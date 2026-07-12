import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_DIR = path.resolve(SITE_DIR, '..');
const DISHES_DIR = path.join(ROOT_DIR, 'dishes');
const DEST_DIR = path.join(SITE_DIR, 'public/assets/dishes');

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.JPG',
  '.JPEG',
  '.PNG',
]);

function copyImages(srcDir, relativeDir = '') {
  let count = 0;

  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const nextRelative = relativeDir ? path.join(relativeDir, entry) : entry;

    if (fs.statSync(srcPath).isDirectory()) {
      if (entry === 'template') continue;
      count += copyImages(srcPath, nextRelative);
      continue;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(entry))) continue;

    const destPath = path.join(DEST_DIR, nextRelative);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    count += 1;
  }

  return count;
}

fs.rmSync(DEST_DIR, { recursive: true, force: true });
const total = copyImages(DISHES_DIR);
console.log(`Prepared ${total} recipe images into public/assets/dishes`);
