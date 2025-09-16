// ============================================================================
// REENTRANT LOCK - Concurrency Control with Semaphore
// ============================================================================

/**
 * Reentrant lock with semaphore for limiting concurrent operations
 * Features:
 * - Request deduplication (multiple requests for same key)
 * - Concurrency limiting (max operations based on cache size)
 * - Race condition protection
 * - Proper cleanup and resource management
 */
export class ReentrantLock<T> {
    private readonly locks = new Map<string, Promise<T>>();
    private readonly maxConcurrent: number;
    private loadingCount: number = 0;
    private readonly waitQueue: Array<() => void> = [];

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(maxConcurrent: number) {
        this.maxConcurrent = maxConcurrent;
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Acquire lock for key with deduplication and concurrency limiting
     * @param key - Unique identifier for the operation
     * @param fn - Function to execute if not already running
     * @returns Promise resolving to the operation result
     */
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

    // ========================================================================
    // PRIVATE - SEMAPHORE OPERATIONS
    // ========================================================================

    /**
     * Acquire a loading slot (semaphore acquire)
     */
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

    /**
     * Release a loading slot (semaphore release)
     */
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
}
