import { Pixel, RGBColor } from '../types';

export abstract class Tile {
    readonly cache: Float64Array;
    constructor(
        readonly width: number,
        readonly height: number
    ) {
        this.cache = new Float64Array(width * height);
        this.cache.fill(NaN);
    }

    abstract close(): void;
    abstract getRGBFromImageData(index: number): RGBColor;

    getElevation(position: Pixel): number {
        // Input validation
        if (position.x < 0 || position.x >= this.width) {
            throw new Error(
                `Invalid x position: ${position.x}. Must be between 0 and ${this.width - 1}`
            );
        }

        if (position.y < 0 || position.y >= this.height) {
            throw new Error(
                `Invalid y position: ${position.y}. Must be between 0 and ${this.height - 1}`
            );
        }

        // Calculate pixel index in RGBA array (4 bytes per pixel)
        const index = (position.y * this.width + position.x) * 4;
        if (isNaN(this.cache[index])) {
            const rgb = this.getRGBFromImageData(index);
            const elevation = this.decodeElevation(rgb);
            this.cache[index] = elevation;
            return elevation;
        } else {
            return this.cache[index];
        }
    }

    /**
     * Decode elevation from RGB values using Terrarium encoding
     * Formula: elevation = (red * 256 + green + blue / 256) - 32768
     * @param rgb - RGB color values from terrain tile pixel
     * @returns Elevation in meters, rounded to 2 decimal places
     */
    decodeElevation(rgb: RGBColor): number {
        const elevation = rgb.red * 256 + rgb.green + rgb.blue / 256 - 32768;
        return Math.round(elevation * 100) / 100; // Round to 2 decimal places for precision
    }
}
