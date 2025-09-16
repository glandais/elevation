import { TileManager } from '../../src/tile/TileManager';
import TileFetcher from '../../src/tile/fetcher';
import { Cache } from '../../src/tile/cache/Cache';
import type { TileCoordinates, Tile } from '../../src/types';

// Mock dependencies
jest.mock('../../src/tile/fetcher');
jest.mock('../../src/tile/cache/Cache');

const MockedTileFetcher = TileFetcher as jest.MockedClass<typeof TileFetcher>;
const MockedCache = Cache as jest.MockedClass<typeof Cache>;

describe('TileManager', () => {
    let mockFetchTile: jest.MockedFunction<(tileCoords: TileCoordinates) => Promise<Tile>>;
    let mockCacheGet: jest.MockedFunction<(k: TileCoordinates) => Promise<Tile>>;
    let mockCacheClear: jest.MockedFunction<() => void>;
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

        const mockImageBitmap = {
            close: jest.fn(),
            width: 256,
            height: 256,
        } as unknown as ImageBitmap;

        mockTile = {
            data: mockImageData,
            bitmap: mockImageBitmap,
        };

        mockFetchTile = jest.fn().mockResolvedValue(mockTile) as jest.MockedFunction<
            (tileCoords: TileCoordinates) => Promise<Tile>
        >;
        MockedTileFetcher.prototype.loadTile = mockFetchTile;

        mockCacheGet = jest.fn().mockResolvedValue(mockTile) as jest.MockedFunction<
            (k: TileCoordinates) => Promise<Tile>
        >;
        mockCacheClear = jest.fn();

        MockedCache.prototype.get = mockCacheGet;
        MockedCache.prototype.clear = mockCacheClear;
        MockedCache.prototype.has = jest.fn().mockReturnValue(false);
        MockedCache.prototype.getKeys = jest.fn().mockReturnValue([]);
        MockedCache.prototype.getLRUKeys = jest.fn().mockReturnValue([]);
    });

    describe('constructor', () => {
        it('should create TileManager with provided parameters', () => {
            const tileUrlTemplate = 'https://example.com/{z}/{x}/{y}.png';
            const timeout = 3000;
            const cacheSize = 50;

            const manager = new TileManager(tileUrlTemplate, timeout, cacheSize);

            expect(manager).toBeDefined();
            expect(MockedTileFetcher).toHaveBeenCalledWith(tileUrlTemplate, timeout);
            expect(MockedCache).toHaveBeenCalledWith(
                cacheSize,
                expect.any(Function), // keyMapper function
                expect.any(Function), // valueBuilder function
                expect.any(Function) // cleanup function
            );
        });

        it('should create cache with correct key mapping function', () => {
            new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);

            // Get the key mapper function that was passed to Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const keyMapperFunction = cacheConstructorCall[1];

            // Test the key mapping function
            const tileCoords: TileCoordinates = { z: 12, x: 100, y: 200 };
            const key = keyMapperFunction(tileCoords);

            expect(key).toBe('12/100/200');
        });

        it('should create cache with correct value builder function', async () => {
            new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);

            // Get the value builder function that was passed to Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const valueBuilderFunction = cacheConstructorCall[2];

            const tileCoords: TileCoordinates = { z: 12, x: 100, y: 200 };
            await valueBuilderFunction(tileCoords);

            expect(mockFetchTile).toHaveBeenCalledWith(tileCoords);
        });

        it('should create cache with cleanup function that closes ImageBitmap', () => {
            new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);

            // Get the cleanup function that was passed to Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const cleanupFunction = cacheConstructorCall[3];

            const mockCloseFn = jest.fn();
            const testTile: Tile = {
                data: mockTile.data,
                bitmap: { close: mockCloseFn } as unknown as ImageBitmap,
            };

            cleanupFunction(testTile);

            expect(mockCloseFn).toHaveBeenCalled();
        });
    });

    describe('getTile', () => {
        let manager: TileManager;

        beforeEach(() => {
            manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);
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

        it('should handle network errors from TileFetcher', async () => {
            // Simulate cache miss triggering value builder (TileFetcher.loadTile)
            mockFetchTile.mockRejectedValueOnce(new Error('Network timeout'));
            mockCacheGet.mockRejectedValueOnce(new Error('Network timeout'));

            const tileCoords: TileCoordinates = { z: 10, x: 50, y: 75 };

            await expect(manager.getTile(tileCoords)).rejects.toThrow('Network timeout');
        });
    });

    describe('clearCache', () => {
        let manager: TileManager;

        beforeEach(() => {
            manager = new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);
        });

        it('should delegate to cache.clear', () => {
            manager.clearCache();

            expect(mockCacheClear).toHaveBeenCalled();
        });

        it('should be callable multiple times', () => {
            manager.clearCache();
            manager.clearCache();
            manager.clearCache();

            expect(mockCacheClear).toHaveBeenCalledTimes(3);
        });
    });

    describe('integration scenarios', () => {
        let manager: TileManager;

        beforeEach(() => {
            manager = new TileManager('https://tiles.example.com/{z}/{x}/{y}.png', 2000, 5);
        });

        it('should handle concurrent tile requests', async () => {
            const tileCoords1: TileCoordinates = { z: 12, x: 100, y: 200 };
            const tileCoords2: TileCoordinates = { z: 12, x: 101, y: 200 };
            const tileCoords3: TileCoordinates = { z: 12, x: 100, y: 201 };

            // Simulate different tiles returned for different coordinates
            mockCacheGet
                .mockResolvedValueOnce(mockTile)
                .mockResolvedValueOnce({ ...mockTile })
                .mockResolvedValueOnce({ ...mockTile });

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

        it('should handle cache operations with different tile URL templates', () => {
            new TileManager('https://server1.com/{z}/{x}/{y}.png', 5000, 10);
            new TileManager('https://server2.com/{z}/{x}/{y}.png', 3000, 20);

            expect(MockedTileFetcher).toHaveBeenCalledWith(
                'https://server1.com/{z}/{x}/{y}.png',
                5000
            );
            expect(MockedTileFetcher).toHaveBeenCalledWith(
                'https://server2.com/{z}/{x}/{y}.png',
                3000
            );
            expect(MockedCache).toHaveBeenCalledTimes(3); // Including the previous test setups
        });

        it('should properly initialize all dependencies', () => {
            new TileManager('https://test.com/{z}/{x}/{y}.png', 1000, 100);

            expect(MockedTileFetcher).toHaveBeenCalledWith(
                'https://test.com/{z}/{x}/{y}.png',
                1000
            );
            expect(MockedCache).toHaveBeenCalledWith(
                100,
                expect.any(Function),
                expect.any(Function),
                expect.any(Function)
            );
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            // This will be used for error handling tests
        });

        it('should handle TileFetcher initialization errors', () => {
            MockedTileFetcher.mockImplementationOnce(() => {
                throw new Error('TileFetcher initialization failed');
            });

            expect(() => {
                new TileManager('invalid-url', 5000, 10);
            }).toThrow('TileFetcher initialization failed');
        });

        it('should handle Cache initialization errors', () => {
            MockedCache.mockImplementationOnce(() => {
                throw new Error('Cache initialization failed');
            });

            expect(() => {
                new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);
            }).toThrow('Cache initialization failed');
        });
    });

    describe('memory management', () => {
        it('should call ImageBitmap.close() in cleanup function', () => {
            new TileManager('https://test.com/{z}/{x}/{y}.png', 5000, 10);

            // Extract the cleanup function from the Cache constructor
            const cacheConstructorCall = (MockedCache as unknown as jest.Mock).mock.calls[0];
            const cleanupFunction = cacheConstructorCall[3];

            const mockClose1 = jest.fn();
            const mockClose2 = jest.fn();

            const tile1: Tile = {
                data: mockTile.data,
                bitmap: { close: mockClose1 } as unknown as ImageBitmap,
            };

            const tile2: Tile = {
                data: mockTile.data,
                bitmap: { close: mockClose2 } as unknown as ImageBitmap,
            };

            cleanupFunction(tile1);
            cleanupFunction(tile2);

            expect(mockClose1).toHaveBeenCalledTimes(1);
            expect(mockClose2).toHaveBeenCalledTimes(1);
        });
    });
});
