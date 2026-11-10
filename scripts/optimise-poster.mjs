// Usage: node scripts/optimise-poster.mjs <rendered-poster.png>
// The poster comes from "TPC Cafe Lucky Draw A2 Poster Size.pdf" (rendered to PNG first). Trims the 6px edge line and writes WebP.
import sharp from 'sharp';
const src = process.argv[2];
const img = sharp(src);
const { width, height } = await img.metadata();
await sharp(src).extract({ left: 6, top: 6, width: width - 12, height: height - 12 }).resize({ width: 1100 }).webp({ quality: 84 }).toFile('public/lucky-draw/poster.webp');
console.log('done', width, height);
