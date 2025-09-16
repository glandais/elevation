import { Coordinates } from 'src/types';
import { ElevationCalculator } from './ElevationCalculator';
export declare class BatchCalculator {
    private readonly elevationCalculator;
    constructor(elevationCalculator: ElevationCalculator);
    /**
     * Get elevations for multiple coordinates from an iterator
     * @param coordinates - Iterator of coordinates
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsFrom(coordinates: Iterator<Coordinates>, zoomLevel: number, interpolation?: boolean): Promise<number[]>;
}
//# sourceMappingURL=BatchCalculator.d.ts.map