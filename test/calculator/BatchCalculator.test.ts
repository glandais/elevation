import { BatchCalculator } from '../../src/calculator/BatchCalculator';
import { ElevationCalculator } from '../../src/calculator/ElevationCalculator';
import { TileManager } from '../../src/tile/TileManager';
import type { Coordinates } from '../../src/types';

// Mock dependencies
jest.mock('../../src/tile/TileManager');
jest.mock('../../src/calculator/ElevationCalculator');

const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;
const MockedElevationCalculator = ElevationCalculator as jest.MockedClass<
    typeof ElevationCalculator
>;

// Type for accessing private methods in tests
interface BatchCalculatorTestable {
    distance(coord1: Coordinates, coord2: Coordinates): number;
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
        mockTileManager = new MockedTileManager('', 0, 0) as jest.Mocked<TileManager>;

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

    describe('getElevationsFrom', () => {
        function* createCoordinatesIterator(count: number): Generator<Coordinates> {
            for (let i = 0; i < count; i++) {
                yield {
                    latitude: i % 85,
                    longitude: i % 180,
                };
            }
        }

        it('should process small batch without triggering batch logic', async () => {
            const coordinatesIterator = createCoordinatesIterator(50);
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                12 // zoomLevel
            );

            expect(elevations).toHaveLength(50);
            elevations.forEach(elevation => {
                expect(elevation).toBe(100);
            });

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(50);
        });

        it('should handle large batch processing (triggers batch size logic)', async () => {
            // Create iterator with more than 100 coordinates to trigger batch processing
            const coordinatesIterator = createCoordinatesIterator(150);
            mockElevationCalculator.getElevation.mockResolvedValue(200);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                12, // zoomLevel
                false // interpolation
            );

            expect(elevations).toHaveLength(150);
            elevations.forEach(elevation => {
                expect(elevation).toBe(200);
            });

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(150);
        });

        it('should handle batch with remainder (tests last batch processing)', async () => {
            // Create iterator with 105 coordinates to test remainder processing (100 + 5)
            const coordinatesIterator = createCoordinatesIterator(105);
            mockElevationCalculator.getElevation.mockResolvedValue(300);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                12, // zoomLevel
                false // interpolation
            );

            expect(elevations).toHaveLength(105);
            elevations.forEach(elevation => {
                expect(elevation).toBe(300);
            });

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(105);
        });

        it('should handle empty iterator', async () => {
            const coordinatesIterator = createCoordinatesIterator(0);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                12, // zoomLevel
                true // interpolation
            );

            expect(elevations).toHaveLength(0);
            expect(elevations).toEqual([]);
            expect(mockElevationCalculator.getElevation).not.toHaveBeenCalled();
        });

        it('should handle single coordinate iterator', async () => {
            const coordinatesIterator = createCoordinatesIterator(1);
            mockElevationCalculator.getElevation.mockResolvedValue(50);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                10, // zoomLevel
                true // interpolation
            );

            expect(elevations).toHaveLength(1);
            expect(elevations[0]).toBe(50);
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(1);
        });

        it('should pass correct parameters to ElevationCalculator', async () => {
            const testCoords = { latitude: 40.7128, longitude: -74.006 };

            function* testIterator(): Generator<Coordinates> {
                yield testCoords;
            }

            mockElevationCalculator.getElevation.mockResolvedValue(150);

            await batchCalculator.getElevationsFrom(
                testIterator(),
                8, // zoomLevel
                false // interpolation
            );

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledWith(
                testCoords,
                8, // zoomLevel
                false // interpolation
            );
        });

        it('should propagate errors from elevation calculation', async () => {
            const coordinatesIterator = createCoordinatesIterator(1);
            mockElevationCalculator.getElevation.mockRejectedValue(new Error('Calculation failed'));

            await expect(
                batchCalculator.getElevationsFrom(
                    coordinatesIterator,
                    12, // zoomLevel
                    true // interpolation
                )
            ).rejects.toThrow('Calculation failed');
        });

        it('should handle multiple batches correctly (200 coordinates)', async () => {
            // This will trigger 2 full batches of 100 each
            const coordinatesIterator = createCoordinatesIterator(200);
            mockElevationCalculator.getElevation.mockResolvedValue(400);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                12, // zoomLevel
                true // interpolation
            );

            expect(elevations).toHaveLength(200);
            elevations.forEach(elevation => {
                expect(elevation).toBe(400);
            });

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(200);
        });

        it('should handle exactly 100 coordinates (boundary case)', async () => {
            // Test the boundary case of exactly one full batch
            const coordinatesIterator = createCoordinatesIterator(100);
            mockElevationCalculator.getElevation.mockResolvedValue(500);

            const elevations = await batchCalculator.getElevationsFrom(
                coordinatesIterator,
                12, // zoomLevel
                true // interpolation
            );

            expect(elevations).toHaveLength(100);
            elevations.forEach(elevation => {
                expect(elevation).toBe(500);
            });

            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(100);
        });

        it('should work with array as iterable', async () => {
            const coordinates: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 46.0, longitude: 1.0 },
                { latitude: 47.0, longitude: 2.0 },
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(250);

            const elevations = await batchCalculator.getElevationsFrom(coordinates, 10, true);

            expect(elevations).toHaveLength(3);
            expect(elevations).toEqual([250, 250, 250]);
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledTimes(3);
        });
    });

    describe('distance calculation', () => {
        it('should calculate distance between two close points', () => {
            const coord1 = { latitude: 48.8566, longitude: 2.3522 }; // Paris
            const coord2 = { latitude: 48.8606, longitude: 2.3376 }; // Near Paris

            // Access private method via any cast for testing
            const distance = (batchCalculator as unknown as BatchCalculatorTestable).distance(
                coord1,
                coord2
            );

            // Distance should be approximately 1.2km
            expect(distance).toBeGreaterThan(1000);
            expect(distance).toBeLessThan(1500);
        });

        it('should calculate distance between distant points', () => {
            const coord1 = { latitude: 48.8566, longitude: 2.3522 }; // Paris
            const coord2 = { latitude: 51.5074, longitude: -0.1278 }; // London

            const distance = (batchCalculator as unknown as BatchCalculatorTestable).distance(
                coord1,
                coord2
            );

            // Distance should be approximately 344km
            expect(distance).toBeGreaterThan(340000);
            expect(distance).toBeLessThan(350000);
        });

        it('should return 0 for same coordinates', () => {
            const coord = { latitude: 48.8566, longitude: 2.3522 };

            const distance = (batchCalculator as unknown as BatchCalculatorTestable).distance(
                coord,
                coord
            );

            expect(distance).toBe(0);
        });

        it('should handle coordinates at equator', () => {
            const coord1 = { latitude: 0, longitude: 0 };
            const coord2 = { latitude: 0, longitude: 1 };

            const distance = (batchCalculator as unknown as BatchCalculatorTestable).distance(
                coord1,
                coord2
            );

            // 1 degree of longitude at equator is approximately 111km
            expect(distance).toBeGreaterThan(110000);
            expect(distance).toBeLessThan(112000);
        });
    });

    describe('getElevationsBetween', () => {
        it('should interpolate between two points', async () => {
            const coord1 = { latitude: 45.0, longitude: 0.0 };
            const coord2 = { latitude: 45.001, longitude: 0.001 };
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsBetween(
                coord1,
                coord2,
                10, // zoomLevel
                50, // step in meters
                true // interpolation
            );

            expect(result.length).toBeGreaterThan(2); // Should have intermediate points
            expect(result[0]).toEqual(
                expect.objectContaining({
                    latitude: 45.0,
                    longitude: 0.0,
                    elevation: 100,
                })
            );
            expect(result[result.length - 1]).toEqual(
                expect.objectContaining({
                    latitude: 45.001,
                    longitude: 0.001,
                    elevation: 100,
                })
            );
        });

        it('should throw error for points too far apart', async () => {
            const coord1 = { latitude: 45.0, longitude: 0.0 };
            const coord2 = { latitude: 46.0, longitude: 1.0 }; // >10km apart

            await expect(
                batchCalculator.getElevationsBetween(coord1, coord2, 10, 50, true)
            ).rejects.toThrow('Points are too far from each other');
        });

        it('should throw error for step too small', async () => {
            const coord1 = { latitude: 45.0, longitude: 0.0 };
            const coord2 = { latitude: 45.001, longitude: 0.001 };

            await expect(
                batchCalculator.getElevationsBetween(coord1, coord2, 10, 0.5, true)
            ).rejects.toThrow('Step is too small');
        });

        it('should handle points closer than step size', async () => {
            const coord1 = { latitude: 45.0, longitude: 0.0 };
            const coord2 = { latitude: 45.0001, longitude: 0.0001 }; // ~15m apart
            mockElevationCalculator.getElevation.mockResolvedValue(150);

            const result = await batchCalculator.getElevationsBetween(
                coord1,
                coord2,
                10,
                50 // step larger than distance
            );

            expect(result).toHaveLength(2); // Only start and end points
            expect(result[0]).toEqual(
                expect.objectContaining({
                    latitude: 45.0,
                    longitude: 0.0,
                    elevation: 150,
                })
            );
            expect(result[1]).toEqual(
                expect.objectContaining({
                    latitude: 45.0001,
                    longitude: 0.0001,
                    elevation: 150,
                })
            );
        });

        it('should generate correct number of intermediate points', async () => {
            const coord1 = { latitude: 45.0, longitude: 0.0 };
            const coord2 = { latitude: 45.003, longitude: 0.003 }; // ~470m apart
            mockElevationCalculator.getElevation.mockResolvedValue(200);

            const result = await batchCalculator.getElevationsBetween(
                coord1,
                coord2,
                10,
                100, // 100m step
                false
            );

            // Should have: start + 4 intermediate points + end = 6 points
            expect(result).toHaveLength(6);

            // Verify interpolation of coordinates
            expect(result[2].latitude).toBeGreaterThan(45.0);
            expect(result[2].latitude).toBeLessThan(45.003);
            expect(result[2].longitude).toBeGreaterThan(0.0);
            expect(result[2].longitude).toBeLessThan(0.003);
        });

        it('should pass interpolation flag correctly', async () => {
            const coord1 = { latitude: 45.0, longitude: 0.0 };
            const coord2 = { latitude: 45.001, longitude: 0.001 };
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            await batchCalculator.getElevationsBetween(
                coord1,
                coord2,
                8,
                50,
                false // no interpolation
            );

            // Check that getElevation was called with interpolation = false
            expect(mockElevationCalculator.getElevation).toHaveBeenCalledWith(
                expect.any(Object),
                8,
                false
            );
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

            const result = await batchCalculator.getElevationsAlong(path, 10, 50, true);

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
                    true
                )
            ).rejects.toThrow('Path must contain at least 2 coordinates');

            await expect(batchCalculator.getElevationsAlong([], 10, 50, true)).rejects.toThrow(
                'Path must contain at least 2 coordinates'
            );
        });

        it('should throw error for step too small', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.001, longitude: 0.001 },
            ];

            await expect(batchCalculator.getElevationsAlong(path, 10, 0.5, true)).rejects.toThrow(
                'Step is too small'
            );
        });

        it('should handle path with all segments shorter than 1 meter', async () => {
            const path: Coordinates[] = [
                { latitude: 45.0, longitude: 0.0 },
                { latitude: 45.0000001, longitude: 0.0000001 }, // <1m
                { latitude: 45.0000002, longitude: 0.0000002 }, // <1m
            ];
            mockElevationCalculator.getElevation.mockResolvedValue(100);

            const result = await batchCalculator.getElevationsAlong(path, 10, 50, true);

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
                30 // Small step to ensure multiple points per segment
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
                expect(points[0]).toEqual(coord1);
                expect(points[points.length - 1]).toEqual(coord2);

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
                expect(points[0]).toEqual(coord1);
                expect(points[1]).toEqual(coord2);
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
                expect(points[0]).toEqual(path[0]);

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
                expect(points[0]).toEqual(path[0]);

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
    });
});
