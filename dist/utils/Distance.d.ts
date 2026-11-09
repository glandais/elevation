import { Coordinates } from '../types';
import { Vector3D } from './Vector3D';
/**
 * Distance calculation utilities for geographic and 3D coordinates
 */
export declare class Distance {
    /**
     * Calculate great circle distance between two geographic coordinates using Haversine formula
     * @param coord1 - First coordinate
     * @param coord2 - Second coordinate
     * @returns Distance in meters
     */
    static haversine(coord1: Coordinates, coord2: Coordinates): number;
    /**
     * Calculate Euclidean distance between two 3D points
     * @param point1 - First 3D point
     * @param point2 - Second 3D point
     * @returns Distance in meters
     */
    static euclidean3D(point1: Vector3D, point2: Vector3D): number;
    /**
     * Calculate perpendicular distance from a point to a line segment in 3D space
     * @param point - Point to measure from
     * @param segmentStart - Start point of line segment
     * @param segmentEnd - End point of line segment
     * @returns Perpendicular distance in meters
     */
    static pointToSegment3D(point: Vector3D, segmentStart: Vector3D, segmentEnd: Vector3D): number;
    /**
     * Calculate cumulative distances along a path of coordinates
     * @param points - Array of coordinates
     * @returns Array of cumulative distances in meters
     */
    static cumulativeDistances(points: Coordinates[]): number[];
    /**
     * Calculate total distance along a path of coordinates
     * @param points - Array of coordinates
     * @returns Total distance in meters
     */
    static totalPathDistance(points: Coordinates[]): number;
}
//# sourceMappingURL=Distance.d.ts.map