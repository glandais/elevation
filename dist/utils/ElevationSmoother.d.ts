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
    static smoothProfile(distances: ArrayLike<number>, elevations: ArrayLike<number>, windowSize: number): number[];
}
//# sourceMappingURL=ElevationSmoother.d.ts.map