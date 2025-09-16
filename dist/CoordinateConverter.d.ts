import { Coordinates, Pixel } from './types';
/**
 * Converts between WGS84 coordinates and Web Mercator tile coordinates
 */
export declare class CoordinateConverter {
    private static readonly TILE_SIZE;
    static toPixel(coords: Coordinates, z: number): Pixel;
    private static degToRad;
    private static isValidLatitude;
    private static isValidLongitude;
    private static isValidZoomLevel;
}
//# sourceMappingURL=CoordinateConverter.d.ts.map