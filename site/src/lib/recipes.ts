import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import {
  CATEGORIES,
  getCategoryFromPath,
  type CategorySlug,
} from './categories';

const SITE_DIR = path.resolve(process.cwd());
const ROOT_DIR = path.resolve(SITE_DIR, '..');
const DISHES_DIR = path.join(ROOT_DIR, 'dishes');
const PUBLIC_ASSETS = path.join(SITE_DIR, 'public/assets');

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

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG']);

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

function ensurePublicDir(relativePath: string): string {
  const destDir = path.dirname(path.join(PUBLIC_ASSETS, relativePath));
  fs.mkdirSync(destDir, { recursive: true });
  return path.join(PUBLIC_ASSETS, relativePath);
}

function copyImageIfExists(sourcePath: string, publicRelativePath: string): string | null {
  if (!fs.existsSync(sourcePath)) return null;

  const destPath = ensurePublicDir(publicRelativePath);
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(sourcePath, destPath);
  }

  return `/assets/${publicRelativePath.split(path.sep).join('/')}`;
}

function resolveImagePath(markdownDir: string, imageRef: string, dishRelativePath: string): string | null {
  const cleaned = imageRef.replace(/^\.\//, '');
  const sourcePath = path.resolve(markdownDir, cleaned);
  const publicRelative = path.join('dishes', dishRelativePath, cleaned);

  return copyImageIfExists(sourcePath, publicRelative);
}

function findCoverImage(markdownDir: string, dishRelativePath: string): string | null {
  if (!fs.existsSync(markdownDir)) return null;

  for (const entry of fs.readdirSync(markdownDir)) {
    const ext = path.extname(entry);
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const publicRelative = path.join('dishes', dishRelativePath, entry);
    const copied = copyImageIfExists(path.join(markdownDir, entry), publicRelative);
    if (copied) return copied;
  }

  return null;
}

function rewriteMarkdownImages(content: string, markdownDir: string, dishRelativePath: string): string {
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, imageRef) => {
    if (imageRef.startsWith('http://') || imageRef.startsWith('https://')) {
      return `![${alt}](${imageRef})`;
    }

    const publicUrl = resolveImagePath(markdownDir, imageRef, dishRelativePath);
    if (!publicUrl) return '';

    return `![${alt}](${publicUrl})`;
  });
}

function parseRecipe(filePath: string): Recipe | null {
  const category = getCategoryFromPath(filePath);
  if (!category || category === ('template' as CategorySlug)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const name = parseTitle(raw);
  const markdownDir = path.dirname(filePath);
  const dishRelativePath = path.relative(DISHES_DIR, markdownDir);
  const rewritten = rewriteMarkdownImages(raw, markdownDir, dishRelativePath);
  const coverFromMarkdown = rewritten.match(/!\[[^\]]*\]\(([^)]+)\)/);
  const coverImage =
    (coverFromMarkdown?.[1] && !coverFromMarkdown[1].startsWith('http') ? coverFromMarkdown[1] : null) ??
    findCoverImage(markdownDir, dishRelativePath);

  const contentHtml = marked.parse(rewritten, { async: false }) as string;

  return {
    slug: slugify(filePath, category),
    name,
    category,
    categoryTitle: CATEGORIES[category].title,
    difficulty: parseDifficulty(raw),
    calories: parseCalories(raw),
    description: parseDescription(raw),
    coverImage,
    filePath,
    contentHtml,
    searchText: `${name} ${CATEGORIES[category].title} ${parseDescription(raw)}`.toLowerCase(),
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
