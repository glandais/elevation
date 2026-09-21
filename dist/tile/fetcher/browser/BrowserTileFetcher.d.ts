import { TileFetcher } from '..';
import { Tile } from '../..';
/**
 * HTTP client for fetching terrain RGB tiles with memory-efficient ImageBitmap processing
 * Features:
 * - Configurable timeout support
 * - Memory-efficient canvas pooling
 * - ImageBitmap creation for optimal performance
 * - Automatic resource cleanup
 */
export declare class BrowserTileFetcher implements TileFetcher {
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
//# sourceMappingURL=BrowserTileFetcher.d.ts.map