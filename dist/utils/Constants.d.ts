/**
 * Earth and mathematical constants used throughout the elevation library
 */
export declare const EARTH_CONSTANTS: {
    /** Semi-major axis in meters (WGS84 ellipsoid) */
    readonly SEMI_MAJOR_AXIS: 6378137;
    /** Mean radius in meters (used for distance calculations) */
    readonly MEAN_RADIUS: 6371000;
    /** First eccentricity squared (WGS84 ellipsoid) */
    readonly FIRST_ECCENTRICITY_SQUARED: 0.00669437999014;
};
/**
 * Mathematical constants
 */
export declare const MATH_CONSTANTS: {
    /** Degrees to radians conversion factor */
    readonly DEG_TO_RAD: number;
    /** Radians to degrees conversion factor */
    readonly RAD_TO_DEG: number;
};
/**
 * Algorithm constants
 */
export declare const ALGORITHM_CONSTANTS: {
    /** Minimum points needed for smoothing operations */
    readonly MIN_SMOOTHING_POINTS: 3;
    /** Minimum segment distance in meters for path processing */
    readonly MIN_SEGMENT_DISTANCE: 1;
};
//# sourceMappingURL=Constants.d.ts.map