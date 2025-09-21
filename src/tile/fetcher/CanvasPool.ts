import { createLogger, Logger } from '../../utils';

const logger: Logger = createLogger('tile/fetcher/CanvasPool');

// ============================================================================
// CANVAS POOL - Resource Management
// ============================================================================

/**
 * Canvas pool for efficient canvas reuse and memory management
 * Automatically trims excess canvases after idle period
 */
export class CanvasPool<T> {
    private readonly builder: () => T;
    private available: T[] = [];
    private readonly idleSize: number = 5;
    private readonly idleTimeout: number = 30000; // 30 seconds
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private totalCreated: number = 0;
    private totalAcquired: number = 0;
    private totalReleased: number = 0;

    constructor(builder: () => T) {
        this.builder = builder;
    }

    /**
     * Acquire a canvas from the pool (creates new if none available)
     */
    public acquire(): T {
        this.totalAcquired++;
        let canvas = this.available.pop();

        if (!canvas) {
            canvas = this.builder();
            this.totalCreated++;
            logger.debug(
                'Canvas created - new canvas (total created: %d, pool size: %d)',
                this.totalCreated,
                this.available.length
            );
        } else {
            logger.debug(
                'Canvas acquired from pool (pool size: %d → %d, total acquired: %d)',
                this.available.length + 1,
                this.available.length,
                this.totalAcquired
            );
        }

        this._resetIdleTimer();
        return canvas;
    }

    /**
     * Return a canvas to the pool for reuse
     */
    public release(canvas: T): void {
        if (canvas) {
            this.totalReleased++;
            this.available.push(canvas);
            logger.debug(
                'Canvas released to pool (pool size: %d → %d, total released: %d)',
                this.available.length - 1,
                this.available.length,
                this.totalReleased
            );
            this._resetIdleTimer();
        } else {
            logger.warn('Canvas release attempted with null/undefined canvas');
        }
    }

    /**
     * Reset the idle timer for automatic cleanup
     */
    private _resetIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            logger.debug('Idle timer reset - previous timer cleared');
        } else {
            logger.debug('Idle timer started - %d ms until auto-trim', this.idleTimeout);
        }
        this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
    }

    /**
     * Trim excess canvases to prevent memory buildup
     */
    private _trim(): void {
        const initialSize = this.available.length;
        let trimmed = 0;

        if (initialSize > this.idleSize) {
            logger.debug(
                'Auto-trim triggered - pool size %d exceeds idle limit %d',
                initialSize,
                this.idleSize
            );

            while (this.available.length > this.idleSize) {
                this.available.pop();
                trimmed++;
            }

            logger.info(
                'Canvas pool trimmed - removed %d canvases (pool size: %d → %d)',
                trimmed,
                initialSize,
                this.available.length
            );
        } else {
            logger.debug(
                'Auto-trim skipped - pool size %d within idle limit %d',
                initialSize,
                this.idleSize
            );
        }

        // Clear the timer since this trim cycle is complete
        this.idleTimer = null;
    }
}
