import { TileFetcher } from '..';
import { Tile } from '../..';
export declare class NodeJsTileFetcher implements TileFetcher {
    private readonly canvasPool;
    constructor();
    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     * @param url - The URL of the tile to fetch
     * @param tileKey - The tile identifier for logging
     * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
     */
    fetchTile(url: string): Promise<Tile>;
}
//# sourceMappingURL=NodeJsTileFetcher.d.ts.map