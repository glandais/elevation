import { CoordinateConverter } from './CoordinateConverter';
import { TileFetcher } from './TileFetcher';
import { ElevationDecoder } from './ElevationDecoder';
import { Cache } from './Cache';
import type {
    Coordinates,
    ElevationProviderConfig,
    Attribution,
    Tile,
    TileCoordinates,
    Pixel,
} from './types';

/**
 * Main API class for retrieving elevation data from geographic coordinates
 */
export class ElevationProvider {
    private static readonly TILE_SIZE = 256;

    private readonly config: Required<ElevationProviderConfig>;
    private readonly tileFetcher: TileFetcher;
    private readonly cache: Cache<TileCoordinates, Tile>;

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
        const cleanupFunction = (cachedTile: Tile) => {
            cachedTile.bitmap.close();
        };
        this.cache = new Cache<TileCoordinates, Tile>(
            this.config.cacheSize,
            tileCoords => `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`,
            tileCoords => this.loadTile(tileCoords),
            cleanupFunction
        );
    }

    /**
     * Get tile URL from template
     */
    private getTileUrl(tileCoords: TileCoordinates): string {
        return this.config.tileUrlTemplate
            .replace('{z}', tileCoords.z.toString())
            .replace('{x}', tileCoords.x.toString())
            .replace('{y}', tileCoords.y.toString());
    }

    private async loadTile(tileCoords: TileCoordinates): Promise<Tile> {
        const tileUrl = this.getTileUrl(tileCoords);
        return await this.tileFetcher.fetchTile(tileUrl);
    }

    /**
     * Get elevation at specific coordinates
     */
    public async getElevation(latitude: number, longitude: number): Promise<number> {
        const coords: Coordinates = { latitude, longitude };
        const pixel = CoordinateConverter.toPixel(coords, this.config.zoomLevel);
        return await this.getElevationPixel(pixel);
    }

    private async getElevationPixel(pixel: Pixel): Promise<number> {
        try {
            // Try to get tile from cache
            const cachedTile = await this.cache.get(pixel.tile);
            const imageData = cachedTile.data;
            // Decode elevation from pixel data
            const elevation = ElevationDecoder.getElevationFromImageData(imageData, pixel);
            return elevation;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get elevation: ${error.message}`);
            }
            throw new Error('Failed to get elevation: Unknown error');
        }
    }

    public async getInterpolatedElevation(latitude: number, longitude: number): Promise<number> {
        const coords: Coordinates = { latitude, longitude };
        const pixel = CoordinateConverter.toPixel(coords, this.config.zoomLevel);
        return await this.getInterpolatedElevationPixel(pixel);
    }

    private async getInterpolatedElevationPixel(pixelFloat: {
        tile: Pixel['tile'];
        x: number;
        y: number;
    }): Promise<number> {
        const x0 = Math.floor(pixelFloat.x);
        const y0 = Math.floor(pixelFloat.y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const dx = pixelFloat.x - x0;
        const dy = pixelFloat.y - y0;

        const p00 = await this.getElevationPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x0, y: y0 })
        );
        const p10 = await this.getElevationPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x1, y: y0 })
        );
        const p01 = await this.getElevationPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x0, y: y1 })
        );
        const p11 = await this.getElevationPixel(
            this.normalizePixel({ tile: pixelFloat.tile, x: x1, y: y1 })
        );

        const top = p00 * (1 - dx) + p10 * dx;
        const bottom = p01 * (1 - dx) + p11 * dx;
        return top * (1 - dy) + bottom * dy;
    }

    private normalizePixel(pixel: Pixel): Pixel {
        let { x, y } = pixel;
        const tile = pixel.tile;
        let tileX = tile.x;
        let tileY = tile.y;
        const z = tile.z;

        if (x < 0) {
            x += ElevationProvider.TILE_SIZE;
            tileX -= 1;
        }
        if (x >= ElevationProvider.TILE_SIZE) {
            x -= ElevationProvider.TILE_SIZE;
            tileX += 1;
        }
        if (y < 0) {
            y += ElevationProvider.TILE_SIZE;
            tileY -= 1;
        }
        if (y >= ElevationProvider.TILE_SIZE) {
            y -= ElevationProvider.TILE_SIZE;
            tileY += 1;
        }

        const maxTile = Math.pow(2, z) - 1;
        tileX = Math.max(0, Math.min(maxTile, tileX));
        tileY = Math.max(0, Math.min(maxTile, tileY));

        return { tile: { z, x: tileX, y: tileY }, x, y };
    }

    /**
     * Batch get elevations for multiple coordinates
     */
    public async getInterpolatedElevations(
        coordinates: Array<{ latitude: number; longitude: number }>
    ): Promise<number[]> {
        const promises = coordinates.map(coord =>
            this.getInterpolatedElevation(coord.latitude, coord.longitude)
        );

        return Promise.all(promises);
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
