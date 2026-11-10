import sharp from 'sharp';
import path from 'node:path';
const SRC = path.resolve(process.cwd(), '..');
const OUT = path.resolve(process.cwd(), 'public/logos');
const map = {
  'tpc-titans': 'WhatsApp Image 2026-08-08 at 19.34.04 (2).jpeg',
  'gq-warriors': 'GQ Warriors.jpeg',
  'the-crusaders': 'The Crusaders.jpeg',
  'gq-mavericks': 'WhatsApp Image 2026-08-08 at 19.34.04 (1).jpeg',
  'tdd-tigers': 'TDD Tigers.jpeg',
  'eastcape-knights': 'WhatsApp Image 2026-08-08 at 19.34.03 (1).jpeg',
  'tpc-spartans': 'WhatsApp Image 2026-08-08 at 19.34.05.jpeg',
  'apex': 'Apex.jpeg',
  'league-badge': 'The Padel League Logo.jpeg',
  'league-wordmark': 'The Padel League Logo 1.jpeg',
};
for (const [slug, file] of Object.entries(map)) {
  const big = slug.startsWith('league-wordmark');
  await sharp(path.join(SRC, file)).resize(big ? 900 : 512, big ? undefined : 512, { fit: 'contain', background: '#101418' }).webp({ quality: 82 }).toFile(path.join(OUT, slug + '.webp'));
  console.log('ok', slug);
}
