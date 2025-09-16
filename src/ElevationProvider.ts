import { TileManager } from './tile/TileManager';
import { ElevationCalculator } from './calculator/ElevationCalculator';
import type { Coordinates, ElevationProviderConfig, Attribution } from './types';

/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export class ElevationProvider {
    private readonly config: Required<ElevationProviderConfig>;
    private readonly tileManager: TileManager;
    private readonly calculator: ElevationCalculator;

    // ============================================================================
    // CONSTRUCTOR & CONFIGURATION
    // ============================================================================

    constructor(config: ElevationProviderConfig = {}) {
        this.config = {
            zoomLevel: config.zoomLevel ?? 12,
            cacheSize: config.cacheSize ?? 100,
            tileUrlTemplate:
                config.tileUrlTemplate ??
                'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
            timeout: config.timeout ?? 5000,
        };

        this.validateConfig();
        this.tileManager = new TileManager(
            this.config.tileUrlTemplate,
            this.config.timeout,
            this.config.cacheSize
        );
        this.calculator = new ElevationCalculator(this.tileManager);
    }

    /**
     * Get current configuration
     */
    public getConfig(): Readonly<Required<ElevationProviderConfig>> {
        return { ...this.config };
    }

    /**
     * Get attribution information for elevation data
     */
    public static getAttribution(): Attribution {
        return {
            text: 'Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1. Data processing by Mapzen/Tilezen.',
            url: 'https://github.com/tilezen/joerd',
        };
    }

    // ============================================================================
    // PUBLIC API - SINGLE COORDINATE METHODS
    // ============================================================================

    /**
     * Get elevation at specific coordinates
     */
    public async getElevation(latitude: number, longitude: number): Promise<number> {
        const coords: Coordinates = { latitude, longitude };
        return await this.calculator.getElevation(coords, this.config.zoomLevel);
    }

    /**
     * Get interpolated elevation at specific coordinates (smoother results)
     */
    public async getInterpolatedElevation(latitude: number, longitude: number): Promise<number> {
        const coords: Coordinates = { latitude, longitude };
        return await this.calculator.getInterpolatedElevation(coords, this.config.zoomLevel);
    }

    // ============================================================================
    // PUBLIC API - BULK COORDINATE METHODS
    // ============================================================================

    /**
     * Get elevations for multiple coordinates from an array
     */
    public async getElevationsFromArray(coordinates: Array<Coordinates>): Promise<number[]> {
        return this.getElevationsFrom(coordinates.values());
    }

    /**
     * Get elevations for multiple coordinates from an iterator
     */
    public async getElevationsFrom(coordinates: Iterator<Coordinates>): Promise<number[]> {
        const f = (coord: Coordinates) => this.getElevation(coord.latitude, coord.longitude);
        return this.computeElevations(coordinates, f);
    }

    /**
     * Get interpolated elevations for multiple coordinates from an array
     */
    public async getInterpolatedElevationsFromArray(
        coordinates: Array<Coordinates>
    ): Promise<number[]> {
        return this.getInterpolatedElevations(coordinates.values());
    }

    /**
     * Get interpolated elevations for multiple coordinates from an iterator
     */
    public async getInterpolatedElevations(coordinates: Iterator<Coordinates>): Promise<number[]> {
        const f = (coord: Coordinates) =>
            this.getInterpolatedElevation(coord.latitude, coord.longitude);
        return this.computeElevations(coordinates, f);
    }

    // ============================================================================
    // PUBLIC API - CACHE MANAGEMENT
    // ============================================================================

    /**
     * Clear tile cache
     */
    public clearCache(): void {
        this.tileManager.clearCache();
    }

    // ============================================================================
    // PRIVATE - BATCH PROCESSING
    // ============================================================================

    private async computeElevations(
        coordinates: Iterator<Coordinates>,
        f: (coord: Coordinates) => Promise<number>
    ): Promise<number[]> {
        const batchSize = 100;
        const allResults: number[] = [];
        let batch: Promise<number>[] = [];

        let result = coordinates.next();
        while (!result.done) {
            batch.push(f(result.value));

            // Process batch when it reaches the batch size
            if (batch.length >= batchSize) {
                const batchResults = await Promise.all(batch);
                allResults.push(...batchResults);
                batch = [];
            }

            result = coordinates.next();
        }

        // Process any remaining items in the last batch
        if (batch.length > 0) {
            const batchResults = await Promise.all(batch);
            allResults.push(...batchResults);
        }

        return allResults;
    }

    // ============================================================================
    // PRIVATE - VALIDATION
    // ============================================================================

    private validateConfig(): void {
        const { zoomLevel, cacheSize, timeout } = this.config;

        if (!Number.isInteger(zoomLevel) || zoomLevel < 0 || zoomLevel > 15) {
            throw new Error(
                `Invalid zoom level: ${zoomLevel}. Must be an integer between 0 and 15`
            );
        }

        if (!Number.isInteger(cacheSize) || cacheSize <= 0) {
            throw new Error(`Invalid cache size: ${cacheSize}. Must be a positive integer`);
        }

        if (!Number.isInteger(timeout) || timeout <= 0) {
            throw new Error(`Invalid timeout: ${timeout}. Must be a positive integer`);
        }
    }
}
