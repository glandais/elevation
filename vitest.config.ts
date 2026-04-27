import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        __DEV__: 'true',
        __NODE__: 'false',
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts'],
        include: ['test/**/*.test.ts', '**/__tests__/**/*.test.ts'],
        exclude: ['node_modules', 'dist', 'test/browser/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: 'coverage',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/utils/Logger.ts'],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
    },
});
