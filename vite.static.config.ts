import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
// A portable client-only build for GitHub Pages and other static hosts.
export default defineConfig({
    root: fileURLToPath(new URL('./static', import.meta.url)),
    publicDir: fileURLToPath(new URL('./public', import.meta.url)),
    base: './',
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
    build: { outDir: fileURLToPath(new URL('./out', import.meta.url)), emptyOutDir: true },
});
