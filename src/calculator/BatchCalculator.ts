import {
    asCoordinatesElevation,
    Coordinates,
    CoordinatesElevation,
    FilterOptions,
    SmoothingOptions,
    TileCoordinates,
} from '../types';
import { ElevationCalculator } from './ElevationCalculator';
import { DouglasPeucker } from '../utils/DouglasPeucker';
import { ElevationSmoother } from '../utils/ElevationSmoother';
import { Distance } from '../utils/Distance';
import { createLogger, Logger, LogLevel } from '../utils';
import { Flux } from './Reactive';
import { toTileCoordinates } from './ElevationFunctions';

const logger: Logger = createLogger('calculator/BatchCalculator');

export class BatchCalculator {
    private readonly elevationCalculator: ElevationCalculator;

    constructor(elevationCalculator: ElevationCalculator) {
        this.elevationCalculator = elevationCalculator;
    }

    public async setElevations(
        coordinates: Iterable<Coordinates>,
        zoomLevel: number,
        interpolation: boolean
    ): Promise<void> {
        const pointsPerTile: Record<string, Coordinates[]> = {};
        const tileCoordinatesMap: Map<string, TileCoordinates> = new Map();

        // Helper function to create a unique key for tile coordinates
        const tileKey = (tile: TileCoordinates): string => `${tile.z}/${tile.x}/${tile.y}`;

        // Populate pointsPerTile by grouping coordinates by their tile
        for (const point of coordinates) {
            const tile = toTileCoordinates(point, zoomLevel);
            const key = tileKey(tile);

            let array = pointsPerTile[key];
            if (!array) {
                array = [];
                pointsPerTile[key] = array;
                tileCoordinatesMap.set(key, tile);
            }
            array.push(point);
        }

        const tiles = Array.from(tileCoordinatesMap.values());
        await Flux.from(tiles)
            .mapAsync(async tile => {
                const key = tileKey(tile);
                const points: Coordinates[] = pointsPerTile[key];
                for (const point of points) {
                    point.elevation = await this.elevationCalculator.getElevation(
                        point,
                        zoomLevel,
                        interpolation
                    );
                }
                return tile;
            }, 10)
            .countProcessed();
    }

    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param zoomLevel - Tile zoom level (0-15)
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results
     * @param smoothingOptions - Optional distance-based smoothing options
     * @param filterOptions - Optional filtering options using Douglas-Peucker algorithm
     */
    public async getElevationsAlong(
        path: Coordinates[],
        zoomLevel: number,
        step: number,
        minDistance: number,
        interpolation: boolean,
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

        let coordinates = Array.from(this.generateCoordinatesAlong(path, step, minDistance));

        logger.timeEndLevel(LogLevel.DEBUG, coordGenTimer);
        logger.debug('Generated %d coordinates along path', coordinates.length);

        // Get elevations for all coordinates
        logger.debug('Fetching elevations for generated coordinates');
        await this.setElevations(coordinates, zoomLevel, interpolation);

        logger.debug('Combined coordinates with elevations - points: %d', coordinates.length);

        // Apply smoothing if explicitly enabled
        if (smoothingOptions?.enabled === true && coordinates.length >= 3) {
            const windowSize = smoothingOptions.windowSize ?? 50;
            const originalCount = coordinates.length;

            logger.debug('Applying elevation smoothing - windowSize: %dm', windowSize);
            const smoothTimer = 'smoothing';
            logger.timeLevel(LogLevel.DEBUG, smoothTimer);

            coordinates = ElevationSmoother.smooth(coordinates, windowSize);

            logger.timeEndLevel(LogLevel.DEBUG, smoothTimer);
            logger.debug(
                'Smoothing completed - points: %d → %d',
                originalCount,
                coordinates.length
            );
        } else if (smoothingOptions?.enabled === true) {
            logger.debug(
                'Smoothing skipped - insufficient points: %d (minimum: 3)',
                coordinates.length
            );
        }

        // Apply filtering if explicitly enabled
        if (filterOptions?.enabled === true && coordinates.length > 2) {
            const tolerance = filterOptions?.tolerance ?? 10;
            const zExaggeration = filterOptions?.zExaggeration ?? 3;
            const originalCount = coordinates.length;

            logger.debug(
                'Applying Douglas-Peucker filtering - tolerance: %d, zExaggeration: %d',
                tolerance,
                zExaggeration
            );
            const filterTimer = 'filtering';
            logger.timeLevel(LogLevel.DEBUG, filterTimer);

            const filtered = DouglasPeucker.simplify(coordinates, tolerance, zExaggeration);

            logger.timeEndLevel(LogLevel.DEBUG, filterTimer);
            logger.debug(
                'Filtering completed - points: %d → %d (%f % reduction)',
                originalCount,
                filtered.length,
                (((originalCount - filtered.length) / originalCount) * 100).toFixed(1)
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
                coordinates.length
            );
        }

        logger.timeEndLevel(LogLevel.INFO, pathTimer);
        logger.info(
            'Path processing completed - waypoints: %d, final points: %d, smoothed: %s, filtered: %s',
            path.length,
            coordinates.length,
            smoothingOptions?.enabled,
            filterOptions?.enabled
        );

        return coordinates;
    }

    /**
     * Generate coordinates along a path with multiple waypoints
     * @param path - Array of coordinates defining the path
     * @param step - Distance between points in meters
     */
    private *generateCoordinatesAlong(
        path: Coordinates[],
        step: number,
        minDistance: number
    ): Generator<CoordinatesElevation, void, unknown> {
        if (path.length < 2) {
            logger.debug('Path generation skipped - insufficient waypoints: %d', path.length);
            return;
        }

        logger.debug('Generating coordinates - waypoints: %d, step: %dm', path.length, step);

        // Yield the first point
        yield asCoordinatesElevation(path[0]);
        let totalGenerated = 1;
        let skippedSegments = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const segmentDistance = Distance.haversine(path[i], path[i + 1]);

            // Skip very short segments (< 1 meter)
            if (segmentDistance < minDistance) {
                skippedSegments++;
                logger.debug(
                    'Segment %d skipped - distance too short: %.2fm (minimum: %.2fm)',
                    i + 1,
                    segmentDistance,
                    minDistance
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
    ): Generator<CoordinatesElevation, void, unknown> {
        const distance = Distance.haversine(coordinate1, coordinate2);

        // Always yield the start point
        yield asCoordinatesElevation(coordinate1);

        if (distance <= step) {
            // If distance is less than step, just yield the end point
            yield asCoordinatesElevation(coordinate2);
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
                elevation: 0,
            };
        }

        // Always yield the end point
        yield asCoordinatesElevation(coordinate2);
    }
}
