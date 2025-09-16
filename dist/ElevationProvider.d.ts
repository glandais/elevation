import { ElevationProviderConfig, Attribution } from './types';
/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export declare class ElevationProvider {
    private static readonly TILE_SIZE;
    private readonly config;
    private readonly tileFetcher;
    private readonly cache;
    constructor(config?: ElevationProviderConfig);
    /**
     * Get tile URL from template
     */
    private getTileUrl;
    private loadTile;
    /**
     * Get elevation at specific coordinates
     */
    getElevation(latitude: number, longitude: number): Promise<number>;
    private getElevationPixel;
    getInterpolatedElevation(latitude: number, longitude: number): Promise<number>;
    private getInterpolatedElevationPixel;
    private normalizePixel;
    /**
     * Batch get elevations for multiple coordinates
     */
    getInterpolatedElevations(coordinates: Array<{
        latitude: number;
        longitude: number;
    }>): Promise<number[]>;
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