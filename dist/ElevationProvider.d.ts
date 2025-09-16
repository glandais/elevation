import { Coordinates, ElevationProviderConfig, Attribution } from './types';
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
    getInterpolatedElevations(coordinates: Iterator<Coordinates>): Promise<number[]>;
    getInterpolatedElevationsFromArray(coordinates: Array<Coordinates>): Promise<number[]>;
    getElevationsFrom(coordinates: Iterator<Coordinates>): Promise<number[]>;
    getElevationsFromArray(coordinates: Array<Coordinates>): Promise<number[]>;
    private computeElevations;
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