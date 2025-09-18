import { createLogger, Logger, LogLevel } from '../../utils';

const logger: Logger = createLogger('tile/cache/ReentrantLock');
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
        logger.debug(
            '%s: Lock acquire requested (active: %d/%d, queued: %d)',
            key,
            this.loadingCount,
            this.maxConcurrent,
            this.waitQueue.length
        );

        // First check if we already have this key being loaded (deduplication)
        if (this.locks.has(key)) {
            logger.debug(
                '%s: Lock deduplication - already loading, returning existing promise',
                key
            );
            return this.locks.get(key)!;
        }

        // Wait for a loading slot for this new unique operation
        await this.acquireLoadingSlot(key);

        // Double-check after acquiring slot (race condition protection)
        if (this.locks.has(key)) {
            logger.debug(
                '%s: Lock race condition - already loading after slot acquired, releasing slot',
                key
            );
            this.releaseLoadingSlot(key);
            return this.locks.get(key)!;
        }

        // Create the promise with proper cleanup
        logger.debug('%s: Lock creating new promise', key);
        const promise = (async () => {
            try {
                logger.debug('%s: Promise executing function', key);
                const result = await fn();
                logger.debug('%s: Promise resolved successfully', key);
                return result;
            } catch (error) {
                logger.error('%s: Promise rejected - %o', key, error);
                throw error;
            } finally {
                logger.debug('%s: Promise cleanup - removing lock and releasing slot', key);
                this.locks.delete(key);
                this.releaseLoadingSlot(key);
            }
        })();

        this.locks.set(key, promise);
        logger.debug('%s: Lock registered promise (total locks: %d)', key, this.locks.size);
        return promise;
    }

    // ========================================================================
    // PRIVATE - SEMAPHORE OPERATIONS
    // ========================================================================

    /**
     * Acquire a loading slot (semaphore acquire)
     */
    private async acquireLoadingSlot(key: string): Promise<void> {
        if (this.loadingCount < this.maxConcurrent) {
            this.loadingCount++;
            logger.debug(
                '%s: Semaphore acquired slot immediately (%d/%d active, %d queued)',
                key,
                this.loadingCount,
                this.maxConcurrent,
                this.waitQueue.length
            );
            return;
        }

        logger.debug(
            '%s: Semaphore waiting for slot (%d/%d active, %d queued)',
            key,
            this.loadingCount,
            this.maxConcurrent,
            this.waitQueue.length
        );

        logger.timeLevel(LogLevel.DEBUG, key);

        // Wait until a slot becomes available
        return new Promise<void>((resolve: () => void) => {
            this.waitQueue.push(() => {
                logger.timeEndLevel(LogLevel.DEBUG, key);
                this.loadingCount++;
                logger.debug(
                    '%s: Semaphore acquired slot after waiting (%d/%d active, %d queued)',
                    key,
                    this.loadingCount,
                    this.maxConcurrent,
                    this.waitQueue.length
                );
                resolve();
            });
        });
    }

    /**
     * Release a loading slot (semaphore release)
     */
    private releaseLoadingSlot(key: string): void {
        if (this.waitQueue.length > 0) {
            logger.debug(
                '%s: Semaphore: releasing slot to waiting request (%d/%d active, %d queued)',
                key,
                this.loadingCount,
                this.maxConcurrent,
                this.waitQueue.length
            );
            const next = this.waitQueue.shift();
            if (next) {
                next(); // This will increment loadingCount in the queued resolver
            }
        } else {
            this.loadingCount--;
            logger.debug(
                '%s: Semaphore: released slot (%d/%d active, %d queued)',
                key,
                this.loadingCount,
                this.maxConcurrent,
                this.waitQueue.length
            );
        }
    }
}
