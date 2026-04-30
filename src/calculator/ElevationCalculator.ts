import { toPixel, normalizePixel } from './ElevationFunctions';
import type { TileManager } from '../tile';
import type { Pixel, Coordinates } from '../types';

export class ElevationCalculator {
    private readonly tileManager: TileManager;
    private readonly tileSize: number;

    constructor(tileManager: TileManager, tileSize: number = 256) {
        this.tileManager = tileManager;
        this.tileSize = tileSize;
    }

    // ========================================================================
    // PUBLIC API - ELEVATION CALCULATIONS
    // ========================================================================

    public async getElevation(
        coords: Coordinates,
        zoomLevel: number,
        interpolation: boolean = true
    ): Promise<number> {
        try {
            if (interpolation) {
                return await this.getInterpolatedElevationInternal(coords, zoomLevel);
            } else {
                const pixel = toPixel(coords, zoomLevel, this.tileSize);
                return await this.getElevationFromPixel(pixel);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get elevation: ${error.message}`, { cause: error });
            }
            throw new Error('Failed to get elevation: Unknown error', { cause: error });
        }
    }

    // ========================================================================
    // PRIVATE - HELPER METHODS
    // ========================================================================

    private async getInterpolatedElevationInternal(
        coords: Coordinates,
        zoomLevel: number
    ): Promise<number> {
        const pixel = toPixel(coords, zoomLevel, this.tileSize);
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
            normalizePixel({ tile: pixelFloat.tile, x: x0, y: y0 }, this.tileSize)
        );
        const p10 = await this.getElevationFromPixel(
            normalizePixel({ tile: pixelFloat.tile, x: x1, y: y0 }, this.tileSize)
        );
        const p01 = await this.getElevationFromPixel(
            normalizePixel({ tile: pixelFloat.tile, x: x0, y: y1 }, this.tileSize)
        );
        const p11 = await this.getElevationFromPixel(
            normalizePixel({ tile: pixelFloat.tile, x: x1, y: y1 }, this.tileSize)
        );

        const top = p00 * (1 - dx) + p10 * dx;
        const bottom = p01 * (1 - dx) + p11 * dx;
        return top * (1 - dy) + bottom * dy;
    }

    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private async getElevationFromPixel(pixel: Pixel): Promise<number> {
        let cachedTile = this.tileManager.getTileDirect(pixel.tile);
        if (!cachedTile) {
            cachedTile = await this.tileManager.getTile(pixel.tile);
        }
        return cachedTile.getElevation(pixel);
    }
}
