import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Keeps the staff session fresh (Auth tokens are short-lived) for staff routes only. */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  await sb.auth.getUser();
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = { matcher: ['/admin/:path*', '/staff/:path*'] };
