import Link from 'next/link';

/** Sub-navigation for the Players & Teams area. */
export function PeopleNav({ active }: { active: 'players' | 'teams' | 'new' }) {
  const item = (key: typeof active, href: string, label: string) => (
    <Link href={href} aria-current={active === key ? 'page' : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === key ? 'bg-lime text-ink' : 'border border-line hover:border-lime'}`}>{label}</Link>
  );
  return <nav aria-label="Players and teams" className="mb-5 flex flex-wrap gap-2">{item('players', '/admin/people', 'Players')}{item('teams', '/admin/people/teams', 'Teams')}{item('new', '/admin/people/new', '+ Add player')}</nav>;
}
