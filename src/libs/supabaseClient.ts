import config from '@/config'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const createSupabaseServerClient = (request: Request) => {
  return createServerClient(
    `https://${config.auth.supabaseId}.supabase.co`,
    config.auth.supabaseAnonKey ?? '',
    {
      cookies: {
        getAll: () => parseCookieHeader(request.headers.get('cookie') || ''),
      }
    }
  )
}

export const createSupabaseClient = () => {
  return createClient(
    `https://${config.auth.supabaseId}.supabase.co`,
    config.auth.supabaseAnonKey ?? '',
  )
}