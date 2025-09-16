import { Pixel, Coordinates } from '../types';
import { TileManager } from '../tile/TileManager';
export declare class ElevationCalculator {
    private static readonly TILE_SIZE;
    private readonly tileManager;
    constructor(tileManager: TileManager);
    getElevation(coords: Coordinates, zoomLevel: number): Promise<number>;
    getInterpolatedElevation(coords: Coordinates, zoomLevel: number): Promise<number>;
    /**
     * Convert WGS84 coordinates to Web Mercator tile pixel coordinates
     * @param coords - WGS84 latitude/longitude coordinates
     * @param z - Zoom level (0-15)
     * @returns Pixel coordinates within the appropriate tile
     */
    private toPixel;
    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private getElevationFromPixel;
    normalizePixel(pixel: Pixel): Pixel;
    /**
     * Convert degrees to radians
     */
    private degToRad;
    /**
     * Validate latitude is within Web Mercator bounds
     */
    private isValidLatitude;
    /**
     * Validate longitude is within valid range
     */
    private isValidLongitude;
    /**
     * Validate zoom level is within supported range
     */
    private isValidZoomLevel;
}
//# sourceMappingURL=ElevationCalculator.d.ts.map