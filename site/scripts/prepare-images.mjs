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
  '.WEBP',
]);

function isLfsPointer(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').slice(0, 40).startsWith('version https://git-lfs.github.com');
  } catch {
    return false;
  }
}

function isValidImage(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath)) && !isLfsPointer(filePath);
}

function copyImages(srcDir, relativeDir = '') {
  let copied = 0;
  let skipped = 0;

  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const nextRelative = relativeDir ? path.join(relativeDir, entry) : entry;

    if (fs.statSync(srcPath).isDirectory()) {
      if (entry === 'template') continue;
      const result = copyImages(srcPath, nextRelative);
      copied += result.copied;
      skipped += result.skipped;
      continue;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(entry))) continue;

    if (!isValidImage(srcPath)) {
      skipped += 1;
      continue;
    }

    const destPath = path.join(DEST_DIR, nextRelative);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    copied += 1;
  }

  return { copied, skipped };
}

fs.rmSync(DEST_DIR, { recursive: true, force: true });
const { copied, skipped } = copyImages(DISHES_DIR);
console.log(`Prepared ${copied} recipe images into public/assets/dishes`);
if (skipped > 0) {
  console.warn(`Skipped ${skipped} invalid or Git LFS pointer image files`);
}
