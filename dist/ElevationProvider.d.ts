import { Coordinates, CoordinatesElevation, ElevationProviderConfig, Attribution, GetElevationOptions, GetElevationsFromOptions, GetElevationsAlongOptions } from './types';
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
     * @param options - Optional parameters
     */
    getElevation(latitude: number, longitude: number, options?: GetElevationOptions): Promise<number>;
    /**
     * Get elevations for multiple coordinates from an interable
     * @param coordinates - Iteratable of coordinates
     * @param options - Optional parameters
     */
    getElevationsFrom(coordinates: Iterable<Coordinates>, options?: GetElevationsFromOptions): Promise<number[]>;
    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param options - Optional parameters
     */
    getElevationsAlong(path: Coordinates[], options?: GetElevationsAlongOptions): Promise<CoordinatesElevation[]>;
    /**
     * Clear tile cache
     */
    clearCache(): void;
    private validateConfig;
}
//# sourceMappingURL=ElevationProvider.d.ts.map