import { Coordinates, CoordinatesElevation, FilterOptions, SmoothingOptions } from '../types';
import { ElevationCalculator } from './ElevationCalculator';
export declare class BatchCalculator {
    private readonly elevationCalculator;
    constructor(elevationCalculator: ElevationCalculator);
    setElevations(coordinates: Iterable<Coordinates>, zoomLevel: number, interpolation: boolean): Promise<void>;
    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param zoomLevel - Tile zoom level (0-15)
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results
     * @param smoothingOptions - Optional distance-based smoothing options
     * @param filterOptions - Optional filtering options using Douglas-Peucker algorithm
     */
    getElevationsAlong(path: Coordinates[], zoomLevel: number, step: number, minDistance: number, interpolation: boolean, smoothingOptions?: SmoothingOptions, filterOptions?: FilterOptions): Promise<CoordinatesElevation[]>;
    /**
     * Generate coordinates along a path with multiple waypoints
     * @param path - Array of coordinates defining the path
     * @param step - Distance between points in meters
     */
    private generateCoordinatesAlong;
    /**
     * Generate coordinates between two points at regular intervals
     * @param coordinate1 - Start coordinate
     * @param coordinate2 - End coordinate
     * @param step - Distance between points in meters
     */
    private generateCoordinatesBetween;
}
//# sourceMappingURL=BatchCalculator.d.ts.map