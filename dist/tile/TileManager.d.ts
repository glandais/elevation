import { Cache } from './cache';
import { Tile } from './Tile';
import type { TileCoordinates } from '../types';
export declare class TileManager {
    private readonly tileUrlTemplate;
    private readonly cacheSize;
    private cache;
    constructor(tileUrlTemplate: string, cacheSize: number);
    getTileDirect(tileCoords: TileCoordinates): Tile | undefined;
    getTile(tileCoords: TileCoordinates): Promise<Tile>;
    initCache(): Promise<Cache<TileCoordinates, Tile>>;
}
//# sourceMappingURL=TileManager.d.ts.map