import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr'

/**
 * Determines if a request is coming from a browser by checking the User-Agent header.
 * 
 * @param request - The request object to check
 * @returns True if the request appears to be from a browser, false otherwise
 */
export const isRequestFromBrowser = (request: Request): boolean => {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Common browser identifiers
  return /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(userAgent) && 
         !userAgent.includes('bot') && 
         !userAgent.includes('crawl');
}

export const createSupabaseServerClient = (request: Request) => {
  return createServerClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => parseCookieHeader(request.headers.get('cookie') || ''),
      }
    }
  )
}
