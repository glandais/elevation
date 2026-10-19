/**
 * 3D Vector class for ECEF coordinate operations
 */
export declare class Vector3D {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    constructor(x: number, y: number, z: number);
    /**
     * Calculate Euclidean distance between two vectors
     */
    distanceTo(other: Vector3D): number;
    /**
     * Subtract two vectors
     */
    subtract(other: Vector3D): Vector3D;
    /**
     * Add two vectors
     */
    add(other: Vector3D): Vector3D;
    /**
     * Multiply vector by scalar
     */
    multiply(scalar: number): Vector3D;
    /**
     * Calculate dot product with another vector
     */
    dot(other: Vector3D): number;
    /**
     * Calculate cross product with another vector
     */
    cross(other: Vector3D): Vector3D;
    /**
     * Calculate the magnitude (length) of the vector
     */
    magnitude(): number;
    /**
     * Normalize the vector to unit length
     */
    normalize(): Vector3D;
    /**
     * Calculate the shortest distance from this point to a line segment
     */
    distanceToSegment(segmentStart: Vector3D, segmentEnd: Vector3D): number;
}
//# sourceMappingURL=Vector3D.d.ts.map