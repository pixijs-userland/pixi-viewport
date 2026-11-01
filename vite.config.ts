import { resolve } from 'path';
import { defineConfig } from 'vite';

// Builds the demo site in docs/ (the playground plus the example pages) into docs/dist. The demo imports
// 'pixi-viewport' like an app would; the alias points it at the library source.
export default defineConfig({
    base: './',
    root: 'docs/',
    resolve: {
        alias: {
            'pixi-viewport': resolve(import.meta.dirname, 'src/index.ts'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000,
        rolldownOptions: {
            input: {
                playground: resolve(import.meta.dirname, 'docs/index.html'),
                scrollingPage: resolve(import.meta.dirname, 'docs/examples/scrolling-page.html'),
                overlays: resolve(import.meta.dirname, 'docs/examples/overlays.html'),
            },
        },
    },
});
