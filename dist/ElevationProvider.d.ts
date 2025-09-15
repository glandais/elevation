import { ElevationProviderConfig, Attribution } from './types';
/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export declare class ElevationProvider {
    private readonly config;
    private readonly tileFetcher;
    private readonly tileCache;
    constructor(config?: ElevationProviderConfig);
    /**
     * Get elevation at specific coordinates
     */
    getElevation(latitude: number, longitude: number): Promise<number>;
    /**
     * Get interpolated elevation for smoother results
     */
    getInterpolatedElevation(latitude: number, longitude: number): Promise<number>;
    /**
     * Batch get elevations for multiple coordinates
     */
    getElevations(coordinates: Array<{
        latitude: number;
        longitude: number;
    }>): Promise<number[]>;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<Required<ElevationProviderConfig>>;
    /**
     * Clear tile cache
     */
    clearCache(): void;
    /**
     * Get attribution information for elevation data
     */
    static getAttribution(): Attribution;
    private validateConfig;
}
//# sourceMappingURL=ElevationProvider.d.ts.map