import { CoordinateConverter } from './CoordinateConverter';
import { TileFetcher } from './TileFetcher';
import { ElevationDecoder } from './ElevationDecoder';
import { Cache } from './Cache';
import type { Coordinates, ElevationProviderConfig, Attribution, CachedTile } from './types';

/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export class ElevationProvider {
    private readonly config: Required<ElevationProviderConfig>;
    private readonly tileFetcher: TileFetcher;
    private readonly cache: Cache<CachedTile>;

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

        // Create cache with cleanup function to close ImageBitmaps
        const cleanupFunction = (cachedTile: CachedTile) => {
            cachedTile.bitmap.close();
        };
        this.cache = new Cache<CachedTile>(this.config.cacheSize, cleanupFunction);
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
            const cachedTile = this.cache.get(tileKey);
            let imageData: ImageData;

            // If not in cache, fetch it
            if (!cachedTile) {
                const tileUrl = CoordinateConverter.getTileUrl(
                    tileCoords,
                    this.config.tileUrlTemplate
                );

                const { imageData: fetchedImageData, imageBitmap } =
                    await this.tileFetcher.fetchTile(tileUrl);
                imageData = fetchedImageData;
                this.cache.set(tileKey, { key: tileKey, data: imageData, bitmap: imageBitmap });
            } else {
                imageData = cachedTile.data;
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
            const cachedTile = this.cache.get(tileKey);
            let imageData: ImageData;

            // If not in cache, fetch it
            if (!cachedTile) {
                const tileUrl = CoordinateConverter.getTileUrl(
                    tileCoords,
                    this.config.tileUrlTemplate
                );

                const { imageData: fetchedImageData, imageBitmap } =
                    await this.tileFetcher.fetchTile(tileUrl);
                imageData = fetchedImageData;
                this.cache.set(tileKey, { key: tileKey, data: imageData, bitmap: imageBitmap });
            } else {
                imageData = cachedTile.data;
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
        this.cache.clear();
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
