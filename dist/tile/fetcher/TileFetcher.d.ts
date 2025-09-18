import { Tile, TileCoordinates } from '../../types';
/**
 * HTTP client for fetching terrain RGB tiles with memory-efficient ImageBitmap processing
 * Features:
 * - Configurable timeout support
 * - Memory-efficient canvas pooling
 * - ImageBitmap creation for optimal performance
 * - Automatic resource cleanup
 */
export declare class TileFetcher {
    private readonly tileUrlTemplate;
    private readonly timeout;
    private readonly canvasPool;
    constructor(tileUrlTemplate: string, timeout?: number);
    loadTile(tileCoords: TileCoordinates): Promise<Tile>;
    private getTileUrl;
    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     * @param url - The URL of the tile to fetch
     * @param tileKey - The tile identifier for logging
     * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
     */
    private fetchTile;
    /**
     * Fetch with timeout support using AbortController
     */
    private fetchWithTimeout;
    /**
     * Convert blob to ImageData and ImageBitmap using createImageBitmap
     * This approach avoids memory leaks from Image objects and blob URLs
     * Uses canvas pool for efficient resource management
     */
    private blobToImageDataAndBitmap;
}
//# sourceMappingURL=TileFetcher.d.ts.map