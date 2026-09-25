import { defineConfig, type Plugin } from 'vitest/config';
import preact from '@preact/preset-vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

// GitHub Pages serves this as a project site, so every URL lives under /<repo>/, not /.
const base = process.env.BASE_PATH ?? '/spacewatch-web/';
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * Emits sw.js with the exact list of built files to precache. Hand-rolled instead of a PWA
 * plugin: it's one hook, and it keeps launch data out of the service worker entirely (the app
 * owns caching/staleness of API data, the SW only ever caches the app shell).
 */
function serviceWorker(): Plugin {
  return {
    name: 'spacewatch-sw',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const publicFiles = listFiles('public')
        .map((p) => relative('public', p).replaceAll('\\', '/'))
        .filter((p) => p !== 'og-image.png' && p !== 'robots.txt');
      const files = [...new Set(['./', 'index.html', ...Object.keys(bundle), ...publicFiles])].sort();
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync('src/sw-template.js', 'utf8')
        .replace('__PRECACHE__', JSON.stringify(files))
        .replace('__VERSION__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base,
  plugins: [preact(), serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
});
