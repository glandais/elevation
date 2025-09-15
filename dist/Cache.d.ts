/**
 * LRU (Least Recently Used) cache with performance optimizations and cleanup support
 */
export declare class Cache<T> {
    private readonly maxSize;
    private readonly cache;
    private readonly cleanupFn?;
    private readonly lruOrder;
    private head;
    private tail;
    constructor(maxSize?: number, cleanupFn?: (value: T) => void);
    /**
     * Get item from cache
     */
    get(key: string): T | null;
    /**
     * Store item in cache
     */
    set(key: string, value: T): void;
    /**
     * Check if item exists in cache
     */
    has(key: string): boolean;
    /**
     * Remove item from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all cached items
     */
    clear(): void;
    /**
     * Get all cached keys
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
//# sourceMappingURL=Cache.d.ts.map