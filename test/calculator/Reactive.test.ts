import { Flux } from '../../src/calculator/Reactive';

describe('Flux', () => {
    describe('from', () => {
        it('should create a Flux from an array', async () => {
            const array = [1, 2, 3, 4, 5];
            const flux = Flux.from(array);

            const result = await flux.countProcessed();
            expect(result).toBe(5);
        });

        it('should create a Flux from a Set', async () => {
            const set = new Set([1, 2, 3]);
            const flux = Flux.from(set);

            const result = await flux.countProcessed();
            expect(result).toBe(3);
        });

        it('should create a Flux from a generator', async () => {
            function* generator() {
                yield 1;
                yield 2;
                yield 3;
            }
            const flux = Flux.from(generator());

            const result = await flux.countProcessed();
            expect(result).toBe(3);
        });

        it('should handle empty iterables', async () => {
            const flux = Flux.from([]);

            const result = await flux.countProcessed();
            expect(result).toBe(0);
        });

        it('should handle single element', async () => {
            const flux = Flux.from([42]);

            const result = await flux.countProcessed();
            expect(result).toBe(1);
        });
    });

    describe('mapAsync', () => {
        it('should apply async transformation to each element', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);

            const result = await flux.mapAsync(async x => x * 2).countProcessed();

            expect(result).toBe(3);
        });

        it('should maintain order with sequential processing (maxParallel=1)', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);
            const results: number[] = [];

            await flux
                .mapAsync(async x => {
                    await new Promise(resolve => setTimeout(resolve, (4 - x) * 10));
                    results.push(x * 2);
                    return x * 2;
                })
                .countProcessed();

            expect(results).toEqual([2, 4, 6]);
        });

        it('should process in parallel with maxParallel > 1', async () => {
            const array = [1, 2, 3, 4, 5];
            const flux = Flux.from(array);
            const startTime = Date.now();

            // Each item takes 50ms to process
            await flux
                .mapAsync(async x => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return x * 2;
                }, 3) // Process 3 at a time
                .countProcessed();

            const duration = Date.now() - startTime;
            // With parallel=3, 5 items should take roughly 2 batches (100ms)
            // We allow some margin for test stability
            expect(duration).toBeLessThan(200);
        });

        it('should handle errors in transformation', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);

            await expect(
                flux
                    .mapAsync(async x => {
                        if (x === 2) {
                            throw new Error('Test error');
                        }
                        return x * 2;
                    })
                    .countProcessed()
            ).rejects.toThrow('Test error');
        });

        it('should handle empty flux', async () => {
            const flux = Flux.from([]);

            const result = await flux.mapAsync(async x => x).countProcessed();

            expect(result).toBe(0);
        });

        it('should chain multiple mapAsync operations', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);

            const result = await flux
                .mapAsync(async x => x * 2)
                .mapAsync(async x => x + 1)
                .mapAsync(async x => x.toString())
                .countProcessed();

            expect(result).toBe(3);
        });

        it('should collect transformed results', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);
            const results: number[] = [];

            // Create a custom collector since countProcessed discards values
            const collectingFlux = flux.mapAsync(async x => {
                const result = x * 2;
                results.push(result);
                return result;
            });

            await collectingFlux.countProcessed();
            expect(results).toEqual([2, 4, 6]);
        });

        it('should handle large datasets efficiently', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i);
            const flux = Flux.from(largeArray);

            const result = await flux
                .mapAsync(async x => x * 2, 10) // Process 10 at a time
                .countProcessed();

            expect(result).toBe(1000);
        });

        it('should respect maxParallel limit', async () => {
            const array = [1, 2, 3, 4, 5, 6];
            const flux = Flux.from(array);
            let currentlyProcessing = 0;
            let maxConcurrent = 0;

            await flux
                .mapAsync(async x => {
                    currentlyProcessing++;
                    maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
                    await new Promise(resolve => setTimeout(resolve, 20));
                    currentlyProcessing--;
                    return x;
                }, 3) // Max 3 parallel
                .countProcessed();

            expect(maxConcurrent).toBeLessThanOrEqual(3);
            expect(maxConcurrent).toBeGreaterThan(1); // Should use parallelism
        });
    });

    describe('countProcessed', () => {
        it('should count all elements', async () => {
            const array = [1, 2, 3, 4, 5];
            const flux = Flux.from(array);

            const count = await flux.countProcessed();
            expect(count).toBe(5);
        });

        it('should count zero for empty flux', async () => {
            const flux = Flux.from([]);

            const count = await flux.countProcessed();
            expect(count).toBe(0);
        });

        it('should count elements after transformation', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);

            const count = await flux
                .mapAsync(async x => x * 2)
                .mapAsync(async x => x + 1)
                .countProcessed();

            expect(count).toBe(3);
        });

        it('should consume the stream only once', async () => {
            const array = [1, 2, 3];
            const flux = Flux.from(array);

            const count1 = await flux.countProcessed();
            expect(count1).toBe(3);

            // Stream is already consumed, should return 0
            const count2 = await flux.countProcessed();
            expect(count2).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex data types', async () => {
            interface User {
                id: number;
                name: string;
            }

            const users: User[] = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
            ];

            const flux = Flux.from(users);
            const processedNames: string[] = [];

            await flux
                .mapAsync(async user => {
                    const uppercased = user.name.toUpperCase();
                    processedNames.push(uppercased);
                    return { ...user, name: uppercased };
                })
                .countProcessed();

            expect(processedNames).toEqual(['ALICE', 'BOB', 'CHARLIE']);
        });

        it('should simulate batch processing like in BatchCalculator', async () => {
            // Simulate tiles with points
            const tiles = [
                { z: 12, x: 100, y: 200 },
                { z: 12, x: 101, y: 200 },
                { z: 12, x: 102, y: 200 },
            ];

            const processedTiles: Array<{ z: number; x: number; y: number }> = [];

            await Flux.from(tiles)
                .mapAsync(async tile => {
                    // Simulate elevation fetching
                    await new Promise(resolve => setTimeout(resolve, 10));
                    processedTiles.push(tile);
                    return tile;
                }, 10) // Process up to 10 tiles in parallel
                .countProcessed();

            expect(processedTiles).toHaveLength(3);
            expect(processedTiles).toEqual(tiles);
        });

        it('should handle mixed sync/async operations', async () => {
            const data = [1, 2, 3, 4, 5];
            const results: number[] = [];

            await Flux.from(data)
                .mapAsync(async x => {
                    // Some async work
                    await Promise.resolve();
                    return x * 2;
                })
                .mapAsync(async x => {
                    // Some sync work wrapped in async
                    const result = x + 10;
                    results.push(result);
                    return result;
                })
                .countProcessed();

            expect(results).toEqual([12, 14, 16, 18, 20]);
        });

        it('should handle varying processing times with parallelism', async () => {
            const items = [1, 2, 3, 4, 5];
            const processingOrder: number[] = [];
            const completionOrder: number[] = [];

            await Flux.from(items)
                .mapAsync(async x => {
                    processingOrder.push(x);
                    // Varying delays based on value
                    await new Promise(resolve => setTimeout(resolve, (6 - x) * 10));
                    completionOrder.push(x);
                    return x;
                }, 3) // Allow 3 parallel
                .countProcessed();

            // First 3 should start immediately
            expect(processingOrder.slice(0, 3)).toEqual([1, 2, 3]);

            // With parallel processing and varying delays, completion order may differ
            expect(completionOrder).toHaveLength(5);
        });
    });
});
