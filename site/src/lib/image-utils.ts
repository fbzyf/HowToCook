import fs from 'node:fs';
import path from 'node:path';

export const IMAGE_EXTENSIONS = new Set([
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

export function hasImageExtension(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath));
}

export function isLfsPointer(filePath: string): boolean {
  try {
    const header = fs.readFileSync(filePath, 'utf8').slice(0, 40);
    return header.startsWith('version https://git-lfs.github.com');
  } catch {
    return false;
  }
}

export function isValidImageFile(filePath: string): boolean {
  if (!fs.existsSync(filePath) || !hasImageExtension(filePath)) return false;
  if (isLfsPointer(filePath)) return false;
  return true;
}

export interface MarkdownImage {
  alt: string;
  url: string;
}

/** Parse markdown image syntax, including paths that contain parentheses. */
export function parseMarkdownImages(content: string): MarkdownImage[] {
  const images: MarkdownImage[] = [];
  const marker = /!\[([^\]]*)\]\(/g;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(content)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;

    while (index < content.length && depth > 0) {
      const char = content[index];
      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      index += 1;
    }

    if (depth !== 0) continue;

    images.push({
      alt: match[1],
      url: content.slice(start, index - 1).trim(),
    });
  }

  return images;
}

export function listValidImagesInDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((entry) => isValidImageFile(path.join(dir, entry)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
