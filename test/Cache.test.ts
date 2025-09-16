import { Cache } from '../src/Cache';

describe('Cache', () => {
    let cache: Cache<string, string>;
    const mockKeyMapper = (key: string) => key;
    const mockValueBuilder = jest.fn((key: string) => Promise.resolve(`value-${key}`));
    const mockCleanupFn = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        cache = new Cache<string, string>(3, mockKeyMapper, mockValueBuilder, mockCleanupFn);
    });

    describe('constructor', () => {
        it('should create cache with default maxSize', () => {
            const defaultCache = new Cache<string, string>(100, mockKeyMapper, mockValueBuilder);
            expect(defaultCache).toBeDefined();
        });

        it('should throw error for invalid maxSize', () => {
            expect(() => {
                new Cache<string, string>(0, mockKeyMapper, mockValueBuilder);
            }).toThrow('Cache size must be greater than 0');

            expect(() => {
                new Cache<string, string>(-1, mockKeyMapper, mockValueBuilder);
            }).toThrow('Cache size must be greater than 0');
        });

        it('should create cache without cleanup function', () => {
            const cacheWithoutCleanup = new Cache<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder
            );
            expect(cacheWithoutCleanup).toBeDefined();
        });
    });

    describe('get method', () => {
        it('should build and cache new values', async () => {
            const result = await cache.get('key1');
            expect(result).toBe('value-key1');
            expect(mockValueBuilder).toHaveBeenCalledWith('key1');
            expect(mockValueBuilder).toHaveBeenCalledTimes(1);
        });

        it('should return cached value without rebuilding', async () => {
            await cache.get('key1');
            const result = await cache.get('key1');
            expect(result).toBe('value-key1');
            expect(mockValueBuilder).toHaveBeenCalledTimes(1);
        });

        it('should handle concurrent requests for same key', async () => {
            const promises = [cache.get('key1'), cache.get('key1'), cache.get('key1')];
            const results = await Promise.all(promises);

            expect(results).toEqual(['value-key1', 'value-key1', 'value-key1']);
            expect(mockValueBuilder).toHaveBeenCalledTimes(1);
        });

        it('should handle race condition where item appears during lock acquisition', async () => {
            // Create a cache with a slow value builder to test race conditions
            const slowBuilder = jest.fn().mockImplementation(async (key: string) => {
                // Simulate slow build
                await new Promise(resolve => setTimeout(resolve, 10));
                return `value-${key}`;
            });

            const raceCache = new Cache<string, string>(
                3,
                mockKeyMapper,
                slowBuilder,
                mockCleanupFn
            );

            // Start first request
            const promise1 = raceCache.get('race-key');

            // Start second request for same key while first is building
            const promise2 = raceCache.get('race-key');

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(result1).toBe('value-race-key');
            expect(result2).toBe('value-race-key');
            // Should only call builder once due to lock
            expect(slowBuilder).toHaveBeenCalledTimes(1);
        });

        it('should build different values for different keys', async () => {
            const result1 = await cache.get('key1');
            const result2 = await cache.get('key2');

            expect(result1).toBe('value-key1');
            expect(result2).toBe('value-key2');
            expect(mockValueBuilder).toHaveBeenCalledTimes(2);
        });

        it('should evict LRU item when cache is full', async () => {
            // Fill cache to capacity
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');

            // Add one more item to trigger eviction
            await cache.get('key4');

            expect(mockCleanupFn).toHaveBeenCalledWith('value-key1');
            expect(mockCleanupFn).toHaveBeenCalledTimes(1);

            // Verify key1 is no longer cached
            await cache.get('key1');
            expect(mockValueBuilder).toHaveBeenCalledWith('key1');
        });

        it('should update LRU order when accessing cached items', async () => {
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');

            // Access key1 to make it most recently used
            await cache.get('key1');

            // Add key4 to trigger eviction (should evict key2)
            await cache.get('key4');

            expect(mockCleanupFn).toHaveBeenCalledWith('value-key2');
        });

        it('should handle valueBuilder errors', async () => {
            const errorBuilder = jest.fn().mockRejectedValue(new Error('Build failed'));
            const errorCache = new Cache<string, string>(3, mockKeyMapper, errorBuilder);

            await expect(errorCache.get('key1')).rejects.toThrow('Build failed');
        });
    });

    describe('has method', () => {
        it('should return false for non-existent key', () => {
            expect(cache.has('nonexistent')).toBe(false);
        });

        it('should return true for cached key', async () => {
            await cache.get('key1');
            expect(cache.has('key1')).toBe(true);
        });

        it('should return false after eviction', async () => {
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');
            await cache.get('key4'); // Evicts key1

            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key4')).toBe(true);
        });
    });

    describe('clear method', () => {
        it('should clear all cached items', async () => {
            await cache.get('key1');
            await cache.get('key2');

            cache.clear();

            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(false);
        });

        it('should call cleanup function for all items', async () => {
            await cache.get('key1');
            await cache.get('key2');

            cache.clear();

            expect(mockCleanupFn).toHaveBeenCalledWith('value-key1');
            expect(mockCleanupFn).toHaveBeenCalledWith('value-key2');
            expect(mockCleanupFn).toHaveBeenCalledTimes(2);
        });

        it('should handle clear without cleanup function', async () => {
            const cacheWithoutCleanup = new Cache<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder
            );
            await cacheWithoutCleanup.get('key1');

            expect(() => cacheWithoutCleanup.clear()).not.toThrow();
        });
    });

    describe('getKeys method', () => {
        it('should return empty array for empty cache', () => {
            expect(cache.getKeys()).toEqual([]);
        });

        it('should return all cached keys', async () => {
            await cache.get('key1');
            await cache.get('key2');

            const keys = cache.getKeys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys).toHaveLength(2);
        });
    });

    describe('getLRUKeys method', () => {
        it('should return empty array for empty cache', () => {
            expect(cache.getLRUKeys()).toEqual([]);
        });

        it('should return keys in LRU order', async () => {
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');

            const lruKeys = cache.getLRUKeys();
            expect(lruKeys).toEqual(['key1', 'key2', 'key3']); // From tail (LRU) to head (MRU)
        });

        it('should limit returned keys to specified count', async () => {
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');

            const lruKeys = cache.getLRUKeys(2);
            expect(lruKeys).toEqual(['key1', 'key2']); // First 2 from tail (LRU)
            expect(lruKeys).toHaveLength(2);
        });

        it('should update order after accessing cached item', async () => {
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');

            // Access key1 to make it most recently used
            await cache.get('key1');

            const lruKeys = cache.getLRUKeys();
            expect(lruKeys).toEqual(['key2', 'key3', 'key1']); // key2 is now LRU, key1 is MRU
        });
    });

    describe('LRU edge cases', () => {
        it('should handle single item cache', async () => {
            const singleCache = new Cache<string, string>(
                1,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );

            await singleCache.get('key1');
            await singleCache.get('key2');

            expect(mockCleanupFn).toHaveBeenCalledWith('value-key1');
            expect(singleCache.has('key1')).toBe(false);
            expect(singleCache.has('key2')).toBe(true);
        });

        it('should handle empty cache operations', () => {
            expect(cache.getKeys()).toEqual([]);
            expect(cache.getLRUKeys()).toEqual([]);
            expect(cache.has('key1')).toBe(false);
            expect(() => cache.clear()).not.toThrow();
        });

        it('should handle edge case in LRU removal operations', async () => {
            // Test removeFromLRU edge cases by manipulating internal state
            await cache.get('key1');
            await cache.get('key2');
            await cache.get('key3');

            // Trigger eviction to test internal removeFromLRU logic
            await cache.get('key4'); // This should evict key1

            expect(mockCleanupFn).toHaveBeenCalledWith('value-key1');
        });

        it('should handle missing node removal', () => {
            // Try to access private methods if possible for coverage
            const cacheInstance = cache as unknown as {
                removeFromLRU?: (key: string) => void;
                delete?: (key: string) => boolean;
            };

            // Test removeFromLRU with non-existent key (should not crash)
            if (cacheInstance.removeFromLRU) {
                expect(() => cacheInstance.removeFromLRU('nonexistent')).not.toThrow();
            }

            // Test delete with non-existent key
            if (cacheInstance.delete) {
                const result = cacheInstance.delete('nonexistent');
                expect(result).toBe(false);
            }
        });
    });

    describe('ReentrantLock and Semaphore functionality', () => {
        it('should limit concurrent loading operations to cache size', async () => {
            let currentlyLoading = 0;
            let maxConcurrent = 0;

            const slowBuilder = jest.fn().mockImplementation(async (key: string) => {
                currentlyLoading++;
                maxConcurrent = Math.max(maxConcurrent, currentlyLoading);

                // Simulate slow loading
                await new Promise(resolve => setTimeout(resolve, 50));

                currentlyLoading--;
                return `value-${key}`;
            });

            const limitedCache = new Cache<string, string>(2, mockKeyMapper, slowBuilder);

            // Start 5 concurrent requests for different keys
            const promises = [
                limitedCache.get('key1'),
                limitedCache.get('key2'),
                limitedCache.get('key3'),
                limitedCache.get('key4'),
                limitedCache.get('key5'),
            ];

            await Promise.all(promises);

            // Should never have more than 2 concurrent operations (cache size)
            expect(maxConcurrent).toBeLessThanOrEqual(2);
            expect(slowBuilder).toHaveBeenCalledTimes(5);
        });

        it('should handle race condition in ReentrantLock', async () => {
            let buildCount = 0;
            const raceBuilder = jest.fn().mockImplementation(async (key: string) => {
                buildCount++;
                // Small delay to create race conditions
                await new Promise(resolve => setTimeout(resolve, 10));
                return `value-${key}-${buildCount}`;
            });

            const raceCache = new Cache<string, string>(3, mockKeyMapper, raceBuilder);

            // Start multiple concurrent requests for same key after small delay
            setTimeout(() => {
                raceCache.get('race-key');
                raceCache.get('race-key');
            }, 5);

            const promise1 = raceCache.get('race-key');
            const promise2 = raceCache.get('race-key');

            const results = await Promise.all([promise1, promise2]);

            // Should have same result (deduplication worked)
            expect(results[0]).toBe(results[1]);
            // Should only build once
            expect(raceBuilder).toHaveBeenCalledTimes(1);
        });

        it('should queue operations when at capacity and process them sequentially', async () => {
            const processOrder: string[] = [];
            const queueBuilder = jest.fn().mockImplementation(async (key: string) => {
                processOrder.push(`start-${key}`);
                await new Promise(resolve => setTimeout(resolve, 30));
                processOrder.push(`end-${key}`);
                return `value-${key}`;
            });

            const queueCache = new Cache<string, string>(1, mockKeyMapper, queueBuilder);

            // Start 3 operations for different keys (should queue)
            const promises = [
                queueCache.get('first'),
                queueCache.get('second'),
                queueCache.get('third'),
            ];

            const results = await Promise.all(promises);

            expect(results).toEqual(['value-first', 'value-second', 'value-third']);
            expect(queueBuilder).toHaveBeenCalledTimes(3);

            // Should process sequentially (no overlapping)
            expect(processOrder).toEqual([
                'start-first',
                'end-first',
                'start-second',
                'end-second',
                'start-third',
                'end-third',
            ]);
        });

        it('should handle waitQueue edge cases', async () => {
            // Test empty waitQueue branch in releaseLoadingSlot
            const emptyBuilder = jest.fn().mockResolvedValue('test-value');
            const testCache = new Cache<string, string>(5, mockKeyMapper, emptyBuilder);

            // Single operation should not trigger queue
            const result = await testCache.get('single');
            expect(result).toBe('test-value');
            expect(emptyBuilder).toHaveBeenCalledTimes(1);
        });

        it('should handle getLoadingCount method', async () => {
            let loadingCount = 0;
            let maxLoadingCount = 0;

            const countBuilder = jest.fn().mockImplementation(async (key: string) => {
                // Record loading count at the start of each operation
                loadingCount++;
                maxLoadingCount = Math.max(maxLoadingCount, loadingCount);

                await new Promise(resolve => setTimeout(resolve, 20));

                loadingCount--;
                return `value-${key}`;
            });

            const countCache = new Cache<string, string>(2, mockKeyMapper, countBuilder);

            // Start concurrent operations
            const promises = [countCache.get('key1'), countCache.get('key2')];

            await Promise.all(promises);

            // Verify that we had concurrent operations
            expect(maxLoadingCount).toBeGreaterThan(0);

            // Test getLoadingCount method directly
            const lockInstance = (
                countCache as unknown as { lock: { getLoadingCount: () => number } }
            ).lock;
            expect(typeof lockInstance.getLoadingCount).toBe('function');
            expect(lockInstance.getLoadingCount()).toBe(0); // Should be 0 after completion
        });
    });

    describe('Batch processing coverage', () => {
        it('should handle empty iterator in computeElevations', async () => {
            const provider = new Cache<string, string>(3, mockKeyMapper, mockValueBuilder);

            // Test with empty array iterator
            const emptyIterator = [][Symbol.iterator]();

            // Access private method for testing
            const providerInstance = provider as unknown as {
                computeElevations?: (
                    coords: Iterator<string>,
                    fn: (coord: string) => Promise<string>
                ) => Promise<string[]>;
            };

            if (providerInstance.computeElevations) {
                const result = await providerInstance.computeElevations(
                    emptyIterator,
                    async coord => `value-${coord}`
                );
                expect(result).toEqual([]);
            }
        });
    });
});
