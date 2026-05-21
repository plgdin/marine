/**
 * Typed access to all Vite environment variables.
 * Always import env values through this module — never access import.meta.env directly.
 */
const env = {
  supabaseUrl:    import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  mapboxToken:    import.meta.env.VITE_MAPBOX_TOKEN ?? '',
  appEnv:         import.meta.env.VITE_APP_ENV ?? 'development',
  enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  isDev:          import.meta.env.DEV,
  isProd:         import.meta.env.PROD,
} as const;

export default env;
