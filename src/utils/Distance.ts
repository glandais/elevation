import { Coordinates } from '../types';
import { EARTH_CONSTANTS, MATH_CONSTANTS } from './Constants';
import { Vector3D } from './Vector3D';

/**
 * Distance calculation utilities for geographic and 3D coordinates
 */
export class Distance {
    /**
     * Calculate great circle distance between two geographic coordinates using Haversine formula
     * @param coord1 - First coordinate
     * @param coord2 - Second coordinate
     * @returns Distance in meters
     */
    public static haversine(coord1: Coordinates, coord2: Coordinates): number {
        const lat1Rad = coord1.latitude * MATH_CONSTANTS.DEG_TO_RAD;
        const lat2Rad = coord2.latitude * MATH_CONSTANTS.DEG_TO_RAD;
        const deltaLat = (coord2.latitude - coord1.latitude) * MATH_CONSTANTS.DEG_TO_RAD;
        const deltaLon = (coord2.longitude - coord1.longitude) * MATH_CONSTANTS.DEG_TO_RAD;

        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_CONSTANTS.MEAN_RADIUS * c;
    }

    /**
     * Calculate Euclidean distance between two 3D points
     * @param point1 - First 3D point
     * @param point2 - Second 3D point
     * @returns Distance in meters
     */
    public static euclidean3D(point1: Vector3D, point2: Vector3D): number {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = point1.z - point2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Calculate perpendicular distance from a point to a line segment in 3D space
     * @param point - Point to measure from
     * @param segmentStart - Start point of line segment
     * @param segmentEnd - End point of line segment
     * @returns Perpendicular distance in meters
     */
    public static pointToSegment3D(
        point: Vector3D,
        segmentStart: Vector3D,
        segmentEnd: Vector3D
    ): number {
        const segmentVector = segmentEnd.subtract(segmentStart);
        const pointVector = point.subtract(segmentStart);

        // Check if segment has zero length
        const segmentLengthSquared = segmentVector.dot(segmentVector);
        if (segmentLengthSquared === 0) {
            return Distance.euclidean3D(point, segmentStart);
        }

        // Calculate parameter t for closest point on segment
        const t = Math.max(0, Math.min(1, pointVector.dot(segmentVector) / segmentLengthSquared));

        // Calculate closest point on segment
        const closestPoint = segmentStart.add(segmentVector.multiply(t));

        // Return distance to closest point
        return Distance.euclidean3D(point, closestPoint);
    }

    /**
     * Calculate cumulative distances along a path of coordinates
     * @param points - Array of coordinates
     * @returns Array of cumulative distances in meters
     */
    public static cumulativeDistances(points: Coordinates[]): number[] {
        const distances: number[] = [0];

        for (let i = 1; i < points.length; i++) {
            const segmentDistance = Distance.haversine(points[i - 1], points[i]);
            distances.push(distances[i - 1] + segmentDistance);
        }

        return distances;
    }

    /**
     * Calculate total distance along a path of coordinates
     * @param points - Array of coordinates
     * @returns Total distance in meters
     */
    public static totalPathDistance(points: Coordinates[]): number {
        if (points.length < 2) {
            return 0;
        }

        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
            totalDistance += Distance.haversine(points[i - 1], points[i]);
        }

        return totalDistance;
    }
}
