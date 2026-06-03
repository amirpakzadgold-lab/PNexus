import 'dotenv/config';

/**
 * Environment Variable Validator
 * Ensures all required Supabase credentials are present and valid
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  geminiApiKey?: string;
  environment: 'development' | 'production';
  enableRlsValidation: boolean;
  enableRealtimeValidation: boolean;
  enableStorageValidation: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

const errors: ValidationError[] = [];
const warnings: ValidationError[] = [];

function validateEnv(): EnvConfig | null {
  // Required fields
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  // Validate Supabase URL
  if (!supabaseUrl) {
    errors.push({
      field: 'VITE_SUPABASE_URL',
      message: 'Missing required Supabase URL. Get it from https://app.supabase.com/projects',
      severity: 'error',
    });
  } else if (!supabaseUrl.match(/^https:\/\/[\w-]+\.supabase\.co$/)) {
    errors.push({
      field: 'VITE_SUPABASE_URL',
      message: `Invalid Supabase URL format: ${supabaseUrl}. Expected: https://project-id.supabase.co`,
      severity: 'error',
    });
  }

  // Validate Anon Key
  if (!supabaseAnonKey) {
    errors.push({
      field: 'VITE_SUPABASE_ANON_KEY',
      message: 'Missing required Supabase Anon Key (public API key)',
      severity: 'error',
    });
  } else if (supabaseAnonKey === 'your-anon-key-here' || supabaseAnonKey.length < 20) {
    errors.push({
      field: 'VITE_SUPABASE_ANON_KEY',
      message: `Invalid or placeholder Supabase Anon Key. Current value: ${supabaseAnonKey.substring(0, 10)}...`,
      severity: 'error',
    });
  }

  // Validate Service Role Key
  if (!supabaseServiceRoleKey) {
    warnings.push({
      field: 'VITE_SUPABASE_SERVICE_ROLE_KEY',
      message: 'Service Role Key not set. Some admin operations will fail.',
      severity: 'warning',
    });
  } else if (supabaseServiceRoleKey === 'your-service-role-key-here' || supabaseServiceRoleKey.length < 20) {
    warnings.push({
      field: 'VITE_SUPABASE_SERVICE_ROLE_KEY',
      message: `Invalid or placeholder Service Role Key. Current value: ${supabaseServiceRoleKey.substring(0, 10)}...`,
      severity: 'warning',
    });
  }

  // Optional fields
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === 'your-gemini-api-key') {
    warnings.push({
      field: 'VITE_GEMINI_API_KEY',
      message: 'Gemini API key not configured. AI features will be disabled.',
      severity: 'warning',
    });
  }

  // Feature flags
  const enableRlsValidation = process.env.VITE_ENABLE_RLS_VALIDATION !== 'false';
  const enableRealtimeValidation = process.env.VITE_ENABLE_REALTIME !== 'false';
  const enableStorageValidation = process.env.VITE_ENABLE_STORAGE !== 'false';
  const environment = (process.env.VITE_ENVIRONMENT || 'development') as 'development' | 'production';

  if (errors.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
    errors.forEach(err => {
      console.error(`  ❌ [${err.field}] ${err.message}`);
    });
    if (warnings.length > 0) {
      console.warn('\n⚠️  WARNINGS:\n');
      warnings.forEach(warn => {
        console.warn(`  ⚠️  [${warn.field}] ${warn.message}`);
      });
    }
    return null;
  }

  console.log('✅ Environment validation passed\n');

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:\n');
    warnings.forEach(warn => {
      console.warn(`  ⚠️  [${warn.field}] ${warn.message}`);
    });
    console.warn('');
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    supabaseServiceRoleKey: supabaseServiceRoleKey || '',
    geminiApiKey,
    environment,
    enableRlsValidation,
    enableRealtimeValidation,
    enableStorageValidation,
  };
}

export { validateEnv, EnvConfig, ValidationError };
