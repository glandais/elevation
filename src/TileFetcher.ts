import { Tile } from './types';

class CanvasPool {
    private available: HTMLCanvasElement[] = [];
    private readonly idleSize: number = 5;
    private readonly idleTimeout: number = 30000; // 30 seconds
    private idleTimer: ReturnType<typeof setTimeout> | null = null;

    public acquire(): HTMLCanvasElement {
        let canvas = this.available.pop();
        if (!canvas) {
            canvas = document.createElement('canvas');
        }
        this._resetIdleTimer();
        return canvas;
    }

    public release(canvas: HTMLCanvasElement): void {
        if (canvas) {
            this.available.push(canvas);
            this._resetIdleTimer();
        }
    }

    private _resetIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        this.idleTimer = setTimeout(() => this._trim(), this.idleTimeout);
    }

    private _trim(): void {
        while (this.available.length > this.idleSize) {
            this.available.pop();
        }
    }
}

const _canvasPool = new CanvasPool();

/**
 * HTTP client for fetching terrain RGB tiles with memory-efficient ImageBitmap
 */
export class TileFetcher {
    private readonly timeout: number;

    constructor(timeout: number = 5000) {
        this.timeout = timeout;
    }

    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     */
    public async fetchTile(url: string): Promise<Tile> {
        try {
            const response = await this.fetchWithTimeout(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            return await this.blobToImageDataAndBitmap(blob);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to fetch tile from ${url}: ${error.message}`);
            }
            throw new Error(`Failed to fetch tile from ${url}: Unknown error`);
        }
    }

    /**
     * Fetch with timeout support
     */
    private async fetchWithTimeout(url: string): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Convert blob to ImageData and ImageBitmap using createImageBitmap
     * This approach avoids memory leaks from Image objects and blob URLs
     */
    private async blobToImageDataAndBitmap(blob: Blob): Promise<Tile> {
        let canvas: HTMLCanvasElement | null = null;
        let ctx: CanvasRenderingContext2D | null = null;
        try {
            canvas = _canvasPool.acquire();
            ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                throw new Error('Failed to get 2D canvas context');
            }
            // Create ImageBitmap directly from blob - more efficient and better memory management
            const bitmap = await createImageBitmap(blob);

            // Resize canvas to match image dimensions
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;

            // Draw ImageBitmap to canvas and extract ImageData
            ctx.drawImage(bitmap, 0, 0);
            const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

            return { data, bitmap };
        } catch (error) {
            throw new Error(
                `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        } finally {
            if (canvas) {
                _canvasPool.release(canvas);
            }
        }
    }
}
