import { Pixel, RGBColor } from '../types';
/**
 * Decodes elevation data from RGB terrain tiles using Terrarium encoding
 * Features:
 * - Terrarium RGB encoding formula implementation
 * - ImageData pixel extraction with bounds checking
 * - High-precision elevation calculation (2 decimal places)
 * - Input validation with proper error handling
 */
export declare class ElevationDecoder {
    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     * @param rgb - RGB color values from terrain tile pixel
     * @returns Elevation in meters, rounded to 2 decimal places
     */
    static decodeElevation(rgb: RGBColor): number;
    /**
     * Get elevation from ImageData at specific pixel position (convenience method)
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns Elevation in meters at the specified position
     */
    static getElevationFromImageData(imageData: ImageData, position: Pixel): number;
    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    static getRGBFromImageData(imageData: ImageData, position: Pixel): RGBColor;
}
//# sourceMappingURL=ElevationDecoder.d.ts.map