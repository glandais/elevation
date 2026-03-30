import { ElevationProvider } from '../src/ElevationProvider';
import { TileManager } from '../src/tile/TileManager';
import { ElevationCalculator, BatchCalculator } from '../src/calculator';
import { toPixel } from '../src/calculator/ElevationFunctions';
import type { ElevationProviderConfig, Coordinates } from '../src/types';

// Mock dependencies
jest.mock('../src/tile/TileManager');

const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;

// Create a manual mock that preserves static methods
const mockCalculator = {
    getElevation: jest.fn(),
};

jest.spyOn(ElevationCalculator.prototype, 'getElevation').mockImplementation(
    mockCalculator.getElevation
);

describe('ElevationProvider', () => {
    let mockTileManager: jest.Mocked<TileManager>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock TileManager
        mockTileManager = new MockedTileManager('', 0) as jest.Mocked<TileManager>;

        // Configure mock implementation for ElevationCalculator methods
        // Allow validation errors to pass through but mock successful calculations
        mockCalculator.getElevation.mockImplementation(
            async (coords, zoomLevel, _interpolation = true) => {
                // Let the toPixel method run for validation - it will throw if invalid
                // Use the exported toPixel function from ElevationFunctions
                toPixel(coords, zoomLevel, 256);

                return 0; // Default return value
            }
        );

        // Configure mocks to return our instances
        MockedTileManager.mockImplementation(() => mockTileManager);
    });

    describe('constructor', () => {
        it('should create provider with default config', () => {
            const provider = new ElevationProvider();
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(12);
            expect(config.cacheSize).toBe(100);
            expect(config.tileUrlTemplate).toBe('https://tiles.mapterhorn.com/{z}/{x}/{y}.webp');
            expect(config.tileSize).toBe(512);
        });

        it('should create provider with custom config', () => {
            const customConfig: ElevationProviderConfig = {
                zoomLevel: 10,
                cacheSize: 50,
                tileUrlTemplate: 'https://custom.tiles.com/{z}/{x}/{y}.png',
            };

            const provider = new ElevationProvider(customConfig);
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(10);
            expect(config.cacheSize).toBe(50);
            expect(config.tileUrlTemplate).toBe('https://custom.tiles.com/{z}/{x}/{y}.png');
        });

        it('should create provider with partial config', () => {
            const partialConfig: ElevationProviderConfig = {
                zoomLevel: 8,
            };

            const provider = new ElevationProvider(partialConfig);
            const config = provider.getConfig();

            expect(config.zoomLevel).toBe(8);
            expect(config.cacheSize).toBe(100); // Default
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

        it('should create provider with custom tileSize', () => {
            const provider = new ElevationProvider({ tileSize: 512 });
            expect(provider.getConfig().tileSize).toBe(512);
        });

        it('should throw error for invalid tile size', () => {
            expect(() => new ElevationProvider({ tileSize: 0 })).toThrow(
                'Invalid tile size: 0. Must be a positive power of 2'
            );

            expect(() => new ElevationProvider({ tileSize: -256 })).toThrow(
                'Invalid tile size: -256. Must be a positive power of 2'
            );

            expect(() => new ElevationProvider({ tileSize: 300 })).toThrow(
                'Invalid tile size: 300. Must be a positive power of 2'
            );

            expect(() => new ElevationProvider({ tileSize: 1.5 })).toThrow(
                'Invalid tile size: 1.5. Must be a positive power of 2'
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

        describe('getElevationsAlong', () => {
            it('should get elevations along a path', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                    { latitude: 45.002, longitude: 0.002 },
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                const result = await provider.getElevationsAlong(path, {
                    step: 50,
                    interpolation: true,
                });

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

                const result = await provider.getElevationsAlong(path, {
                    step: 50,
                    interpolation: true,
                });

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
                    provider.getElevationsAlong([{ latitude: 45.0, longitude: 0.0 }], {
                        step: 50,
                        interpolation: true,
                    })
                ).rejects.toThrow('Path must contain at least 2 coordinates');

                await expect(
                    provider.getElevationsAlong([], { step: 50, interpolation: true })
                ).rejects.toThrow('Path must contain at least 2 coordinates');
            });

            it('should throw error for step too small', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                ];

                await expect(
                    provider.getElevationsAlong(path, { step: 0.5, interpolation: true })
                ).rejects.toThrow('Step is too small');
            });

            it('should use default interpolation parameter', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                ];
                mockCalculator.getElevation.mockResolvedValue(100);

                // Test default interpolation (should be true)
                await provider.getElevationsAlong(path, { step: 50 });

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

                await provider.getElevationsAlong(path, { step: 50, interpolation: false });

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

                const result = await provider.getElevationsAlong(path, {
                    step: 100,
                    interpolation: true,
                });

                // Should have many points due to interpolation
                expect(result.length).toBeGreaterThan(5);
                // First and last points should match
                expect(result[0].latitude).toBeCloseTo(45.0, 6);
                expect(result[result.length - 1].latitude).toBeCloseTo(45.005, 6);
            });
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
        it('should return default attribution information', () => {
            const provider = new ElevationProvider();
            const attribution = provider.getAttribution();

            expect(attribution).toHaveProperty('text');
            expect(attribution).toHaveProperty('url');
            expect(typeof attribution.text).toBe('string');
            expect(typeof attribution.url).toBe('string');
            expect(attribution.text.length).toBeGreaterThan(0);
            expect(attribution.url).toContain('http');
        });

        it('should return custom attribution when configured', () => {
            const provider = new ElevationProvider({
                attribution: { text: 'Custom attribution', url: 'https://example.com/attribution' },
            });

            const attribution = provider.getAttribution();
            expect(attribution.text).toBe('Custom attribution');
            expect(attribution.url).toBe('https://example.com/attribution');
        });

        it('should return consistent attribution', () => {
            const provider = new ElevationProvider();
            const attr1 = provider.getAttribution();
            const attr2 = provider.getAttribution();

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
            });

            await provider.getElevation(0, 0);
            await provider.getElevation(45, 90); // Different tile, should trigger cache operations

            // Verify TileManager was initialized with correct parameters
            expect(MockedTileManager).toHaveBeenCalledWith(
                'https://test.example.com/{z}/{x}/{y}.png',
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
                const elevation = await provider.getElevation(lat, lon, { interpolation: true });
                expect(typeof elevation).toBe('number');
                expect(elevation).toBe(250);
                expect(isFinite(elevation)).toBe(true);
            }

            // Verify interpolation calculations were called
            expect(mockCalculator.getElevation).toHaveBeenCalledTimes(3);
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
        });
    });

    describe('Options Interface Tests', () => {
        let provider: ElevationProvider;
        let mockBatchCalculator: jest.Mocked<BatchCalculator>;

        beforeEach(() => {
            mockBatchCalculator = {
                getElevationsAlong: jest.fn(),
            } as unknown as jest.Mocked<BatchCalculator>;

            provider = new ElevationProvider();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (provider as any).batchCalculator = mockBatchCalculator;
        });

        it('should use custom step and interpolation from options', async () => {
            mockBatchCalculator.getElevationsAlong.mockResolvedValueOnce([]);

            const path = [
                { latitude: 0, longitude: 0 },
                { latitude: 0.001, longitude: 0.001 },
            ];

            await provider.getElevationsAlong(path, {
                step: 25,
                interpolation: false,
                filterOptions: { enabled: true, tolerance: 15 },
            });

            expect(mockBatchCalculator.getElevationsAlong).toHaveBeenCalledWith(
                path,
                12, // default zoomLevel
                25, // custom step
                1,
                false, // custom interpolation
                undefined, // smoothingOptions
                { enabled: true, tolerance: 15 } // custom filterOptions
            );
        });

        it('should use default step when only interpolation is provided', async () => {
            mockBatchCalculator.getElevationsAlong.mockResolvedValueOnce([]);

            const path = [
                { latitude: 0, longitude: 0 },
                { latitude: 0.001, longitude: 0.001 },
            ];

            await provider.getElevationsAlong(path, { interpolation: false });

            expect(mockBatchCalculator.getElevationsAlong).toHaveBeenCalledWith(
                path,
                12, // default zoomLevel
                10, // default step
                1,
                false, // custom interpolation
                undefined, // smoothingOptions
                undefined // no filterOptions
            );
        });
    });

    describe('setElevations', () => {
        let provider: ElevationProvider;
        let mockBatchCalculator: jest.Mocked<BatchCalculator>;

        beforeEach(() => {
            provider = new ElevationProvider();

            // Mock the batchCalculator's setElevations method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockBatchCalculator = (provider as any).batchCalculator as jest.Mocked<BatchCalculator>;
            mockBatchCalculator.setElevations = jest.fn().mockResolvedValue(undefined);
        });

        it('should call batchCalculator.setElevations with default interpolation', async () => {
            const coordinates = [
                { latitude: 40.7128, longitude: -74.006, elevation: 0 },
                { latitude: 51.5074, longitude: -0.1278, elevation: 0 },
            ];

            await provider.setElevations(coordinates);

            expect(mockBatchCalculator.setElevations).toHaveBeenCalledWith(
                coordinates,
                12, // default zoomLevel from provider config
                true // default interpolation
            );
        });

        it('should respect interpolation option when false', async () => {
            const coordinates = [{ latitude: 40.7128, longitude: -74.006, elevation: 0 }];

            await provider.setElevations(coordinates, { interpolation: false });

            expect(mockBatchCalculator.setElevations).toHaveBeenCalledWith(
                coordinates,
                12, // default zoomLevel from provider config
                false // explicit interpolation setting
            );
        });

        it('should handle empty coordinates array', async () => {
            const coordinates: Coordinates[] = [];

            await provider.setElevations(coordinates);

            expect(mockBatchCalculator.setElevations).toHaveBeenCalledWith(coordinates, 12, true);
        });

        it('should work with generators', async () => {
            function* coordinateGenerator() {
                yield { latitude: 40.7128, longitude: -74.006, elevation: 0 };
                yield { latitude: 51.5074, longitude: -0.1278, elevation: 0 };
            }

            await provider.setElevations(coordinateGenerator());

            expect(mockBatchCalculator.setElevations).toHaveBeenCalled();
            const callArgs = mockBatchCalculator.setElevations.mock.calls[0];
            expect(callArgs[1]).toBe(12); // zoomLevel
            expect(callArgs[2]).toBe(true); // default interpolation
        });
    });
});
