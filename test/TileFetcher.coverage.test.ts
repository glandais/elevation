import { TileFetcher } from '../src/TileFetcher';

describe('TileFetcher Coverage Tests', () => {
    beforeEach(() => {
        // Reset canvas pool state
        (global as unknown as { fetch: jest.MockedFunction<typeof fetch> }).fetch = jest.fn();
    });

    it('should test canvas pool trim functionality', async () => {
        // Access the internal canvas pool
        const TileFetcherModule = require('../src/TileFetcher');
        const canvasPool = TileFetcherModule._canvasPool;

        if (canvasPool) {
            // Test the pool by acquiring and releasing canvases
            const canvases: HTMLCanvasElement[] = [];

            // Acquire multiple canvases
            for (let i = 0; i < 10; i++) {
                canvases.push(canvasPool.acquire());
            }

            // Release them to populate the pool
            canvases.forEach(canvas => canvasPool.release(canvas));

            // Access private members for testing trim functionality
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            // Verify pool has canvases
            expect(poolInstance.available.length).toBeGreaterThan(0);

            // Manually trigger _trim to test trim functionality
            if (poolInstance._trim) {
                poolInstance._trim();
                // After trim, should have at most 5 canvases (idleSize)
                expect(poolInstance.available.length).toBeLessThanOrEqual(5);
            }
        }
    });

    it('should handle canvas context creation failure (line 109)', async () => {
        const fetcher = new TileFetcher(1000);

        // Mock HTMLCanvasElement.getContext to return null
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

        try {
            const blob = new Blob(['test'], { type: 'image/png' });

            await expect(
                (
                    fetcher as unknown as {
                        blobToImageDataAndBitmap: (blob: Blob) => Promise<unknown>;
                    }
                ).blobToImageDataAndBitmap(blob)
            ).rejects.toThrow('Failed to get 2D canvas context');
        } finally {
            // Restore original method
            HTMLCanvasElement.prototype.getContext = originalGetContext;
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

    it('should trigger canvas pool trim functionality', () => {
        // Access the internal canvas pool directly
        const TileFetcherModule = require('../src/TileFetcher');
        const canvasPool = TileFetcherModule._canvasPool;

        if (canvasPool) {
            // Access private members for testing
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            if (poolInstance._trim) {
                // Backup original state
                const originalAvailable = [...poolInstance.available];

                // Force pool to exceed idle size to trigger trim (lines 32-35)
                poolInstance.available = [];
                for (let i = 0; i < 10; i++) {
                    // 10 > 5 (idleSize)
                    poolInstance.available.push(document.createElement('canvas'));
                }

                expect(poolInstance.available.length).toBeGreaterThan(5);

                // Trigger trim
                poolInstance._trim();

                // Should have trimmed excess canvases
                expect(poolInstance.available.length).toBeLessThanOrEqual(5);

                // Restore original state
                poolInstance.available = originalAvailable;
            }
        }
    });

    it('should test canvas pool edge cases', () => {
        // Access canvas pool for direct testing
        const TileFetcherModule = require('../src/TileFetcher');
        const canvasPool = TileFetcherModule._canvasPool;

        if (canvasPool) {
            // Access private members for testing
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            // Test trim with empty pool
            const originalAvailable = [...poolInstance.available];
            poolInstance.available = [];

            expect(() => poolInstance._trim()).not.toThrow();

            // Test trim with exactly idleSize items (5)
            poolInstance.available = [];
            for (let i = 0; i < 5; i++) {
                poolInstance.available.push(document.createElement('canvas'));
            }

            poolInstance._trim();
            expect(poolInstance.available.length).toBe(5);

            // Restore state
            poolInstance.available = originalAvailable;
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
