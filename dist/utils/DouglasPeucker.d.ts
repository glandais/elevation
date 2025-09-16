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
    /**
     * Calculate reduction percentage after simplification
     * @param originalCount - Original number of points
     * @param simplifiedCount - Number of points after simplification
     * @returns Reduction percentage (0-100)
     */
    static calculateReduction(originalCount: number, simplifiedCount: number): number;
    /**
     * Estimate appropriate tolerance based on path characteristics
     * @param points - Array of coordinates with elevation
     * @param targetReduction - Desired reduction percentage (0-100, default: 50)
     * @returns Suggested tolerance in meters
     */
    static estimateTolerance(points: CoordinatesElevation[], targetReduction?: number): number;
}
//# sourceMappingURL=DouglasPeucker.d.ts.map