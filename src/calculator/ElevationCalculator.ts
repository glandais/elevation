import { ElevationDecoder } from './ElevationDecoder';
import type { Pixel, Coordinates } from '../types';
import type { TileManager } from '../tile/TileManager';

export class ElevationCalculator {
    private static readonly TILE_SIZE = 256;
    private readonly tileManager: TileManager;

    constructor(tileManager: TileManager) {
        this.tileManager = tileManager;
    }

    // ========================================================================
    // PUBLIC API - ELEVATION CALCULATIONS
    // ========================================================================

    public async getElevation(coords: Coordinates, zoomLevel: number): Promise<number> {
        try {
            const pixel = this.toPixel(coords, zoomLevel);
            return await this.getElevationFromPixel(pixel);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get elevation: ${error.message}`);
            }
            throw new Error('Failed to get elevation: Unknown error');
        }
    }

    public async getInterpolatedElevation(coords: Coordinates, zoomLevel: number): Promise<number> {
        const pixel = this.toPixel(coords, zoomLevel);
        const pixelFloat = {
            tile: pixel.tile,
            x: pixel.x,
            y: pixel.y,
        };
        const x0 = Math.floor(pixelFloat.x);
        const y0 = Math.floor(pixelFloat.y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const dx = pixelFloat.x - x0;
        const dy = pixelFloat.y - y0;

        const p00 = await this.getElevationFromPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x0, y: y0 })
        );
        const p10 = await this.getElevationFromPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x1, y: y0 })
        );
        const p01 = await this.getElevationFromPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x0, y: y1 })
        );
        const p11 = await this.getElevationFromPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x1, y: y1 })
        );

        const top = p00 * (1 - dx) + p10 * dx;
        const bottom = p01 * (1 - dx) + p11 * dx;
        return top * (1 - dy) + bottom * dy;
    }

    // ========================================================================
    // PRIVATE - HELPER METHODS
    // ========================================================================

    /**
     * Convert WGS84 coordinates to Web Mercator tile pixel coordinates
     * @param coords - WGS84 latitude/longitude coordinates
     * @param z - Zoom level (0-15)
     * @returns Pixel coordinates within the appropriate tile
     */
    private toPixel(coords: Coordinates, z: number): Pixel {
        // Input validation
        if (!this.isValidLatitude(coords.latitude)) {
            throw new Error(
                `Invalid latitude: ${coords.latitude}. Must be between -85.0511 and 85.0511`
            );
        }

        if (!this.isValidLongitude(coords.longitude)) {
            throw new Error(`Invalid longitude: ${coords.longitude}. Must be between -180 and 180`);
        }

        if (!this.isValidZoomLevel(z)) {
            throw new Error(`Invalid zoom level: ${z}. Must be between 0 and 15`);
        }

        // Web Mercator projection calculation
        const lat = this.degToRad(coords.latitude);
        const n = Math.pow(2, z);
        const xFloat = ((coords.longitude + 180) / 360) * n;
        const yFloat = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n;

        let tileX = Math.floor(xFloat);
        let tileY = Math.floor(yFloat);

        // Clamp tile coordinates to valid range for the zoom level
        const maxTile = n - 1;
        tileX = Math.max(0, Math.min(maxTile, tileX));
        tileY = Math.max(0, Math.min(maxTile, tileY));

        // Calculate pixel coordinates within the tile
        const x = Math.floor((xFloat - tileX) * ElevationCalculator.TILE_SIZE);
        const y = Math.floor((yFloat - tileY) * ElevationCalculator.TILE_SIZE);

        return {
            tile: {
                z,
                x: tileX,
                y: tileY,
            },
            x: Math.max(0, Math.min(ElevationCalculator.TILE_SIZE - 1, x)),
            y: Math.max(0, Math.min(ElevationCalculator.TILE_SIZE - 1, y)),
        };
    }

    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private async getElevationFromPixel(pixel: Pixel): Promise<number> {
        const cachedTile = await this.tileManager.getTile(pixel.tile);
        return ElevationDecoder.getElevationFromImageData(cachedTile.data, pixel);
    }

    public normalizePixel(pixel: Pixel): Pixel {
        let { x, y } = pixel;
        const tile = pixel.tile;
        let tileX = tile.x;
        let tileY = tile.y;
        const z = tile.z;

        if (x < 0) {
            x += ElevationCalculator.TILE_SIZE;
            tileX -= 1;
        }
        if (x >= ElevationCalculator.TILE_SIZE) {
            x -= ElevationCalculator.TILE_SIZE;
            tileX += 1;
        }
        if (y < 0) {
            y += ElevationCalculator.TILE_SIZE;
            tileY -= 1;
        }
        if (y >= ElevationCalculator.TILE_SIZE) {
            y -= ElevationCalculator.TILE_SIZE;
            tileY += 1;
        }

        const maxTile = Math.pow(2, z) - 1;
        tileX = Math.max(0, Math.min(maxTile, tileX));
        tileY = Math.max(0, Math.min(maxTile, tileY));

        return { tile: { z, x: tileX, y: tileY }, x, y };
    }

    // ========================================================================
    // PRIVATE - UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Convert degrees to radians
     */
    private degToRad(degrees: number): number {
        return (degrees * Math.PI) / 180;
    }

    // ========================================================================
    // PRIVATE - VALIDATION FUNCTIONS
    // ========================================================================

    /**
     * Validate latitude is within Web Mercator bounds
     */
    private isValidLatitude(lat: number): boolean {
        return lat >= -85.0511 && lat <= 85.0511;
    }

    /**
     * Validate longitude is within valid range
     */
    private isValidLongitude(lon: number): boolean {
        return lon >= -180 && lon <= 180;
    }

    /**
     * Validate zoom level is within supported range
     */
    private isValidZoomLevel(zoom: number): boolean {
        return Number.isInteger(zoom) && zoom >= 0 && zoom <= 15;
    }
}
