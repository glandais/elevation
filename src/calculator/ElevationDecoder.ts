import type { Pixel, RGBColor } from '../types';

// ============================================================================
// ELEVATION DECODER - Terrarium RGB to Elevation Conversion
// ============================================================================

/**
 * Decodes elevation data from RGB terrain tiles using Terrarium encoding
 * Features:
 * - Terrarium RGB encoding formula implementation
 * - ImageData pixel extraction with bounds checking
 * - High-precision elevation calculation (2 decimal places)
 * - Input validation with proper error handling
 */
export class ElevationDecoder {
    // ========================================================================
    // PUBLIC API - ELEVATION DECODING
    // ========================================================================
    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     * @param rgb - RGB color values from terrain tile pixel
     * @returns Elevation in meters, rounded to 2 decimal places
     */
    public static decodeElevation(rgb: RGBColor): number {
        const elevation = rgb.red * 256 + rgb.green + rgb.blue / 256 - 32768;
        return Math.round(elevation * 100) / 100; // Round to 2 decimal places for precision
    }

    /**
     * Get elevation from ImageData at specific pixel position (convenience method)
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns Elevation in meters at the specified position
     */
    public static getElevationFromImageData(imageData: ImageData, position: Pixel): number {
        const rgb = this.getRGBFromImageData(imageData, position);
        return this.decodeElevation(rgb);
    }

    // ========================================================================
    // PUBLIC API - PIXEL DATA EXTRACTION
    // ========================================================================

    /**
     * Extract RGB values from ImageData at specific pixel position
     * @param imageData - Image data from terrain tile
     * @param position - Pixel coordinates within the tile
     * @returns RGB color values for elevation decoding
     */
    public static getRGBFromImageData(imageData: ImageData, position: Pixel): RGBColor {
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
