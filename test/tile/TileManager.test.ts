import { Tile } from '../../src/tile';
import { TileManager } from '../../src/tile/TileManager';
import { Cache } from '../../src/tile/cache/Cache';
import { TileLoader } from '../../src/tile/fetcher/TileLoader';
import type { TileCoordinates, Pixel } from '../../src/types';

// Mock dependencies
jest.mock('../../src/tile/cache/Cache');
jest.mock('../../src/tile/fetcher/TileLoader');

// Mock the dynamic imports for browser and Node.js tile fetchers
jest.mock('../../src/tile/fetcher/browser/BrowserTileFetcher', () => ({
    BrowserTileFetcher: jest.fn().mockImplementation(() => ({
        fetchTile: jest.fn(),
    })),
}));

jest.mock('../../src/tile/fetcher/nodejs/NodeJsTileFetcher', () => ({
    NodeJsTileFetcher: jest.fn().mockImplementation(() => ({
        fetchTile: jest.fn(),
    })),
}));

const MockedCache = Cache as jest.MockedClass<typeof Cache>;
const MockedTileLoader = TileLoader as jest.MockedClass<typeof TileLoader>;

describe('TileManager', () => {
    let mockLoadTile: jest.MockedFunction<(tileCoords: TileCoordinates) => Promise<Tile>>;
    let mockCacheGet: jest.MockedFunction<(k: TileCoordinates) => Promise<Tile>>;
    let mockTile: Tile;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock ImageData with known elevation values
        const data = new Uint8ClampedArray(256 * 256 * 4);
        // Fill with sea level (128, 0, 0) for simplicity
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 128; // Red - sea level
            data[i + 1] = 0; // Green
            data[i + 2] = 0; // Blue
            data[i + 3] = 255; // Alpha
        }

        const mockImageData = new ImageData(data, 256, 256);

        // Create proper Tile interface implementation
        mockTile = {
            close: jest.fn(),
            getRGBFromImageData: jest.fn((position: Pixel) => {
                const x = Math.floor(position.x);
                const y = Math.floor(position.y);
                const index = (y * 256 + x) * 4;

                return {
                    red: mockImageData.data[index],
                    green: mockImageData.data[index + 1],
                    blue: mockImageData.data[index + 2],
                };
            }),
        } as jest.Mocked<Tile>;

        mockLoadTile = jest.fn().mockResolvedValue(mockTile);
        MockedTileLoader.prototype.loadTile = mockLoadTile;

        mockCacheGet = jest.fn().mockResolvedValue(mockTile);
        MockedCache.prototype.get = mockCacheGet;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (MockedCache.prototype as any).has = jest.fn().mockReturnValue(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (MockedCache.prototype as any).getKeys = jest.fn().mockReturnValue([]);
    });

    describe('constructor', () => {
        it('should create TileManager with provided parameters', () => {
            const tileUrlTemplate = 'https://example.com/{z}/{x}/{y}.png';
            const cacheSize = 50;

            const manager = new TileManager(tileUrlTemplate, cacheSize);

            expect(manager).toBeDefined();
            // Cache is lazily initialized, so constructor doesn't create dependencies yet
        });

        it('should initialize cache lazily when getTile is called', async () => {
            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 100);
            const tileCoords: TileCoordinates = { z: 12, x: 100, y: 200 };

            await manager.getTile(tileCoords);

            // Verify that cache was created with correct parameters
            expect(MockedCache).toHaveBeenCalledWith(
                100,
                expect.any(Function), // keyMapper function
                expect.any(Function), // valueBuilder function
                expect.any(Function) // cleanup function
            );
            expect(MockedTileLoader).toHaveBeenCalledWith(
                'https://test.com/{z}/{x}/{y}.png',
                expect.any(Object) // TileFetcher instance
            );
        });

        it('should create cache with correct key mapping function', async () => {
            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
            const tileCoords: TileCoordinates = { z: 12, x: 100, y: 200 };

            await manager.getTile(tileCoords);

            // Get the key mapper function that was passed to Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const keyMapperFunction = cacheConstructorCall[1];

            // Test the key mapping function
            const key = keyMapperFunction(tileCoords);
            expect(key).toBe('12/100/200');
        });

        it('should create cache with correct value builder function', async () => {
            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
            const tileCoords: TileCoordinates = { z: 12, x: 100, y: 200 };

            await manager.getTile(tileCoords);

            // Get the value builder function that was passed to Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const valueBuilderFunction = cacheConstructorCall[2];

            await valueBuilderFunction(tileCoords);

            expect(mockLoadTile).toHaveBeenCalledWith(tileCoords);
        });

        it('should create cache with cleanup function that closes tiles', async () => {
            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
            const tileCoords: TileCoordinates = { z: 12, x: 100, y: 200 };

            await manager.getTile(tileCoords);

            // Get the cleanup function that was passed to Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const cleanupFunction = cacheConstructorCall[3];

            const mockCloseFn = jest.fn();
            const testTile: Tile = {
                close: mockCloseFn,
                getRGBFromImageData: jest.fn(),
            };

            cleanupFunction(testTile);

            expect(mockCloseFn).toHaveBeenCalled();
        });
    });

    describe('getTile', () => {
        let manager: TileManager;

        beforeEach(() => {
            manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
        });

        it('should delegate to cache.get', async () => {
            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            const result = await manager.getTile(tileCoords);

            expect(mockCacheGet).toHaveBeenCalledWith(tileCoords);
            expect(result).toBe(mockTile);
        });

        it('should handle different tile coordinates', async () => {
            const testCases = [
                { z: 0, x: 0, y: 0 },
                { z: 15, x: 32767, y: 32767 },
                { z: 8, x: 128, y: 96 },
            ];

            for (const tileCoords of testCases) {
                await manager.getTile(tileCoords);
                expect(mockCacheGet).toHaveBeenCalledWith(tileCoords);
            }
        });

        it('should propagate cache errors', async () => {
            const error = new Error('Cache error');
            mockCacheGet.mockRejectedValueOnce(error);

            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await expect(manager.getTile(tileCoords)).rejects.toThrow('Cache error');
        });

        it('should handle network errors from TileLoader', async () => {
            // Simulate cache miss triggering value builder (TileLoader.loadTile)
            mockLoadTile.mockRejectedValueOnce(new Error('Network timeout'));
            mockCacheGet.mockRejectedValueOnce(new Error('Network timeout'));

            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await expect(manager.getTile(tileCoords)).rejects.toThrow('Network timeout');
        });

        it('should reuse cache instance on subsequent calls', async () => {
            const tileCoords1: TileCoordinates = { z: 10, x: 50, y: 75 };
            const tileCoords2: TileCoordinates = { z: 10, x: 51, y: 75 };

            await manager.getTile(tileCoords1);
            await manager.getTile(tileCoords2);

            // Cache should only be created once
            expect(MockedCache).toHaveBeenCalledTimes(1);
            expect(mockCacheGet).toHaveBeenCalledTimes(2);
        });
    });

    describe('integration scenarios', () => {
        let manager: TileManager;

        beforeEach(() => {
            manager = new TileManager('https://tiles.example.com/{z}/{x}/{y}.png', 5);
        });

        it('should handle concurrent tile requests', async () => {
            const tileCoords1: TileCoordinates = { z: 12, x: 100, y: 200 };
            const tileCoords2: TileCoordinates = { z: 12, x: 101, y: 200 };
            const tileCoords3: TileCoordinates = { z: 12, x: 100, y: 201 };

            // Create different mock tiles for each request
            const mockTile1 = { ...mockTile, close: jest.fn() };
            const mockTile2 = { ...mockTile, close: jest.fn() };
            const mockTile3 = { ...mockTile, close: jest.fn() };

            // Simulate different tiles returned for different coordinates
            mockCacheGet
                .mockResolvedValueOnce(mockTile1)
                .mockResolvedValueOnce(mockTile2)
                .mockResolvedValueOnce(mockTile3);

            const promises = [
                manager.getTile(tileCoords1),
                manager.getTile(tileCoords2),
                manager.getTile(tileCoords3),
            ];

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            expect(mockCacheGet).toHaveBeenCalledTimes(3);
            expect(mockCacheGet).toHaveBeenCalledWith(tileCoords1);
            expect(mockCacheGet).toHaveBeenCalledWith(tileCoords2);
            expect(mockCacheGet).toHaveBeenCalledWith(tileCoords3);
        });

        it('should handle different cache sizes', async () => {
            const manager1 = new TileManager('https://server1.com/{z}/{x}/{y}.png', 10);
            const manager2 = new TileManager('https://server2.com/{z}/{x}/{y}.png', 20);

            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            // Trigger cache initialization for both managers
            await manager1.getTile(tileCoords);
            await manager2.getTile(tileCoords);

            // Verify both caches were created with correct sizes
            const cacheCalls = (MockedCache as unknown as jest.Mock).mock.calls;
            expect(cacheCalls.some(call => call[0] === 10)).toBe(true);
            expect(cacheCalls.some(call => call[0] === 20)).toBe(true);
        });

        it('should properly initialize dependencies when getTile is called', async () => {
            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 100);
            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await manager.getTile(tileCoords);

            expect(MockedCache).toHaveBeenCalledWith(
                100,
                expect.any(Function),
                expect.any(Function),
                expect.any(Function)
            );
            expect(MockedTileLoader).toHaveBeenCalledWith(
                'https://test.com/{z}/{x}/{y}.png',
                expect.any(Object)
            );
        });
    });

    describe('error handling', () => {
        it('should handle Cache initialization errors during getTile', async () => {
            MockedCache.mockImplementationOnce(() => {
                throw new Error('Cache initialization failed');
            });

            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await expect(manager.getTile(tileCoords)).rejects.toThrow(
                'Cache initialization failed'
            );
        });

        it('should handle TileLoader initialization errors during getTile', async () => {
            MockedTileLoader.mockImplementationOnce(() => {
                throw new Error('TileLoader initialization failed');
            });

            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await expect(manager.getTile(tileCoords)).rejects.toThrow(
                'TileLoader initialization failed'
            );
        });
    });

    describe('memory management', () => {
        it('should call tile.close() in cleanup function', async () => {
            const manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 10);
            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await manager.getTile(tileCoords);

            // Extract the cleanup function from the Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const cleanupFunction = cacheConstructorCall[3];

            const mockClose1 = jest.fn();
            const mockClose2 = jest.fn();

            const tile1: Tile = {
                close: mockClose1,
                getRGBFromImageData: jest.fn(),
            };

            const tile2: Tile = {
                close: mockClose2,
                getRGBFromImageData: jest.fn(),
            };

            cleanupFunction(tile1);
            cleanupFunction(tile2);

            expect(mockClose1).toHaveBeenCalledTimes(1);
            expect(mockClose2).toHaveBeenCalledTimes(1);
        });
    });
});
