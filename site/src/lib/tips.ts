import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const SITE_DIR = path.resolve(process.cwd());
const ROOT_DIR = path.resolve(SITE_DIR, '..');
const TIPS_DIR = path.join(ROOT_DIR, 'tips');

export type TipGroup = 'basics' | 'learn' | 'advanced';

export interface TipArticle {
  slug: string;
  title: string;
  group: TipGroup;
  groupTitle: string;
  filePath: string;
  contentHtml: string;
  searchText: string;
}

const GROUP_LABELS: Record<TipGroup, string> = {
  basics: '厨房基础',
  learn: '烹饪技法',
  advanced: '进阶技巧',
};

function parseTipFile(filePath: string, group: TipGroup): TipArticle {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const title = path.basename(filePath, '.md');
  const contentHtml = marked.parse(raw, { async: false }) as string;

  return {
    slug: title,
    title,
    group,
    groupTitle: GROUP_LABELS[group],
    filePath,
    contentHtml,
    searchText: `${title} ${GROUP_LABELS[group]}`.toLowerCase(),
  };
}

let tipCache: TipArticle[] | null = null;

export function getAllTips(): TipArticle[] {
  if (tipCache) return tipCache;

  const tips: TipArticle[] = [];

  for (const entry of fs.readdirSync(TIPS_DIR)) {
    const fullPath = path.join(TIPS_DIR, entry);
    if (fs.statSync(fullPath).isFile() && entry.endsWith('.md')) {
      tips.push(parseTipFile(fullPath, 'basics'));
    }
  }

  for (const entry of fs.readdirSync(path.join(TIPS_DIR, 'learn'))) {
    if (entry.endsWith('.md')) {
      tips.push(parseTipFile(path.join(TIPS_DIR, 'learn', entry), 'learn'));
    }
  }

  for (const entry of fs.readdirSync(path.join(TIPS_DIR, 'advanced'))) {
    if (entry.endsWith('.md')) {
      tips.push(parseTipFile(path.join(TIPS_DIR, 'advanced', entry), 'advanced'));
    }
  }

  tipCache = tips.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  return tipCache;
}

export function getTipBySlug(slug: string): TipArticle | undefined {
  return getAllTips().find((tip) => tip.slug === slug);
}

export function getTipsByGroup(group: TipGroup): TipArticle[] {
  return getAllTips().filter((tip) => tip.group === group);
}
