import { Coordinates, CoordinatesElevation, FilterOptions, SmoothingOptions } from '../types';
import { ElevationCalculator } from './ElevationCalculator';
import { DouglasPeucker } from '../utils/DouglasPeucker';
import { ElevationSmoother } from '../utils/ElevationSmoother';
import { Distance } from '../utils/Distance';
import { ALGORITHM_CONSTANTS } from '../utils/Constants';

export class BatchCalculator {
    private readonly elevationCalculator: ElevationCalculator;

    constructor(elevationCalculator: ElevationCalculator) {
        this.elevationCalculator = elevationCalculator;
    }

    /**
     * Get elevations for multiple coordinates from an iterable
     * @param coordinates - Iterable of coordinates (array, generator, etc.)
     * @param zoomLevel - Tile zoom level (0-15)
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    public async getElevationsFrom(
        coordinates: Iterable<Coordinates>,
        zoomLevel: number,
        interpolation: boolean = true
    ): Promise<number[]> {
        const batchSize = 100;
        const allResults: number[] = [];
        let batch: Promise<number>[] = [];

        for (const coordinate of coordinates) {
            const elevation = this.elevationCalculator.getElevation(
                coordinate,
                zoomLevel,
                interpolation
            );
            batch.push(elevation);

            // Process batch when it reaches the batch size
            if (batch.length >= batchSize) {
                const batchResults = await Promise.all(batch);
                allResults.push(...batchResults);
                batch = [];
            }
        }

        // Process any remaining items in the last batch
        if (batch.length > 0) {
            const batchResults = await Promise.all(batch);
            allResults.push(...batchResults);
        }

        return allResults;
    }

    /**
     * Generate coordinates between two points at regular intervals
     * @param coordinate1 - Start coordinate
     * @param coordinate2 - End coordinate
     * @param step - Distance between points in meters
     */
    private *generateCoordinatesBetween(
        coordinate1: Coordinates,
        coordinate2: Coordinates,
        step: number
    ): Generator<Coordinates, void, unknown> {
        const distance = Distance.haversine(coordinate1, coordinate2);

        // Always yield the start point
        yield coordinate1;

        if (distance <= step) {
            // If distance is less than step, just yield the end point
            yield coordinate2;
            return;
        }

        // Calculate number of intermediate points
        const numSteps = Math.floor(distance / step);

        // Linear interpolation in lat/lng space (not great circle)
        const latDiff = coordinate2.latitude - coordinate1.latitude;
        const lonDiff = coordinate2.longitude - coordinate1.longitude;

        for (let i = 1; i <= numSteps; i++) {
            const fraction = (i * step) / distance;
            yield {
                latitude: coordinate1.latitude + latDiff * fraction,
                longitude: coordinate1.longitude + lonDiff * fraction,
            };
        }

        // Always yield the end point
        yield coordinate2;
    }

    /**
     * Generate coordinates along a path with multiple waypoints
     * @param path - Array of coordinates defining the path
     * @param step - Distance between points in meters
     */
    private *generateCoordinatesAlong(
        path: Coordinates[],
        step: number
    ): Generator<Coordinates, void, unknown> {
        if (path.length < 2) {
            return;
        }

        // Yield the first point
        yield path[0];

        for (let i = 0; i < path.length - 1; i++) {
            const segmentDistance = Distance.haversine(path[i], path[i + 1]);

            // Skip very short segments (< 1 meter)
            if (segmentDistance < ALGORITHM_CONSTANTS.MIN_SEGMENT_DISTANCE) {
                continue;
            }

            // Generate intermediate points for this segment
            // Skip the first point (already yielded from previous segment)
            let isFirst = true;
            for (const coord of this.generateCoordinatesBetween(path[i], path[i + 1], step)) {
                if (isFirst) {
                    isFirst = false;
                    continue; // Skip the first point to avoid duplicates
                }
                yield coord;
            }
        }
    }

    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param zoomLevel - Tile zoom level (0-15)
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     * @param smoothingOptions - Optional distance-based smoothing options
     * @param filterOptions - Optional filtering options using Douglas-Peucker algorithm
     */
    public async getElevationsAlong(
        path: Coordinates[],
        zoomLevel: number,
        step: number,
        interpolation: boolean = true,
        smoothingOptions?: SmoothingOptions,
        filterOptions?: FilterOptions
    ): Promise<CoordinatesElevation[]> {
        // Validate inputs
        if (path.length < 2) {
            throw new Error('Path must contain at least 2 coordinates');
        }
        if (step <= 1) {
            throw new Error(`Step is too small: ${step} meters`);
        }

        // Generate coordinates along the entire path
        const coordinates = Array.from(this.generateCoordinatesAlong(path, step));

        // Get elevations for all coordinates
        const elevations = await this.getElevationsFrom(coordinates, zoomLevel, interpolation);

        // Combine coordinates with elevations
        let coordinatesWithElevation = coordinates.map((coord, index) => ({
            ...coord,
            elevation: elevations[index],
        }));

        // Apply smoothing if explicitly enabled
        if (smoothingOptions?.enabled === true && coordinatesWithElevation.length >= 3) {
            const windowSize = smoothingOptions.windowSize ?? 50;
            coordinatesWithElevation = ElevationSmoother.smooth(
                coordinatesWithElevation,
                windowSize
            );
        }

        // Apply filtering if explicitly enabled
        if (filterOptions?.enabled === true && coordinatesWithElevation.length > 2) {
            const tolerance = filterOptions?.tolerance ?? 10;
            const zExaggeration = filterOptions?.zExaggeration ?? 3;

            return DouglasPeucker.simplify(coordinatesWithElevation, tolerance, zExaggeration);
        }

        return coordinatesWithElevation;
    }
}
