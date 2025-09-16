import { Coordinates, CoordinatesElevation } from 'src/types';
import { ElevationCalculator } from './ElevationCalculator';
export declare class BatchCalculator {
    private readonly elevationCalculator;
    private static readonly MIN_SEGMENT_DISTANCE;
    constructor(elevationCalculator: ElevationCalculator);
    /**
     * Get elevations for multiple coordinates from an iterable
     * @param coordinates - Iterable of coordinates (array, generator, etc.)
     * @param zoomLevel - Tile zoom level (0-15)
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsFrom(coordinates: Iterable<Coordinates>, zoomLevel: number, interpolation?: boolean): Promise<number[]>;
    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param coord1 - First coordinate
     * @param coord2 - Second coordinate
     * @returns Distance in meters
     */
    private distance;
    /**
     * Generate coordinates between two points at regular intervals
     * @param coordinate1 - Start coordinate
     * @param coordinate2 - End coordinate
     * @param step - Distance between points in meters
     */
    private generateCoordinatesBetween;
    /**
     * Get elevations between two coordinates at regular intervals
     * @param coordinate1 - Start coordinate
     * @param coordinate2 - End coordinate
     * @param zoomLevel - Tile zoom level (0-15)
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsBetween(coordinate1: Coordinates, coordinate2: Coordinates, zoomLevel: number, step: number, interpolation?: boolean): Promise<CoordinatesElevation[]>;
    /**
     * Generate coordinates along a path with multiple waypoints
     * @param path - Array of coordinates defining the path
     * @param step - Distance between points in meters
     */
    private generateCoordinatesAlong;
    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param zoomLevel - Tile zoom level (0-15)
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsAlong(path: Coordinates[], zoomLevel: number, step: number, interpolation?: boolean): Promise<CoordinatesElevation[]>;
}
//# sourceMappingURL=BatchCalculator.d.ts.map