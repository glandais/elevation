/**
 * Earth and mathematical constants used throughout the elevation library
 */
export const EARTH_CONSTANTS = {
    /** Semi-major axis in meters (WGS84 ellipsoid) */
    SEMI_MAJOR_AXIS: 6378137.0,
    /** Mean radius in meters (used for distance calculations) */
    MEAN_RADIUS: 6371000,
    /** First eccentricity squared (WGS84 ellipsoid) */
    FIRST_ECCENTRICITY_SQUARED: 0.00669437999014,
} as const;

/**
 * Mathematical constants
 */
export const MATH_CONSTANTS = {
    /** Degrees to radians conversion factor */
    DEG_TO_RAD: Math.PI / 180,
    /** Radians to degrees conversion factor */
    RAD_TO_DEG: 180 / Math.PI,
} as const;

/**
 * Algorithm constants
 */
export const ALGORITHM_CONSTANTS = {
    /** Minimum points needed for smoothing operations */
    MIN_SMOOTHING_POINTS: 3,
    /** Minimum segment distance in meters for path processing */
    MIN_SEGMENT_DISTANCE: 1,
} as const;
