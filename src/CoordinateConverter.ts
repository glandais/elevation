import type { Coordinates, TileCoordinates, TilePixelPosition } from './types';

/**
 * Converts between WGS84 coordinates and Web Mercator tile coordinates
 */
export class CoordinateConverter {
    private static readonly TILE_SIZE = 256;

    /**
     * Convert WGS84 coordinates to Web Mercator tile coordinates
     */
    public static toTileCoordinates(coords: Coordinates, zoomLevel: number): TileCoordinates {
        if (!this.isValidLatitude(coords.latitude)) {
            throw new Error(
                `Invalid latitude: ${coords.latitude}. Must be between -85.0511 and 85.0511`
            );
        }

        if (!this.isValidLongitude(coords.longitude)) {
            throw new Error(`Invalid longitude: ${coords.longitude}. Must be between -180 and 180`);
        }

        if (!this.isValidZoomLevel(zoomLevel)) {
            throw new Error(`Invalid zoom level: ${zoomLevel}. Must be between 0 and 15`);
        }

        const lat = this.degToRad(coords.latitude);

        const n = Math.pow(2, zoomLevel);
        const x = Math.floor(((coords.longitude + 180) / 360) * n);
        const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n);

        return { x, y, z: zoomLevel };
    }

    /**
     * Get pixel position within a tile (0-255 range)
     */
    public static getTilePixelPosition(
        coords: Coordinates,
        tileCoords: TileCoordinates
    ): TilePixelPosition {
        const lat = this.degToRad(coords.latitude);

        const n = Math.pow(2, tileCoords.z);
        const xFloat = ((coords.longitude + 180) / 360) * n;
        const yFloat = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n;

        const x = Math.floor((xFloat - tileCoords.x) * this.TILE_SIZE);
        const y = Math.floor((yFloat - tileCoords.y) * this.TILE_SIZE);

        return {
            x: Math.max(0, Math.min(this.TILE_SIZE - 1, x)),
            y: Math.max(0, Math.min(this.TILE_SIZE - 1, y)),
        };
    }

    /**
     * Convert tile coordinates back to WGS84 coordinates (for tile center)
     */
    public static fromTileCoordinates(tileCoords: TileCoordinates): Coordinates {
        const n = Math.pow(2, tileCoords.z);
        const lonDeg = (tileCoords.x / n) * 360.0 - 180.0;
        const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileCoords.y) / n)));
        const latDeg = this.radToDeg(latRad);

        return {
            latitude: latDeg,
            longitude: lonDeg,
        };
    }

    /**
     * Generate tile key for caching
     */
    public static getTileKey(tileCoords: TileCoordinates): string {
        return `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`;
    }

    /**
     * Get tile URL from template
     */
    public static getTileUrl(
        tileCoords: TileCoordinates,
        urlTemplate: string = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
    ): string {
        return urlTemplate
            .replace('{z}', tileCoords.z.toString())
            .replace('{x}', tileCoords.x.toString())
            .replace('{y}', tileCoords.y.toString());
    }

    private static degToRad(degrees: number): number {
        return (degrees * Math.PI) / 180;
    }

    private static radToDeg(radians: number): number {
        return (radians * 180) / Math.PI;
    }

    private static isValidLatitude(lat: number): boolean {
        return lat >= -85.0511 && lat <= 85.0511;
    }

    private static isValidLongitude(lon: number): boolean {
        return lon >= -180 && lon <= 180;
    }

    private static isValidZoomLevel(zoom: number): boolean {
        return Number.isInteger(zoom) && zoom >= 0 && zoom <= 15;
    }
}
