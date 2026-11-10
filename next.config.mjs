const supabaseHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname; } catch { return null; } })();

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // winner photos are served from the project's public storage bucket
    remotePatterns: supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : [],
  },
  // photos are shrunk in the browser first; Vercel functions accept at most ~4.5 MB per request
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
};
