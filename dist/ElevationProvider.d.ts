import { Coordinates, ElevationProviderConfig, Attribution } from './types';
/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export declare class ElevationProvider {
    private readonly config;
    private readonly tileManager;
    private readonly calculator;
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
     */
    getElevation(latitude: number, longitude: number): Promise<number>;
    /**
     * Get interpolated elevation at specific coordinates (smoother results)
     */
    getInterpolatedElevation(latitude: number, longitude: number): Promise<number>;
    /**
     * Get elevations for multiple coordinates from an array
     */
    getElevationsFromArray(coordinates: Array<Coordinates>): Promise<number[]>;
    /**
     * Get elevations for multiple coordinates from an iterator
     */
    getElevationsFrom(coordinates: Iterator<Coordinates>): Promise<number[]>;
    /**
     * Get interpolated elevations for multiple coordinates from an array
     */
    getInterpolatedElevationsFromArray(coordinates: Array<Coordinates>): Promise<number[]>;
    /**
     * Get interpolated elevations for multiple coordinates from an iterator
     */
    getInterpolatedElevations(coordinates: Iterator<Coordinates>): Promise<number[]>;
    /**
     * Clear tile cache
     */
    clearCache(): void;
    private computeElevations;
    private validateConfig;
}
//# sourceMappingURL=ElevationProvider.d.ts.map