const TZ = 'Africa/Johannesburg';
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, ...opts }).format(new Date(iso.length === 10 ? iso + 'T12:00:00+02:00' : iso));
export const fmtRand = (n: number) => 'R ' + new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(n).replace(/ /g, ' ');
/** SAST calendar date for "now" as YYYY-MM-DD. */
export const todaySAST = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
export const daysUntil = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(todaySAST() + 'T00:00:00Z')) / 86400000);
export const divisionLabel = { ladies: 'Ladies', high: 'High', low: 'Low' } as const;
export const slotLabel = { ladies: 'Ladies', low: 'Low', high_1: 'High 1', high_2: 'High 2' } as const;
export const roundLabel: Record<string, string> = {
  group: 'Group stage', qf: 'Quarter-final', sf: 'Semi-final', final: 'Final', third: '3rd/4th play-off',
  plate_sf: 'Plate semi-final', plate_final: 'Plate Final', plate_third: 'Plate 3rd/4th',
};
