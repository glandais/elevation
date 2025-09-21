import { TileCoordinates } from '../types';
import { Tile } from './Tile';
export declare class TileManager {
    private readonly tileUrlTemplate;
    private readonly cacheSize;
    private cache;
    constructor(tileUrlTemplate: string, cacheSize: number);
    getTile(tileCoords: TileCoordinates): Promise<Tile>;
    private checkCache;
}
//# sourceMappingURL=TileManager.d.ts.map