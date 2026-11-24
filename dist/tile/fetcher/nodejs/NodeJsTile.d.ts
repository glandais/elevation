import { ImageData } from 'canvas';
import { Tile } from '../..';
import { RGBColor } from '../../../types';
export declare class NodeTile extends Tile {
    readonly data: ImageData;
    constructor(data: ImageData);
    close(): void;
    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    getRGBFromImageData(index: number): RGBColor;
}
//# sourceMappingURL=NodeJsTile.d.ts.map