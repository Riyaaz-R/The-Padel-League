/** Public Supabase Storage URL for an uploaded file. */
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const storageUrl = (bucket: 'team-logos' | 'player-photos' | 'lucky-draw' | 'sponsor-images', path: string) => `${BASE}/storage/v1/object/public/${bucket}/${path}`;
/** A logo is either a file shipped with the site ("/logos/x.webp") or an uploaded file in the team-logos bucket. */
export const resolveLogo = (path: string | null | undefined): string => (!path ? '/logos/league-badge.webp' : path.startsWith('/') || path.startsWith('http') ? path : storageUrl('team-logos', path));
