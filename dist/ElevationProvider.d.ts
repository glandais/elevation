import { Coordinates, ElevationProviderConfig, Attribution } from './types';
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
     * Get elevations for multiple coordinates from an array
     * @param coordinates - Array of coordinates
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsFromArray(coordinates: Array<Coordinates>, interpolation?: boolean): Promise<number[]>;
    /**
     * Get elevations for multiple coordinates from an iterator
     * @param coordinates - Iterator of coordinates
     * @param interpolation - Use bilinear interpolation for smoother results (default: true)
     */
    getElevationsFrom(coordinates: Iterator<Coordinates>, interpolation?: boolean): Promise<number[]>;
    /**
     * Clear tile cache
     */
    clearCache(): void;
    private validateConfig;
}
//# sourceMappingURL=ElevationProvider.d.ts.map