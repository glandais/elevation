/**
 * LRU (Least Recently Used) cache with performance optimizations and cleanup support
 */
export declare class Cache<K, T> {
    private readonly maxSize;
    private readonly cache;
    private readonly keyMapper;
    private readonly valueBuilder;
    private readonly cleanupFn?;
    private readonly lruOrder;
    private head;
    private tail;
    private readonly lock;
    constructor(maxSize: number | undefined, keyMapper: (key: K) => string, valueBuilder: (key: K) => Promise<T>, cleanupFn?: (value: T) => void);
    /**
     * Get item from cache
     */
    get(k: K): Promise<T>;
    /**
     * Store item in cache
     */
    private set;
    /**
     * Check if item exists in cache
     */
    has(k: K): boolean;
    /**
     * Remove item from cache
     */
    private delete;
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