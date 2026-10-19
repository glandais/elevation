import type { TileManager } from '../tile';
import type { Coordinates } from '../types';
export declare class ElevationCalculator {
    private readonly tileManager;
    private readonly tileSize;
    constructor(tileManager: TileManager, tileSize?: number);
    getElevation(coords: Coordinates, zoomLevel: number, interpolation?: boolean): Promise<number>;
    private getInterpolatedElevationInternal;
    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private getElevationFromPixel;
}
//# sourceMappingURL=ElevationCalculator.d.ts.map