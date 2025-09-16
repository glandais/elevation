import { CoordinatesElevation } from '../types';
import { Vector3D } from './Vector3D';
/**
 * Earth constants for WGS84 ellipsoid
 */
export declare const EARTH_CONSTANTS: {
    /** Semi-major axis in meters */
    readonly SEMI_MAJOR_AXIS: 6378137;
    /** First eccentricity squared */
    readonly FIRST_ECCENTRICITY_SQUARED: 0.00669437999014;
};
/**
 * ECEF (Earth-Centered, Earth-Fixed) coordinate converter
 * Converts WGS84 coordinates (lat/lon/elevation) to ECEF Cartesian coordinates
 */
export declare class EcefConverter {
    /**
     * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
     * @param coordinates - Geographic coordinates with elevation
     * @param zExaggeration - Elevation exaggeration factor (default: 3)
     * @returns ECEF coordinates as Vector3D
     */
    static toEcef(coordinates: CoordinatesElevation, zExaggeration?: number): Vector3D;
    /**
     * Convert multiple coordinates to ECEF vectors
     * @param coordinates - Array of geographic coordinates with elevation
     * @param zExaggeration - Elevation exaggeration factor (default: 3)
     * @returns Array of ECEF coordinates as Vector3D
     */
    static convertBatch(coordinates: CoordinatesElevation[], zExaggeration?: number): Vector3D[];
}
//# sourceMappingURL=EcefConverter.d.ts.map