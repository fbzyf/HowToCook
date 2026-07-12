// @ts-check
import { defineConfig } from 'astro/config';

const base = process.env.BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://fbzyf.github.io',
  base,
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
