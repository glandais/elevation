import { Tile, TileCoordinates } from '../../types';
import { CanvasPool } from './CanvasPool';

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
export class TileFetcher {
    private readonly tileUrlTemplate: string;
    private readonly timeout: number;
    private readonly canvasPool: CanvasPool;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(tileUrlTemplate: string, timeout: number = 5000) {
        this.tileUrlTemplate = tileUrlTemplate;
        this.timeout = timeout;
        this.canvasPool = new CanvasPool();
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public async loadTile(tileCoords: TileCoordinates): Promise<Tile> {
        const tileUrl = this.getTileUrl(tileCoords);
        return await this.fetchTile(tileUrl);
    }

    // ========================================================================
    // PRIVATE
    // ========================================================================

    private getTileUrl(tileCoords: TileCoordinates): string {
        return this.tileUrlTemplate
            .replace('{z}', tileCoords.z.toString())
            .replace('{x}', tileCoords.x.toString())
            .replace('{y}', tileCoords.y.toString());
    }

    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     * @param url - The URL of the tile to fetch
     * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
     */
    private async fetchTile(url: string): Promise<Tile> {
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

    // ========================================================================
    // PRIVATE - HTTP OPERATIONS
    // ========================================================================

    /**
     * Fetch with timeout support using AbortController
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

    // ========================================================================
    // PRIVATE - IMAGE PROCESSING
    // ========================================================================

    /**
     * Convert blob to ImageData and ImageBitmap using createImageBitmap
     * This approach avoids memory leaks from Image objects and blob URLs
     * Uses canvas pool for efficient resource management
     */
    private async blobToImageDataAndBitmap(blob: Blob): Promise<Tile> {
        // Acquire canvas from pool
        const canvas = this.canvasPool.acquire();

        try {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
            // Always return canvas to pool for reuse
            this.canvasPool.release(canvas);
        }
    }
}
