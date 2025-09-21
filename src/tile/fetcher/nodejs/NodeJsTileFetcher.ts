import { CanvasPool, TileFetcher } from '..';
import { NodeTile } from './NodeJsTile';
import { Tile } from '../..';
import { Canvas, createCanvas, loadImage } from 'canvas';

export class NodeJsTileFetcher implements TileFetcher {
    private readonly canvasPool: CanvasPool<Canvas>;

    constructor() {
        this.canvasPool = new CanvasPool<Canvas>(() => createCanvas(256, 256));
    }

    /**
     * Fetch a tile image and return both ImageData and ImageBitmap for memory management
     * @param url - The URL of the tile to fetch
     * @param tileKey - The tile identifier for logging
     * @returns Promise<Tile> - Object containing ImageData and ImageBitmap
     */
    public async fetchTile(url: string): Promise<Tile> {
        const image = await loadImage(url);
        // Acquire canvas from pool
        const canvas = this.canvasPool.acquire();

        try {
            // Resize canvas to match image dimensions
            if (canvas.width !== image.width) {
                canvas.width = image.width;
            }
            if (canvas.height !== image.height) {
                canvas.height = image.height;
            }

            const ctx = canvas.getContext('2d');

            ctx.drawImage(image, 0, 0);
            const data = ctx.getImageData(0, 0, image.width, image.height);
            return new NodeTile(data);
        } finally {
            // Always return canvas to pool for reuse
            this.canvasPool.release(canvas);
        }
    }
}
