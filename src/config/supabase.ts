import { createClient } from '@supabase/supabase-js';
import env from './env';
import type { Database } from '@shared/types/database.types';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

/**
 * Enterprise Supabase Client
 * 
 * Configured with standard enterprise defaults:
 * - autoRefreshToken enabled
 * - persistSession enabled
 * - Uses typed Database definitions for end-to-end type safety
 */
export const supabase = createClient<Database>(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 40, // Increased for high-frequency vessel tracking
      },
    },
  }
);
