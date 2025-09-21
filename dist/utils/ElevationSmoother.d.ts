import { CoordinatesElevation } from '../types';
/**
 * Distance-based elevation smoothing using weighted triangular kernel
 * Based on the algorithm from Java SmoothService
 */
export declare class ElevationSmoother {
    /**
     * Apply distance-based smoothing to elevation data
     * @param points - Array of coordinates with elevation
     * @param windowSize - Smoothing window in meters (default: 50)
     * @returns Smoothed elevation data
     */
    static smooth(points: CoordinatesElevation[], windowSize?: number): CoordinatesElevation[];
    /**
     * Compute smoothed elevation value for a single point
     * @param index - Index of point to smooth
     * @param points - All points
     * @param distances - Cumulative distances
     * @param windowSize - Smoothing window in meters
     * @returns Smoothed elevation value
     */
    private static computeSmoothedValue;
}
//# sourceMappingURL=ElevationSmoother.d.ts.map