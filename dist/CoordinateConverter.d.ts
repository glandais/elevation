import { Coordinates, TileCoordinates, TilePixelPosition } from './types';
/**
 * Converts between WGS84 coordinates and Web Mercator tile coordinates
 */
export declare class CoordinateConverter {
    private static readonly TILE_SIZE;
    /**
     * Convert WGS84 coordinates to Web Mercator tile coordinates
     */
    static toTileCoordinates(coords: Coordinates, zoomLevel: number): TileCoordinates;
    /**
     * Get pixel position within a tile (0-255 range)
     */
    static getTilePixelPosition(coords: Coordinates, tileCoords: TileCoordinates): TilePixelPosition;
    /**
     * Convert tile coordinates back to WGS84 coordinates (for tile center)
     */
    static fromTileCoordinates(tileCoords: TileCoordinates): Coordinates;
    /**
     * Generate tile key for caching
     */
    static getTileKey(tileCoords: TileCoordinates): string;
    /**
     * Get tile URL from template
     */
    static getTileUrl(tileCoords: TileCoordinates, urlTemplate?: string): string;
    private static degToRad;
    private static radToDeg;
    private static isValidLatitude;
    private static isValidLongitude;
    private static isValidZoomLevel;
}
//# sourceMappingURL=CoordinateConverter.d.ts.map