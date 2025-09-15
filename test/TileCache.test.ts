import { TileCache } from '../src/TileCache';

describe('TileCache', () => {
    let cache: TileCache;
    let mockImageData: ImageData;

    beforeEach(() => {
        cache = new TileCache(3); // Small cache for easier testing
        // Create mock ImageData
        mockImageData = new ImageData(256, 256);
    });

    describe('constructor', () => {
        it('should create cache with default max size', () => {
            const defaultCache = new TileCache();
            expect(defaultCache).toBeInstanceOf(TileCache);
        });

        it('should create cache with specified max size', () => {
            const customCache = new TileCache(50);
            expect(customCache).toBeInstanceOf(TileCache);
        });

        it('should throw error for invalid max size', () => {
            expect(() => new TileCache(0)).toThrow('Cache size must be greater than 0');
            expect(() => new TileCache(-1)).toThrow('Cache size must be greater than 0');
        });
    });

    describe('get method', () => {
        it('should return null for non-existent key', () => {
            const result = cache.get('non-existent');
            expect(result).toBeNull();
        });

        it('should return ImageData for existing key', () => {
            cache.set('test-key', mockImageData);
            const result = cache.get('test-key');
            expect(result).toBe(mockImageData);
        });

        it('should move accessed item to front (most recently used)', () => {
            // Fill cache
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            // Access key1 to move it to front
            cache.get('key1');

            // Add new item to trigger eviction
            cache.set('key4', mockImageData);

            // key1 should still exist (was moved to front)
            // key2 should be evicted (was least recently used)
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });
    });

    describe('set method', () => {
        it('should add new item to cache', () => {
            cache.set('test-key', mockImageData);
            expect(cache.has('test-key')).toBe(true);
            expect(cache.get('test-key')).toBe(mockImageData);
        });

        it('should update existing item', () => {
            const newImageData = new ImageData(128, 128);
            cache.set('test-key', mockImageData);
            cache.set('test-key', newImageData);

            expect(cache.get('test-key')).toBe(newImageData);
        });

        it('should update existing item and move to front', () => {
            // Fill cache
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            // Update key1 to move it to front
            const newImageData = new ImageData(128, 128);
            cache.set('key1', newImageData);

            // Add new item to trigger eviction
            cache.set('key4', mockImageData);

            // key1 should still exist (was moved to front)
            // key2 should be evicted (was least recently used)
            expect(cache.has('key1')).toBe(true);
            expect(cache.get('key1')).toBe(newImageData);
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });

        it('should evict least recently used item when cache is full', () => {
            // Fill cache to capacity
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);

            // Add one more item to trigger eviction
            cache.set('key4', mockImageData);

            // key1 should be evicted (least recently used)
            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });

        it('should maintain correct order when items are accessed', () => {
            // Fill cache
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            // Access key2 to make it most recently used
            cache.get('key2');

            // Add new item
            cache.set('key4', mockImageData);

            // key1 should be evicted (now least recently used)
            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });
    });

    describe('has method', () => {
        it('should return false for non-existent key', () => {
            expect(cache.has('non-existent')).toBe(false);
        });

        it('should return true for existing key', () => {
            cache.set('test-key', mockImageData);
            expect(cache.has('test-key')).toBe(true);
        });

        it('should not affect LRU order', () => {
            // Fill cache
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            // Check existence without affecting order
            cache.has('key1');

            // Add new item
            cache.set('key4', mockImageData);

            // key1 should still be evicted (has() doesn't update LRU)
            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });
    });

    describe('delete method', () => {
        it('should return false for non-existent key', () => {
            const result = cache.delete('non-existent');
            expect(result).toBe(false);
        });

        it('should return true and remove existing key', () => {
            cache.set('test-key', mockImageData);
            expect(cache.has('test-key')).toBe(true);

            const result = cache.delete('test-key');
            expect(result).toBe(true);
            expect(cache.has('test-key')).toBe(false);
        });

        it('should properly update LRU structure when deleting head', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData); // key3 is now head

            cache.delete('key3');

            // Should still be able to add items and maintain order
            cache.set('key4', mockImageData);
            // After deleting head, we have space for key4, so no eviction should occur
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });

        it('should properly update LRU structure when deleting tail', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            cache.delete('key1'); // key1 is tail

            // Add new item - should not cause eviction since we have space
            cache.set('key4', mockImageData);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });

        it('should properly update LRU structure when deleting middle item', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            cache.delete('key2'); // key2 is in middle

            // Add new item - should not cause eviction since we have space
            cache.set('key4', mockImageData);
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key3')).toBe(true);
            expect(cache.has('key4')).toBe(true);
        });
    });

    describe('clear method', () => {
        it('should remove all items from cache', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(true);
            expect(cache.has('key3')).toBe(true);

            cache.clear();

            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(false);
            expect(cache.has('key3')).toBe(false);
        });

        it('should reset LRU structure', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.clear();

            // Should be able to add items normally after clear
            cache.set('key3', mockImageData);
            cache.set('key4', mockImageData);
            cache.set('key5', mockImageData);
            cache.set('key6', mockImageData); // Should evict key3

            expect(cache.has('key3')).toBe(false);
            expect(cache.has('key4')).toBe(true);
            expect(cache.has('key5')).toBe(true);
            expect(cache.has('key6')).toBe(true);
        });

        it('should work on empty cache', () => {
            expect(() => cache.clear()).not.toThrow();
        });
    });

    describe('getKeys method', () => {
        it('should return empty array for empty cache', () => {
            const keys = cache.getKeys();
            expect(keys).toEqual([]);
        });

        it('should return all cached keys', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            const keys = cache.getKeys();
            expect(keys).toHaveLength(3);
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys).toContain('key3');
        });

        it('should return current keys after eviction', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);
            cache.set('key4', mockImageData); // Should evict key1

            const keys = cache.getKeys();
            expect(keys).toHaveLength(3);
            expect(keys).not.toContain('key1');
            expect(keys).toContain('key2');
            expect(keys).toContain('key3');
            expect(keys).toContain('key4');
        });
    });

    describe('getLRUKeys method', () => {
        it('should return empty array for empty cache', () => {
            const lruKeys = cache.getLRUKeys();
            expect(lruKeys).toEqual([]);
        });

        it('should return keys in LRU order (least to most recent)', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            const lruKeys = cache.getLRUKeys();
            expect(lruKeys).toEqual(['key1', 'key2', 'key3']);
        });

        it('should respect count parameter', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            const lruKeys = cache.getLRUKeys(2);
            expect(lruKeys).toEqual(['key1', 'key2']);
        });

        it('should update order when items are accessed', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            // Access key1 to move it to front
            cache.get('key1');

            const lruKeys = cache.getLRUKeys();
            expect(lruKeys).toEqual(['key2', 'key3', 'key1']);
        });

        it('should handle count larger than cache size', () => {
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);

            const lruKeys = cache.getLRUKeys(10);
            expect(lruKeys).toEqual(['key1', 'key2']);
        });

        it('should handle single item cache', () => {
            cache.set('only-key', mockImageData);

            const lruKeys = cache.getLRUKeys();
            expect(lruKeys).toEqual(['only-key']);
        });
    });

    describe('edge cases and boundary conditions', () => {
        it('should handle cache with size 1', () => {
            const smallCache = new TileCache(1);

            smallCache.set('key1', mockImageData);
            expect(smallCache.has('key1')).toBe(true);

            smallCache.set('key2', mockImageData);
            expect(smallCache.has('key1')).toBe(false);
            expect(smallCache.has('key2')).toBe(true);
        });

        it('should handle operations on empty cache', () => {
            expect(cache.get('any-key')).toBeNull();
            expect(cache.has('any-key')).toBe(false);
            expect(cache.delete('any-key')).toBe(false);
            expect(cache.getKeys()).toEqual([]);
            expect(cache.getLRUKeys()).toEqual([]);
        });

        it('should handle multiple operations on same key', () => {
            cache.set('key1', mockImageData);
            cache.get('key1');
            cache.set('key1', new ImageData(128, 128));
            cache.get('key1');

            expect(cache.has('key1')).toBe(true);
            expect(cache.get('key1')).toBeInstanceOf(ImageData);
        });

        it('should maintain cache size limits under various operations', () => {
            // Fill to capacity
            cache.set('key1', mockImageData);
            cache.set('key2', mockImageData);
            cache.set('key3', mockImageData);

            // Perform various operations
            cache.get('key1');
            cache.delete('key2');
            cache.set('key4', mockImageData);
            cache.set('key5', mockImageData);

            // Should never exceed max size
            expect(cache.getKeys().length).toBeLessThanOrEqual(3);
        });

        it('should handle null/undefined keys gracefully', () => {
            // TypeScript should prevent this, but test runtime behavior
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => (cache as any).set(null, mockImageData)).not.toThrow();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => (cache as any).get(null)).not.toThrow();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => (cache as any).has(null)).not.toThrow();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => (cache as any).delete(null)).not.toThrow();
        });

        it('should handle eviction on empty cache (edge case coverage)', () => {
            // This tests the early return in evictLeastRecentlyUsed when this.tail is null
            const emptyCache = new TileCache(1);

            // Clear to ensure empty state with null head/tail
            emptyCache.clear();
            expect(emptyCache.getKeys()).toEqual([]);

            // Try to force eviction path when cache size would exceed
            // This should trigger evictLeastRecentlyUsed with null tail
            emptyCache.set('key1', mockImageData);
            emptyCache.set('key2', mockImageData); // This should trigger eviction logic

            expect(emptyCache.has('key2')).toBe(true);
        });

        it('should handle attempt to remove non-existent key from LRU structure', () => {
            // This tests the early return in removeFromLRU when node is not found
            cache.set('key1', mockImageData);

            // Delete the same key twice to trigger the removeFromLRU early return
            expect(cache.delete('key1')).toBe(true);
            expect(cache.delete('key1')).toBe(false); // Second delete should return false and handle missing node

            // Cache should still function normally
            cache.set('key2', mockImageData);
            expect(cache.has('key2')).toBe(true);
        });
    });

    describe('LRU ordering integrity', () => {
        it('should maintain correct head/tail pointers', () => {
            // Start fresh
            cache.clear();

            // Single item
            cache.set('single', mockImageData);
            expect(cache.getLRUKeys()).toEqual(['single']);

            // Two items
            cache.set('second', mockImageData);
            expect(cache.getLRUKeys()).toEqual(['single', 'second']);

            // Access first item
            cache.get('single');
            expect(cache.getLRUKeys()).toEqual(['second', 'single']);

            // Delete head
            cache.delete('single');
            expect(cache.getLRUKeys()).toEqual(['second']);

            // Add back
            cache.set('third', mockImageData);
            expect(cache.getLRUKeys()).toEqual(['second', 'third']);
        });

        it('should handle complex access patterns', () => {
            cache.set('a', mockImageData);
            cache.set('b', mockImageData);
            cache.set('c', mockImageData);

            // Pattern: access a, then b, then add d
            cache.get('a'); // Order: b, c, a
            cache.get('b'); // Order: c, a, b
            cache.set('d', mockImageData); // Should evict c

            expect(cache.has('c')).toBe(false);
            expect(cache.getLRUKeys()).toEqual(['a', 'b', 'd']);
        });
    });
});
