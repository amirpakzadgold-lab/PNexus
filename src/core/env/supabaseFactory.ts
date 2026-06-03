import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EnvConfig } from './validator';

/**
 * Supabase Client Factory
 * Creates and configures Supabase client with proper error handling
 */

interface ClientConfig {
  shouldThrowOnError: boolean;
  autoRefreshToken: boolean;
  persistSession: boolean;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function createSupabaseClient(
  config: EnvConfig,
  clientConfig: Partial<ClientConfig> = {}
): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const options = {
    shouldThrowOnError: true,
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
    ...clientConfig,
  };

  try {
    supabaseClient = createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: options.autoRefreshToken,
          persistSession: options.persistSession,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'User-Agent': 'PNexus-Client/1.0',
          },
        },
      }
    );

    console.log('✅ Supabase client initialized (Anon)');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw error;
  }
}

function createSupabaseAdminClient(config: EnvConfig): SupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  if (!config.supabaseServiceRoleKey) {
    throw new Error('Service Role Key required for admin operations');
  }

  try {
    supabaseAdminClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'User-Agent': 'PNexus-Admin/1.0',
          },
        },
      }
    );

    console.log('✅ Supabase admin client initialized (Service Role)');
    return supabaseAdminClient;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase admin client:', error);
    throw error;
  }
}

async function testConnection(client: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('COUNT(*)', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
}

export { createSupabaseClient, createSupabaseAdminClient, testConnection };
export type { ClientConfig };
