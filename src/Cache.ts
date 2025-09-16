class ReentrantLock<T> {
    private readonly locks = new Map<string, Promise<T>>();
    private readonly maxConcurrent: number;
    private loadingCount: number = 0;
    private readonly waitQueue: Array<() => void> = [];

    constructor(maxConcurrent: number) {
        this.maxConcurrent = maxConcurrent;
    }

    public async acquire(key: string, fn: () => Promise<T>): Promise<T> {
        // First check if we already have this key being loaded (deduplication)
        if (this.locks.has(key)) {
            return this.locks.get(key)!;
        }

        // Wait for a loading slot for this new unique operation
        await this.acquireLoadingSlot();

        // Double-check after acquiring slot (race condition protection)
        if (this.locks.has(key)) {
            this.releaseLoadingSlot();
            return this.locks.get(key)!;
        }

        // Create the promise with proper cleanup
        const promise = (async () => {
            try {
                return await fn();
            } finally {
                this.locks.delete(key);
                this.releaseLoadingSlot();
            }
        })();

        this.locks.set(key, promise);
        return promise;
    }

    private async acquireLoadingSlot(): Promise<void> {
        if (this.loadingCount < this.maxConcurrent) {
            this.loadingCount++;
            return;
        }

        // Wait until a slot becomes available
        return new Promise<void>((resolve: () => void) => {
            this.waitQueue.push(resolve);
        });
    }

    private releaseLoadingSlot(): void {
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift();
            if (next) {
                next();
            }
        } else {
            this.loadingCount--;
        }
    }

    public getLoadingCount(): number {
        return this.locks.size;
    }
}

/**
 * LRU (Least Recently Used) cache with performance optimizations and cleanup support
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
    private readonly lock: ReentrantLock<T>;

    constructor(
        maxSize: number = 100,
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

    /**
     * Get item from cache
     */
    public async get(k: K): Promise<T> {
        const key = this.keyMapper(k);
        const cachedItem = this.cache.get(key);

        if (cachedItem) {
            this.moveToFront(key);
            return cachedItem;
        }

        return this.lock.acquire(key, async () => {
            const existing = this.cache.get(key);
            if (existing) {
                this.moveToFront(key);
                return existing;
            }

            const newItem = await this.valueBuilder(k);
            this.set(key, newItem);
            return newItem;
        });
    }

    /**
     * Store item in cache
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
     * Check if item exists in cache
     */
    public has(k: K): boolean {
        const key = this.keyMapper(k);
        return this.cache.has(key);
    }

    /**
     * Remove item from cache
     */
    private delete(key: string): boolean {
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
