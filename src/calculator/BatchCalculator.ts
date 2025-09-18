import { Coordinates, CoordinatesElevation, FilterOptions, SmoothingOptions } from '../types';
import { ElevationCalculator } from './ElevationCalculator';
import { DouglasPeucker } from '../utils/DouglasPeucker';
import { ElevationSmoother } from '../utils/ElevationSmoother';
import { Distance } from '../utils/Distance';
import { ALGORITHM_CONSTANTS } from '../utils/Constants';
import { createLogger, Logger, LogLevel } from '../utils';

const logger: Logger = createLogger('calculator/BatchCalculator');

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
        let totalProcessed = 0;
        let batchNumber = 0;

        logger.info(
            'Batch processing started - zoom: %d, interpolation: %s, batchSize: %d',
            zoomLevel,
            interpolation,
            batchSize
        );

        const timer = 'batch-elevations';
        logger.timeLevel(LogLevel.INFO, timer);

        for (const coordinate of coordinates) {
            const elevation = this.elevationCalculator.getElevation(
                coordinate,
                zoomLevel,
                interpolation
            );
            batch.push(elevation);

            // Process batch when it reaches the batch size
            if (batch.length >= batchSize) {
                batchNumber++;
                logger.debug('Processing batch %d (%d coordinates)', batchNumber, batch.length);

                const batchTimer = `batch-${batchNumber}`;
                logger.timeLevel(LogLevel.DEBUG, batchTimer);

                const batchResults = await Promise.all(batch);
                allResults.push(...batchResults);
                totalProcessed += batch.length;

                logger.timeEndLevel(LogLevel.DEBUG, batchTimer);
                logger.debug(
                    'Batch %d completed - processed: %d, total: %d',
                    batchNumber,
                    batch.length,
                    totalProcessed
                );

                batch = [];
            }
        }

        // Process any remaining items in the last batch
        if (batch.length > 0) {
            batchNumber++;
            logger.debug('Processing final batch %d (%d coordinates)', batchNumber, batch.length);

            const batchTimer = `batch-${batchNumber}`;
            logger.timeLevel(LogLevel.DEBUG, batchTimer);

            const batchResults = await Promise.all(batch);
            allResults.push(...batchResults);
            totalProcessed += batch.length;

            logger.timeEndLevel(LogLevel.DEBUG, batchTimer);
            logger.debug(
                'Final batch %d completed - processed: %d, total: %d',
                batchNumber,
                batch.length,
                totalProcessed
            );
        }

        logger.timeEndLevel(LogLevel.INFO, timer);
        logger.info(
            'Batch processing completed - total coordinates: %d, batches: %d',
            totalProcessed,
            batchNumber
        );

        return allResults;
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
        const pathTimer = 'path-elevations';
        logger.timeLevel(LogLevel.INFO, pathTimer);

        logger.info(
            'Path processing started - waypoints: %d, step: %dm, zoom: %d, interpolation: %s',
            path.length,
            step,
            zoomLevel,
            interpolation
        );

        // Validate inputs
        if (path.length < 2) {
            logger.error('Path validation failed - insufficient waypoints: %d', path.length);
            throw new Error('Path must contain at least 2 coordinates');
        }
        if (step <= 1) {
            logger.error('Path validation failed - step too small: %dm', step);
            throw new Error(`Step is too small: ${step} meters`);
        }

        // Generate coordinates along the entire path
        logger.debug('Generating coordinates along path');
        const coordGenTimer = 'coordinate-generation';
        logger.timeLevel(LogLevel.DEBUG, coordGenTimer);

        const coordinates = Array.from(this.generateCoordinatesAlong(path, step));

        logger.timeEndLevel(LogLevel.DEBUG, coordGenTimer);
        logger.debug('Generated %d coordinates along path', coordinates.length);

        // Get elevations for all coordinates
        logger.debug('Fetching elevations for generated coordinates');
        const elevations = await this.getElevationsFrom(coordinates, zoomLevel, interpolation);

        // Combine coordinates with elevations
        let coordinatesWithElevation = coordinates.map((coord, index) => ({
            ...coord,
            elevation: elevations[index],
        }));

        logger.debug(
            'Combined coordinates with elevations - points: %d',
            coordinatesWithElevation.length
        );

        // Apply smoothing if explicitly enabled
        if (smoothingOptions?.enabled === true && coordinatesWithElevation.length >= 3) {
            const windowSize = smoothingOptions.windowSize ?? 50;
            const originalCount = coordinatesWithElevation.length;

            logger.debug('Applying elevation smoothing - windowSize: %dm', windowSize);
            const smoothTimer = 'smoothing';
            logger.timeLevel(LogLevel.DEBUG, smoothTimer);

            coordinatesWithElevation = ElevationSmoother.smooth(
                coordinatesWithElevation,
                windowSize
            );

            logger.timeEndLevel(LogLevel.DEBUG, smoothTimer);
            logger.debug(
                'Smoothing completed - points: %d → %d',
                originalCount,
                coordinatesWithElevation.length
            );
        } else if (smoothingOptions?.enabled === true) {
            logger.debug(
                'Smoothing skipped - insufficient points: %d (minimum: 3)',
                coordinatesWithElevation.length
            );
        }

        // Apply filtering if explicitly enabled
        if (filterOptions?.enabled === true && coordinatesWithElevation.length > 2) {
            const tolerance = filterOptions?.tolerance ?? 10;
            const zExaggeration = filterOptions?.zExaggeration ?? 3;
            const originalCount = coordinatesWithElevation.length;

            logger.debug(
                'Applying Douglas-Peucker filtering - tolerance: %d, zExaggeration: %d',
                tolerance,
                zExaggeration
            );
            const filterTimer = 'filtering';
            logger.timeLevel(LogLevel.DEBUG, filterTimer);

            const filtered = DouglasPeucker.simplify(
                coordinatesWithElevation,
                tolerance,
                zExaggeration
            );

            logger.timeEndLevel(LogLevel.DEBUG, filterTimer);
            logger.debug(
                'Filtering completed - points: %d → %d (%.1f%% reduction)',
                originalCount,
                filtered.length,
                ((originalCount - filtered.length) / originalCount) * 100
            );

            logger.timeEndLevel(LogLevel.INFO, pathTimer);
            logger.info(
                'Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s',
                path.length,
                filtered.length,
                smoothingOptions?.enabled,
                filterOptions?.enabled
            );

            return filtered;
        } else if (filterOptions?.enabled === true) {
            logger.debug(
                'Filtering skipped - insufficient points: %d (minimum: 3)',
                coordinatesWithElevation.length
            );
        }

        logger.timeEndLevel(LogLevel.INFO, pathTimer);
        logger.info(
            'Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s',
            path.length,
            coordinatesWithElevation.length,
            smoothingOptions?.enabled,
            filterOptions?.enabled
        );

        return coordinatesWithElevation;
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
            logger.debug('Path generation skipped - insufficient waypoints: %d', path.length);
            return;
        }

        logger.debug('Generating coordinates - waypoints: %d, step: %dm', path.length, step);

        // Yield the first point
        yield path[0];
        let totalGenerated = 1;
        let skippedSegments = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const segmentDistance = Distance.haversine(path[i], path[i + 1]);

            // Skip very short segments (< 1 meter)
            if (segmentDistance < ALGORITHM_CONSTANTS.MIN_SEGMENT_DISTANCE) {
                skippedSegments++;
                logger.debug(
                    'Segment %d skipped - distance too short: %.2fm (minimum: %.2fm)',
                    i + 1,
                    segmentDistance,
                    ALGORITHM_CONSTANTS.MIN_SEGMENT_DISTANCE
                );
                continue;
            }

            logger.debug('Processing segment %d - distance: %.2fm', i + 1, segmentDistance);

            // Generate intermediate points for this segment
            // Skip the first point (already yielded from previous segment)
            let isFirst = true;
            let segmentGenerated = 0;
            for (const coord of this.generateCoordinatesBetween(path[i], path[i + 1], step)) {
                if (isFirst) {
                    isFirst = false;
                    continue; // Skip the first point to avoid duplicates
                }
                yield coord;
                totalGenerated++;
                segmentGenerated++;
            }

            logger.debug('Segment %d completed - generated: %d points', i + 1, segmentGenerated);
        }

        if (skippedSegments > 0) {
            logger.debug(
                'Path generation completed - generated: %d points, skipped segments: %d',
                totalGenerated,
                skippedSegments
            );
        } else {
            logger.debug('Path generation completed - generated: %d points', totalGenerated);
        }
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
}
