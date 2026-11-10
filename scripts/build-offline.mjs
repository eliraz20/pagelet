import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after build:static. Bundle only tags from the original shell so strings
// inside the editor's renderer are never mistaken for build asset tags.
const root = fileURLToPath(new URL('../out/', import.meta.url));
let html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
const js = [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)];
if (js.length !== 1 || css.length !== 1) throw new Error('Expected one self-contained JavaScript bundle and stylesheet.');
for (const [tag, src] of css) {
    const content = await readFile(path.resolve(root, src), 'utf8');
    html = html.replace(tag, () => `<style>${content}</style>`);
}
for (const [tag, src] of js) {
    const content = await readFile(path.resolve(root, src), 'utf8');
    html = html.replace(tag, () => `<script type="module">${content.replace(/<\/script/gi, '<\\/script')}</script>`);
}
html = html.replace(/<link rel="icon"[^>]*>/g, '');
await writeFile(path.join(root, 'pagelet-offline.html'), html);
console.log('Offline studio: out/pagelet-offline.html');
