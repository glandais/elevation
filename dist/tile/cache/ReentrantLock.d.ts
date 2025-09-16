/**
 * Reentrant lock with semaphore for limiting concurrent operations
 * Features:
 * - Request deduplication (multiple requests for same key)
 * - Concurrency limiting (max operations based on cache size)
 * - Race condition protection
 * - Proper cleanup and resource management
 */
export declare class ReentrantLock<T> {
    private readonly locks;
    private readonly maxConcurrent;
    private loadingCount;
    private readonly waitQueue;
    constructor(maxConcurrent: number);
    /**
     * Acquire lock for key with deduplication and concurrency limiting
     * @param key - Unique identifier for the operation
     * @param fn - Function to execute if not already running
     * @returns Promise resolving to the operation result
     */
    acquire(key: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Get current number of active operations
     * @returns Number of operations currently being loaded
     */
    getLoadingCount(): number;
    /**
     * Acquire a loading slot (semaphore acquire)
     */
    private acquireLoadingSlot;
    /**
     * Release a loading slot (semaphore release)
     */
    private releaseLoadingSlot;
}
//# sourceMappingURL=ReentrantLock.d.ts.map