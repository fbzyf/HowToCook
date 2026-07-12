function normalizeBase(base: string): string {
  if (!base || base === '/') return '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function withBase(path: string): string {
  const base = normalizeBase(import.meta.env.BASE_URL);
  const clean = path.replace(/^\//, '');
  return clean ? `${base}${clean}` : base;
}

export function withBasePath(path: string): string {
  const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
