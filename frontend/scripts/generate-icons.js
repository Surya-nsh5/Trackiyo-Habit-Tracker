import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const svgPath = path.resolve(publicDir, 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons from favicon.svg...');

  // Standard sizes
  await sharp(svgBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'pwa-64x64.png'));
  console.log('Created pwa-64x64.png');

  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // Windows Tile sizes
  await sharp(svgBuffer).resize(150, 150).png().toFile(path.join(publicDir, 'windows-tile-150x150.png'));
  console.log('Created windows-tile-150x150.png');

  await sharp(svgBuffer).resize(310, 310).png().toFile(path.join(publicDir, 'windows-tile-310x310.png'));
  console.log('Created windows-tile-310x310.png');

  // Maskable icon with 10% padding (standard safe zone for maskable icons)
  const innerSize = Math.round(512 * 0.8);
  const innerBuffer = await sharp(svgBuffer).resize(innerSize, innerSize).png().toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 } // #09090B
    }
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
  console.log('Created maskable-icon-512x512.png');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
