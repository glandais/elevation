import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    // By default, 'npm run build' runs in production mode
    // To build with logging enabled, use: 'npm run build -- --mode development'
    const isDev = mode === 'development';
    const isNode = process.env.BUILD_TARGET === 'node';

    // Common configuration
    const baseConfig = {
        define: {
            // Define __DEV__ based on build mode
            // Production build (default): __DEV__ = false, all logging code removed
            // Development build: __DEV__ = true, logging enabled
            __DEV__: JSON.stringify(isDev),
            __NODE__: JSON.stringify(isNode),
        },
        build: {
            sourcemap: true,
        },
    };

    if (isNode) {
        // Node.js specific build configuration
        return {
            ...baseConfig,
            build: {
                ...baseConfig.build,
                outDir: 'dist/node',
                emptyOutDir: false,
                lib: {
                    entry: resolve(__dirname, 'src/index.ts'),
                    formats: ['es', 'cjs'],
                    fileName: format => {
                        return format === 'es' ? 'index.node.mjs' : 'index.node.js';
                    },
                },
                rolldownOptions: {
                    external: ['canvas', 'node-fetch', 'abort-controller'],
                    output: {
                        exports: 'named',
                        codeSplitting: false,
                    },
                },
            },
        };
    } else {
        // Browser build configuration
        const isBrowserBuild = process.env.BUILD_TARGET === 'browser';
        return {
            ...baseConfig,
            build: {
                ...baseConfig.build,
                outDir: isBrowserBuild ? 'dist/browser' : 'dist',
                emptyOutDir: true,
                lib: {
                    entry: resolve(__dirname, 'src/index.ts'),
                    name: 'Elevation',
                    formats: ['es', 'umd', 'iife'],
                    fileName: format => {
                        switch (format) {
                            case 'es':
                                return isBrowserBuild ? 'index.esm.js' : 'index.esm.js';
                            case 'umd':
                                return 'index.umd.js';
                            case 'iife':
                                return 'index.min.js';
                            default:
                                return `index.${format}.js`;
                        }
                    },
                },
                rolldownOptions: {
                    external: ['canvas', 'node-fetch', 'abort-controller'],
                    output: {
                        exports: 'named',
                        codeSplitting: false,
                        globals: {
                            canvas: 'canvas',
                            'node-fetch': 'fetch',
                            'abort-controller': 'AbortController',
                        },
                    },
                },
            },
        };
    }
});
