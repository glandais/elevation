import { CanvasPool } from '../../../src/tile/fetcher/CanvasPool';

describe('CanvasPool', () => {
    let canvasPool: CanvasPool;

    beforeEach(() => {
        canvasPool = new CanvasPool();
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('acquire and release functionality', () => {
        it('should create new canvas when pool is empty', () => {
            const canvas = canvasPool.acquire();
            expect(canvas).toBeInstanceOf(HTMLCanvasElement);
        });

        it('should reuse canvas from pool when available', () => {
            const canvas1 = canvasPool.acquire();
            canvasPool.release(canvas1);

            const canvas2 = canvasPool.acquire();
            expect(canvas2).toBe(canvas1);
        });

        it('should handle null canvas release gracefully', () => {
            expect(() => canvasPool.release(null as unknown as HTMLCanvasElement)).not.toThrow();
        });

        it('should handle comprehensive pool operations', () => {
            const canvases: HTMLCanvasElement[] = [];

            // Acquire multiple canvases
            for (let i = 0; i < 10; i++) {
                canvases.push(canvasPool.acquire());
            }

            // All canvases should be different instances when pool is empty
            const uniqueCanvases = new Set(canvases);
            expect(uniqueCanvases.size).toBe(10);

            // Release them to populate the pool
            canvases.forEach(canvas => canvasPool.release(canvas));

            // Access private members to verify pool state
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
            };

            // Pool should contain the released canvases
            expect(poolInstance.available.length).toBeGreaterThan(0);
        });
    });

    describe('trim functionality', () => {
        it('should trim excess canvases when pool exceeds idle size', () => {
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            // Create more canvases than idleSize (5)
            poolInstance.available = [];
            for (let i = 0; i < 10; i++) {
                poolInstance.available.push(document.createElement('canvas'));
            }

            expect(poolInstance.available.length).toBe(10);

            // Call _trim to trigger the while loop
            poolInstance._trim();

            // Should have trimmed to idleSize (5)
            expect(poolInstance.available.length).toBe(5);
        });

        it('should not trim when pool is at idle size', () => {
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            // Create exactly idleSize canvases (5)
            poolInstance.available = [];
            for (let i = 0; i < 5; i++) {
                poolInstance.available.push(document.createElement('canvas'));
            }

            expect(poolInstance.available.length).toBe(5);

            // Call _trim - should not change anything
            poolInstance._trim();

            // Should still have 5 canvases
            expect(poolInstance.available.length).toBe(5);
        });

        it('should handle empty pool trim gracefully', () => {
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            // Ensure pool is empty
            poolInstance.available = [];

            // Call _trim - should not throw
            expect(() => poolInstance._trim()).not.toThrow();

            // Should still be empty
            expect(poolInstance.available.length).toBe(0);
        });

        it('should trim with forced conditions preserving state', () => {
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                _trim: () => void;
            };

            // Backup original state
            const originalAvailable = [...poolInstance.available];

            // Force pool to exceed idle size
            poolInstance.available = [];
            for (let i = 0; i < 10; i++) {
                poolInstance.available.push(document.createElement('canvas'));
            }

            expect(poolInstance.available.length).toBeGreaterThan(5);

            // Trigger trim
            poolInstance._trim();

            // Should have trimmed excess canvases
            expect(poolInstance.available.length).toBeLessThanOrEqual(5);

            // Restore original state
            poolInstance.available = originalAvailable;
        });
    });

    describe('timer functionality', () => {
        it('should set timer when acquiring canvas', () => {
            jest.useFakeTimers();

            canvasPool.acquire();

            const poolInstance = canvasPool as unknown as {
                idleTimer: ReturnType<typeof setTimeout> | null;
            };

            expect(poolInstance.idleTimer).not.toBeNull();

            jest.useRealTimers();
        });

        it('should reset timer when releasing canvas', () => {
            jest.useFakeTimers();

            const canvas = canvasPool.acquire();
            const poolInstance = canvasPool as unknown as {
                idleTimer: ReturnType<typeof setTimeout> | null;
            };

            const firstTimer = poolInstance.idleTimer;

            canvasPool.release(canvas);

            // Timer should be different (reset)
            expect(poolInstance.idleTimer).not.toBe(firstTimer);
            expect(poolInstance.idleTimer).not.toBeNull();

            jest.useRealTimers();
        });

        it('should clear existing timer before setting new one', () => {
            jest.useFakeTimers();

            // Acquire first canvas to set timer
            canvasPool.acquire();

            const poolInstance = canvasPool as unknown as {
                idleTimer: ReturnType<typeof setTimeout> | null;
            };

            const firstTimer = poolInstance.idleTimer;

            // Acquire second canvas - should reset timer
            canvasPool.acquire();

            // Timer should be different
            expect(poolInstance.idleTimer).not.toBe(firstTimer);

            jest.useRealTimers();
        });

        it('should trigger trim after idle timeout', () => {
            jest.useFakeTimers();

            // Add many canvases to pool
            const canvases: HTMLCanvasElement[] = [];
            for (let i = 0; i < 10; i++) {
                canvases.push(canvasPool.acquire());
            }
            canvases.forEach(canvas => canvasPool.release(canvas));

            // Access pool internals
            const poolInstance = canvasPool as unknown as {
                available: HTMLCanvasElement[];
                idleTimeout: number;
            };

            expect(poolInstance.available.length).toBe(10);

            // Fast-forward time to trigger the idle timeout
            jest.advanceTimersByTime(poolInstance.idleTimeout);

            // Should have trimmed to idle size (5)
            expect(poolInstance.available.length).toBe(5);

            jest.useRealTimers();
        });

        it('should test _resetIdleTimer directly for function coverage', () => {
            jest.useFakeTimers();

            const poolInstance = canvasPool as unknown as {
                _resetIdleTimer: () => void;
                idleTimer: ReturnType<typeof setTimeout> | null;
            };

            // Call _resetIdleTimer directly
            poolInstance._resetIdleTimer();
            expect(poolInstance.idleTimer).not.toBeNull();

            // Call it again to test clearing existing timer
            const firstTimer = poolInstance.idleTimer;
            poolInstance._resetIdleTimer();
            expect(poolInstance.idleTimer).not.toBe(firstTimer);

            jest.useRealTimers();
        });
    });
});
