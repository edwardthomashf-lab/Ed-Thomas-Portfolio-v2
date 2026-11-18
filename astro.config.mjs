// @ts-check
import { defineConfig } from 'astro/config';

// A single static page. Netlify serves `dist/` as-is.
export default defineConfig({
  site: 'https://edwardthomas.dev',
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
