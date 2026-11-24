/**
 * LRU (Least Recently Used) cache with performance optimizations and cleanup support
 * Features:
 * - O(1) LRU operations using doubly-linked list structure
 * - Automatic eviction when capacity exceeded
 * - Concurrent loading with deduplication via ReentrantLock
 * - Optional cleanup function for resource management
 * - Thread-safe operations with proper error handling
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
    constructor(maxSize: number, keyMapper: (key: K) => string, valueBuilder: (key: K) => Promise<T>, cleanupFn?: (value: T) => void);
    getDirect(k: K): T | undefined;
    /**
     * Get item from cache or build if not present
     * @param k - Key to retrieve
     * @returns Promise resolving to cached or newly built value
     */
    get(k: K): Promise<T>;
    /**
     * Clear all cached items
     */
    clear(): void;
    /**
     * Check if item exists in cache
     * @param k - Key to check
     * @returns True if key exists in cache
     */
    protected has(k: K): boolean;
    /**
     * Get all cached keys
     * @returns Array of all cached keys
     */
    protected getKeys(): string[];
    /**
     * Get the least recently used keys in order
     * @param count - Maximum number of keys to return
     * @returns Array of LRU keys from least to most recently used
     */
    protected getLRUKeys(count?: number): string[];
    /**
     * Store item in cache with automatic eviction
     */
    private set;
    /**
     * Remove item from cache with cleanup
     */
    private delete;
    /**
     * Remove the least recently used item to make space
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
     * Remove a key from the LRU doubly-linked list
     */
    private removeFromLRU;
}
//# sourceMappingURL=Cache.d.ts.map