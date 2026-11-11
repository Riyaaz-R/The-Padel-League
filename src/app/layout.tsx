import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { LuckyDrawPopup } from '@/components/LuckyDrawPopup';
import { SponsorBanner } from '@/components/SponsorBanner';
import { getBanner } from '@/data/db';
import { loadBanner } from '@/data/sponsors';

const display = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800'], style: ['italic'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: { default: 'The Padel League', template: '%s | The Padel League' },
  description: 'TPC Friday Night Team Padel League: fixtures, results, tables and live scores.',
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: '#07090b', width: 'device-width', initialScale: 1 };

const NAV = [
  ['/fixtures', 'Fixtures'], ['/tables', 'Tables'], ['/knockouts', 'Knockouts'], ['/teams', 'Teams'],
  ['/players', 'Players'], ['/live', 'Live'], ['/tv', 'TV Mode'], ['/lucky-draw', 'Lucky Draw'], ['/sponsors', 'Sponsors'], ['/rules', 'Rules'], ['/about', 'About'],
] as const;

export const dynamic = 'force-dynamic'; // the announcement banner is read per request

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [banner, sponsorBanner] = await Promise.all([getBanner(), loadBanner()]);
  return (
    <html lang="en-ZA" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-lime focus:p-2 focus:text-ink">Skip to content</a>
        <AnnouncementBar initial={banner} />
        <header className="no-print sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
            <Link href="/" className="flex items-center gap-2" aria-label="The Padel League home">
              <Image src="/logos/league-badge.webp" alt="" width={44} height={44} className="rounded-full" />
              <span className="display text-xl leading-none">The Padel<br /><span className="text-lime">League</span></span>
            </Link>
            <nav aria-label="Main" className="flex flex-wrap gap-x-4 gap-y-1">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="py-2 text-sm font-semibold uppercase tracking-wider hover:text-lime">{label}</Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="no-print mt-12 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-bone/70">
            <p>TPC Friday Night League at TPC – The Padel Centre. Powered by <strong className="text-bone">PadelBros</strong>.</p>
            <p className="flex gap-4">
              <a className="hover:text-lime" href="https://www.instagram.com/padelbros_sa" rel="noopener noreferrer" target="_blank">Instagram @padelbros_sa</a>
              <Link className="hover:text-lime" href="/staff">Staff</Link>
            </p>
          </div>
        </footer>
        <SponsorBanner initial={sponsorBanner} />
        <LuckyDrawPopup />
      </body>
    </html>
  );
}
