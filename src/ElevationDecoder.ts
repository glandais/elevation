import type { RGBColor, TilePixelPosition } from './types';

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
        return Math.round(elevation * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Extract RGB values from ImageData at specific pixel position
     */
    public static getRGBFromImageData(imageData: ImageData, position: TilePixelPosition): RGBColor {
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
    public static getElevationFromImageData(
        imageData: ImageData,
        position: TilePixelPosition
    ): number {
        const rgb = this.getRGBFromImageData(imageData, position);
        return this.decodeElevation(rgb);
    }

    /**
     * Get interpolated elevation using bilinear interpolation
     * This provides smoother elevation values between pixels
     */
    public static getInterpolatedElevation(imageData: ImageData, x: number, y: number): number {
        // Clamp coordinates to valid range
        const clampedX = Math.max(0, Math.min(imageData.width - 1, x));
        const clampedY = Math.max(0, Math.min(imageData.height - 1, y));

        const x0 = Math.floor(clampedX);
        const y0 = Math.floor(clampedY);
        const x1 = Math.min(x0 + 1, imageData.width - 1);
        const y1 = Math.min(y0 + 1, imageData.height - 1);

        const fx = clampedX - x0;
        const fy = clampedY - y0;

        // Get elevation at four corner points
        const e00 = this.getElevationFromImageData(imageData, { x: x0, y: y0 });
        const e10 = this.getElevationFromImageData(imageData, { x: x1, y: y0 });
        const e01 = this.getElevationFromImageData(imageData, { x: x0, y: y1 });
        const e11 = this.getElevationFromImageData(imageData, { x: x1, y: y1 });

        // Bilinear interpolation
        const ex0 = e00 * (1 - fx) + e10 * fx;
        const ex1 = e01 * (1 - fx) + e11 * fx;
        const elevation = ex0 * (1 - fy) + ex1 * fy;

        return Math.round(elevation * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Validate that RGB values represent valid terrain data
     */
    public static isValidTerrainData(rgb: RGBColor): boolean {
        // Check for typical "no data" values
        if (rgb.red === 0 && rgb.green === 0 && rgb.blue === 0) {
            return false; // Pure black typically indicates no data
        }

        if (rgb.red === 255 && rgb.green === 255 && rgb.blue === 255) {
            return false; // Pure white typically indicates no data
        }

        return true;
    }
}
