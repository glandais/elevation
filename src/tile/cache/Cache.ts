import { createLogger, Logger, LogLevel } from '../../utils';
import { ReentrantLock } from './ReentrantLock';
const logger: Logger = createLogger('tile/cache/Cache');

// ============================================================================
// LRU CACHE - Memory-Efficient Caching with Concurrency Control
// ============================================================================

/**
 * LRU (Least Recently Used) cache with performance optimizations and cleanup support
 * Features:
 * - O(1) LRU operations using doubly-linked list structure
 * - Automatic eviction when capacity exceeded
 * - Concurrent loading with deduplication via ReentrantLock
 * - Optional cleanup function for resource management
 * - Thread-safe operations with proper error handling
 */
export class Cache<K, T> {
    private readonly maxSize: number;
    private readonly cache: Map<string, T>;
    private readonly keyMapper: (key: K) => string;
    private readonly valueBuilder: (key: K) => Promise<T>;
    private readonly cleanupFn?: (value: T) => void;

    // Using LinkedList-like structure for true O(1) LRU operations
    private readonly lruOrder: Map<string, { prev: string | null; next: string | null }>;
    private head: string | null = null;
    private tail: string | null = null;

    // Concurrency control
    private readonly lock: ReentrantLock<T>;

    // ========================================================================
    // CONSTRUCTOR & VALIDATION
    // ========================================================================

    constructor(
        maxSize: number,
        keyMapper: (key: K) => string,
        valueBuilder: (key: K) => Promise<T>,
        cleanupFn?: (value: T) => void
    ) {
        if (maxSize <= 0) {
            throw new Error('Cache size must be greater than 0');
        }

        this.maxSize = maxSize;
        this.keyMapper = keyMapper;
        this.valueBuilder = valueBuilder;
        this.cleanupFn = cleanupFn;
        this.cache = new Map();
        this.lruOrder = new Map();
        this.lock = new ReentrantLock<T>(maxSize);
    }

    // ========================================================================
    // PUBLIC API - CACHE OPERATIONS
    // ========================================================================

    /**
     * Get item from cache or build if not present
     * @param k - Key to retrieve
     * @returns Promise resolving to cached or newly built value
     */
    public async get(k: K): Promise<T> {
        const key = this.keyMapper(k);
        const cachedItem = this.cache.get(key);

        if (cachedItem) {
            this.moveToFront(key);
            return cachedItem;
        }
        logger.debug('%s miss', key);

        return this.lock.acquire(key, async () => {
            const existing = this.cache.get(key);
            if (existing) {
                logger.debug('%s Missed at first but now OK', key);
                this.moveToFront(key);
                return existing;
            }

            logger.info('%s loading', key);
            logger.timeLevel(LogLevel.INFO, key);
            const newItem = await this.valueBuilder(k);
            logger.info('%s loaded', key);
            logger.timeEndLevel(LogLevel.INFO, key);
            this.set(key, newItem);
            return newItem;
        });
    }

    /**
     * Clear all cached items
     */
    public clear(): void {
        logger.debug('clear');
        // Call cleanup function for all cached items
        if (this.cleanupFn) {
            for (const value of this.cache.values()) {
                this.cleanupFn(value);
            }
        }

        this.cache.clear();
        this.lruOrder.clear();
        this.head = null;
        this.tail = null;
    }

    // ========================================================================
    // PROTECTED API - INSPECTION METHODS
    // ========================================================================

    /**
     * Check if item exists in cache
     * @param k - Key to check
     * @returns True if key exists in cache
     */
    protected has(k: K): boolean {
        const key = this.keyMapper(k);
        return this.cache.has(key);
    }

    /**
     * Get all cached keys
     * @returns Array of all cached keys
     */
    protected getKeys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get the least recently used keys in order
     * @param count - Maximum number of keys to return
     * @returns Array of LRU keys from least to most recently used
     */
    protected getLRUKeys(count: number = 10): string[] {
        const result: string[] = [];
        let current = this.tail; // Start from tail (least recently used)

        while (current && result.length < count) {
            result.push(current);
            const node = this.lruOrder.get(current);
            current = node?.prev || null;
        }

        return result;
    }

    // ========================================================================
    // PRIVATE - CACHE STORAGE OPERATIONS
    // ========================================================================

    /**
     * Store item in cache with automatic eviction
     */
    private set(key: string, value: T): void {
        // If cache is full, remove least recently used item
        if (this.cache.size >= this.maxSize) {
            this.evictLeastRecentlyUsed();
        }

        // Add new item
        this.cache.set(key, value);
        this.addToFront(key);
    }

    /**
     * Remove item from cache with cleanup
     */
    private delete(key: string): boolean {
        logger.debug('%s delete', key);
        if (!this.cache.has(key)) {
            return false;
        }

        const value = this.cache.get(key);
        this.cache.delete(key);
        this.removeFromLRU(key);

        // Call cleanup function if provided
        if (value && this.cleanupFn) {
            this.cleanupFn(value);
        }

        return true;
    }

    // ========================================================================
    // PRIVATE - LRU EVICTION OPERATIONS
    // ========================================================================

    /**
     * Remove the least recently used item to make space
     */
    private evictLeastRecentlyUsed(): void {
        if (!this.tail) {
            return;
        }

        const lruKey = this.tail;
        this.delete(lruKey);
    }

    // ========================================================================
    // PRIVATE - LRU LINKED LIST OPERATIONS
    // ========================================================================

    /**
     * Add a key to the front of the LRU list (most recently used)
     */
    private addToFront(key: string): void {
        const node = { prev: null, next: this.head };
        this.lruOrder.set(key, node);

        if (this.head) {
            const headNode = this.lruOrder.get(this.head)!;
            headNode.prev = key;
        } else {
            // First node
            this.tail = key;
        }

        this.head = key;
    }

    /**
     * Move an existing key to the front of the LRU list
     */
    private moveToFront(key: string): void {
        if (this.head === key) {
            return; // Already at front
        }

        // Remove from current position
        this.removeFromLRU(key);

        // Add to front
        this.addToFront(key);
    }

    /**
     * Remove a key from the LRU doubly-linked list
     */
    private removeFromLRU(key: string): void {
        const node = this.lruOrder.get(key);
        if (!node) {
            return;
        }

        // Update previous node's next pointer
        if (node.prev) {
            const prevNode = this.lruOrder.get(node.prev)!;
            prevNode.next = node.next;
        } else {
            // This was the head
            this.head = node.next;
        }

        // Update next node's prev pointer
        if (node.next) {
            const nextNode = this.lruOrder.get(node.next)!;
            nextNode.prev = node.prev;
        } else {
            // This was the tail
            this.tail = node.prev;
        }

        this.lruOrder.delete(key);
    }
}
