function normalizeBase(base: string): string {
  if (!base || base === '/') return '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function hasFileExtension(path: string): boolean {
  const lastSegment = path.split('/').pop() || '';
  return /\.[a-zA-Z0-9]+$/.test(lastSegment);
}

export function withBase(path: string): string {
  const base = normalizeBase(import.meta.env.BASE_URL);
  const clean = path.replace(/^\//, '');
  let url = clean ? `${base}${clean}` : base;

  if (clean && !hasFileExtension(clean) && !url.endsWith('/')) {
    url = `${url}/`;
  }

  return url;
}

export function withBasePath(path: string): string {
  const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
