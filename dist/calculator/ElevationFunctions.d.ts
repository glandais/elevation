import { Coordinates, Pixel } from 'src/types';
/**
 * Convert degrees to radians
 */
export declare function degToRad(degrees: number): number;
/**
 * Validate latitude is within Web Mercator bounds
 */
export declare function isValidLatitude(lat: number): boolean;
/**
 * Validate longitude is within valid range
 */
export declare function isValidLongitude(lon: number): boolean;
/**
 * Validate zoom level is within supported range
 */
export declare function isValidZoomLevel(zoom: number): boolean;
export declare function normalizePixel(pixel: Pixel): Pixel;
/**
 * Convert WGS84 coordinates to Web Mercator tile pixel coordinates
 * @param coords - WGS84 latitude/longitude coordinates
 * @param z - Zoom level (0-15)
 * @returns Pixel coordinates within the appropriate tile
 */
export declare function toPixel(coords: Coordinates, z: number): Pixel;
//# sourceMappingURL=ElevationFunctions.d.ts.map