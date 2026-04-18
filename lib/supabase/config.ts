const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseConfig() {
  return {
    supabaseUrl: supabaseUrl ?? "",
    supabaseAnonKey: supabaseAnonKey ?? "",
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}
