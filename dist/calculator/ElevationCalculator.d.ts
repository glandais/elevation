import { Coordinates } from '../types';
import { TileManager } from '../tile';
export declare class ElevationCalculator {
    private readonly tileManager;
    constructor(tileManager: TileManager);
    getElevation(coords: Coordinates, zoomLevel: number, interpolation?: boolean): Promise<number>;
    private getInterpolatedElevationInternal;
    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private getElevationFromPixel;
    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     * @param rgb - RGB color values from terrain tile pixel
     * @returns Elevation in meters, rounded to 2 decimal places
     */
    private decodeElevation;
}
//# sourceMappingURL=ElevationCalculator.d.ts.map