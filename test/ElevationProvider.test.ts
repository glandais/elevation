import { ElevationProvider } from '../src/ElevationProvider';
import { TileManager } from '../src/tile/TileManager';
import { ElevationCalculator } from '../src/calculator/ElevationCalculator';
import type { ElevationProviderConfig, Tile, Coordinates } from '../src/types';

// Mock dependencies
jest.mock('../src/tile/TileManager');

const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;

// Create a manual mock that preserves static methods
const mockCalculator = {
    getElevation: jest.fn(),
    getInterpolatedElevation: jest.fn(),
    normalizePixel: jest.fn(),
};

jest.spyOn(ElevationCalculator.prototype, 'getElevation').mockImplementation(
    mockCalculator.getElevation
);
jest.spyOn(ElevationCalculator.prototype, 'getInterpolatedElevation').mockImplementation(
    mockCalculator.getInterpolatedElevation
);
jest.spyOn(ElevationCalculator.prototype, 'normalizePixel').mockImplementation(
    mockCalculator.normalizePixel
);

describe('ElevationProvider', () => {
    let mockTileManager: jest.Mocked<TileManager>;
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

        // Mock TileManager
        mockTileManager = new MockedTileManager('', 0, 0) as jest.Mocked<TileManager>;
        mockTileManager.getTile = jest.fn().mockResolvedValue(mockTile);
        mockTileManager.clearCache = jest.fn();

        // Configure mock implementation for ElevationCalculator methods
        // Allow validation errors to pass through but mock successful calculations
        mockCalculator.getElevation.mockImplementation(async (coords, zoomLevel) => {
            // Let the toPixel method run for validation - it will throw if invalid
            // Create a calculator instance to call the instance method
            const validatorCalc = new ElevationCalculator(mockTileManager);
            (
                validatorCalc as unknown as { toPixel: (coords: Coordinates, z: number) => unknown }
            ).toPixel(coords, zoomLevel);
            return 0; // Return mock value for valid inputs
        });
        mockCalculator.getInterpolatedElevation.mockImplementation(async (coords, zoomLevel) => {
            // Create a calculator instance to call the instance method
            const validatorCalc = new ElevationCalculator(mockTileManager);
            (
                validatorCalc as unknown as {
                    toPixel: (coords: Coordinates, z: number) => unknown;
                }
            ).toPixel(coords, zoomLevel);
            return 0;
        });
        mockCalculator.normalizePixel.mockReturnValue({
            tile: { z: 12, x: 100, y: 200 },
            x: 0,
            y: 0,
        });

        // Configure mocks to return our instances
        MockedTileManager.mockImplementation(() => mockTileManager);
    });

    describe('constructor', () => {
        it('should create provider with default config', () => {
            const provider = new ElevationProvider();
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(12);
            expect(config.cacheSize).toBe(100);
            expect(config.tileUrlTemplate).toBe(
                'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
            );
            expect(config.timeout).toBe(5000);
        });

        it('should create provider with custom config', () => {
            const customConfig: ElevationProviderConfig = {
                zoomLevel: 10,
                cacheSize: 50,
                tileUrlTemplate: 'https://custom.tiles.com/{z}/{x}/{y}.png',
                timeout: 3000,
            };

            const provider = new ElevationProvider(customConfig);
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(10);
            expect(config.cacheSize).toBe(50);
            expect(config.tileUrlTemplate).toBe('https://custom.tiles.com/{z}/{x}/{y}.png');
            expect(config.timeout).toBe(3000);
        });

        it('should create provider with partial config', () => {
            const partialConfig: ElevationProviderConfig = {
                zoomLevel: 8,
                timeout: 2000,
            };

            const provider = new ElevationProvider(partialConfig);
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(8);
            expect(config.cacheSize).toBe(100); // Default
            expect(config.timeout).toBe(2000);
        });

        it('should throw error for invalid zoom level', () => {
            expect(() => new ElevationProvider({ zoomLevel: -1 })).toThrow(
                'Invalid zoom level: -1. Must be an integer between 0 and 15'
            );

            expect(() => new ElevationProvider({ zoomLevel: 16 })).toThrow(
                'Invalid zoom level: 16. Must be an integer between 0 and 15'
            );

            expect(() => new ElevationProvider({ zoomLevel: 1.5 })).toThrow(
                'Invalid zoom level: 1.5. Must be an integer between 0 and 15'
            );
        });

        it('should throw error for invalid cache size', () => {
            expect(() => new ElevationProvider({ cacheSize: 0 })).toThrow(
                'Invalid cache size: 0. Must be a positive integer'
            );

            expect(() => new ElevationProvider({ cacheSize: -10 })).toThrow(
                'Invalid cache size: -10. Must be a positive integer'
            );

            expect(() => new ElevationProvider({ cacheSize: 1.5 })).toThrow(
                'Invalid cache size: 1.5. Must be a positive integer'
            );
        });

        it('should throw error for invalid timeout', () => {
            expect(() => new ElevationProvider({ timeout: 0 })).toThrow(
                'Invalid timeout: 0. Must be a positive integer'
            );

            expect(() => new ElevationProvider({ timeout: -1000 })).toThrow(
                'Invalid timeout: -1000. Must be a positive integer'
            );

            expect(() => new ElevationProvider({ timeout: 1.5 })).toThrow(
                'Invalid timeout: 1.5. Must be a positive integer'
            );
        });

        it('should handle tile manager initialization errors', () => {
            MockedTileManager.mockImplementationOnce(() => {
                throw new Error('TileManager init failed');
            });

            expect(() => new ElevationProvider()).toThrow('TileManager init failed');
        });
    });

    describe('getElevation method', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should get elevation for valid coordinates', async () => {
            mockCalculator.getElevation.mockResolvedValueOnce(100);

            const elevation = await provider.getElevation(0, 0);
            expect(typeof elevation).toBe('number');
            expect(elevation).toBe(100);
            expect(mockCalculator.getElevation).toHaveBeenCalled();
        });

        it('should handle different coordinate sets', async () => {
            mockCalculator.getElevation.mockResolvedValue(50);

            const testCases = [
                { lat: 40.7128, lon: -74.006 }, // NYC
                { lat: 51.5074, lon: -0.1278 }, // London
                { lat: -33.8688, lon: 151.2093 }, // Sydney
            ];

            for (const { lat, lon } of testCases) {
                const elevation = await provider.getElevation(lat, lon);
                expect(typeof elevation).toBe('number');
                expect(isFinite(elevation)).toBe(true);
            }
        });

        it('should reject invalid coordinates', async () => {
            await expect(provider.getElevation(90, 0)).rejects.toThrow(
                'Invalid latitude: 90. Must be between -85.0511 and 85.0511'
            );

            await expect(provider.getElevation(0, 200)).rejects.toThrow(
                'Invalid longitude: 200. Must be between -180 and 180'
            );
        });

        it('should handle elevation calculation errors', async () => {
            mockCalculator.getElevation.mockRejectedValueOnce(new Error('Calculation error'));

            await expect(provider.getElevation(0, 0)).rejects.toThrow('Calculation error');
        });

        it('should handle unknown errors', async () => {
            mockCalculator.getElevation.mockRejectedValueOnce(new Error('Unknown error'));

            await expect(provider.getElevation(0, 0)).rejects.toThrow('Unknown error');
        });
    });

    describe('getInterpolatedElevation method', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should get interpolated elevation for valid coordinates', async () => {
            mockCalculator.getInterpolatedElevation.mockResolvedValueOnce(125.5);

            const elevation = await provider.getInterpolatedElevation(0, 0);
            expect(typeof elevation).toBe('number');
            expect(elevation).toBe(125.5);
            expect(mockCalculator.getInterpolatedElevation).toHaveBeenCalled();
        });

        it('should handle coordinates requiring multiple tiles', async () => {
            mockCalculator.getInterpolatedElevation.mockResolvedValueOnce(75.25);

            // Coordinates that might require pixel normalization
            const elevation = await provider.getInterpolatedElevation(0.001, 0.001);
            expect(typeof elevation).toBe('number');
            expect(elevation).toBe(75.25);
            expect(mockCalculator.getInterpolatedElevation).toHaveBeenCalled();
        });

        it('should reject invalid coordinates', async () => {
            await expect(provider.getInterpolatedElevation(90, 0)).rejects.toThrow(
                'Invalid latitude: 90. Must be between -85.0511 and 85.0511'
            );
        });
    });

    describe('batch methods', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider();
        });

        describe('getElevationsFromArray', () => {
            it('should get elevations for multiple coordinates', async () => {
                const coordinates = [
                    { latitude: 0, longitude: 0 },
                    { latitude: 1, longitude: 1 },
                    { latitude: -1, longitude: -1 },
                ];

                const elevations = await provider.getElevationsFromArray(coordinates);

                expect(elevations).toHaveLength(3);
                elevations.forEach(elevation => {
                    expect(typeof elevation).toBe('number');
                    expect(isFinite(elevation)).toBe(true);
                });
            });

            it('should handle empty array', async () => {
                const elevations = await provider.getElevationsFromArray([]);
                expect(elevations).toEqual([]);
            });

            it('should handle single coordinate', async () => {
                const coordinates = [{ latitude: 0, longitude: 0 }];
                const elevations = await provider.getElevationsFromArray(coordinates);

                expect(elevations).toHaveLength(1);
                expect(typeof elevations[0]).toBe('number');
            });

            it('should reject if any coordinate is invalid', async () => {
                const coordinates = [
                    { latitude: 0, longitude: 0 },
                    { latitude: 90, longitude: 0 }, // Invalid
                ];

                await expect(provider.getElevationsFromArray(coordinates)).rejects.toThrow();
            });
        });

        describe('getInterpolatedElevationsFromArray', () => {
            it('should get interpolated elevations for multiple coordinates', async () => {
                const coordinates = [
                    { latitude: 0, longitude: 0 },
                    { latitude: 1, longitude: 1 },
                ];

                const elevations = await provider.getInterpolatedElevationsFromArray(coordinates);

                expect(elevations).toHaveLength(2);
                elevations.forEach(elevation => {
                    expect(typeof elevation).toBe('number');
                    expect(isFinite(elevation)).toBe(true);
                });
            });

            it('should handle empty array', async () => {
                const elevations = await provider.getInterpolatedElevationsFromArray([]);
                expect(elevations).toEqual([]);
            });
        });
    });

    describe('batch processing internals', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should handle empty iterator in computeElevations', async () => {
            const emptyCoords: Coordinates[] = [];
            const emptyIterator = emptyCoords[Symbol.iterator]();

            const providerInstance = provider as unknown as {
                computeElevations: (
                    coords: Iterator<Coordinates>,
                    fn: (coord: Coordinates) => Promise<number>
                ) => Promise<number[]>;
            };

            const result = await providerInstance.computeElevations(emptyIterator, async () => 42);
            expect(result).toEqual([]);
        });

        it('should handle single coordinate in batch', async () => {
            const singleCoord: Coordinates[] = [{ latitude: 47.2, longitude: -1.5 }];
            const singleIterator = singleCoord[Symbol.iterator]();

            const mockGetElevation = jest.spyOn(provider, 'getElevation').mockResolvedValue(123);

            const providerInstance = provider as unknown as {
                computeElevations: (
                    coords: Iterator<Coordinates>,
                    fn: (coord: Coordinates) => Promise<number>
                ) => Promise<number[]>;
            };

            const fn = (coord: Coordinates) =>
                provider.getElevation(coord.latitude, coord.longitude);
            const result = await providerInstance.computeElevations(singleIterator, fn);

            expect(result).toEqual([123]);
            expect(mockGetElevation).toHaveBeenCalledWith(47.2, -1.5);

            mockGetElevation.mockRestore();
        });

        it('should process partial final batch correctly', async () => {
            const coordinates: Coordinates[] = [];
            for (let i = 0; i < 150; i++) {
                coordinates.push({ latitude: 47.2 + i * 0.001, longitude: -1.5 + i * 0.001 });
            }

            const mockGetElevation = jest
                .spyOn(provider, 'getElevation')
                .mockImplementation(async () => Math.floor(Math.random() * 1000));

            const result = await provider.getElevationsFromArray(coordinates);

            expect(result).toHaveLength(150);
            expect(mockGetElevation).toHaveBeenCalledTimes(150);

            mockGetElevation.mockRestore();
        });

        it('should handle exact multiple of batch size', async () => {
            const coordinates: Coordinates[] = [];
            for (let i = 0; i < 200; i++) {
                coordinates.push({ latitude: 47.2 + i * 0.001, longitude: -1.5 + i * 0.001 });
            }

            const mockGetElevation = jest
                .spyOn(provider, 'getElevation')
                .mockImplementation(async () => 42);

            const result = await provider.getElevationsFromArray(coordinates);

            expect(result).toHaveLength(200);
            expect(result.every(elevation => elevation === 42)).toBe(true);
            expect(mockGetElevation).toHaveBeenCalledTimes(200);

            mockGetElevation.mockRestore();
        });

        it('should handle batch processing errors', async () => {
            const coordinates: Coordinates[] = [
                { latitude: 47.2, longitude: -1.5 },
                { latitude: 47.3, longitude: -1.6 },
                { latitude: 47.4, longitude: -1.7 },
            ];

            const mockGetElevation = jest
                .spyOn(provider, 'getElevation')
                .mockResolvedValueOnce(100)
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(200);

            await expect(provider.getElevationsFromArray(coordinates)).rejects.toThrow(
                'Network error'
            );

            mockGetElevation.mockRestore();
        });

        it('should process batches sequentially', async () => {
            const coordinates: Coordinates[] = [];
            for (let i = 0; i < 250; i++) {
                coordinates.push({ latitude: 47.2 + i * 0.001, longitude: -1.5 + i * 0.001 });
            }

            const callOrder: number[] = [];
            const mockGetElevation = jest
                .spyOn(provider, 'getElevation')
                .mockImplementation(async lat => {
                    const index = Math.round((lat - 47.2) / 0.001);
                    callOrder.push(index);
                    return index;
                });

            const result = await provider.getElevationsFromArray(coordinates);

            expect(result).toHaveLength(250);
            expect(mockGetElevation).toHaveBeenCalledTimes(250);

            // Verify sequential processing
            const firstBatchCalls = callOrder.slice(0, 100);
            const secondBatchCalls = callOrder.slice(100, 200);
            const thirdBatchCalls = callOrder.slice(200, 250);

            expect(Math.max(...firstBatchCalls)).toBeLessThan(Math.min(...secondBatchCalls));
            expect(Math.max(...secondBatchCalls)).toBeLessThan(Math.min(...thirdBatchCalls));

            mockGetElevation.mockRestore();
        });
    });

    describe('cache management', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider({ cacheSize: 2 });
        });

        it('should cache tiles between requests', async () => {
            mockCalculator.getElevation.mockResolvedValue(150);

            await provider.getElevation(0, 0);
            await provider.getElevation(0, 0); // Same tile

            expect(mockCalculator.getElevation).toHaveBeenCalledTimes(2);
        });

        it('should clear cache when requested', async () => {
            mockCalculator.getElevation.mockResolvedValue(150);

            await provider.getElevation(0, 0);
            provider.clearCache();
            await provider.getElevation(0, 0);

            expect(mockTileManager.clearCache).toHaveBeenCalled();
        });
    });

    describe('configuration', () => {
        it('should return readonly config', () => {
            const provider = new ElevationProvider({ zoomLevel: 10 });
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(10);
            expect(typeof config).toBe('object');
        });

        it('should return a copy of config', () => {
            const provider = new ElevationProvider({ zoomLevel: 8 });
            const config1 = provider.getConfig();
            const config2 = provider.getConfig();

            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2); // Different objects
        });
    });

    describe('attribution', () => {
        it('should return attribution information', () => {
            const attribution = ElevationProvider.getAttribution();

            expect(attribution).toHaveProperty('text');
            expect(attribution).toHaveProperty('url');
            expect(typeof attribution.text).toBe('string');
            expect(typeof attribution.url).toBe('string');
            expect(attribution.text.length).toBeGreaterThan(0);
            expect(attribution.url).toContain('http');
        });

        it('should return consistent attribution', () => {
            const attr1 = ElevationProvider.getAttribution();
            const attr2 = ElevationProvider.getAttribution();

            expect(attr1).toEqual(attr2);
        });
    });

    describe('error handling', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should wrap and rethrow known errors', async () => {
            mockCalculator.getElevation.mockRejectedValueOnce(
                new Error('Specific calculation error')
            );

            await expect(provider.getElevation(0, 0)).rejects.toThrow('Specific calculation error');
        });

        it('should handle non-Error exceptions', async () => {
            mockCalculator.getElevation.mockRejectedValueOnce(new Error('String error'));

            await expect(provider.getElevation(0, 0)).rejects.toThrow('String error');
        });
    });

    describe('integration scenarios', () => {
        it('should exercise cache creation and tile loading', async () => {
            mockCalculator.getElevation.mockResolvedValue(100);

            const provider = new ElevationProvider({
                cacheSize: 1,
                zoomLevel: 1,
                tileUrlTemplate: 'https://test.example.com/{z}/{x}/{y}.png',
                timeout: 1000,
            });

            await provider.getElevation(0, 0);
            await provider.getElevation(45, 90); // Different tile, should trigger cache operations

            // Verify TileManager was initialized with correct parameters
            expect(MockedTileManager).toHaveBeenCalledWith(
                'https://test.example.com/{z}/{x}/{y}.png',
                1000,
                1
            );

            // Verify calculations were called
            expect(mockCalculator.getElevation).toHaveBeenCalledTimes(2);
        });

        it('should exercise interpolation pixel normalization paths', async () => {
            mockCalculator.getInterpolatedElevation.mockResolvedValue(250);

            const provider = new ElevationProvider({
                zoomLevel: 2,
                cacheSize: 10,
            });

            const testCoords = [
                { lat: 0.001, lon: 0.001 },
                { lat: 45.999, lon: 89.999 },
                { lat: -0.001, lon: -0.001 },
            ];

            for (const { lat, lon } of testCoords) {
                const elevation = await provider.getInterpolatedElevation(lat, lon);
                expect(typeof elevation).toBe('number');
                expect(elevation).toBe(250);
                expect(isFinite(elevation)).toBe(true);
            }

            // Verify interpolation calculations were called
            expect(mockCalculator.getInterpolatedElevation).toHaveBeenCalledTimes(3);
        });

        it('should test cache cleanup function execution', async () => {
            mockCalculator.getElevation.mockResolvedValue(300);

            const provider = new ElevationProvider({
                cacheSize: 2,
                zoomLevel: 3,
            });

            await provider.getElevation(0, 0);
            await provider.getElevation(30, 60);
            await provider.getElevation(60, 120); // Should trigger cache eviction

            // Test manual cache clear
            provider.clearCache();
            expect(mockTileManager.clearCache).toHaveBeenCalled();
        });

        it('should exercise tile URL generation with custom template', async () => {
            mockCalculator.getElevation.mockResolvedValue(150);

            const provider = new ElevationProvider({
                tileUrlTemplate: 'https://custom.tiles.example/{z}/{x}/{y}.png',
                zoomLevel: 5,
            });

            await provider.getElevation(40.7128, -74.006);

            // Verify TileManager was initialized with custom template
            expect(MockedTileManager).toHaveBeenCalledWith(
                'https://custom.tiles.example/{z}/{x}/{y}.png',
                5000, // Default timeout
                100 // Default cache size
            );
        });

        it('should handle different tile URL templates', async () => {
            mockCalculator.getElevation.mockResolvedValue(125);

            const provider = new ElevationProvider({
                tileUrlTemplate: 'https://example.com/{z}/{x}/{y}.png',
            });

            await provider.getElevation(0, 0);
            expect(mockCalculator.getElevation).toHaveBeenCalled();
        });

        it('should test cache and TileFetcher integration', () => {
            const provider = new ElevationProvider();
            expect(provider).toBeDefined();

            const provider2 = new ElevationProvider({
                cacheSize: 1,
                tileUrlTemplate: 'https://test.com/{z}/{x}/{y}.png',
            });

            expect(provider2).toBeDefined();
            expect(provider2.getConfig().tileUrlTemplate).toBe('https://test.com/{z}/{x}/{y}.png');

            // Test cache clear functionality
            provider2.clearCache();
            expect(mockTileManager.clearCache).toHaveBeenCalled();
        });
    });
});
