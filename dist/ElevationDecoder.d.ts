import { Pixel, RGBColor } from './types';
/**
 * Decodes elevation data from RGB terrain tiles using Terrarium encoding
 */
export declare class ElevationDecoder {
    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     */
    static decodeElevation(rgb: RGBColor): number;
    /**
     * Extract RGB values from ImageData at specific pixel position
     */
    static getRGBFromImageData(imageData: ImageData, position: Pixel): RGBColor;
    /**
     * Get elevation from ImageData at specific pixel position
     */
    static getElevationFromImageData(imageData: ImageData, position: Pixel): number;
}
//# sourceMappingURL=ElevationDecoder.d.ts.map