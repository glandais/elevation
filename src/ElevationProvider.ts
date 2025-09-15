import { CoordinateConverter } from './CoordinateConverter';
import { TileFetcher } from './TileFetcher';
import { ElevationDecoder } from './ElevationDecoder';
import { TileCache } from './TileCache';
import type { Coordinates, ElevationProviderConfig, Attribution } from './types';

/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export class ElevationProvider {
    private readonly config: Required<ElevationProviderConfig>;
    private readonly tileFetcher: TileFetcher;
    private readonly tileCache: TileCache;

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
        this.tileFetcher = new TileFetcher(this.config.timeout);
        this.tileCache = new TileCache(this.config.cacheSize);
    }

    /**
     * Get elevation at specific coordinates
     */
    public async getElevation(latitude: number, longitude: number): Promise<number> {
        const coords: Coordinates = { latitude, longitude };

        try {
            const tileCoords = CoordinateConverter.toTileCoordinates(coords, this.config.zoomLevel);

            const tileKey = CoordinateConverter.getTileKey(tileCoords);

            // Try to get tile from cache
            let imageData = this.tileCache.get(tileKey);

            // If not in cache, fetch it
            if (!imageData) {
                const tileUrl = CoordinateConverter.getTileUrl(
                    tileCoords,
                    this.config.tileUrlTemplate
                );

                imageData = await this.tileFetcher.fetchTile(tileUrl);
                this.tileCache.set(tileKey, imageData);
            }

            // Get pixel position within tile
            const pixelPosition = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

            // Decode elevation from pixel data
            const elevation = ElevationDecoder.getElevationFromImageData(imageData, pixelPosition);

            return elevation;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get elevation: ${error.message}`);
            }
            throw new Error('Failed to get elevation: Unknown error');
        }
    }

    /**
     * Get interpolated elevation for smoother results
     */
    public async getInterpolatedElevation(latitude: number, longitude: number): Promise<number> {
        const coords: Coordinates = { latitude, longitude };

        try {
            const tileCoords = CoordinateConverter.toTileCoordinates(coords, this.config.zoomLevel);

            const tileKey = CoordinateConverter.getTileKey(tileCoords);

            // Try to get tile from cache
            let imageData = this.tileCache.get(tileKey);

            // If not in cache, fetch it
            if (!imageData) {
                const tileUrl = CoordinateConverter.getTileUrl(
                    tileCoords,
                    this.config.tileUrlTemplate
                );

                imageData = await this.tileFetcher.fetchTile(tileUrl);
                this.tileCache.set(tileKey, imageData);
            }

            // Get exact pixel position (with decimal values for interpolation)
            const pixelPosition = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

            // Use interpolated elevation
            const elevation = ElevationDecoder.getInterpolatedElevation(
                imageData,
                pixelPosition.x,
                pixelPosition.y
            );

            return elevation;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get interpolated elevation: ${error.message}`);
            }
            throw new Error('Failed to get interpolated elevation: Unknown error');
        }
    }

    /**
     * Batch get elevations for multiple coordinates
     */
    public async getElevations(
        coordinates: Array<{ latitude: number; longitude: number }>
    ): Promise<number[]> {
        const promises = coordinates.map(coord =>
            this.getElevation(coord.latitude, coord.longitude)
        );

        return Promise.all(promises);
    }

    /**
     * Get current configuration
     */
    public getConfig(): Readonly<Required<ElevationProviderConfig>> {
        return { ...this.config };
    }

    /**
     * Clear tile cache
     */
    public clearCache(): void {
        this.tileCache.clear();
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
