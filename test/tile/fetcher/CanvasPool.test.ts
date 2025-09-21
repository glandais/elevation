import { CanvasPool } from '../../../src/tile/fetcher/CanvasPool';

// Extended class for testing private methods
class CanvasPoolExtended<T> extends CanvasPool<T> {
    // Expose private methods as public for testing
    public callTrim(): void {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent._trim.call(this);
    }

    public callResetIdleTimer(): void {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent._resetIdleTimer.call(this);
    }

    // Expose private properties with getter/setter methods
    public getAvailable(): T[] {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).available;
    }

    public setAvailable(value: T[]): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).available = value;
    }

    public getIdleTimer(): ReturnType<typeof setTimeout> | null {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).idleTimer;
    }

    public getIdleTimeout(): number {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).idleTimeout;
    }
}

describe('CanvasPool', () => {
    let canvasPool: CanvasPool<HTMLCanvasElement>;
    let extendedCanvasPool: CanvasPoolExtended<HTMLCanvasElement>;

    beforeEach(() => {
        const canvasBuilder = () => document.createElement('canvas');
        canvasPool = new CanvasPool(canvasBuilder);
        extendedCanvasPool = new CanvasPoolExtended(canvasBuilder);
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
                canvases.push(extendedCanvasPool.acquire());
            }

            // All canvases should be different instances when pool is empty
            const uniqueCanvases = new Set(canvases);
            expect(uniqueCanvases.size).toBe(10);

            // Release them to populate the pool
            canvases.forEach(canvas => extendedCanvasPool.release(canvas));

            // Pool should contain the released canvases
            expect(extendedCanvasPool.getAvailable().length).toBeGreaterThan(0);
        });
    });

    describe('trim functionality', () => {
        it('should trim excess canvases when pool exceeds idle size', () => {
            // Create more canvases than idleSize (5)
            const canvases: HTMLCanvasElement[] = [];
            for (let i = 0; i < 10; i++) {
                canvases.push(document.createElement('canvas'));
            }
            extendedCanvasPool.setAvailable(canvases);

            expect(extendedCanvasPool.getAvailable().length).toBe(10);

            // Call _trim to trigger the while loop
            extendedCanvasPool.callTrim();

            // Should have trimmed to idleSize (5)
            expect(extendedCanvasPool.getAvailable().length).toBe(5);
        });

        it('should not trim when pool is at idle size', () => {
            // Create exactly idleSize canvases (5)
            const canvases: HTMLCanvasElement[] = [];
            for (let i = 0; i < 5; i++) {
                canvases.push(document.createElement('canvas'));
            }
            extendedCanvasPool.setAvailable(canvases);

            expect(extendedCanvasPool.getAvailable().length).toBe(5);

            // Call _trim - should not change anything
            extendedCanvasPool.callTrim();

            // Should still have 5 canvases
            expect(extendedCanvasPool.getAvailable().length).toBe(5);
        });

        it('should handle empty pool trim gracefully', () => {
            // Ensure pool is empty
            extendedCanvasPool.setAvailable([]);

            // Call _trim - should not throw
            expect(() => extendedCanvasPool.callTrim()).not.toThrow();

            // Should still be empty
            expect(extendedCanvasPool.getAvailable().length).toBe(0);
        });

        it('should trim with forced conditions preserving state', () => {
            // Backup original state
            const originalAvailable = [...extendedCanvasPool.getAvailable()];

            // Force pool to exceed idle size
            const canvases: HTMLCanvasElement[] = [];
            for (let i = 0; i < 10; i++) {
                canvases.push(document.createElement('canvas'));
            }
            extendedCanvasPool.setAvailable(canvases);

            expect(extendedCanvasPool.getAvailable().length).toBeGreaterThan(5);

            // Trigger trim
            extendedCanvasPool.callTrim();

            // Should have trimmed excess canvases
            expect(extendedCanvasPool.getAvailable().length).toBeLessThanOrEqual(5);

            // Restore original state
            extendedCanvasPool.setAvailable(originalAvailable);
        });
    });

    describe('timer functionality', () => {
        it('should set timer when acquiring canvas', () => {
            jest.useFakeTimers();

            extendedCanvasPool.acquire();

            expect(extendedCanvasPool.getIdleTimer()).not.toBeNull();

            jest.useRealTimers();
        });

        it('should reset timer when releasing canvas', () => {
            jest.useFakeTimers();

            const canvas = extendedCanvasPool.acquire();
            const firstTimer = extendedCanvasPool.getIdleTimer();

            extendedCanvasPool.release(canvas);

            // Timer should be different (reset)
            expect(extendedCanvasPool.getIdleTimer()).not.toBe(firstTimer);
            expect(extendedCanvasPool.getIdleTimer()).not.toBeNull();

            jest.useRealTimers();
        });

        it('should clear existing timer before setting new one', () => {
            jest.useFakeTimers();

            // Acquire first canvas to set timer
            extendedCanvasPool.acquire();
            const firstTimer = extendedCanvasPool.getIdleTimer();

            // Acquire second canvas - should reset timer
            extendedCanvasPool.acquire();

            // Timer should be different
            expect(extendedCanvasPool.getIdleTimer()).not.toBe(firstTimer);

            jest.useRealTimers();
        });

        it('should trigger trim after idle timeout', () => {
            jest.useFakeTimers();

            // Add many canvases to pool
            const canvases: HTMLCanvasElement[] = [];
            for (let i = 0; i < 10; i++) {
                canvases.push(extendedCanvasPool.acquire());
            }
            canvases.forEach(canvas => extendedCanvasPool.release(canvas));

            expect(extendedCanvasPool.getAvailable().length).toBe(10);

            // Fast-forward time to trigger the idle timeout
            jest.advanceTimersByTime(extendedCanvasPool.getIdleTimeout());

            // Should have trimmed to idle size (5)
            expect(extendedCanvasPool.getAvailable().length).toBe(5);

            jest.useRealTimers();
        });

        it('should test _resetIdleTimer directly for function coverage', () => {
            jest.useFakeTimers();

            // Call _resetIdleTimer directly
            extendedCanvasPool.callResetIdleTimer();
            expect(extendedCanvasPool.getIdleTimer()).not.toBeNull();

            // Call it again to test clearing existing timer
            const firstTimer = extendedCanvasPool.getIdleTimer();
            extendedCanvasPool.callResetIdleTimer();
            expect(extendedCanvasPool.getIdleTimer()).not.toBe(firstTimer);

            jest.useRealTimers();
        });
    });
});
