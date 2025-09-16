// ============================================================================
// CANVAS POOL - Resource Management
// ============================================================================

/**
 * Canvas pool for efficient canvas reuse and memory management
 * Automatically trims excess canvases after idle period
 */
export class CanvasPool {
    private available: HTMLCanvasElement[] = [];
    private readonly idleSize: number = 5;
    private readonly idleTimeout: number = 30000; // 30 seconds
    private idleTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Acquire a canvas from the pool (creates new if none available)
     */
    public acquire(): HTMLCanvasElement {
        let canvas = this.available.pop();
        if (!canvas) {
            canvas = document.createElement('canvas');
        }
        this._resetIdleTimer();
        return canvas;
    }

    /**
     * Return a canvas to the pool for reuse
     */
    public release(canvas: HTMLCanvasElement): void {
        if (canvas) {
            this.available.push(canvas);
            this._resetIdleTimer();
        }
    }

    /**
     * Reset the idle timer for automatic cleanup
     */
    private _resetIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
    }

    /**
     * Trim excess canvases to prevent memory buildup
     */
    private _trim(): void {
        while (this.available.length > this.idleSize) {
            this.available.pop();
        }
    }
}
