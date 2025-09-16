import { Coordinates } from '../types';
import { TileManager } from '../tile/TileManager';
export declare class ElevationCalculator {
    private readonly tileManager;
    constructor(tileManager: TileManager);
    getElevation(coords: Coordinates, zoomLevel: number, interpolation?: boolean): Promise<number>;
    private getInterpolatedElevationInternal;
    /**
     * Get elevation for a specific pixel (internal helper)
     */
    private getElevationFromPixel;
}
//# sourceMappingURL=ElevationCalculator.d.ts.map