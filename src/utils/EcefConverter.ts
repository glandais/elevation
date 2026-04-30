import { Coordinates } from '../types';
import { EARTH_CONSTANTS } from './Constants';
import { Vector3D } from './Vector3D';

/**
 * ECEF (Earth-Centered, Earth-Fixed) coordinate converter
 * Converts WGS84 coordinates (lat/lon/elevation) to ECEF Cartesian coordinates
 */
export class EcefConverter {
    /**
     * Convert WGS84 coordinates to ECEF coordinates with optional elevation exaggeration
     * @param coordinates - Geographic coordinates with elevation
     * @param zExaggeration - Elevation exaggeration factor (default: 3)
     * @returns ECEF coordinates as Vector3D
     */
    public static toEcef(coordinates: Coordinates, zExaggeration: number = 3): Vector3D {
        // Convert degrees to radians
        const latRad = (coordinates.latitude * Math.PI) / 180;
        const lonRad = (coordinates.longitude * Math.PI) / 180;

        // Apply elevation exaggeration
        const elevationExaggerated = zExaggeration * (coordinates.elevation || 0);

        // Calculate prime vertical radius of curvature
        const sinLat = Math.sin(latRad);
        const n =
            EARTH_CONSTANTS.SEMI_MAJOR_AXIS /
            Math.sqrt(1 - EARTH_CONSTANTS.FIRST_ECCENTRICITY_SQUARED * sinLat * sinLat);

        // Calculate ECEF coordinates
        const cosLat = Math.cos(latRad);
        const cosLon = Math.cos(lonRad);
        const sinLon = Math.sin(lonRad);

        const x = (n + elevationExaggerated) * cosLat * cosLon;
        const y = (n + elevationExaggerated) * cosLat * sinLon;
        const z =
            (n * (1 - EARTH_CONSTANTS.FIRST_ECCENTRICITY_SQUARED) + elevationExaggerated) * sinLat;

        return new Vector3D(x, y, z);
    }

    /**
     * Convert multiple coordinates to ECEF vectors
     * @param coordinates - Array of geographic coordinates with elevation
     * @param zExaggeration - Elevation exaggeration factor (default: 3)
     * @returns Array of ECEF coordinates as Vector3D
     */
    public static convertBatch(coordinates: Coordinates[], zExaggeration: number = 3): Vector3D[] {
        return coordinates.map(coord => this.toEcef(coord, zExaggeration));
    }
}
