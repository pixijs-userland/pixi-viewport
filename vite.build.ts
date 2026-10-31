// vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const globals = {
    'pixi.js': 'PIXI',
};

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'pixi_viewport',
            fileName: 'pixi_viewport',
        },
        rollupOptions: {
            external: Object.keys(globals),
            output: {
                globals,
            },
        },
    },
    plugins: [dts({ copyDtsFiles: true })],
});
