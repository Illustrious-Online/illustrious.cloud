import config from "@/config";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  `https://${config.auth.supabaseId}.supabase.co`,
  config.auth.supabaseAnonKey ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
