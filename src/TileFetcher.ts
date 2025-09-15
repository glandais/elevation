/**
 * HTTP client for fetching terrain RGB tiles
 */
export class TileFetcher {
    private readonly timeout: number;

    constructor(timeout: number = 5000) {
        this.timeout = timeout;
    }

    /**
     * Fetch a tile image and return ImageData
     */
    public async fetchTile(url: string): Promise<ImageData> {
        try {
            const response = await this.fetchWithTimeout(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            return await this.blobToImageData(blob);
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
                headers: {
                    Accept: 'image/png,image/jpeg,image/*',
                    'Cache-Control': 'max-age=86400', // 24 hours
                },
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Convert blob to ImageData using Canvas API
     */
    private async blobToImageData(blob: Blob): Promise<ImageData> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = (): void => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Failed to get 2D canvas context'));
                        return;
                    }

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    resolve(imageData);
                } catch (error) {
                    reject(
                        new Error(
                            `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    );
                }
            };

            img.onerror = (): void => {
                reject(new Error('Failed to load image'));
            };

            img.src = URL.createObjectURL(blob);
        });
    }
}
