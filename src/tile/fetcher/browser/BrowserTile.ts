import { RGBColor } from '../../../types';
import { Tile } from '../..';
export class BrowserTile extends Tile {
    constructor(
        readonly data: ImageData,
        readonly bitmap: ImageBitmap
    ) {
        super(data.width, data.height);
    }

    public close() {
        this.bitmap.close();
    }

    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    public getRGBFromImageData(index: number): RGBColor {
        return {
            red: this.data.data[index],
            green: this.data.data[index + 1],
            blue: this.data.data[index + 2],
            // Alpha channel (index + 3) is ignored for Terrarium encoding
        };
    }
}
