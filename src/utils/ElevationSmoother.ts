import { CoordinatesElevation } from '../types';
import { ALGORITHM_CONSTANTS } from './Constants';
import { Distance } from './Distance';
import { createLogger, Logger, LogLevel } from './Logger';

const logger: Logger = createLogger('utils/ElevationSmoother');

/**
 * Distance-based elevation smoothing using weighted triangular kernel
 * Based on the algorithm from Java SmoothService
 */
export class ElevationSmoother {
    /**
     * Apply distance-based smoothing to elevation data
     * @param points - Array of coordinates with elevation
     * @param windowSize - Smoothing window in meters (default: 50)
     * @returns Smoothed elevation data
     */
    public static smooth(
        points: CoordinatesElevation[],
        windowSize: number = 50
    ): CoordinatesElevation[] {
        logger.debug('smooth %s', points.length);
        // Validate inputs
        if (points.length < ALGORITHM_CONSTANTS.MIN_SMOOTHING_POINTS) {
            logger.debug('too small');
            return points; // Not enough points to smooth
        }

        if (windowSize <= 0) {
            throw new Error(`Invalid window size: ${windowSize}. Must be positive`);
        }
        logger.timeLevel(LogLevel.INFO, 'smooth');

        const distances = Distance.cumulativeDistances(points);
        const smoothed = ElevationSmoother.smoothProfile(
            distances,
            points.map(p => p.elevation),
            windowSize
        );
        const smoothedPoints = points.map((point, i) => ({ ...point, elevation: smoothed[i] }));
        logger.timeEndLevel(LogLevel.INFO, 'smooth');

        return smoothedPoints;
    }

    /**
     * The kernel of {@link smooth}, on flat arrays.
     *
     * `distances` must be non-decreasing (cumulative meters along the path) and the same length as
     * `elevations`. The window is a **half-width** applied on each side, so a `windowSize` of 150
     * spans 300 m of path, the extreme members carrying a weight of ~0.
     *
     * Exists as its own entry point so callers that already hold a profile as arrays do not have
     * to allocate one {@link CoordinatesElevation} per point.
     *
     * Unlike {@link smooth}, which throws, a `windowSize` that is not strictly positive means
     * "do not smooth" and returns a copy of `elevations`. So do fewer than
     * `ALGORITHM_CONSTANTS.MIN_SMOOTHING_POINTS` points.
     *
     * @param distances - Cumulative distance of each point in meters
     * @param elevations - Elevation of each point in meters
     * @param windowSize - Kernel half-width in meters
     * @returns A new array of smoothed elevations
     */
    public static smoothProfile(
        distances: ArrayLike<number>,
        elevations: ArrayLike<number>,
        windowSize: number
    ): number[] {
        if (distances.length !== elevations.length) {
            throw new Error(
                `distances (${distances.length}) and elevations (${elevations.length}) must have the same length`
            );
        }
        const n = elevations.length;
        if (n < ALGORITHM_CONSTANTS.MIN_SMOOTHING_POINTS || !(windowSize > 0)) {
            return Array.from(elevations);
        }

        const out = new Array<number>(n);
        // The window bounds are monotone in `i`, so two cursors sweep the profile once between
        // them instead of being re-searched from `i` for every point.
        let startIndex = 0;
        let endIndex = 0;
        for (let i = 0; i < n; i++) {
            const current = distances[i];
            while (current - distances[startIndex] > windowSize) {
                startIndex++;
            }
            if (endIndex < i) {
                endIndex = i;
            }
            while (endIndex < n - 1 && distances[endIndex + 1] - current <= windowSize) {
                endIndex++;
            }

            // Triangular kernel: weight = 1 - (distance / windowSize). The current point always
            // has weight 1, so totalWeight > 0.
            let totalWeight = 0;
            let weightedSum = 0;
            for (let j = startIndex; j <= endIndex; j++) {
                const weight = 1 - Math.abs(distances[j] - current) / windowSize;
                totalWeight += weight;
                weightedSum += elevations[j] * weight;
            }
            out[i] = weightedSum / totalWeight;
        }
        return out;
    }
}
