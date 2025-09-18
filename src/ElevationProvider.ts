import { TileManager } from './tile';
import { ElevationCalculator, BatchCalculator } from './calculator';
import type {
    Coordinates,
    CoordinatesElevation,
    ElevationProviderConfig,
    Attribution,
    GetElevationOptions,
    GetElevationsFromOptions,
    GetElevationsAlongOptions,
} from './types';
import { createLogger, Logger } from './utils';

const logger: Logger = createLogger('ElevationProvider');

/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export class ElevationProvider {
    private readonly config: Required<ElevationProviderConfig>;
    private readonly tileManager: TileManager;
    private readonly calculator: ElevationCalculator;
    private readonly batchCalculator: BatchCalculator;

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
        logger.dir('Config :', this.config);

        this.validateConfig();
        this.tileManager = new TileManager(
            this.config.tileUrlTemplate,
            this.config.timeout,
            this.config.cacheSize
        );
        this.calculator = new ElevationCalculator(this.tileManager);
        this.batchCalculator = new BatchCalculator(this.calculator);
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
     * @param latitude - Latitude in decimal degrees
     * @param longitude - Longitude in decimal degrees
     * @param options - Optional parameters
     */
    public async getElevation(
        latitude: number,
        longitude: number,
        options?: GetElevationOptions
    ): Promise<number> {
        const interpolation = options?.interpolation ?? true;
        const coords: Coordinates = { latitude, longitude };
        return await this.calculator.getElevation(coords, this.config.zoomLevel, interpolation);
    }

    // ============================================================================
    // PUBLIC API - BULK COORDINATE METHODS
    // ============================================================================

    /**
     * Get elevations for multiple coordinates from an interable
     * @param coordinates - Iteratable of coordinates
     * @param options - Optional parameters
     */
    public async getElevationsFrom(
        coordinates: Iterable<Coordinates>,
        options?: GetElevationsFromOptions
    ): Promise<number[]> {
        const interpolation = options?.interpolation ?? true;
        return this.batchCalculator.getElevationsFrom(
            coordinates,
            this.config.zoomLevel,
            interpolation
        );
    }

    /**
     * Get elevations along a path defined by multiple coordinates
     * @param path - Array of coordinates defining the path
     * @param options - Optional parameters
     */
    public async getElevationsAlong(
        path: Coordinates[],
        options?: GetElevationsAlongOptions
    ): Promise<CoordinatesElevation[]> {
        const step = options?.step ?? 10;
        const interpolation = options?.interpolation ?? true;
        const smoothingOptions = options?.smoothingOptions;
        const filterOptions = options?.filterOptions;
        return this.batchCalculator.getElevationsAlong(
            path,
            this.config.zoomLevel,
            step,
            interpolation,
            smoothingOptions,
            filterOptions
        );
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
