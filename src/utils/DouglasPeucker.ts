import { CoordinatesElevation } from '../types';
import { EcefConverter } from './EcefConverter';

/**
 * 3D Douglas-Peucker algorithm implementation for elevation profile simplification
 * Uses ECEF coordinates for true 3D distance calculations
 */
export class DouglasPeucker {
    /**
     * Simplify a path using the Douglas-Peucker algorithm in 3D space
     * @param points - Array of coordinates with elevation
     * @param tolerance - Maximum allowed distance from simplified line in meters
     * @param zExaggeration - Elevation exaggeration factor for ECEF conversion (default: 3)
     * @returns Simplified array of coordinates
     */
    public static simplify(
        points: CoordinatesElevation[],
        tolerance: number,
        zExaggeration: number = 3
    ): CoordinatesElevation[] {
        if (points.length <= 2) {
            return [...points]; // Return copy to avoid mutation
        }

        const lastIndex = points.length - 1;
        const simplified: CoordinatesElevation[] = [];

        // Always include first point
        simplified.push(points[0]);

        // Recursively simplify the path
        const intermediatePoints = this.simplifyRecursive(
            points,
            0,
            lastIndex,
            tolerance,
            zExaggeration
        );
        simplified.push(...intermediatePoints);

        // Always include last point
        simplified.push(points[lastIndex]);

        return simplified;
    }

    /**
     * Recursive step of the Douglas-Peucker algorithm
     * @param points - Array of all points
     * @param firstIndex - Index of first point in current segment
     * @param lastIndex - Index of last point in current segment
     * @param tolerance - Maximum allowed distance in meters
     * @param zExaggeration - Elevation exaggeration factor
     * @returns Array of points to include in simplified path
     */
    private static simplifyRecursive(
        points: CoordinatesElevation[],
        firstIndex: number,
        lastIndex: number,
        tolerance: number,
        zExaggeration: number
    ): CoordinatesElevation[] {
        let maxDistance = 0;
        let maxIndex = -1;
        const result: CoordinatesElevation[] = [];

        // Convert segment endpoints to ECEF
        const firstEcef = EcefConverter.toEcef(points[firstIndex], zExaggeration);
        const lastEcef = EcefConverter.toEcef(points[lastIndex], zExaggeration);

        // Find the point with maximum perpendicular distance to the line segment
        for (let i = firstIndex + 1; i < lastIndex; i++) {
            const pointEcef = EcefConverter.toEcef(points[i], zExaggeration);
            const distance = pointEcef.distanceToSegment(firstEcef, lastEcef);

            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        // If the maximum distance is greater than tolerance, split the segment
        if (maxDistance > tolerance && maxIndex !== -1) {
            // Recursively simplify the first sub-segment
            if (maxIndex - firstIndex > 1) {
                const leftSegment = this.simplifyRecursive(
                    points,
                    firstIndex,
                    maxIndex,
                    tolerance,
                    zExaggeration
                );
                result.push(...leftSegment);
            }

            // Include the point with maximum distance
            result.push(points[maxIndex]);

            // Recursively simplify the second sub-segment
            if (lastIndex - maxIndex > 1) {
                const rightSegment = this.simplifyRecursive(
                    points,
                    maxIndex,
                    lastIndex,
                    tolerance,
                    zExaggeration
                );
                result.push(...rightSegment);
            }
        }

        return result;
    }

    /**
     * Calculate reduction percentage after simplification
     * @param originalCount - Original number of points
     * @param simplifiedCount - Number of points after simplification
     * @returns Reduction percentage (0-100)
     */
    public static calculateReduction(originalCount: number, simplifiedCount: number): number {
        if (originalCount === 0) {
            return 0;
        }
        return Math.round(((originalCount - simplifiedCount) / originalCount) * 100);
    }

    /**
     * Estimate appropriate tolerance based on path characteristics
     * @param points - Array of coordinates with elevation
     * @param targetReduction - Desired reduction percentage (0-100, default: 50)
     * @returns Suggested tolerance in meters
     */
    public static estimateTolerance(
        points: CoordinatesElevation[],
        targetReduction: number = 50
    ): number {
        if (points.length <= 2) {
            return 10; // Default fallback
        }

        // Calculate elevation range for scaling
        const elevations = points.map(p => p.elevation);
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const elevationRange = maxElevation - minElevation;

        // Base tolerance on elevation range and target reduction
        // More aggressive simplification for larger elevation ranges
        const baseToleranceRate = targetReduction / 100;
        const tolerance = Math.max(
            5, // Minimum 5 meters
            Math.min(
                100, // Maximum 100 meters
                elevationRange * baseToleranceRate * 0.1
            )
        );

        return Math.round(tolerance);
    }
}
