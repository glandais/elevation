import { CanvasPool, TileFetcher } from '..';
import { BrowserTile } from './BrowserTile';
import { Tile } from '../..';

// ============================================================================
// TILE FETCHER - HTTP Client for Terrain Tiles
// ============================================================================

/**
 * HTTP client for fetching terrain RGB tiles with memory-efficient ImageBitmap processing
 * Features:
 * - Configurable timeout support
 * - Memory-efficient canvas pooling
 * - ImageBitmap creation for optimal performance
 * - Automatic resource cleanup
 */
export class BrowserTileFetcher implements TileFetcher {
    private readonly canvasPool: CanvasPool<HTMLCanvasElement>;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor() {
        this.canvasPool = new CanvasPool<HTMLCanvasElement>(() => document.createElement('canvas'));
    }

    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     * @param url - The URL of the tile to fetch
     * @param tileKey - The tile identifier for logging
     * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
     */
    public async fetchTile(url: string): Promise<Tile> {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();

        // Create ImageBitmap directly from blob - more efficient and better memory management
        const bitmap = await createImageBitmap(blob);

        // Acquire canvas from pool
        const canvas = this.canvasPool.acquire();

        try {
            // Resize canvas to match image dimensions
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                throw new Error('Failed to get 2D canvas context');
            }

            // Draw ImageBitmap to canvas and extract ImageData
            ctx.drawImage(bitmap, 0, 0);
            const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

            return new BrowserTile(data, bitmap);
        } finally {
            // Always return canvas to pool for reuse
            this.canvasPool.release(canvas);
        }
    }
}
