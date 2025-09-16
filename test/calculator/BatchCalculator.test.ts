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
    });
});
