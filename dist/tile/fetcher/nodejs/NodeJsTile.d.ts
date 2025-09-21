import { ImageData } from 'canvas';
import { Pixel, RGBColor } from '../../../types';
import { Tile } from '../..';
export declare class NodeTile implements Tile {
    readonly data: ImageData;
    constructor(data: ImageData);
    close(): void;
    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    getRGBFromImageData(position: Pixel): RGBColor;
}
//# sourceMappingURL=NodeJsTile.d.ts.map