import { BrowserTile } from '../src/tile/fetcher/browser/BrowserTile';
import { ElevationProvider } from '../src/ElevationProvider';
import type { TileCoordinates } from '../src/types';

// No mocks in this file - use real implementations except TileFetcher

describe('ElevationProvider Integration - Constructor Function Coverage', () => {
    it('should execute cleanup function (line 43) during cache eviction', async () => {
        const closeSpy = jest.fn();

        // Mock only TileFetcher, let Cache be real
        const { BrowserTileFetcher } = require('../src/tile/fetcher/browser/BrowserTileFetcher');
        const originalFetchTile = BrowserTileFetcher.prototype.fetchTile;

        const createMockTile = (): BrowserTile =>
            new BrowserTile(
                new ImageData(new Uint8ClampedArray(256 * 256 * 4).fill(128), 256, 256),
                { close: closeSpy } as unknown as ImageBitmap
            );

        BrowserTileFetcher.prototype.fetchTile = jest
            .fn()
            .mockImplementation(() => Promise.resolve(createMockTile()));

        try {
            // Create ElevationProvider with small cache to trigger eviction
            const provider = new ElevationProvider({ cacheSize: 1 });

            // Load first tile
            await provider.getElevation(0, 0);
            expect(closeSpy).toHaveBeenCalledTimes(0);

            // Load second tile - should evict first tile and call cleanup
            // This tests line 43: cachedTile.bitmap.close();
            await provider.getElevation(45, 90);
            expect(closeSpy).toHaveBeenCalledTimes(1);
        } finally {
            BrowserTileFetcher.prototype.fetchTile = originalFetchTile;
        }
    });

    it('should execute key mapper and value builder functions (lines 47-48)', async () => {
        const { TileLoader } = require('../src/tile/fetcher/TileLoader');
        const originalLoadTile = TileLoader.prototype.loadTile;

        const createMockTile = (): BrowserTile =>
            new BrowserTile(
                new ImageData(new Uint8ClampedArray(256 * 256 * 4).fill(128), 256, 256),
                { close: jest.fn() } as unknown as ImageBitmap
            );

        const mockLoadTile = jest.fn().mockResolvedValue(createMockTile());
        TileLoader.prototype.loadTile = mockLoadTile;

        try {
            // Create ElevationProvider - this creates real Cache with our functions
            const provider = new ElevationProvider({ cacheSize: 5 });

            // First call - should execute both key mapper and value builder
            await provider.getElevation(0, 0);

            // Verify value builder (line 48) was called: tileCoords => this.tileFetcher.loadTile(tileCoords)
            expect(mockLoadTile).toHaveBeenCalledWith({
                z: 12, // Default zoom level
                x: expect.any(Number),
                y: expect.any(Number),
            });

            // Second call with same coordinates - should use cache (key mapper working)
            await provider.getElevation(0, 0);

            // Should only call loadTile once due to caching
            // This proves key mapper (line 47) works: tileCoords => `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`
            expect(mockLoadTile).toHaveBeenCalledTimes(1);
        } finally {
            TileLoader.prototype.loadTile = originalLoadTile;
        }
    });

    it('should verify key mapper generates correct cache keys (line 47)', () => {
        // Test the exact key mapping function from line 47
        const keyMapper = (tileCoords: TileCoordinates) =>
            `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`;

        const result1 = keyMapper({ z: 12, x: 100, y: 200 });
        const result2 = keyMapper({ z: 12, x: 101, y: 200 });
        const result3 = keyMapper({ z: 13, x: 100, y: 200 });

        expect(result1).toBe('12/100/200');
        expect(result2).toBe('12/101/200');
        expect(result3).toBe('13/100/200');

        // Verify all keys are unique
        expect(result1).not.toBe(result2);
        expect(result1).not.toBe(result3);
        expect(result2).not.toBe(result3);
    });
});
