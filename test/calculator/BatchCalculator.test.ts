import { BatchCalculator } from '../../src/calculator/BatchCalculator';
import { ElevationCalculator } from '../../src/calculator/ElevationCalculator';
import { TileManager } from '../../src/tile/TileManager';
import { Distance } from '../../src/utils/Distance';
import { asCoordinatesElevation, type Coordinates } from '../../src/types';

// Mock dependencies
jest.mock('../../src/tile/TileManager');
jest.mock('../../src/calculator/ElevationCalculator');

const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;
const MockedElevationCalculator = ElevationCalculator as jest.MockedClass<
    typeof ElevationCalculator
>;

// Type for accessing private methods in tests
interface BatchCalculatorTestable {
    generateCoordinatesBetween(
        coordinate1: Coordinates,
        coordinate2: Coordinates,
        step: number
    ): Generator<Coordinates, void, unknown>;
    generateCoordinatesAlong(
        path: Coordinates[],
        step: number
    ): Generator<Coordinates, void, unknown>;
}

describe('BatchCalculator', () => {
    let mockTileManager: jest.Mocked<TileManager>;
    let mockElevationCalculator: jest.Mocked<ElevationCalculator>;
    let batchCalculator: BatchCalculator;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock TileManager
        mockTileManager = new MockedTileManager('', 0) as jest.Mocked<TileManager>;

        // Mock ElevationCalculator
        mockElevationCalculator = new MockedElevationCalculator(
            mockTileManager
        ) as jest.Mocked<ElevationCalculator>;
        mockElevationCalculator.getElevation = jest.fn();

        // Configure mocks to return our instances
        MockedTileManager.mockImplementation(() => mockTileManager);
        MockedElevationCalculator.mockImplementation(() => mockElevationCalculator);

        batchCalculator = new BatchCalculator(mockElevationCalculator);
    });

    describe('distance calculation', () => {
        it('should calculate distance between two close points', () => {
            const coord1 = { latitude: 48.8566, longitude: 2.3522 }; // Paris
            const coord2 = { latitude: 48.8606, longitude: 2.3376 }; // Near Paris

            const distance = Distance.haversine(coord1, coord2);

            // Distance should be approximately 1.2km
            expect(distance).toBeGreaterThan(1000);
            expect(distance).toBeLessThan(1500);
        });

        it('should calculate distance between distant points', () => {
            const coord1 = { latitude: 48.8566, longitude: 2.3522 }; // Paris
            const coord2 = { latitude: 51.5074, longitude: -0.1278 }; // London

            const distance = Distance.haversine(coord1, coord2);

            // Distance should be approximately 344km
            expect(distance).toBeGreaterThan(340000);
            expect(distance).toBeLessThan(350000);
        });

        it('should return 0 for same coordinates', () => {
            const coord = { latitude: 48.8566, longitude: 2.3522 };

            const distance = Distance.haversine(coord, coord);

            expect(distance).toBe(0);
        });

        it('should handle coordinates at equator', () => {
            const coord1 = { latitude: 0, longitude: 0 };
            const coord2 = { latitude: 0, longitude: 1 };

            const distance = Distance.haversine(coord1, coord2);

            // 1 degree of longitude at equator is approximately 111km
            expect(distance).toBeGreaterThan(110000);
            expect(distance).toBeLessThan(112000);
        });
    });

    describe('getElevationsAlong', () => {
        it('should handle path with multiple waypoints', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.001, longitude: 0.001 },
                { latitude: 45.002, longitude: 0.002 },
                { latitude: 45.003, longitude: 0.003 },
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsAlong(path, 10, 50, 10, true);

            expect(result.length).toBeGreaterThan(4); // Should have intermediate points
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
                { latitude: 45.000001, longitude: 0.000001 }, // <1m from previous, segment will be skipped
                { latitude: 45.001, longitude: 0.001 }, // >100m from previous
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsAlong(
                path,
                10,
                50, // 50m step
                10,
                true
            );

            // The algorithm should:
            // 1. Yield first point (45.0, 0.0)
            // 2. Skip segment 0->1 because it's <1m
            // 3. Process segment 1->2 because it's >100m
            //    - generateCoordinatesBetween will yield points between 1 and 2
            //    - But the first point of this segment is skipped to avoid duplicates

            const coordinates = result.map(r => ({ lat: r.latitude, lon: r.longitude }));

            // Should include first point
            expect(coordinates[0]).toEqual({ lat: 45.0, lon: 0.0 });

            // Should include the last point
            expect(coordinates[coordinates.length - 1].lat).toBeCloseTo(45.001, 6);
            expect(coordinates[coordinates.length - 1].lon).toBeCloseTo(0.001, 6);

            // Should have multiple points (interpolated between waypoint 1 and 2)
            // Distance between point 1 and 2 is about 157m, so with 50m step we should have ~4 points
            expect(coordinates.length).toBeGreaterThanOrEqual(4);
        });

        it('should throw error for path with less than 2 coordinates', async () => {
            await expect(
                batchCalculator.getElevationsAlong(
                    [{ latitude: 45.0, longitude: 0.0 }],
                    10,
                    50,
                    10,
                    true
                )
            ).rejects.toThrow('Path must contain at least 2 coordinates');

            await expect(batchCalculator.getElevationsAlong([], 10, 50, 10, true)).rejects.toThrow(
                'Path must contain at least 2 coordinates'
            );
        });

        it('should throw error for step too small', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.001, longitude: 0.001 },
            ];

            await expect(
                batchCalculator.getElevationsAlong(path, 10, 0.5, 10, true)
            ).rejects.toThrow('Step is too small');
        });

        it('should handle path with all segments shorter than 1 meter', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0000001, longitude: 0.0000001 }, // <1m
                { latitude: 45.0000002, longitude: 0.0000002 }, // <1m
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsAlong(path, 10, 50, 10, true);

            // Should still include all waypoints even if segments are skipped
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    latitude: 45.0,
                    longitude: 0.0,
                    elevation: 100,
                })
            );
        });

        it('should avoid duplicate coordinates at segment boundaries', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.001, longitude: 0.001 },
                { latitude: 45.002, longitude: 0.002 },
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsAlong(
                path,
                10,
                30, // Small step to ensure multiple points per segment
                10,
                true
            );

            // Check for duplicates
            const seen = new Set<string>();
            let hasDuplicates = false;

            for (const coord of result) {
                const key = `${coord.latitude.toFixed(10)},${coord.longitude.toFixed(10)}`;
                if (seen.has(key)) {
                    hasDuplicates = true;
                    break;
                }
                seen.add(key);
            }

            expect(hasDuplicates).toBe(false);
        });

        it('should pass correct parameters through the chain', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.001, longitude: 0.001 },
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            await batchCalculator.getElevationsAlong(
                path,
                8, // zoomLevel
                50,
                10,
                false // interpolation
            );

            // Verify that getElevation was called with correct parameters
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledWith(
                expect.any(Object),
                8,
                false
            );
        });

        it('should handle complex path with varying segment lengths', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0000005, longitude: 0.0000005 }, // <1m, should skip
                { latitude: 45.002, longitude: 0.002 }, // ~314m, should interpolate
                { latitude: 45.0021, longitude: 0.0021 }, // ~15m, should include
                { latitude: 45.005, longitude: 0.005 }, // ~471m, should interpolate
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsAlong(
                path,
                10,
                100, // 100m step
                10,
                true
            );

            // Should have many points due to interpolation on longer segments
            expect(result.length).toBeGreaterThan(5);

            // First and last points should match path endpoints
            expect(result[0].latitude).toBeCloseTo(45.0, 6);
            expect(result[0].longitude).toBeCloseTo(0.0, 6);
            expect(result[result.length - 1].latitude).toBeCloseTo(45.005, 6);
            expect(result[result.length - 1].longitude).toBeCloseTo(0.005, 6);
        });
    });

    describe('generator methods', () => {
        describe('generateCoordinatesBetween', () => {
            it('should generate correct intermediate points', () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.002, longitude: 0.002 };

                // Access private generator via any cast
                const generator = (
                    batchCalculator as unknown as BatchCalculatorTestable
                ).generateCoordinatesBetween(
                    coord1,
                    coord2,
                    100 // ~100m step
                );

                const points: Coordinates[] = Array.from(generator);

                expect(points.length).toBeGreaterThan(2);
                expect(points[0]).toEqual(asCoordinatesElevation(coord1));
                expect(points[points.length - 1]).toEqual(asCoordinatesElevation(coord2));

                // Check intermediate points are properly interpolated
                for (let i = 1; i < points.length - 1; i++) {
                    expect(points[i].latitude).toBeGreaterThan(45.0);
                    expect(points[i].latitude).toBeLessThan(45.002);
                    expect(points[i].longitude).toBeGreaterThan(0.0);
                    expect(points[i].longitude).toBeLessThan(0.002);
                }
            });

            it('should yield only start and end for distance less than step', () => {
                const coord1 = { latitude: 45.0, longitude: 0.0 };
                const coord2 = { latitude: 45.0001, longitude: 0.0001 }; // ~15m

                const generator = (
                    batchCalculator as unknown as BatchCalculatorTestable
                ).generateCoordinatesBetween(
                    coord1,
                    coord2,
                    50 // 50m step
                );

                const points: Coordinates[] = Array.from(generator);

                expect(points).toHaveLength(2);
                expect(points[0]).toEqual(asCoordinatesElevation(coord1));
                expect(points[1]).toEqual(asCoordinatesElevation(coord2));
            });
        });

        describe('generateCoordinatesAlong', () => {
            it('should generate coordinates along multi-segment path', () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                    { latitude: 45.002, longitude: 0.002 },
                ];

                const generator = (
                    batchCalculator as unknown as BatchCalculatorTestable
                ).generateCoordinatesAlong(path, 50);
                const points: Coordinates[] = Array.from(generator);

                expect(points.length).toBeGreaterThan(3);
                expect(points[0]).toEqual(asCoordinatesElevation(path[0]));

                // Last point should be close to the path endpoint
                const lastPoint = points[points.length - 1] as Coordinates;
                expect(lastPoint.latitude).toBeCloseTo(45.002, 6);
                expect(lastPoint.longitude).toBeCloseTo(0.002, 6);
            });

            it('should skip segments shorter than 1 meter', () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.0000001, longitude: 0.0000001 }, // <1m
                    { latitude: 45.001, longitude: 0.001 }, // ~157m
                ];

                const generator = (
                    batchCalculator as unknown as BatchCalculatorTestable
                ).generateCoordinatesAlong(path, 50);
                const points: Coordinates[] = Array.from(generator);

                // Should skip the tiny segment
                expect(points[0]).toEqual(asCoordinatesElevation(path[0]));

                // Should have points from the longer segment
                expect(points.length).toBeGreaterThan(2);
            });

            it('should handle empty path', () => {
                const generator = (
                    batchCalculator as unknown as BatchCalculatorTestable
                ).generateCoordinatesAlong([], 50);
                const points: Coordinates[] = Array.from(generator);

                expect(points).toHaveLength(0);
            });

            it('should handle single-point path', () => {
                const path = [{ latitude: 45.0, longitude: 0.0 }];
                const generator = (
                    batchCalculator as unknown as BatchCalculatorTestable
                ).generateCoordinatesAlong(path, 50);
                const points: Coordinates[] = Array.from(generator);

                expect(points).toHaveLength(0);
            });
        });

        describe('filtering functionality', () => {
            beforeEach(() => {
                mockElevationCalculator.getElevation.mockResolvedValue(100);
            });

            it('should apply filtering with default tolerance and zExaggeration', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.01, longitude: 0.01 }, // Longer distances to generate more points
                    { latitude: 45.02, longitude: 0.02 },
                ];

                const result = await batchCalculator.getElevationsAlong(
                    path,
                    12, // zoomLevel
                    100, // smaller step to generate more elevation points
                    10,
                    true, // interpolation
                    undefined, // smoothingOptions
                    { enabled: true } // filterOptions with defaults - will use tolerance=10, zExaggeration=3
                );

                expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
            });

            it('should not apply filtering when disabled', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                    { latitude: 45.002, longitude: 0.002 },
                ];

                const result = await batchCalculator.getElevationsAlong(
                    path,
                    12, // zoomLevel
                    25, // step
                    10,
                    true, // interpolation
                    undefined, // smoothingOptions
                    { enabled: false } // filterOptions disabled
                );

                expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
            });

            it('should not apply filtering when there are 2 or fewer points', async () => {
                const shortPath: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.001, longitude: 0.001 },
                ];

                const result = await batchCalculator.getElevationsAlong(
                    shortPath,
                    12, // zoomLevel
                    1000, // large step to ensure <=2 points
                    10,
                    true, // interpolation
                    undefined, // smoothingOptions
                    { enabled: true, tolerance: 10, zExaggeration: 3 } // filtering enabled
                );

                expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
                // Should return unfiltered results when <=2 points
            });

            it('should use explicit tolerance and zExaggeration when provided', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.01, longitude: 0.01 },
                    { latitude: 45.02, longitude: 0.02 },
                ];

                const result = await batchCalculator.getElevationsAlong(
                    path,
                    12, // zoomLevel
                    100, // step
                    10,
                    true, // interpolation
                    undefined, // smoothingOptions
                    { enabled: true, tolerance: 15, zExaggeration: 2 } // explicit values
                );

                expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
            });

            it('should use default tolerance when not provided', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.01, longitude: 0.01 },
                    { latitude: 45.02, longitude: 0.02 },
                ];

                const result = await batchCalculator.getElevationsAlong(
                    path,
                    12, // zoomLevel
                    100, // step
                    10,
                    true, // interpolation
                    undefined, // smoothingOptions
                    { enabled: true, zExaggeration: 2 } // tolerance undefined, will use default 10
                );

                expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
            });

            it('should use default zExaggeration when not provided', async () => {
                const path: Coordinates[] = [
                    { latitude: 45.0, longitude: 0.0 },
                    { latitude: 45.01, longitude: 0.01 },
                    { latitude: 45.02, longitude: 0.02 },
                ];

                const result = await batchCalculator.getElevationsAlong(
                    path,
                    12, // zoomLevel
                    100, // step
                    10,
                    true, // interpolation
                    undefined, // smoothingOptions
                    { enabled: true, tolerance: 15 } // zExaggeration undefined, will use default 3
                );

                expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
            });
        });
    });

    describe('smoothing functionality', () => {
        beforeEach(() => {
            mockElevationCalculator.getElevation.mockResolvedValue(100);
        });

        it('should apply smoothing when enabled with default window size', async () => {
            const path = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0001, longitude: 0.0 },
                { latitude: 45.0002, longitude: 0.0 },
                { latitude: 45.0003, longitude: 0.0 },
            ];

            const result = await batchCalculator.getElevationsAlong(
                path,
                12, // zoomLevel
                100, // step
                10,
                true, // interpolation
                { enabled: true }, // smoothingOptions - no windowSize, should use default 50
                undefined // filterOptions
            );

            expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should apply smoothing with custom window size', async () => {
            const path = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0001, longitude: 0.0 },
                { latitude: 45.0002, longitude: 0.0 },
                { latitude: 45.0003, longitude: 0.0 },
            ];

            const result = await batchCalculator.getElevationsAlong(
                path,
                12, // zoomLevel
                100, // step
                10,
                true, // interpolation
                { enabled: true, windowSize: 75 }, // smoothingOptions with custom windowSize
                undefined // filterOptions
            );

            expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should not apply smoothing when disabled', async () => {
            const path = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0001, longitude: 0.0 },
                { latitude: 45.0002, longitude: 0.0 },
            ];

            const result = await batchCalculator.getElevationsAlong(
                path,
                12, // zoomLevel
                100, // step
                10,
                true, // interpolation
                { enabled: false, windowSize: 50 }, // smoothingOptions disabled
                undefined // filterOptions
            );

            expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        it('should not apply smoothing when less than 3 points', async () => {
            const path = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0001, longitude: 0.0 },
            ];

            const result = await batchCalculator.getElevationsAlong(
                path,
                12, // zoomLevel
                100, // step
                10,
                true, // interpolation
                { enabled: true, windowSize: 50 }, // smoothingOptions enabled
                undefined // filterOptions
            );

            expect(mockElevationCalculator.getElevation).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            // With only 2 points, smoothing shouldn't be applied regardless of enabled setting
        });
    });

    describe('setElevations', () => {
        it('should set elevations for all provided coordinates', async () => {
            const coordinates = [
                { latitude: 40.7128, longitude: -74.006, elevation: 0 },
                { latitude: 40.713, longitude: -74.007, elevation: 0 },
                { latitude: 51.5074, longitude: -0.1278, elevation: 0 },
                { latitude: 51.5076, longitude: -0.128, elevation: 0 },
            ];

            mockElevationCalculator.getElevation.mockImplementation(async (coord: Coordinates) => {
                // Return different elevations based on latitude
                return coord.latitude > 50 ? 100 : 50;
            });

            await batchCalculator.setElevations(coordinates, 12, true);

            // Verify elevations were set
            expect(coordinates[0].elevation).toBe(50);
            expect(coordinates[1].elevation).toBe(50);
            expect(coordinates[2].elevation).toBe(100);
            expect(coordinates[3].elevation).toBe(100);

            // Verify getElevation was called for each coordinate
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(4);
        });

        it('should group coordinates by tile for efficient processing', async () => {
            // Create coordinates that will be in the same tile
            const coordinates = [
                { latitude: 40.7128, longitude: -74.006, elevation: 0 },
                { latitude: 40.7129, longitude: -74.0061, elevation: 0 },
                { latitude: 40.7127, longitude: -74.0059, elevation: 0 },
            ];

            mockElevationCalculator.getElevation.mockResolvedValue(75);

            await batchCalculator.setElevations(coordinates, 12, false);

            // All elevations should be set
            coordinates.forEach(coord => {
                expect(coord.elevation).toBe(75);
            });

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(3);
        });

        it('should handle empty coordinate list', async () => {
            const coordinates: Array<{ latitude: number; longitude: number; elevation: number }> =
                [];

            await batchCalculator.setElevations(coordinates, 12, true);

            expect(mockElevationCalculator.getElevation).not.toHaveBeenCalled();
            expect(coordinates).toHaveLength(0);
        });

        it('should handle single coordinate', async () => {
            const coordinates = [{ latitude: 40.7128, longitude: -74.006, elevation: 0 }];

            mockElevationCalculator.getElevation.mockResolvedValue(25);

            await batchCalculator.setElevations(coordinates, 10, true);

            expect(coordinates[0].elevation).toBe(25);
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(1);
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledWith(
                coordinates[0],
                10,
                true
            );
        });

        it('should handle coordinates across multiple tiles', async () => {
            // Create coordinates that will be in different tiles
            const coordinates = [
                { latitude: 0, longitude: 0, elevation: 0 }, // Equator
                { latitude: 40.7128, longitude: -74.006, elevation: 0 }, // New York
                { latitude: 51.5074, longitude: -0.1278, elevation: 0 }, // London
                { latitude: -33.8688, longitude: 151.2093, elevation: 0 }, // Sydney
            ];

            mockElevationCalculator.getElevation.mockImplementation(async (coord: Coordinates) => {
                // Return elevation based on latitude ranges
                if (coord.latitude < -30) {
                    return 10;
                }
                if (coord.latitude < 10) {
                    return 20;
                }
                if (coord.latitude < 45) {
                    return 30;
                }
                return 40;
            });

            await batchCalculator.setElevations(coordinates, 8, false);

            expect(coordinates[0].elevation).toBe(20); // Equator
            expect(coordinates[1].elevation).toBe(30); // New York
            expect(coordinates[2].elevation).toBe(40); // London
            expect(coordinates[3].elevation).toBe(10); // Sydney

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(4);
        });

        it('should respect interpolation parameter', async () => {
            const coordinates = [
                { latitude: 40.7128, longitude: -74.006, elevation: 0 },
                { latitude: 41.7128, longitude: -74.006, elevation: 0 },
            ];

            mockElevationCalculator.getElevation.mockResolvedValue(60);

            await batchCalculator.setElevations(coordinates, 14, false);

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledWith(
                coordinates[0],
                14,
                false
            );
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledWith(
                coordinates[1],
                14,
                false
            );
        });

        it('should handle generator as iterable input', async () => {
            function* coordinateGenerator() {
                yield { latitude: 40.7128, longitude: -74.006, elevation: 0 };
                yield { latitude: 51.5074, longitude: -0.1278, elevation: 0 };
            }

            const coordinates = Array.from(coordinateGenerator());
            mockElevationCalculator.getElevation.mockResolvedValue(80);

            await batchCalculator.setElevations(coordinateGenerator(), 12, true);

            // Since we're passing a generator, we need to check the results differently
            // The generator will be consumed during the process
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(2);

            // Set elevations on our saved array for verification
            await batchCalculator.setElevations(coordinates, 12, true);
            expect(coordinates[0].elevation).toBe(80);
            expect(coordinates[1].elevation).toBe(80);
        });
    });
});
