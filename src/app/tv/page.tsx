import type { Metadata } from 'next';
import { TvScreen } from '@/components/TvScreen';

export const metadata: Metadata = { title: 'TV', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Tv({ searchParams }: { searchParams: Promise<{ token?: string; scene?: string; scale?: string }> }) {
  const { token, scene, scale } = await searchParams;
  const required = process.env.TV_TOKEN;
  if (required && token !== required) {
    return <main className="p-10 text-center text-2xl">This TV link needs a valid token. Ask the committee for the device link.</main>;
  }
  const sc = scale ? Number(scale) : undefined;
  return <TvScreen fixedScene={scene} scale={sc && sc > 0.5 && sc < 4 ? sc : undefined} />;
}
