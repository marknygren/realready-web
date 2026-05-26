import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://realready.app',
  integrations: [
    sitemap({
      // We don't list every URL when the site is noindex anyway, but having
      // this wired up means the sitemap exists at /sitemap-index.xml the
      // moment we flip indexing on. Exclude legal pages from the sitemap
      // (they don't need to rank).
      filter: (page) =>
        !page.includes('/privacy/') &&
        !page.includes('/terms/') &&
        !page.includes('/404'),
    }),
  ],
});
