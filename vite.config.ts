import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            rollupTypes: false,
            copyDtsFiles: false,
            entryRoot: 'src',
            outDir: 'dist',
            exclude: ['test/**/*', '**/*.test.*'],
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Elevation',
            formats: ['es', 'umd', 'iife'],
            fileName: format => {
                switch (format) {
                    case 'es':
                        return 'index.esm.js';
                    case 'umd':
                        return 'index.umd.js';
                    case 'iife':
                        return 'index.min.js';
                    default:
                        return `index.${format}.js`;
                }
            },
        },
        sourcemap: true,
    },
});
