import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import {
  CATEGORIES,
  getCategoryFromPath,
  type CategorySlug,
} from './categories';
import {
  isValidImageFile,
  listValidImagesInDir,
  parseMarkdownImages,
} from './image-utils';
import { withBasePath } from './paths';
import { buildSearchText, markdownToSearchText } from './search-text';

const SITE_DIR = path.resolve(process.cwd());
const ROOT_DIR = path.resolve(SITE_DIR, '..');
const DISHES_DIR = path.join(ROOT_DIR, 'dishes');

export interface Recipe {
  slug: string;
  name: string;
  category: CategorySlug;
  categoryTitle: string;
  difficulty: number;
  calories: number | null;
  description: string;
  coverImage: string | null;
  filePath: string;
  contentHtml: string;
  searchText: string;
}

function walkMarkdownFiles(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'template') continue;
      walkMarkdownFiles(fullPath, results);
    } else if (entry.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function parseTitle(raw: string): string {
  const match = raw.match(/^#\s+(.+?)的做法\s*$/m);
  if (match) return match[1].trim();
  return raw.replace(/^#\s+/, '').replace(/\.md$/, '').trim();
}

function parseDifficulty(raw: string): number {
  const match = raw.match(/预估烹饪难度[：:]\s*(★+)/);
  return match ? match[1].length : 0;
}

function parseCalories(raw: string): number | null {
  const match = raw.match(/预估卡路里[：:]\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseDescription(raw: string): string {
  const lines = raw.split('\n');
  let foundTitle = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      foundTitle = true;
      continue;
    }
    if (!foundTitle) continue;

    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('![')) continue;
    if (trimmed.startsWith('预估烹饪难度')) continue;
    if (trimmed.startsWith('预估卡路里')) continue;
    if (trimmed.startsWith('## ')) break;

    return trimmed.slice(0, 120);
  }

  return '';
}

function slugify(filePath: string, category: CategorySlug): string {
  const categoryDir = path.join(DISHES_DIR, category);
  const relative = path.relative(categoryDir, filePath).replace(/\.md$/, '');
  return relative.split(path.sep).join('/');
}

function toAssetUrl(publicRelativePath: string): string {
  const assetPath = `/assets/${publicRelativePath.split(path.sep).join('/')}`;
  return withBasePath(assetPath);
}

function resolveLocalImageUrl(
  markdownDir: string,
  imageRef: string,
  dishRelativePath: string,
): string | null {
  const cleaned = imageRef.replace(/^\.\//, '');
  const sourcePath = path.resolve(markdownDir, cleaned);
  if (!isValidImageFile(sourcePath)) return null;

  const publicRelative = path.join('dishes', dishRelativePath, cleaned);
  return toAssetUrl(publicRelative);
}

function resolveImageReference(
  markdownDir: string,
  imageRef: string,
  dishRelativePath: string,
): string | null {
  const trimmedRef = imageRef.trim();

  if (trimmedRef.startsWith('http://') || trimmedRef.startsWith('https://')) {
    return trimmedRef;
  }

  return resolveLocalImageUrl(markdownDir, trimmedRef, dishRelativePath);
}

function findCoverImage(
  markdownDir: string,
  dishRelativePath: string,
  recipeName: string,
  filePath: string,
): string | null {
  const fileBase = path.basename(filePath, '.md');
  const slugFolder = path.basename(markdownDir);
  const searchDirs = [
    markdownDir,
    path.join(markdownDir, recipeName),
    path.join(markdownDir, fileBase),
    path.join(path.dirname(markdownDir), recipeName),
    path.join(path.dirname(markdownDir), fileBase),
  ];

  const uniqueDirs = [...new Set(searchDirs)].filter((dir) => fs.existsSync(dir));

  const preferredNames = [
    recipeName,
    fileBase,
    slugFolder,
    `${recipeName}成品`,
    `${fileBase}成品`,
  ];

  for (const dir of uniqueDirs) {
    for (const preferred of preferredNames) {
      for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG']) {
        const candidate = path.join(dir, `${preferred}${ext}`);
        if (isValidImageFile(candidate)) {
          const relative = path.relative(DISHES_DIR, candidate);
          return toAssetUrl(path.join('dishes', relative));
        }
      }
    }
  }

  for (const dir of uniqueDirs) {
    const images = listValidImagesInDir(dir);
    if (images.length > 0) {
      const relative = path.relative(DISHES_DIR, path.join(dir, images[0]));
      return toAssetUrl(path.join('dishes', relative));
    }
  }

  return null;
}

function rewriteMarkdownImages(
  content: string,
  markdownDir: string,
  dishRelativePath: string,
): { content: string; firstImage: string | null } {
  let firstImage: string | null = null;

  const rewritten = content.replace(/!\[([^\]]*)\]\(/g, (match, alt, offset) => {
    const start = offset + match.length;
    let depth = 1;
    let index = start;

    while (index < content.length && depth > 0) {
      const char = content[index];
      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      index += 1;
    }

    if (depth !== 0) return match;

    const imageRef = content.slice(start, index - 1).trim();
    const publicUrl = resolveImageReference(markdownDir, imageRef, dishRelativePath);

    if (!publicUrl) return '';

    if (!firstImage) firstImage = publicUrl;
    return `![${alt}](${publicUrl})`;
  });

  return { content: rewritten, firstImage };
}

function parseRecipe(filePath: string): Recipe | null {
  const category = getCategoryFromPath(filePath);
  if (!category || category === ('template' as CategorySlug)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const name = parseTitle(raw);
  const markdownDir = path.dirname(filePath);
  const dishRelativePath = path.relative(DISHES_DIR, markdownDir);
  const { content: rewritten, firstImage } = rewriteMarkdownImages(raw, markdownDir, dishRelativePath);
  const coverImage =
    firstImage ?? findCoverImage(markdownDir, dishRelativePath, name, filePath);
  const contentHtml = marked.parse(rewritten, { async: false }) as string;

  const description = parseDescription(raw);

  return {
    slug: slugify(filePath, category),
    name,
    category,
    categoryTitle: CATEGORIES[category].title,
    difficulty: parseDifficulty(raw),
    calories: parseCalories(raw),
    description,
    coverImage,
    filePath,
    contentHtml,
    searchText: buildSearchText(
      name,
      CATEGORIES[category].title,
      description,
      markdownToSearchText(raw),
    ),
  };
}

let recipeCache: Recipe[] | null = null;

export function getAllRecipes(): Recipe[] {
  if (recipeCache) return recipeCache;

  const files = walkMarkdownFiles(DISHES_DIR);
  recipeCache = files
    .map(parseRecipe)
    .filter((recipe): recipe is Recipe => recipe !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return recipeCache;
}

export function getRecipeBySlug(category: CategorySlug, slug: string): Recipe | undefined {
  return getAllRecipes().find((recipe) => recipe.category === category && recipe.slug === slug);
}

export function getRecipesByCategory(category: CategorySlug): Recipe[] {
  return getAllRecipes().filter((recipe) => recipe.category === category);
}

export function getRecipeStats() {
  const recipes = getAllRecipes();
  return {
    total: recipes.length,
    byCategory: Object.keys(CATEGORIES).map((slug) => ({
      slug: slug as CategorySlug,
      count: recipes.filter((recipe) => recipe.category === slug).length,
    })),
  };
}
