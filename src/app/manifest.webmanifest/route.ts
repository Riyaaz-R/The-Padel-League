export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    name: 'The Padel League', short_name: 'Padel League', description: 'TPC Friday Night Team Padel League',
    start_url: '/', display: 'standalone', background_color: '#07090b', theme_color: '#07090b',
    icons: [{ src: '/logos/league-badge.webp', sizes: '512x512', type: 'image/webp', purpose: 'any' }],
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
