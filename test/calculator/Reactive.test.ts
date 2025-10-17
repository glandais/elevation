import { Flux } from '../../src/calculator/Reactive';

describe('Flux', () => {
    describe('forEach', () => {
        it('should iterate over an array', async () => {
            const array = [1, 2, 3, 4, 5];
            const results: number[] = [];

            await Flux.forEach(array, async item => {
                results.push(item);
            });

            expect(results).toHaveLength(5);
            expect(results).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
        });

        it('should iterate over a Set', async () => {
            const set = new Set([1, 2, 3]);
            const results: number[] = [];

            await Flux.forEach(set, async item => {
                results.push(item);
            });

            expect(results).toHaveLength(3);
            expect(results).toEqual(expect.arrayContaining([1, 2, 3]));
        });

        it('should iterate over a generator', async () => {
            function* generator() {
                yield 1;
                yield 2;
                yield 3;
            }

            const results: number[] = [];
            await Flux.forEach(generator(), async item => {
                results.push(item);
            });

            expect(results).toHaveLength(3);
            expect(results).toEqual(expect.arrayContaining([1, 2, 3]));
        });

        it('should handle empty iterables', async () => {
            const results: number[] = [];

            await Flux.forEach([], async item => {
                results.push(item);
            });

            expect(results).toEqual([]);
        });

        it('should handle single element', async () => {
            const results: number[] = [];

            await Flux.forEach([42], async item => {
                results.push(item);
            });

            expect(results).toEqual([42]);
        });
    });

    describe('async processing', () => {
        it('should apply async transformation to each element', async () => {
            const array = [1, 2, 3];
            const results: number[] = [];

            await Flux.forEach(array, async x => {
                results.push(x * 2);
            });

            expect(results.length).toBe(3);
            expect(results).toContain(2);
            expect(results).toContain(4);
            expect(results).toContain(6);
        });

        it('should maintain order with sequential processing (maxParallel=1)', async () => {
            const array = [1, 2, 3];
            const results: number[] = [];

            await Flux.forEach(
                array,
                async x => {
                    await new Promise(resolve => setTimeout(resolve, (4 - x) * 10));
                    results.push(x * 2);
                },
                1
            );

            expect(results).toEqual([2, 4, 6]);
        });

        it('should process in parallel with maxParallel > 1', async () => {
            const array = [1, 2, 3, 4, 5];
            const startTime = Date.now();

            // Each item takes 50ms to process
            await Flux.forEach(
                array,
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                },
                3
            ); // Process 3 at a time

            const duration = Date.now() - startTime;
            // With parallel=3, 5 items should take roughly 2 batches (100ms)
            // We allow some margin for test stability
            expect(duration).toBeLessThan(200);
        });

        it('should handle errors in processing', async () => {
            const array = [1, 2, 3];

            await expect(
                Flux.forEach(array, async x => {
                    if (x === 2) {
                        throw new Error('Test error');
                    }
                })
            ).rejects.toThrow('Test error');
        });

        it('should handle empty array', async () => {
            const results: number[] = [];

            await Flux.forEach([], async x => {
                results.push(x);
            });

            expect(results).toEqual([]);
        });

        it('should handle sequential transformations', async () => {
            const array = [1, 2, 3];
            const step1Results: number[] = [];
            const step2Results: number[] = [];
            const step3Results: string[] = [];

            // Step 1: multiply by 2
            await Flux.forEach(array, async x => {
                step1Results.push(x * 2);
            });

            // Step 2: add 1
            await Flux.forEach(step1Results, async x => {
                step2Results.push(x + 1);
            });

            // Step 3: convert to string
            await Flux.forEach(step2Results, async x => {
                step3Results.push(x.toString());
            });

            expect(step3Results).toHaveLength(3);
            expect(step3Results).toEqual(expect.arrayContaining(['3', '5', '7']));
        });

        it('should collect transformed results', async () => {
            const array = [1, 2, 3];
            const results: number[] = [];

            await Flux.forEach(array, async x => {
                const result = x * 2;
                results.push(result);
            });

            expect(results).toContain(2);
            expect(results).toContain(4);
            expect(results).toContain(6);
        });

        it('should handle large datasets efficiently', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i);
            let count = 0;

            await Flux.forEach(
                largeArray,
                async () => {
                    count++;
                },
                10
            ); // Process 10 at a time

            expect(count).toBe(1000);
        });

        it('should respect maxParallel limit', async () => {
            const array = [1, 2, 3, 4, 5, 6];
            let currentlyProcessing = 0;
            let maxConcurrent = 0;

            await Flux.forEach(
                array,
                async () => {
                    currentlyProcessing++;
                    maxConcurrent = Math.max(maxConcurrent, currentlyProcessing);
                    await new Promise(resolve => setTimeout(resolve, 20));
                    currentlyProcessing--;
                },
                3
            ); // Max 3 parallel

            expect(maxConcurrent).toBeLessThanOrEqual(3);
            expect(maxConcurrent).toBeGreaterThan(1); // Should use parallelism
        });
    });

    describe('element counting', () => {
        it('should count all elements', async () => {
            const array = [1, 2, 3, 4, 5];
            let count = 0;

            await Flux.forEach(array, async () => {
                count++;
            });

            expect(count).toBe(5);
        });

        it('should count zero for empty array', async () => {
            let count = 0;

            await Flux.forEach([], async () => {
                count++;
            });

            expect(count).toBe(0);
        });

        it('should count elements after transformation', async () => {
            const array = [1, 2, 3];
            let count = 0;

            await Flux.forEach(array, async () => {
                count++;
            });

            expect(count).toBe(3);
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

            const processedNames: string[] = [];

            await Flux.forEach(users, async user => {
                const uppercased = user.name.toUpperCase();
                processedNames.push(uppercased);
            });

            expect(processedNames).toContain('ALICE');
            expect(processedNames).toContain('BOB');
            expect(processedNames).toContain('CHARLIE');
        });

        it('should simulate batch processing like in BatchCalculator', async () => {
            // Simulate tiles with points
            const tiles = [
                { z: 12, x: 100, y: 200 },
                { z: 12, x: 101, y: 200 },
                { z: 12, x: 102, y: 200 },
            ];

            const processedTiles: Array<{ z: number; x: number; y: number }> = [];

            await Flux.forEach(
                tiles,
                async tile => {
                    // Simulate elevation fetching
                    await new Promise(resolve => setTimeout(resolve, 10));
                    processedTiles.push(tile);
                },
                10
            ); // Process up to 10 tiles in parallel

            expect(processedTiles).toHaveLength(3);
            expect(processedTiles).toEqual(expect.arrayContaining(tiles));
        });

        it('should handle mixed sync/async operations', async () => {
            const data = [1, 2, 3, 4, 5];
            const intermediateResults: number[] = [];
            const finalResults: number[] = [];

            // First transformation
            await Flux.forEach(data, async x => {
                await Promise.resolve();
                intermediateResults.push(x * 2);
            });

            // Second transformation
            await Flux.forEach(intermediateResults, async x => {
                const result = x + 10;
                finalResults.push(result);
            });

            expect(finalResults).toContain(12);
            expect(finalResults).toContain(14);
            expect(finalResults).toContain(16);
            expect(finalResults).toContain(18);
            expect(finalResults).toContain(20);
        });

        it('should handle varying processing times with parallelism', async () => {
            const items = [1, 2, 3, 4, 5];
            const completionOrder: number[] = [];

            await Flux.forEach(
                items,
                async x => {
                    // Varying delays based on value
                    await new Promise(resolve => setTimeout(resolve, (6 - x) * 10));
                    completionOrder.push(x);
                },
                3
            ); // Allow 3 parallel

            // With parallel processing and varying delays, all items should complete
            expect(completionOrder).toHaveLength(5);
            expect(completionOrder).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
        });

        it('should handle errors and stop processing', async () => {
            const items = [1, 2, 3, 4, 5];
            const processed: number[] = [];

            await expect(
                Flux.forEach(items, async x => {
                    if (x === 3) {
                        throw new Error('Stop at 3');
                    }
                    processed.push(x);
                })
            ).rejects.toThrow('Stop at 3');

            // Some items may have been processed before the error
            expect(processed.length).toBeLessThan(5);
        });

        it('should support multiple parallel forEach operations', async () => {
            const array1 = [1, 2, 3];
            const array2 = [10, 20, 30];
            const results1: number[] = [];
            const results2: number[] = [];

            await Promise.all([
                Flux.forEach(array1, async x => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    results1.push(x * 2);
                }),
                Flux.forEach(array2, async x => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    results2.push(x * 2);
                }),
            ]);

            expect(results1).toHaveLength(3);
            expect(results2).toHaveLength(3);
            expect(results1).toContain(2);
            expect(results1).toContain(4);
            expect(results1).toContain(6);
            expect(results2).toContain(20);
            expect(results2).toContain(40);
            expect(results2).toContain(60);
        });

        it('should handle default maxParallel of 1', async () => {
            const items = [1, 2, 3];
            const results: number[] = [];

            await Flux.forEach(items, async x => {
                results.push(x);
            }); // No maxParallel specified, defaults to 1

            expect(results).toHaveLength(3);
            expect(results).toEqual(expect.arrayContaining([1, 2, 3]));
        });
    });
});
