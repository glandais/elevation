/**
 * LRU (Least Recently Used) cache with performance optimizations and cleanup support
 */
export class Cache<T> {
    private readonly maxSize: number;
    private readonly cache: Map<string, T>;
    private readonly cleanupFn?: (value: T) => void;
    // Using LinkedList-like structure for true O(1) LRU operations
    private readonly lruOrder: Map<string, { prev: string | null; next: string | null }>;
    private head: string | null = null;
    private tail: string | null = null;

    constructor(maxSize: number = 100, cleanupFn?: (value: T) => void) {
        if (maxSize <= 0) {
            throw new Error('Cache size must be greater than 0');
        }

        this.maxSize = maxSize;
        this.cleanupFn = cleanupFn;
        this.cache = new Map();
        this.lruOrder = new Map();
    }

    /**
     * Get item from cache
     */
    public get(key: string): T | null {
        const cachedItem = this.cache.get(key);

        if (!cachedItem) {
            return null;
        }

        // Move to front (most recently used)
        this.moveToFront(key);

        return cachedItem;
    }

    /**
     * Store item in cache
     */
    public set(key: string, value: T): void {
        // If key already exists, update it
        if (this.cache.has(key)) {
            this.cache.set(key, value);
            this.moveToFront(key);
            return;
        }

        // If cache is full, remove least recently used item
        if (this.cache.size >= this.maxSize) {
            this.evictLeastRecentlyUsed();
        }

        // Add new item
        this.cache.set(key, value);
        this.addToFront(key);
    }

    /**
     * Check if item exists in cache
     */
    public has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Remove item from cache
     */
    public delete(key: string): boolean {
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

    /**
     * Clear all cached items
     */
    public clear(): void {
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

    /**
     * Get all cached keys
     */
    public getKeys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get the least recently used keys in order
     */
    public getLRUKeys(count: number = 10): string[] {
        const result: string[] = [];
        let current = this.tail; // Start from tail (least recently used)

        while (current && result.length < count) {
            result.push(current);
            const node = this.lruOrder.get(current);
            current = node?.prev || null;
        }

        return result;
    }

    /**
     * Remove the least recently used item
     */
    private evictLeastRecentlyUsed(): void {
        if (!this.tail) {
            return;
        }

        const lruKey = this.tail;
        this.delete(lruKey);
    }

    /**
     * Add a key to the front of the LRU list (most recently used)
     */
    private addToFront(key: string): void {
        const node = { prev: null, next: this.head };
        this.lruOrder.set(key, node);

        if (this.head) {
            const headNode = this.lruOrder.get(this.head);
            if (headNode) {
                headNode.prev = key;
            }
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
     * Remove a key from the LRU list
     */
    private removeFromLRU(key: string): void {
        const node = this.lruOrder.get(key);
        if (!node) {
            return;
        }

        // Update previous node's next pointer
        if (node.prev) {
            const prevNode = this.lruOrder.get(node.prev);
            if (prevNode) {
                prevNode.next = node.next;
            }
        } else {
            // This was the head
            this.head = node.next;
        }

        // Update next node's prev pointer
        if (node.next) {
            const nextNode = this.lruOrder.get(node.next);
            if (nextNode) {
                nextNode.prev = node.prev;
            }
        } else {
            // This was the tail
            this.tail = node.prev;
        }

        this.lruOrder.delete(key);
    }
}
