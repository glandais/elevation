/**
 * HTTP client for fetching terrain RGB tiles with memory-efficient ImageBitmap
 */
export declare class TileFetcher {
    private readonly timeout;
    constructor(timeout?: number);
    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     */
    fetchTile(url: string): Promise<{
        imageData: ImageData;
        imageBitmap: ImageBitmap;
    }>;
    /**
     * Fetch with timeout support
     */
    private fetchWithTimeout;
    /**
     * Convert blob to ImageData and ImageBitmap using createImageBitmap
     * This approach avoids memory leaks from Image objects and blob URLs
     */
    private blobToImageDataAndBitmap;
}
//# sourceMappingURL=TileFetcher.d.ts.map