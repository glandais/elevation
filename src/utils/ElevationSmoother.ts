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

        // Calculate cumulative distances for efficient range queries
        const distances = Distance.cumulativeDistances(points);

        // Apply smoothing to each point
        const smoothedPoints: CoordinatesElevation[] = [];

        for (let i = 0; i < points.length; i++) {
            const smoothedElevation = this.computeSmoothedValue(i, points, distances, windowSize);

            smoothedPoints.push({
                ...points[i],
                elevation: smoothedElevation,
            });
        }
        logger.timeEndLevel(LogLevel.INFO, 'smooth');

        return smoothedPoints;
    }

    /**
     * Compute smoothed elevation value for a single point
     * @param index - Index of point to smooth
     * @param points - All points
     * @param distances - Cumulative distances
     * @param windowSize - Smoothing window in meters
     * @returns Smoothed elevation value
     */
    private static computeSmoothedValue(
        index: number,
        points: CoordinatesElevation[],
        distances: number[],
        windowSize: number
    ): number {
        const currentDistance = distances[index];

        // Find range of points within the window
        let startIndex = index;
        while (startIndex > 0 && currentDistance - distances[startIndex - 1] <= windowSize) {
            startIndex--;
        }

        let endIndex = index;
        while (
            endIndex < points.length - 1 &&
            distances[endIndex + 1] - currentDistance <= windowSize
        ) {
            endIndex++;
        }

        // Apply weighted averaging using triangular kernel
        let totalWeight = 0;
        let weightedSum = 0;

        for (let j = startIndex; j <= endIndex; j++) {
            const distanceFromCurrent = Math.abs(distances[j] - currentDistance);

            // Triangular kernel: weight = 1 - (distance / windowSize)
            const weight = 1 - distanceFromCurrent / windowSize;

            totalWeight += weight;
            weightedSum += points[j].elevation * weight;
        }

        // Return weighted average, or original value if no valid weights
        // Note: totalWeight should always be > 0 since current point has weight = 1,
        // but this check provides defensive programming against edge cases
        return totalWeight > 0 ? weightedSum / totalWeight : points[index].elevation;
    }
}
