import { TileCoordinates, Tile } from '../types';
export declare class TileManager {
    private readonly tileFetcher;
    private readonly cache;
    constructor(tileUrlTemplate: string, timeout: number, cacheSize: number);
    getTile(tileCoords: TileCoordinates): Promise<Tile>;
    clearCache(): void;
}
//# sourceMappingURL=TileManager.d.ts.map