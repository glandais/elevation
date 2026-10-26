import { Tile } from '../..';
import { RGBColor } from '../../../types';
export declare class BrowserTile extends Tile {
    readonly data: ImageData;
    readonly bitmap: ImageBitmap;
    constructor(data: ImageData, bitmap: ImageBitmap);
    close(): void;
    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    getRGBFromImageData(index: number): RGBColor;
}
//# sourceMappingURL=BrowserTile.d.ts.map