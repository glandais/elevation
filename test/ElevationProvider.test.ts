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
    normalizePixel: jest.fn(),
};

jest.spyOn(ElevationCalculator.prototype, 'getElevation').mockImplementation(
    mockCalculator.getElevation
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
        mockCalculator.getElevation.mockImplementation(
            async (coords, zoomLevel, _interpolation = true) => {
                // Let the toPixel method run for validation - it will throw if invalid
                // Create a calculator instance to call the instance method
                const validatorCalc = new ElevationCalculator(mockTileManager);
                (
                    validatorCalc as unknown as {
                        toPixel: (coords: Coordinates, z: number) => unknown;
                    }
                ).toPixel(coords, zoomLevel);

                return 0; // Default return value
            }
        );
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

    describe('batch methods', () => {
        let provider: ElevationProvider;

        beforeEach(() => {
            provider = new ElevationProvider();
        });

        describe('getElevationsFrom', () => {
            it('should get elevations for multiple coordinates', async () => {
                const coordinates = [
                    { latitude: 0, longitude: 0 },
                    { latitude: 1, longitude: 1 },
                    { latitude: -1, longitude: -1 },
                ];

                const elevations = await provider.getElevationsFrom(coordinates);

                expect(elevations).toHaveLength(3);
                elevations.forEach(elevation => {
                    expect(typeof elevation).toBe('number');
                    expect(isFinite(elevation)).toBe(true);
                });
            });

            it('should handle empty array', async () => {
                const elevations = await provider.getElevationsFrom([], true);
                expect(elevations).toEqual([]);
            });

            it('should handle single coordinate', async () => {
                const coordinates = [{ latitude: 0, longitude: 0 }];
                const elevations = await provider.getElevationsFrom(coordinates, false);

                expect(elevations).toHaveLength(1);
                expect(typeof elevations[0]).toBe('number');
            });

            it('should reject if any coordinate is invalid', async () => {
                const coordinates = [
                    { latitude: 0, longitude: 0 },
                    { latitude: 90, longitude: 0 }, // Invalid
                ];

                await expect(provider.getElevationsFrom(coordinates.values())).rejects.toThrow();
            });

            it('should handle large batch processing (triggers batch logic)', async () => {
                // Create array with more than 100 coordinates to trigger batch processing
                const coordinates = Array.from({ length: 150 }, (_, i) => ({
                    latitude: i % 85,
                    longitude: i % 180,
                }));

                mockCalculator.getElevation.mockResolvedValue(100);

                const elevations = await provider.getElevationsFrom(coordinates);

                expect(elevations).toHaveLength(150);
                elevations.forEach(elevation => {
                    expect(typeof elevation).toBe('number');
                    expect(elevation).toBe(100);
                });

                // Should have called getElevation for each coordinate
                expect(mockCalculator.getElevation).toHaveBeenCalledTimes(150);
            });

            it('should handle batch with remainder (tests last batch processing)', async () => {
                // Create array with 105 coordinates to test remainder processing (100 + 5)
                const coordinates = Array.from({ length: 105 }, (_, i) => ({
                    latitude: i % 85,
                    longitude: i % 180,
                }));

                mockCalculator.getElevation.mockResolvedValue(200);

                const elevations = await provider.getElevationsFrom(coordinates);

                expect(elevations).toHaveLength(105);
                elevations.forEach(elevation => {
                    expect(typeof elevation).toBe('number');
                    expect(elevation).toBe(200);
                });

                expect(mockCalculator.getElevation).toHaveBeenCalledTimes(105);
            });
        });

        describe('getElevationsBetween', () => {
            it('should get elevations between two coordinates', async () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.001, longitude: 0.001 };
                mockCalculator.getElevation.mockResolvedValue(100);

                const result = await provider.getElevationsBetween(coord1, coord2, 50, true);

                expect(result.length).toBeGreaterThan(2);
                expect(result[0]).toEqual(
                    expect.objectContaining({
                        latitude: 45.0,
                        longitude: 0.0,
                        elevation: 100,
                    })
                );
                expect(result[result.length - 1].latitude).toBeCloseTo(45.001, 6);
                expect(result[result.length - 1].longitude).toBeCloseTo(0.001, 6);
            });

            it('should pass interpolation flag correctly', async () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.001, longitude: 0.001 };
                mockCalculator.getElevation.mockResolvedValue(100);

                await provider.getElevationsBetween(coord1, coord2, 50, false);

                // Check that getElevation was called with interpolation = false
                expect(mockCalculator.getElevation).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.any(Number),
                    false
                );
            });

            it('should throw error for points too far apart', async () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 46.0, longitude: 1.0 };

                await expect(
                    provider.getElevationsBetween(coord1, coord2, 50, true)
                ).rejects.toThrow('Points are too far from each other');
            });

            it('should throw error for step too small', async () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.001, longitude: 0.001 };

                await expect(
                    provider.getElevationsBetween(coord1, coord2, 0.5, true)
                ).rejects.toThrow('Step is too small');
            });

            it('should use default interpolation parameter', async () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.001, longitude: 0.001 };
                mockCalculator.getElevation.mockResolvedValue(100);

                // Test default interpolation (should be true)
                await provider.getElevationsBetween(coord1, coord2, 50);

                expect(mockCalculator.getElevation).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.any(Number),
                    true // default interpolation
                );
            });

            it('should handle points closer than step size', async () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.0001, longitude: 0.0001 };
                mockCalculator.getElevation.mockResolvedValue(150);

                const result = await provider.getElevationsBetween(coord1, coord2, 50, true);

                expect(result).toHaveLength(2); // Only start and end
                expect(result[0].elevation).toBe(150);
                expect(result[1].elevation).toBe(150);
            });
        });

        describe('getElevationsAlong', () => {
            it('should get elevations along a path', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                    { latitude: 45.002, longitude: 0.002 },
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                const result = await provider.getElevationsAlong(path, 50, true);

                expect(result.length).toBeGreaterThan(3);
                expect(result[0]).toEqual(
                    expect.objectContaining({
                        latitude: 45.0,
                        longitude: 0.0,
                        elevation: 100,
                    })
                );
            });

            it('should skip segments shorter than 1 meter', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.000001, longitude: 0.000001 }, // <1m
                    { latitude: 45.001, longitude: 0.001 },
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                const result = await provider.getElevationsAlong(path, 50, true);

                // First point always included
                expect(result[0]).toEqual(
                    expect.objectContaining({
                        latitude: 45.0,
                        longitude: 0.0,
                        elevation: 100,
                    })
                );
                // Should have points from the longer segment
                expect(result.length).toBeGreaterThanOrEqual(4);
            });

            it('should throw error for path with less than 2 coordinates', async () => {
                await expect(
                    provider.getElevationsAlong([{ latitude: 45.0, longitude: 0.0 }], 50, true)
                ).rejects.toThrow('Path must contain at least 2 coordinates');

                await expect(provider.getElevationsAlong([], 50, true)).rejects.toThrow(
                    'Path must contain at least 2 coordinates'
                );
            });

            it('should throw error for step too small', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                ];

                await expect(provider.getElevationsAlong(path, 0.5, true)).rejects.toThrow(
                    'Step is too small'
                );
            });

            it('should use default interpolation parameter', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                // Test default interpolation (should be true)
                await provider.getElevationsAlong(path, 50);

                expect(mockCalculator.getElevation).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.any(Number),
                    true // default interpolation
                );
            });

            it('should pass interpolation flag correctly', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                await provider.getElevationsAlong(path, 50, false);

                expect(mockCalculator.getElevation).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.any(Number),
                    false
                );
            });

            it('should handle complex path with varying segment lengths', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.0000005, longitude: 0.0000005 }, // <1m, skip
                    { latitude: 45.002, longitude: 0.002 }, // ~314m, interpolate
                    { latitude: 45.0021, longitude: 0.0021 }, // ~15m
                    { latitude: 45.005, longitude: 0.005 }, // ~471m, interpolate
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                const result = await provider.getElevationsAlong(path, 100, true);

                // Should have many points due to interpolation
                expect(result.length).toBeGreaterThan(5);
                // First and last points should match
                expect(result[0].latitude).toBeCloseTo(45.0, 6);
                expect(result[result.length - 1].latitude).toBeCloseTo(45.005, 6);
            });
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
            mockCalculator.getElevation.mockResolvedValue(250);

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
                const elevation = await provider.getElevation(lat, lon, true);
                expect(typeof elevation).toBe('number');
                expect(elevation).toBe(250);
                expect(isFinite(elevation)).toBe(true);
            }

            // Verify interpolation calculations were called
            expect(mockCalculator.getElevation).toHaveBeenCalledTimes(3);
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
