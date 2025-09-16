import type { Pixel, RGBColor } from './types';

/**
 * Decodes elevation data from RGB terrain tiles using Terrarium encoding
 */
export class ElevationDecoder {
    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     */
    public static decodeElevation(rgb: RGBColor): number {
        const elevation = rgb.red * 256 + rgb.green + rgb.blue / 256 - 32768;
        return Math.round(elevation * 100) / 100; // Round to 2 decimal place
    }

    /**
     * Extract RGB values from ImageData at specific pixel position
     */
    public static getRGBFromImageData(imageData: ImageData, position: Pixel): RGBColor {
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

        const index = (position.y * imageData.width + position.x) * 4;

        return {
            red: imageData.data[index],
            green: imageData.data[index + 1],
            blue: imageData.data[index + 2],
        };
    }

    /**
     * Get elevation from ImageData at specific pixel position
     */
    public static getElevationFromImageData(imageData: ImageData, position: Pixel): number {
        const rgb = this.getRGBFromImageData(imageData, position);
        return this.decodeElevation(rgb);
    }
}
