import { toPixel, normalizePixel } from './ElevationFunctions';
import type { Pixel, Coordinates, RGBColor } from '../types';
import type { TileManager } from '../tile';

export class ElevationCalculator {
    private readonly tileManager: TileManager;

    constructor(tileManager: TileManager) {
        this.tileManager = tileManager;
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
                const pixel = toPixel(coords, zoomLevel);
                return await this.getElevationFromPixel(pixel);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get elevation: ${error.message}`);
            }
            throw new Error('Failed to get elevation: Unknown error');
        }
    }

    // ========================================================================
    // PRIVATE - HELPER METHODS
    // ========================================================================

    private async getInterpolatedElevationInternal(
        coords: Coordinates,
        zoomLevel: number
    ): Promise<number> {
        const pixel = toPixel(coords, zoomLevel);
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
            normalizePixel({ tile: pixelFloat.tile, x: x0, y: y0 })
        );
        const p10 = await this.getElevationFromPixel(
            normalizePixel({ tile: pixelFloat.tile, x: x1, y: y0 })
        );
        const p01 = await this.getElevationFromPixel(
            normalizePixel({ tile: pixelFloat.tile, x: x0, y: y1 })
        );
        const p11 = await this.getElevationFromPixel(
            normalizePixel({ tile: pixelFloat.tile, x: x1, y: y1 })
        );

        const top = p00 * (1 - dx) + p10 * dx;
        const bottom = p01 * (1 - dx) + p11 * dx;
        return top * (1 - dy) + bottom * dy;
    }

    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private async getElevationFromPixel(pixel: Pixel): Promise<number> {
        const cachedTile = await this.tileManager.getTile(pixel.tile);
        const rgb = cachedTile.getRGBFromImageData(pixel);
        return this.decodeElevation(rgb);
    }

    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     * @param rgb - RGB color values from terrain tile pixel
     * @returns Elevation in meters, rounded to 2 decimal places
     */
    private decodeElevation(rgb: RGBColor): number {
        const elevation = rgb.red * 256 + rgb.green + rgb.blue / 256 - 32768;
        return Math.round(elevation * 100) / 100; // Round to 2 decimal places for precision
    }
}
