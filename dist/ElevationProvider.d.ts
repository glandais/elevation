import { Coordinates, CoordinatesElevation, ElevationProviderConfig, Attribution, FilterOptions } from './types';
/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export declare class ElevationProvider {
    private readonly config;
    private readonly tileManager;
    private readonly calculator;
    private readonly batchCalculator;
    constructor(config?: ElevationProviderConfig);
    /**
     * Get current configuration
     */
    getConfig(): Readonly<Required<ElevationProviderConfig>>;
    /**
     * Get attribution information for elevation data
     */
    static getAttribution(): Attribution;
    /**
     * Get elevation at specific coordinates
     * @param latitude - Latitude in decimal degrees
     * @param longitude - Longitude in decimal degrees
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevation(latitude: number, longitude: number, interpolation?: boolean): Promise<number>;
    /**
     * Get elevations for multiple coordinates from an interable
     * @param coordinates - Iteratable of coordinates
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsFrom(coordinates: Iterable<Coordinates>, interpolation?: boolean): Promise<number[]>;
    /**
     * Get elevations between two coordinates at regular intervals
     * @param coordinate1 - Start coordinate
     * @param coordinate2 - End coordinate
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsBetween(coordinate1: Coordinates, coordinate2: Coordinates, step: number, interpolation?: boolean): Promise<CoordinatesElevation[]>;
    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param step - Distance between elevation points in meters
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     * @param filterOptions - Optional Douglas-Peucker filtering options
     */
    getElevationsAlong(path: Coordinates[], step: number, interpolation?: boolean, filterOptions?: FilterOptions): Promise<CoordinatesElevation[]>;
    /**
     * Clear tile cache
     */
    clearCache(): void;
    private validateConfig;
}
//# sourceMappingURL=ElevationProvider.d.ts.map