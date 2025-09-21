import { TileCoordinates } from '../../types';
import { Tile } from '..';
import { TileFetcher } from './TileFetcher';
export declare class TileLoader {
    private tileUrlTemplate;
    private tileFetcher;
    constructor(tileUrlTemplate: string, tileFetcher: TileFetcher);
    loadTile(tileCoords: TileCoordinates): Promise<Tile>;
    private getTileUrl;
}
//# sourceMappingURL=TileLoader.d.ts.map