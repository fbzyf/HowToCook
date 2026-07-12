// @ts-check
import { defineConfig } from 'astro/config';

const rawBase = process.env.BASE_PATH || '/';
const base = rawBase === '/' ? '/' : rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://fbzyf.github.io',
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
});
