import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DISHES_DIR = path.join(ROOT_DIR, 'dishes');
const ATTRIBUTION_FILE = path.join(ROOT_DIR, 'site/data/image-attributions.json');

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG', '.WEBP',
]);

const CATEGORY_HINTS = {
  breakfast: 'chinese breakfast',
  meat_dish: 'chinese meat dish',
  aquatic: 'chinese seafood dish',
  vegetable_dish: 'chinese vegetable dish',
  soup: 'chinese soup',
  staple: 'chinese staple food',
  dessert: 'chinese dessert',
  drink: 'chinese drink',
  condiment: 'chinese condiment',
  semi_finished: 'chinese food',
};

/** Common Chinese food terms → English keywords for image search */
const TERM_GLOSSARY = [
  ['西红柿', 'tomato'],
  ['土豆', 'potato'],
  ['茄子', 'eggplant'],
  ['豆腐', 'tofu'],
  ['牛肉', 'beef'],
  ['猪肉', 'pork'],
  ['羊肉', 'lamb'],
  ['鸡肉', 'chicken'],
  ['鸡翅', 'chicken wings'],
  ['鸡腿', 'chicken leg'],
  ['鸡胸', 'chicken breast'],
  ['排骨', 'pork ribs'],
  ['牛腩', 'beef brisket'],
  ['鱼头', 'fish head'],
  ['鲤鱼', 'carp fish'],
  ['生蚝', 'oyster'],
  ['鳕鱼', 'cod fish'],
  ['鳝丝', 'eel'],
  ['螃蟹', 'crab'],
  ['肉蟹', 'crab'],
  ['咖喱', 'curry'],
  ['红烧', 'braised'],
  ['清蒸', 'steamed'],
  ['糖醋', 'sweet sour'],
  ['酸辣', 'sour spicy'],
  ['宫保', 'kung pao'],
  ['麻婆', 'mapo'],
  ['鱼香', 'yuxiang'],
  ['水煮', 'boiled sichuan'],
  ['葱油', 'scallion oil'],
  ['蛋炒饭', 'egg fried rice'],
  ['茶叶蛋', 'tea egg'],
  ['温泉蛋', 'onsen egg'],
  ['水煮蛋', 'boiled egg'],
  ['煎饺', 'pan fried dumplings'],
  ['炸酱面', 'zhajiang noodles'],
  ['热干面', 'hot dry noodles'],
  ['螺蛳粉', 'luosifen noodles'],
  ['紫菜', 'seaweed'],
  ['玉米', 'corn'],
  ['可乐', 'cola'],
  ['炒', 'stir fry'],
  ['煮', 'boiled'],
  ['蒸', 'steamed'],
  ['炖', 'stew'],
  ['煎', 'pan fried'],
  ['炸', 'fried'],
  ['烤', 'roasted'],
  ['汤', 'soup'],
  ['粥', 'congee'],
  ['面', 'noodles'],
  ['饭', 'rice'],
  ['饺', 'dumplings'],
  ['蛋', 'egg'],
  ['鸡', 'chicken'],
  ['鸭', 'duck'],
  ['鱼', 'fish'],
  ['虾', 'shrimp'],
  ['蟹', 'crab'],
  ['肉', 'meat'],
  ['粉', 'noodles'],
];

const ENGLISH_HINTS = {
  茶叶蛋: 'chinese tea egg',
  西红柿炒鸡蛋: 'tomato scrambled eggs chinese',
  西红柿牛腩: 'tomato beef stew chinese',
  麻婆豆腐: 'mapo tofu',
  红烧肉: 'chinese braised pork',
  水煮鱼: 'sichuan boiled fish',
  宫保鸡丁: 'kung pao chicken',
  煎饺: 'chinese pan fried dumplings',
  热干面: 'hot dry noodles wuhan',
  炸酱面: 'zhajiangmian noodles',
  螺蛳粉: 'luosifen noodles',
  蛋炒饭: 'egg fried rice',
  温泉蛋: 'onsen tamago soft boiled egg',
  溏心蛋: 'soft boiled egg yolk',
  太阳蛋: 'sunny side up egg',
  美式炒蛋: 'scrambled eggs',
  吐司果酱: 'toast jam breakfast',
  手抓饼: 'chinese pancake breakfast',
  葱油拌面: 'scallion oil noodles',
  酸辣土豆丝: 'shredded potato chinese',
  皮蛋瘦肉粥: 'century egg pork congee',
  紫菜蛋花汤: 'seaweed egg drop soup',
  罗宋汤: 'borscht soup',
  玉米排骨汤: 'pork rib soup corn',
  可乐鸡翅: 'cola chicken wings',
  鱼香肉丝: 'yuxiang pork shreds',
  回锅肉: 'twice cooked pork',
  糖醋里脊: 'sweet sour pork',
};

function walkMarkdownFiles(dir, results = []) {
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

function isLfsPointer(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').slice(0, 40).startsWith('version https://git-lfs.github.com');
  } catch {
    return false;
  }
}

function parseMarkdownImages(content) {
  const images = [];
  const marker = /!\[([^\]]*)\]\(/g;
  let match;

  while ((match = marker.exec(content)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    while (index < content.length && depth > 0) {
      if (content[index] === '(') depth += 1;
      else if (content[index] === ')') depth -= 1;
      index += 1;
    }
    if (depth === 0) {
      images.push(content.slice(start, index - 1).trim());
    }
  }

  return images;
}

function recipeHasOwnImage(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (parseMarkdownImages(raw).length > 0) return true;

  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.md');
  const title = (raw.match(/^#\s+(.+?)的做法/m) || [])[1] || base;
  const dirs = [dir, path.join(dir, base), path.join(dir, title)];

  for (const searchDir of dirs) {
    if (!fs.existsSync(searchDir)) continue;
    for (const entry of fs.readdirSync(searchDir)) {
      const candidate = path.join(searchDir, entry);
      if (
        fs.statSync(candidate).isFile() &&
        IMAGE_EXTENSIONS.has(path.extname(entry)) &&
        !isLfsPointer(candidate)
      ) {
        return true;
      }
    }
  }

  return false;
}

function translateTitleToEnglish(title) {
  let english = title;
  const sorted = [...TERM_GLOSSARY].sort((a, b) => b[0].length - a[0].length);
  for (const [zh, en] of sorted) {
    english = english.split(zh).join(` ${en} `);
  }
  return english.replace(/\s+/g, ' ').trim();
}

function buildSearchQueries(title, category) {
  const translated = translateTitleToEnglish(title);
  const categoryHint = CATEGORY_HINTS[category] || 'chinese food';

  const queries = [
    ENGLISH_HINTS[title],
    translated,
    `${translated} chinese`,
    `${translated} food`,
    title,
    `${title} 美食`,
    categoryHint,
    `${title} ${categoryHint}`,
  ].filter(Boolean);

  return [...new Set(queries)];
}

async function searchOpenverse(query) {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('license', 'cc0,by,by-sa');
  url.searchParams.set('per_page', '8');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'HowToCook-Site/1.0 (educational cookbook project)' },
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.results?.find((item) => item.url) || null;
}

async function searchWikimedia(query) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('generator', 'search');
  api.searchParams.set('gsrsearch', `filetype:bitmap ${query}`);
  api.searchParams.set('gsrlimit', '8');
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|extmetadata');
  api.searchParams.set('iiurlwidth', '1200');

  const response = await fetch(api, {
    headers: { 'User-Agent': 'HowToCook-Site/1.0 (educational cookbook project)' },
  });
  if (!response.ok) return null;

  const data = await response.json();
  const pages = data.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url || info.url.endsWith('.svg')) continue;

    const license = info.extmetadata?.LicenseShortName?.value || '';
    if (license && !/cc|public domain|pd/i.test(license)) continue;

    return {
      url: info.url,
      foreign_landing_url: info.descriptionurl,
      creator: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') || 'Wikimedia Commons',
      license: license || 'CC',
      license_url: info.extmetadata?.LicenseUrl?.value || 'https://commons.wikimedia.org/',
      source: 'wikimedia',
    };
  }

  return null;
}

function parseTitle(raw) {
  const match = raw.match(/^#\s+(.+?)的做法\s*$/m);
  return match ? match[1].trim() : '';
}

async function searchImage(title, category) {
  const queries = buildSearchQueries(title, category);

  for (const query of queries) {
    const hit = await searchOpenverse(query);
    if (hit) return hit;
    await sleep(250);
  }

  for (const query of queries.slice(0, 4)) {
    const hit = await searchWikimedia(query);
    if (hit) return hit;
    await sleep(250);
  }

  return null;
}

async function downloadImage(imageUrl, destPath) {
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'HowToCook-Site/1.0 (educational cookbook project)' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  let ext = '.jpg';
  if (contentType.includes('png')) ext = '.png';
  else if (contentType.includes('webp')) ext = '.webp';

  const finalPath = destPath.replace(/\.(jpg|jpeg|png|webp)$/i, '') + ext;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 5000) throw new Error('Image too small');

  fs.writeFileSync(finalPath, buffer);
  return finalPath;
}

function insertImageIntoMarkdown(filePath, title, imageFileName) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.includes(`![${title}](`)) return;

  const lines = raw.split('\n');
  const imageLine = `![${title}](./${imageFileName})`;
  const insertAt = lines.findIndex((line) => line.startsWith('# ')) + 1;

  lines.splice(insertAt, 0, '', imageLine);
  fs.writeFileSync(filePath, lines.join('\n'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Infinity;
  return { limit: Number.isFinite(limit) ? limit : Infinity };
}

async function main() {
  const { limit } = parseArgs();
  const files = walkMarkdownFiles(DISHES_DIR);
  const missing = files.filter((file) => !recipeHasOwnImage(file)).slice(0, limit);

  let attributions = [];
  if (fs.existsSync(ATTRIBUTION_FILE)) {
    attributions = JSON.parse(fs.readFileSync(ATTRIBUTION_FILE, 'utf8'));
  }

  const results = { success: 0, failed: 0, skipped: 0, failures: [] };

  console.log(`Found ${missing.length} recipes without images${limit < Infinity ? ` (limit ${limit})` : ''}`);

  for (const [index, filePath] of missing.entries()) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const title = parseTitle(raw);
    const category = filePath.split(path.sep)[1];
    const dir = path.dirname(filePath);

    if (!title) {
      results.skipped += 1;
      console.log(`[${index + 1}/${missing.length}] (no title) ... skipped`);
      continue;
    }

    process.stdout.write(`[${index + 1}/${missing.length}] ${title} ... `);

    try {
      const image = await searchImage(title, category);
      if (!image?.url) {
        results.failed += 1;
        results.failures.push({ title, reason: 'no search result' });
        console.log('no result');
        await sleep(1200);
        continue;
      }

      const destBase = path.join(dir, `${title}.jpg`);
      const savedPath = await downloadImage(image.url, destBase);
      const imageFileName = path.basename(savedPath);
      insertImageIntoMarkdown(filePath, title, imageFileName);

      attributions.push({
        recipe: title,
        file: path.relative(ROOT_DIR, savedPath),
        source: image.foreign_landing_url || image.url,
        creator: image.creator || 'unknown',
        license: image.license || 'unknown',
        license_url: image.license_url || '',
      });

      results.success += 1;
      console.log('ok');
    } catch (error) {
      results.failed += 1;
      results.failures.push({ title, reason: String(error.message || error) });
      console.log(`failed (${error.message || error})`);
    }

    await sleep(1200);
  }

  fs.mkdirSync(path.dirname(ATTRIBUTION_FILE), { recursive: true });
  fs.writeFileSync(ATTRIBUTION_FILE, JSON.stringify(attributions, null, 2));

  console.log('\nDone:', results);
  if (results.failures.length) {
    console.log('Failures:', results.failures.slice(0, 20));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
