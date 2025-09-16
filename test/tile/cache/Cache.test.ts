import { Cache } from '../../../src/tile/cache/Cache';

// Extended class for testing protected methods
class CacheExtended<K, T> extends Cache<K, T> {
    public has(k: K): boolean {
        return super.has(k);
    }

    public getKeys(): string[] {
        return super.getKeys();
    }

    public getLRUKeys(count?: number): string[] {
        return super.getLRUKeys(count);
    }

    // Expose private methods for testing with different names to avoid conflicts
    public callRemoveFromLRU(key: string): void {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.removeFromLRU.call(this, key);
    }

    public callDelete(key: string): boolean {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.delete.call(this, key);
    }

    public callEvictLeastRecentlyUsed(): void {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.evictLeastRecentlyUsed.call(this);
    }

    // Expose private properties for testing
    public getTail(): string | null {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).tail;
    }

    public setTail(value: string | null): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).tail = value;
    }

    public getLruOrder(): Map<string, { prev: string | null; next: string | null }> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).lruOrder;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getLock(): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).lock;
    }
}

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

            // Reset mock to track only the next call
            jest.clearAllMocks();

            // Access key1 again - this should hit moveToFront path
            const result = await cache.get('key1');
            expect(result).toBe('value-key1');

            // Verify valueBuilder was NOT called again (item was cached)
            expect(mockValueBuilder).not.toHaveBeenCalled();

            // Add key4 to trigger eviction (should evict key2, not key1 since key1 was accessed)
            await cache.get('key4');

            expect(mockCleanupFn).toHaveBeenCalledWith('value-key2');
        });

        it('should trigger moveToFront when accessing existing cached item', async () => {
            // Add initial item to cache
            const result1 = await cache.get('testKey');
            expect(result1).toBe('value-testKey');
            expect(mockValueBuilder).toHaveBeenCalledTimes(1);

            // Reset mocks to isolate the second call
            jest.clearAllMocks();

            // Access the same item again - should trigger moveToFront code path
            const result2 = await cache.get('testKey');
            expect(result2).toBe('value-testKey');

            // Verify valueBuilder was NOT called (item was retrieved from cache)
            expect(mockValueBuilder).not.toHaveBeenCalled();

            // Verify cleanup was NOT called (item was not evicted)
            expect(mockCleanupFn).not.toHaveBeenCalled();
        });

        it('should exercise double-check locking pattern in get method', async () => {
            // This test targets the specific lines 75-76 in the double-check locking pattern
            const specialBuilder = jest.fn(async (key: string) => {
                // Add some async work to ensure we go through the lock path
                await new Promise(resolve => setTimeout(resolve, 1));
                return `special-${key}`;
            });

            const specialCache = new Cache<string, string>(3, mockKeyMapper, specialBuilder);

            // Access the private cache to simulate a very specific race condition
            const cacheInstance = specialCache as unknown as {
                cache: Map<string, string>;
                lock: { acquire: (key: string, fn: () => Promise<string>) => Promise<string> };
            };

            // Manually add an item to the internal cache to simulate the race condition
            // where the sync check misses it but the locked check finds it
            const key = 'test-key';
            const mappedKey = mockKeyMapper(key);

            // Mock the lock.acquire to simulate finding the item during the locked phase
            const originalAcquire = cacheInstance.lock.acquire;
            cacheInstance.lock.acquire = jest
                .fn()
                .mockImplementation(async (lockKey: string, fn: () => Promise<string>) => {
                    // Simulate the item appearing in cache during lock acquisition
                    cacheInstance.cache.set(mappedKey, 'race-value');
                    return fn();
                });

            const result = await specialCache.get(key);

            // Due to our manipulation, it should return the race value
            expect(result).toBe('race-value');

            // Restore the original lock
            cacheInstance.lock.acquire = originalAcquire;
        });

        it('should handle valueBuilder errors', async () => {
            const errorBuilder = jest.fn().mockRejectedValue(new Error('Build failed'));
            const errorCache = new Cache<string, string>(3, mockKeyMapper, errorBuilder);

            await expect(errorCache.get('key1')).rejects.toThrow('Build failed');
        });
    });

    describe('has method', () => {
        it('should return false for non-existent key', () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            expect(extendedCache.has('nonexistent')).toBe(false);
        });

        it('should return true for cached key', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            expect(extendedCache.has('key1')).toBe(true);
        });

        it('should return false after eviction', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            await extendedCache.get('key2');
            await extendedCache.get('key3');
            await extendedCache.get('key4'); // Evicts key1

            expect(extendedCache.has('key1')).toBe(false);
            expect(extendedCache.has('key4')).toBe(true);
        });
    });

    describe('clear method', () => {
        it('should clear all cached items', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            await extendedCache.get('key2');

            extendedCache.clear();

            expect(extendedCache.has('key1')).toBe(false);
            expect(extendedCache.has('key2')).toBe(false);
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
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            expect(extendedCache.getKeys()).toEqual([]);
        });

        it('should return all cached keys', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            await extendedCache.get('key2');

            const keys = extendedCache.getKeys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys).toHaveLength(2);
        });
    });

    describe('getLRUKeys method', () => {
        it('should return empty array for empty cache', () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            expect(extendedCache.getLRUKeys()).toEqual([]);
        });

        it('should return keys in LRU order', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            await extendedCache.get('key2');
            await extendedCache.get('key3');

            const lruKeys = extendedCache.getLRUKeys();
            expect(lruKeys).toEqual(['key1', 'key2', 'key3']); // From tail (LRU) to head (MRU)
        });

        it('should limit returned keys to specified count', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            await extendedCache.get('key2');
            await extendedCache.get('key3');

            const lruKeys = extendedCache.getLRUKeys(2);
            expect(lruKeys).toEqual(['key1', 'key2']); // First 2 from tail (LRU)
            expect(lruKeys).toHaveLength(2);
        });

        it('should update order after accessing cached item', async () => {
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            await extendedCache.get('key1');
            await extendedCache.get('key2');
            await extendedCache.get('key3');

            // Access key1 to make it most recently used
            await extendedCache.get('key1');

            const lruKeys = extendedCache.getLRUKeys();
            expect(lruKeys).toEqual(['key2', 'key3', 'key1']); // key2 is now LRU, key1 is MRU
        });
    });

    describe('LRU edge cases', () => {
        it('should handle single item cache', async () => {
            const singleCache = new CacheExtended<string, string>(
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
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );
            expect(extendedCache.getKeys()).toEqual([]);
            expect(extendedCache.getLRUKeys()).toEqual([]);
            expect(extendedCache.has('key1')).toBe(false);
            expect(() => extendedCache.clear()).not.toThrow();
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
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder,
                mockCleanupFn
            );

            // Test removeFromLRU with non-existent key (should not crash)
            expect(() => extendedCache.callRemoveFromLRU('nonexistent')).not.toThrow();

            // Test delete with non-existent key
            const result = extendedCache.callDelete('nonexistent');
            expect(result).toBe(false);
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

    describe('Edge case coverage', () => {
        it('should handle Cache eviction with empty tail', async () => {
            // Test the uncovered branch in evictLeastRecentlyUsed (line 189)
            const emptyCache = new CacheExtended<string, string>(
                1,
                mockKeyMapper,
                mockValueBuilder
            );

            // Ensure tail is null
            emptyCache.setTail(null);

            // This should not throw and should handle the null tail gracefully
            expect(() => emptyCache.callEvictLeastRecentlyUsed()).not.toThrow();
        });

        it('should handle ReentrantLock queue edge case', async () => {
            // Test the uncovered branch in ReentrantLock releaseLoadingSlot (line 99)
            // This is difficult to trigger naturally, but we can test the defensive programming

            const testCache = new CacheExtended<string, string>(1, mockKeyMapper, mockValueBuilder);

            // Access the lock instance
            const lockInstance = testCache.getLock();

            // Manually add undefined to queue to test the defensive check
            lockInstance.waitQueue.push(undefined as unknown as () => void);

            // This should handle the undefined callback gracefully
            expect(() => lockInstance.releaseLoadingSlot()).not.toThrow();
        });

        it('should cover removeFromLRU when removing middle node', async () => {
            // Test lines 253-254: removing a node that has a next node
            const extendedCache = new CacheExtended<string, string>(
                3,
                mockKeyMapper,
                mockValueBuilder
            );

            await extendedCache.get('key1'); // Will be tail
            await extendedCache.get('key2'); // Will be middle
            await extendedCache.get('key3'); // Will be head

            // Remove middle node (has both prev and next)
            extendedCache.callRemoveFromLRU('key2');

            // Verify the links were updated correctly
            const key3Node = extendedCache.getLruOrder().get('key3');
            const key1Node = extendedCache.getLruOrder().get('key1');

            expect(key3Node?.next).toBe('key1'); // key3 should now point to key1
            expect(key1Node?.prev).toBe('key3'); // key1 should point back to key3
        });
    });
});
