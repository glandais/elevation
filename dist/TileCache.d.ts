/**
 * LRU (Least Recently Used) cache for terrain tiles with performance optimizations
 */
export declare class TileCache {
    private readonly maxSize;
    private readonly cache;
    private readonly lruOrder;
    private head;
    private tail;
    constructor(maxSize?: number);
    /**
     * Get tile from cache
     */
    get(key: string): ImageData | null;
    /**
     * Store tile in cache
     */
    set(key: string, imageData: ImageData): void;
    /**
     * Check if tile exists in cache
     */
    has(key: string): boolean;
    /**
     * Remove tile from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all cached tiles
     */
    clear(): void;
    /**
     * Get all cached tile keys
     */
    getKeys(): string[];
    /**
     * Get the least recently used keys in order
     */
    getLRUKeys(count?: number): string[];
    /**
     * Remove the least recently used item
     */
    private evictLeastRecentlyUsed;
    /**
     * Add a key to the front of the LRU list (most recently used)
     */
    private addToFront;
    /**
     * Move an existing key to the front of the LRU list
     */
    private moveToFront;
    /**
     * Remove a key from the LRU list
     */
    private removeFromLRU;
}
//# sourceMappingURL=TileCache.d.ts.map