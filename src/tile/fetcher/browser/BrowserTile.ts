import { Pixel, RGBColor } from '../../../types';
import { Tile } from '../..';
export class BrowserTile implements Tile {
    constructor(
        readonly data: ImageData,
        readonly bitmap: ImageBitmap
    ) {}
    public close() {
        this.bitmap.close();
    }

    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    public getRGBFromImageData(position: Pixel): RGBColor {
        const imageData = this.data;
        // Input validation
        if (position.x < 0 || position.x >= imageData.width) {
            throw new Error(
                `Invalid x position: ${position.x}. Must be between 0 and ${imageData.width - 1}`
            );
        }

        if (position.y < 0 || position.y >= imageData.height) {
            throw new Error(
                `Invalid y position: ${position.y}. Must be between 0 and ${imageData.height - 1}`
            );
        }

        // Calculate pixel index in RGBA array (4 bytes per pixel)
        const index = (position.y * imageData.width + position.x) * 4;

        return {
            red: imageData.data[index],
            green: imageData.data[index + 1],
            blue: imageData.data[index + 2],
            // Alpha channel (index + 3) is ignored for Terrarium encoding
        };
    }
}
