import { Pixel, RGBColor } from '../types';
export declare abstract class Tile {
    readonly width: number;
    readonly height: number;
    readonly cache: Float64Array;
    constructor(width: number, height: number);
    abstract close(): void;
    abstract getRGBFromImageData(index: number): RGBColor;
    getElevation(position: Pixel): number;
    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     * @param rgb - RGB color values from terrain tile pixel
     * @returns Elevation in meters, rounded to 2 decimal places
     */
    decodeElevation(rgb: RGBColor): number;
}
//# sourceMappingURL=Tile.d.ts.map