/**
 * HTTP client for fetching terrain RGB tiles
 */
export declare class TileFetcher {
    private readonly timeout;
    constructor(timeout?: number);
    /**
     * Fetch a tile image and return ImageData
     */
    fetchTile(url: string): Promise<ImageData>;
    /**
     * Fetch with timeout support
     */
    private fetchWithTimeout;
    /**
     * Convert blob to ImageData using Canvas API
     */
    private blobToImageData;
}
//# sourceMappingURL=TileFetcher.d.ts.map