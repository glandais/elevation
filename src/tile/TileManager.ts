import TileFetcher from './fetcher';
import { Cache } from './cache';
import type { TileCoordinates, Tile } from '../types';

export class TileManager {
    private readonly tileFetcher: TileFetcher;
    private readonly cache: Cache<TileCoordinates, Tile>;

    constructor(tileUrlTemplate: string, timeout: number, cacheSize: number) {
        this.tileFetcher = new TileFetcher(tileUrlTemplate, timeout);

        // Create cache with cleanup function to close ImageBitmaps
        const cleanupFunction = (cachedTile: Tile) => {
            cachedTile.bitmap.close();
        };

        this.cache = new Cache<TileCoordinates, Tile>(
            cacheSize,
            tileCoords => `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`,
            tileCoords => this.tileFetcher.loadTile(tileCoords),
            cleanupFunction
        );
    }

    async getTile(tileCoords: TileCoordinates): Promise<Tile> {
        return await this.cache.get(tileCoords);
    }

    clearCache(): void {
        this.cache.clear();
    }
}
