import { CoordinatesElevation } from '../types';
/**
 * 3D Douglas-Peucker algorithm implementation for elevation profile simplification
 * Uses ECEF coordinates for true 3D distance calculations
 */
export declare class DouglasPeucker {
    /**
     * Simplify a path using the Douglas-Peucker algorithm in 3D space
     * @param points - Array of coordinates with elevation
     * @param tolerance - Maximum allowed distance from simplified line in meters
     * @param zExaggeration - Elevation exaggeration factor for ECEF conversion (default: 3)
     * @returns Simplified array of coordinates
     */
    static simplify(points: CoordinatesElevation[], tolerance: number, zExaggeration?: number): CoordinatesElevation[];
    /**
     * Recursive step of the Douglas-Peucker algorithm
     * @param points - Array of all points
     * @param firstIndex - Index of first point in current segment
     * @param lastIndex - Index of last point in current segment
     * @param tolerance - Maximum allowed distance in meters
     * @param zExaggeration - Elevation exaggeration factor
     * @returns Array of points to include in simplified path
     */
    private static simplifyRecursive;
}
//# sourceMappingURL=DouglasPeucker.d.ts.map