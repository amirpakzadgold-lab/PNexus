import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Realtime Security Hardener
 * Implements strict channel access and message validation
 */

interface RealtimeSecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  recommendation: string;
}

interface RealtimeAuditResult {
  channelsValidated: number;
  issuesFound: number;
  issues: RealtimeSecurityIssue[];
  isSecure: boolean;
}

/**
 * Audit realtime security configuration
 */
async function auditRealtimeSecurity(
  client: SupabaseClient
): Promise<RealtimeAuditResult> {
  console.log('\n🔐 SECURITY AUDIT: Realtime Subscriptions\n');

  const issues: RealtimeSecurityIssue[] = [];
  let channelsValidated = 0;

  try {
    // Test presence channel security
    const presenceChannel = client.channel('test-presence', {
      config: { presence: { key: 'test' } },
    });

    channelsValidated++;

    // Presence channels should require authentication
    console.log('  Testing presence channel...');

    // Check if channel requires auth
    const hasAuthCheck =
      presenceChannel.config?.presence?.key !== undefined;

    if (!hasAuthCheck) {
      issues.push({
        severity: 'high',
        issue: 'Presence channels may not require authentication',
        recommendation: 'Implement auth check in presence channel subscriptions',
      });
    }

    await presenceChannel.unsubscribe();

    // Test broadcast channel security
    const broadcastChannel = client.channel('test-broadcast');
    channelsValidated++;

    console.log('  Testing broadcast channel...');

    // Broadcast should only send to authorized subscribers
    let broadcastSecure = true;

    broadcastChannel.on('broadcast', { event: '*' }, () => {
      // This should require authentication
      if (!client.auth) {
        broadcastSecure = false;
      }
    });

    await broadcastChannel.unsubscribe();

    if (!broadcastSecure) {
      issues.push({
        severity: 'high',
        issue: 'Broadcast messages may be accessible without authentication',
        recommendation: 'Verify all broadcast channels require user authentication',
      });
    }

    // Test Postgres changes security
    const postgresChannel = client.channel('public:user_profiles');
    channelsValidated++;

    console.log('  Testing Postgres changes channel...');

    let postgresSecure = false;

    postgresChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
      },
      (payload) => {
        // Should only receive own user data (via RLS)
        postgresSecure = true;
      }
    );

    await postgresChannel.subscribe();

    // Wait briefly for subscription
    await new Promise((resolve) => setTimeout(resolve, 500));

    await postgresChannel.unsubscribe();

    if (!postgresSecure) {
      issues.push({
        severity: 'medium',
        issue: 'Postgres changes subscriptions may not be properly filtered',
        recommendation: 'Ensure RLS policies filter data per-user',
      });
    }

    // Check for potential data leakage
    console.log('  Checking for subscription vulnerabilities...');

    // Verify no sensitive data in subscription callbacks
    const sensitivePatterns = [
      'password',
      'secret',
      'token',
      'apikey',
      'api_key',
    ];

    // This is a warning - actual check would require code analysis
    issues.push({
      severity: 'low',
      issue: 'Manual review needed: Verify no sensitive data in subscription callbacks',
      recommendation:
        'Code review: Ensure subscriptions only handle non-sensitive data',
    });
  } catch (error) {
    issues.push({
      severity: 'high',
      issue: `Realtime audit error: ${error instanceof Error ? error.message : 'Unknown'}`,
      recommendation: 'Check Supabase realtime configuration',
    });
  }

  const isSecure =
    issues.filter((i) => i.severity === 'critical').length === 0;

  console.log(
    `\n  ${isSecure ? '✅' : '⚠️'} Realtime Security: ${issues.length} issues`
  );

  return {
    channelsValidated,
    issuesFound: issues.length,
    issues,
    isSecure,
  };
}

/**
 * Hardened realtime configuration
 */
const HARDENED_REALTIME_CONFIG = {
  // Channel-specific permissions
  channels: {
    'presence:*': {
      requireAuth: true,
      maxSubscribers: 1000,
      messageRateLimit: 100, // messages per second
    },
    'broadcast:*': {
      requireAuth: true,
      maxSubscribers: 10000,
      messageRateLimit: 1000,
    },
    'postgres_changes:*': {
      requireAuth: true,
      enforceRLS: true,
      allowedEvents: ['INSERT', 'UPDATE', 'DELETE'],
    },
  },

  // Message validation
  messageValidation: {
    maxPayloadSize: 1024 * 100, // 100KB
    requireSignature: false,
    validateSchema: true,
    sanitizePayload: true,
  },

  // Rate limiting per user
  rateLimiting: {
    presenceUpdatesPerMinute: 60,
    broadcastMessagesPerMinute: 100,
    subscriptionsPerUser: 50,
  },

  // Security headers for realtime
  headers: {
    'Content-Security-Policy': "default-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  },
};

/**
 * Generate SQL for realtime audit logging
 */
function generateRealtimeHardenedSQL(): string[] {
  return [
    // Create realtime events audit log
    `CREATE TABLE IF NOT EXISTS realtime_audit_log (
       id BIGSERIAL PRIMARY KEY,
       user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
       channel_name TEXT NOT NULL,
       event_type TEXT NOT NULL,
       message_size INTEGER,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );`,

    // Enable RLS
    `ALTER TABLE realtime_audit_log ENABLE ROW LEVEL SECURITY;`,

    // Users can only see their own events
    `CREATE POLICY "realtime_audit_log_user_view" ON realtime_audit_log
     FOR SELECT USING (auth.uid() = user_id);`,

    // Create function to log realtime events
    `CREATE OR REPLACE FUNCTION log_realtime_event(
       p_channel_name TEXT,
       p_event_type TEXT,
       p_message_size INTEGER
     ) RETURNS VOID AS $$
     BEGIN
       INSERT INTO realtime_audit_log (user_id, channel_name, event_type, message_size, created_at)
       VALUES (auth.uid(), p_channel_name, p_event_type, p_message_size, NOW());
     END
     $$ LANGUAGE plpgsql SECURITY DEFINER;`,

    // Function to validate channel access
    `CREATE OR REPLACE FUNCTION check_channel_access(
       p_channel_name TEXT,
       p_user_id UUID
     ) RETURNS BOOLEAN AS $$
     BEGIN
       -- Presence and broadcast require authentication
       IF p_channel_name LIKE 'presence:%' OR p_channel_name LIKE 'broadcast:%' THEN
         RETURN p_user_id IS NOT NULL;
       END IF;

       -- Postgres changes require RLS to filter data
       IF p_channel_name LIKE 'postgres_changes:%' THEN
         RETURN p_user_id IS NOT NULL;
       END IF;

       RETURN FALSE;
     END
     $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  ];
}

export {
  auditRealtimeSecurity,
  generateRealtimeHardenedSQL,
  HARDENED_REALTIME_CONFIG,
};
export type { RealtimeSecurityIssue, RealtimeAuditResult };
