/**
 * Canvas pool for efficient canvas reuse and memory management
 * Automatically trims excess canvases after idle period
 */
export declare class CanvasPool {
    private available;
    private readonly idleSize;
    private readonly idleTimeout;
    private idleTimer;
    private totalCreated;
    private totalAcquired;
    private totalReleased;
    /**
     * Acquire a canvas from the pool (creates new if none available)
     */
    acquire(): HTMLCanvasElement;
    /**
     * Return a canvas to the pool for reuse
     */
    release(canvas: HTMLCanvasElement): void;
    /**
     * Reset the idle timer for automatic cleanup
     */
    private _resetIdleTimer;
    /**
     * Trim excess canvases to prevent memory buildup
     */
    private _trim;
}
//# sourceMappingURL=CanvasPool.d.ts.map