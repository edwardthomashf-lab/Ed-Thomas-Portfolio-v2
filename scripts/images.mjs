// Prepares the source images in `media-source/` for the site.
//
// Every project screenshot is normalised to the same 16:10 frame so the work
// index reads as one even row, and the portrait is cropped to 4:5. Output is a
// high-quality JPEG master in `src/assets/`; Astro's <Picture> then derives the
// AVIF and WebP sizes at build time.
//
//   npm run images
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => join(root, 'media-source', f);
const out = (f) => join(root, 'src', 'assets', f);

const SHOT = { width: 1600, height: 1000 };

/** Screenshots: optional trim (e.g. a captured scrollbar), then a top-anchored 16:10 crop. */
const shots = [
  // Live captures are taken at 1440x900 (already 16:10) with scrollbars hidden.
  { file: 'ford.png', name: 'ford' }, // ford.co.uk/cars/puma-gen-e
  { file: 'hook-and-flanker.png', name: 'hook-and-flanker' },
  { file: 'good-going.png', name: 'good-going' },
  { file: 'staying-connected.png', name: 'staying-connected' },
];

await mkdir(out('work'), { recursive: true });
await mkdir(out('me'), { recursive: true });

for (const shot of shots) {
  let image = sharp(src(shot.file));
  if (shot.trimRight) {
    const { width, height } = await image.metadata();
    image = sharp(await image.extract({ left: 0, top: 0, width: width - shot.trimRight, height }).toBuffer());
  }
  await image
    .resize({ ...SHOT, fit: 'cover', position: 'top' })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(out(`work/${shot.name}.jpg`));
  console.log(`work/${shot.name}.jpg`);
}

// Portrait: a 4:5 crop from the square LinkedIn photo, kept centred on the face.
{
  const image = sharp(src('edward.png'));
  const { width, height } = await image.metadata();
  const cropW = Math.round((height * 4) / 5);
  await image
    .extract({ left: Math.round((width - cropW) / 2), top: 0, width: cropW, height })
    .resize({ width: 1000 })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(out('me/edward.jpg'));
  console.log('me/edward.jpg');
}
