import { Cache } from './cache';
import type { TileCoordinates } from '../types';
import { Tile } from './Tile';
import { TileFetcher } from './fetcher/TileFetcher';
import { TileLoader } from './fetcher/TileLoader';

export class TileManager {
    private cache: Cache<TileCoordinates, Tile> | undefined;

    constructor(
        private readonly tileUrlTemplate: string,
        private readonly cacheSize: number
    ) {}

    public async getTile(tileCoords: TileCoordinates): Promise<Tile> {
        const createdCache = await this.checkCache();
        return await createdCache.get(tileCoords);
    }

    private async checkCache(): Promise<Cache<TileCoordinates, Tile>> {
        if (!this.cache) {
            let tileFetcher: TileFetcher;
            if (__NODE__) {
                const { NodeJsTileFetcher } = await import('./fetcher/nodejs/NodeJsTileFetcher');
                tileFetcher = new NodeJsTileFetcher();
            } else {
                const { BrowserTileFetcher } = await import('./fetcher/browser/BrowserTileFetcher');
                tileFetcher = new BrowserTileFetcher();
            }
            // Create cache with cleanup function to close ImageBitmaps
            const cleanupFunction = (cachedTile: Tile) => cachedTile.close();

            const tileLoader = new TileLoader(this.tileUrlTemplate, tileFetcher);

            const createdCache = new Cache<TileCoordinates, Tile>(
                this.cacheSize,
                tileCoords => `${tileCoords.z}/${tileCoords.x}/${tileCoords.y}`,
                tileCoords => tileLoader.loadTile(tileCoords),
                cleanupFunction
            );
            this.cache = createdCache;
            return createdCache;
        } else {
            return this.cache;
        }
    }
}
