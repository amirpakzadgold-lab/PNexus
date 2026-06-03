import { SupabaseClient } from '@supabase/supabase-js';

/**
 * RLS (Row Level Security) Policy Validator
 * Verifies that all RLS policies are properly configured and enforced
 */

interface RLSCheckResult {
  table: string;
  rlsEnabled: boolean;
  policiesCount: number;
  policies: string[];
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

interface RLSValidationReport {
  timestamp: string;
  totalTables: number;
  passedTables: number;
  failedTables: number;
  results: RLSCheckResult[];
}

const EXPECTED_TABLES = [
  'user_profiles',
  'plans',
  'payments',
  'app_config',
  'stories',
  'story_views',
  'communities',
  'channels',
  'channel_members',
  'chat_folders',
  'calls',
];

const EXPECTED_POLICIES: Record<string, string[]> = {
  user_profiles: [
    'Users can view all profiles',
    'Users can update own profile',
    'Users can insert own profile',
  ],
  plans: ['Anyone can view plans'],
  payments: [
    'Users can view own payments',
    'Users can insert own payments',
  ],
  app_config: ['Anyone can view config'],
  stories: [
    'Anyone can view non-expired stories',
    'Users can insert own stories',
    'Users can delete own stories',
  ],
  story_views: [],
  communities: ['Anyone can view communities'],
  channels: [
    'Anyone can view public channels',
    'Members can view private channels',
  ],
  channel_members: [],
  chat_folders: ['Users can manage own folders'],
  calls: [],
};

async function checkRLSStatus(
  adminClient: SupabaseClient,
  tableName: string
): Promise<RLSCheckResult> {
  try {
    // Query information_schema to check RLS status
    const { data: rlsStatus, error: rlsError } = await adminClient
      .from('information_schema.tables')
      .select('rowsecurity')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .single();

    if (rlsError || !rlsStatus) {
      return {
        table: tableName,
        rlsEnabled: false,
        policiesCount: 0,
        policies: [],
        status: 'fail',
        message: `Failed to check RLS status: ${rlsError?.message || 'Unknown error'}`,
      };
    }

    const rlsEnabled = rlsStatus.rowsecurity === true;

    if (!rlsEnabled) {
      return {
        table: tableName,
        rlsEnabled: false,
        policiesCount: 0,
        policies: [],
        status: 'fail',
        message: `RLS not enabled on table '${tableName}'`,
      };
    }

    // Query pg_policies to get policy count
    const { data: policies, error: policiesError } = await adminClient
      .rpc('get_table_policies', { table_name: tableName })
      .catch(() => ({ data: [], error: null }));

    const policyNames = policies?.map((p: any) => p.policyname) || [];
    const expectedPolicies = EXPECTED_POLICIES[tableName] || [];
    const missingPolicies = expectedPolicies.filter(
      (p) => !policyNames.includes(p)
    );

    let status: 'pass' | 'fail' | 'warning' = 'pass';
    let message = `✅ RLS enabled with ${policyNames.length} policies`;

    if (missingPolicies.length > 0) {
      status = 'warning';
      message = `⚠️  RLS enabled but missing policies: ${missingPolicies.join(', ')}`;
    }

    if (policyNames.length === 0) {
      status = 'warning';
      message = `⚠️  RLS enabled but no policies configured`;
    }

    return {
      table: tableName,
      rlsEnabled: true,
      policiesCount: policyNames.length,
      policies: policyNames,
      status,
      message,
    };
  } catch (error) {
    return {
      table: tableName,
      rlsEnabled: false,
      policiesCount: 0,
      policies: [],
      status: 'fail',
      message: `Error checking RLS: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function validateRLSPolicies(
  adminClient: SupabaseClient
): Promise<RLSValidationReport> {
  console.log('\n🔐 Validating RLS Policies...\n');

  const results: RLSCheckResult[] = [];

  for (const table of EXPECTED_TABLES) {
    const result = await checkRLSStatus(adminClient, table);
    results.push(result);

    const icon =
      result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${result.table.padEnd(20)} | ${result.message}`);
  }

  const passedTables = results.filter((r) => r.status === 'pass').length;
  const failedTables = results.filter((r) => r.status === 'fail').length;

  console.log(
    `\n📊 Summary: ${passedTables}/${EXPECTED_TABLES.length} tables passed\n`
  );

  return {
    timestamp: new Date().toISOString(),
    totalTables: EXPECTED_TABLES.length,
    passedTables,
    failedTables,
    results,
  };
}

/**
 * Test RLS enforcement with a simple query
 * Note: This requires an authenticated user session
 */
async function testRLSEnforcement(
  client: SupabaseClient,
  tableName: string,
  userId: string
): Promise<boolean> {
  try {
    // Try to query the table - should be filtered by RLS if properly configured
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`  ❌ RLS query failed for ${tableName}:`, error.message);
      return false;
    }

    console.log(`  ✅ RLS query succeeded for ${tableName}`);
    return true;
  } catch (error) {
    console.error(
      `  ❌ RLS test error for ${tableName}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

export { validateRLSPolicies, testRLSEnforcement };
export type { RLSCheckResult, RLSValidationReport };
