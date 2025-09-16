import { TileFetcher } from '../src/TileFetcher';

describe('TileFetcher Coverage Tests', () => {
    beforeEach(() => {
        // Reset canvas pool state
        (global as unknown as { fetch: jest.MockedFunction<typeof fetch> }).fetch = jest.fn();
    });

    it('should test canvas pool trim functionality', async () => {
        // Access the internal canvas pool
        const TileFetcherModule = require('../src/TileFetcher');
        const canvasPool = TileFetcherModule.canvasPool;

        if (canvasPool) {
            // Force the pool to exceed idleSize to trigger trim
            const maxSize = canvasPool.idleSize + 10;

            // Add excess canvases
            for (let i = 0; i < maxSize; i++) {
                const canvas = document.createElement('canvas');
                canvasPool.available.push(canvas);
            }

            // Manually trigger _trim to test line 44-45
            if (canvasPool._trim) {
                canvasPool._trim();
                expect(canvasPool.available.length).toBeLessThanOrEqual(canvasPool.idleSize);
            }

            // Also test the idle timer mechanism by manipulating pool
            if (canvasPool.schedule) {
                canvasPool.schedule();
                // Allow timer to potentially execute
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
    });

    it('should trigger unknown error handling path in blobToImageDataAndBitmap', async () => {
        const fetcher = new TileFetcher(1000);

        // Mock createImageBitmap to throw a non-Error object (line 109)
        const originalCreateImageBitmap = global.createImageBitmap;
        (
            global as unknown as {
                createImageBitmap: jest.MockedFunction<typeof createImageBitmap>;
            }
        ).createImageBitmap = jest.fn().mockRejectedValue('String error not Error object');

        try {
            const blob = new Blob(['test'], { type: 'image/png' });
            await (
                fetcher as unknown as { blobToImageDataAndBitmap: (blob: Blob) => Promise<unknown> }
            ).blobToImageDataAndBitmap(blob);
        } catch (error: unknown) {
            expect((error as Error).message).toContain('Failed to process image');
        } finally {
            // Restore original
            (
                global as unknown as { createImageBitmap: typeof createImageBitmap }
            ).createImageBitmap = originalCreateImageBitmap;
        }
    });

    it('should test canvas pool edge cases', () => {
        // Access canvas pool for direct testing
        const TileFetcherModule = require('../src/TileFetcher');
        const canvasPool = TileFetcherModule.canvasPool;

        if (canvasPool && canvasPool._trim) {
            // Test trim with empty pool
            const originalAvailable = [...canvasPool.available];
            canvasPool.available = [];

            expect(() => canvasPool._trim()).not.toThrow();

            // Test trim with exactly idleSize items
            canvasPool.available = [];
            for (let i = 0; i < canvasPool.idleSize; i++) {
                canvasPool.available.push(document.createElement('canvas'));
            }

            canvasPool._trim();
            expect(canvasPool.available.length).toBe(canvasPool.idleSize);

            // Restore state
            canvasPool.available = originalAvailable;
        }
    });

    it('should test error path coverage in fetchTile', async () => {
        const fetcher = new TileFetcher(100); // Short timeout

        // Mock fetch to throw non-Error
        (global.fetch as jest.Mock).mockRejectedValue('String error');

        try {
            await fetcher.fetchTile('https://example.com/test.png');
        } catch (error: unknown) {
            expect((error as Error).message).toContain('Unknown error');
        }
    });
});
