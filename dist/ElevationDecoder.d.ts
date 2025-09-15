import { RGBColor, TilePixelPosition } from './types';
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
    static getRGBFromImageData(imageData: ImageData, position: TilePixelPosition): RGBColor;
    /**
     * Get elevation from ImageData at specific pixel position
     */
    static getElevationFromImageData(imageData: ImageData, position: TilePixelPosition): number;
    /**
     * Get interpolated elevation using bilinear interpolation
     * This provides smoother elevation values between pixels
     */
    static getInterpolatedElevation(imageData: ImageData, x: number, y: number): number;
    /**
     * Validate that RGB values represent valid terrain data
     */
    static isValidTerrainData(rgb: RGBColor): boolean;
}
//# sourceMappingURL=ElevationDecoder.d.ts.map