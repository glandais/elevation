import { ElevationDecoder } from '../src/ElevationDecoder';
import type { RGBColor, TilePixelPosition } from '../src/types';

describe('ElevationDecoder', () => {
    describe('decodeElevation method', () => {
        it('should decode elevation from RGB values using Terrarium encoding', () => {
            const rgb: RGBColor = { red: 128, green: 128, blue: 128 };

            // Formula: (128 * 256 + 128 + 128/256) - 32768
            // = 32768 + 128 + 0.5 - 32768 = 128.5
            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBeCloseTo(128.5, 1);
        });

        it('should handle sea level (elevation 0)', () => {
            // For elevation 0: 0 + 32768 = 32768
            // 32768 = 128 * 256 + 0 + 0
            const rgb: RGBColor = { red: 128, green: 0, blue: 0 };

            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBe(0);
        });

        it('should handle negative elevations (below sea level)', () => {
            // For elevation -100: -100 + 32768 = 32668
            // 32668 = 127 * 256 + 156 + 0
            const rgb: RGBColor = { red: 127, green: 156, blue: 0 };

            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBe(-100);
        });

        it('should handle positive elevations', () => {
            // For elevation 1000: 1000 + 32768 = 33768
            // 33768 = 131 * 256 + 232 + 0
            const rgb: RGBColor = { red: 131, green: 232, blue: 0 };

            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBe(1000);
        });

        it('should handle maximum elevation values', () => {
            // Maximum possible: 255 * 256 + 255 + 255/256 - 32768
            const rgb: RGBColor = { red: 255, green: 255, blue: 255 };

            const result = ElevationDecoder.decodeElevation(rgb);

            // 65280 + 255 + 0.996 - 32768 = 32768
            expect(result).toBeCloseTo(32768, 1);
        });

        it('should handle minimum elevation values', () => {
            // Minimum possible: 0 * 256 + 0 + 0/256 - 32768
            const rgb: RGBColor = { red: 0, green: 0, blue: 0 };

            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBe(-32768);
        });

        it('should round to 1 decimal place', () => {
            const rgb: RGBColor = { red: 128, green: 128, blue: 127 };

            // (128 * 256 + 128 + 127/256) - 32768
            // = 32768 + 128 + 0.496... - 32768 = 128.496...
            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBe(128.5); // Should round to 1 decimal
        });

        it('should handle fractional blue component correctly', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 128 };

            // (128 * 256 + 0 + 128/256) - 32768 = 0.5
            const result = ElevationDecoder.decodeElevation(rgb);

            expect(result).toBe(0.5);
        });
    });

    describe('getRGBFromImageData method', () => {
        let imageData: ImageData;

        beforeEach(() => {
            // Create a 3x3 test image
            imageData = new ImageData(3, 3);
            // Set some test values
            for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = 100; // Red
                imageData.data[i + 1] = 150; // Green
                imageData.data[i + 2] = 200; // Blue
                imageData.data[i + 3] = 255; // Alpha
            }
        });

        it('should extract RGB values at specific position', () => {
            const position: TilePixelPosition = { x: 1, y: 1 };

            const result = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(result).toEqual({
                red: 100,
                green: 150,
                blue: 200,
            });
        });

        it('should extract RGB at top-left corner (0, 0)', () => {
            const position: TilePixelPosition = { x: 0, y: 0 };

            const result = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(result).toEqual({
                red: 100,
                green: 150,
                blue: 200,
            });
        });

        it('should extract RGB at bottom-right corner', () => {
            const position: TilePixelPosition = { x: 2, y: 2 };

            const result = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(result).toEqual({
                red: 100,
                green: 150,
                blue: 200,
            });
        });

        it('should handle different RGB values at different positions', () => {
            // Set different values at position (1, 0)
            const index = (0 * 3 + 1) * 4;
            imageData.data[index] = 50;
            imageData.data[index + 1] = 75;
            imageData.data[index + 2] = 100;

            const position: TilePixelPosition = { x: 1, y: 0 };
            const result = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(result).toEqual({
                red: 50,
                green: 75,
                blue: 100,
            });
        });

        it('should throw error for negative x position', () => {
            const position: TilePixelPosition = { x: -1, y: 0 };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid x position: -1. Must be between 0 and 2'
            );
        });

        it('should throw error for x position >= width', () => {
            const position: TilePixelPosition = { x: 3, y: 0 };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid x position: 3. Must be between 0 and 2'
            );
        });

        it('should throw error for negative y position', () => {
            const position: TilePixelPosition = { x: 0, y: -1 };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid y position: -1. Must be between 0 and 2'
            );
        });

        it('should throw error for y position >= height', () => {
            const position: TilePixelPosition = { x: 0, y: 3 };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid y position: 3. Must be between 0 and 2'
            );
        });

        it('should work with large ImageData (256x256)', () => {
            const largeImageData = new ImageData(256, 256);
            // Set a specific pixel
            const index = (128 * 256 + 128) * 4;
            largeImageData.data[index] = 111;
            largeImageData.data[index + 1] = 222;
            largeImageData.data[index + 2] = 33;

            const position: TilePixelPosition = { x: 128, y: 128 };
            const result = ElevationDecoder.getRGBFromImageData(largeImageData, position);

            expect(result).toEqual({
                red: 111,
                green: 222,
                blue: 33,
            });
        });
    });

    describe('getElevationFromImageData method', () => {
        let imageData: ImageData;

        beforeEach(() => {
            imageData = new ImageData(2, 2);
            // Set elevation 0 at position (0, 0)
            // 0 + 32768 = 32768 = 128 * 256 + 0 + 0
            imageData.data[0] = 128; // Red
            imageData.data[1] = 0; // Green
            imageData.data[2] = 0; // Blue
            imageData.data[3] = 255; // Alpha

            // Set elevation 1000 at position (1, 0)
            // 1000 + 32768 = 33768 = 131 * 256 + 232 + 0
            imageData.data[4] = 131;
            imageData.data[5] = 232;
            imageData.data[6] = 0;
            imageData.data[7] = 255;
        });

        it('should get elevation at specific position', () => {
            const position: TilePixelPosition = { x: 0, y: 0 };

            const result = ElevationDecoder.getElevationFromImageData(imageData, position);

            expect(result).toBe(0);
        });

        it('should get different elevation at different position', () => {
            const position: TilePixelPosition = { x: 1, y: 0 };

            const result = ElevationDecoder.getElevationFromImageData(imageData, position);

            expect(result).toBe(1000);
        });

        it('should throw error for invalid position', () => {
            const position: TilePixelPosition = { x: -1, y: 0 };

            expect(() => ElevationDecoder.getElevationFromImageData(imageData, position)).toThrow(
                'Invalid x position: -1. Must be between 0 and 1'
            );
        });

        it('should handle negative elevations', () => {
            // Set elevation -500 at position (0, 1)
            // -500 + 32768 = 32268 = 126 * 256 + 12 + 0
            const index = (1 * 2 + 0) * 4;
            imageData.data[index] = 126;
            imageData.data[index + 1] = 12;
            imageData.data[index + 2] = 0;

            const position: TilePixelPosition = { x: 0, y: 1 };
            const result = ElevationDecoder.getElevationFromImageData(imageData, position);

            expect(result).toBe(-500);
        });
    });

    describe('getInterpolatedElevation method', () => {
        let imageData: ImageData;

        beforeEach(() => {
            imageData = new ImageData(3, 3);
            // Set up a gradient of elevations for testing interpolation
            // Top-left (0,0): elevation 0
            const index00 = 0;
            imageData.data[index00] = 128;
            imageData.data[index00 + 1] = 0;
            imageData.data[index00 + 2] = 0;

            // Top-right (2,0): elevation 200
            const index20 = (0 * 3 + 2) * 4;
            imageData.data[index20] = 128;
            imageData.data[index20 + 1] = 200;
            imageData.data[index20 + 2] = 0;

            // Bottom-left (0,2): elevation 100
            const index02 = (2 * 3 + 0) * 4;
            imageData.data[index02] = 128;
            imageData.data[index02 + 1] = 100;
            imageData.data[index02 + 2] = 0;

            // Bottom-right (2,2): elevation 300
            const index22 = (2 * 3 + 2) * 4;
            imageData.data[index22] = 129;
            imageData.data[index22 + 1] = 44;
            imageData.data[index22 + 2] = 0;

            // Center (1,1): elevation 150
            const index11 = (1 * 3 + 1) * 4;
            imageData.data[index11] = 128;
            imageData.data[index11 + 1] = 150;
            imageData.data[index11 + 2] = 0;
        });

        it('should return exact elevation at integer coordinates', () => {
            const result = ElevationDecoder.getInterpolatedElevation(imageData, 0, 0);

            expect(result).toBe(0);
        });

        it('should interpolate between pixels horizontally', () => {
            // Between (0,0) elevation 0 and (1,0) elevation depends on what's set
            // First set (1,0) to elevation 100
            const index10 = (0 * 3 + 1) * 4;
            imageData.data[index10] = 128;
            imageData.data[index10 + 1] = 100;
            imageData.data[index10 + 2] = 0;

            const result = ElevationDecoder.getInterpolatedElevation(imageData, 0.5, 0);

            // Should be halfway between 0 and 100
            expect(result).toBe(50);
        });

        it('should interpolate between pixels vertically', () => {
            // Between (0,0) elevation 0 and (0,1) elevation depends on what's set
            // First set (0,1) to elevation 100
            const index01 = (1 * 3 + 0) * 4;
            imageData.data[index01] = 128;
            imageData.data[index01 + 1] = 100;
            imageData.data[index01 + 2] = 0;

            const result = ElevationDecoder.getInterpolatedElevation(imageData, 0, 0.5);

            // Should be halfway between 0 and 100
            expect(result).toBe(50);
        });

        it('should perform bilinear interpolation', () => {
            // Set up a 2x2 grid for clearer testing
            const smallImageData = new ImageData(2, 2);

            // (0,0): elevation 0
            smallImageData.data[0] = 128;
            smallImageData.data[1] = 0;
            smallImageData.data[2] = 0;

            // (1,0): elevation 100
            smallImageData.data[4] = 128;
            smallImageData.data[5] = 100;
            smallImageData.data[6] = 0;

            // (0,1): elevation 200
            smallImageData.data[8] = 128;
            smallImageData.data[9] = 200;
            smallImageData.data[10] = 0;

            // (1,1): elevation 300
            smallImageData.data[12] = 129;
            smallImageData.data[13] = 44;
            smallImageData.data[14] = 0;

            // Interpolate at center (0.5, 0.5)
            const result = ElevationDecoder.getInterpolatedElevation(smallImageData, 0.5, 0.5);

            // Bilinear interpolation:
            // Top edge: 0 * 0.5 + 100 * 0.5 = 50
            // Bottom edge: 200 * 0.5 + 300 * 0.5 = 250
            // Final: 50 * 0.5 + 250 * 0.5 = 150
            expect(result).toBe(150);
        });

        it('should clamp coordinates to valid range (negative)', () => {
            const result = ElevationDecoder.getInterpolatedElevation(imageData, -1, -1);

            // Should use (0, 0)
            expect(result).toBe(0);
        });

        it('should clamp coordinates to valid range (too large)', () => {
            const result = ElevationDecoder.getInterpolatedElevation(imageData, 10, 10);

            // Should use (2, 2) which has elevation 300
            expect(result).toBe(300);
        });

        it('should handle edge coordinates', () => {
            const result = ElevationDecoder.getInterpolatedElevation(imageData, 2, 2);

            expect(result).toBe(300);
        });

        it('should handle fractional coordinates at edges', () => {
            // At edge, should not go out of bounds
            const result = ElevationDecoder.getInterpolatedElevation(imageData, 2.5, 2.5);

            // Should clamp to (2, 2)
            expect(result).toBe(300);
        });

        it('should round result to 1 decimal place', () => {
            // Create a scenario that produces a fractional result
            const smallImageData = new ImageData(2, 2);

            // Set values that will produce fractional interpolation
            smallImageData.data[0] = 128;
            smallImageData.data[1] = 0;
            smallImageData.data[2] = 1; // Will add 1/256 to elevation

            smallImageData.data[4] = 128;
            smallImageData.data[5] = 0;
            smallImageData.data[6] = 3; // Will add 3/256 to elevation

            const result = ElevationDecoder.getInterpolatedElevation(smallImageData, 0.5, 0);

            // Should round to 1 decimal place
            expect(result.toString()).toMatch(/^\d+(\.\d)?$/);
        });

        it('should handle coordinates exactly at pixel boundaries', () => {
            const result1 = ElevationDecoder.getInterpolatedElevation(imageData, 1.0, 1.0);
            const result2 = ElevationDecoder.getInterpolatedElevation(imageData, 1, 1);

            expect(result1).toBe(result2);
            expect(result1).toBe(150);
        });
    });

    describe('isValidTerrainData method', () => {
        it('should return true for valid terrain data', () => {
            const rgb: RGBColor = { red: 128, green: 100, blue: 50 };

            const result = ElevationDecoder.isValidTerrainData(rgb);

            expect(result).toBe(true);
        });

        it('should return false for pure black (no data)', () => {
            const rgb: RGBColor = { red: 0, green: 0, blue: 0 };

            const result = ElevationDecoder.isValidTerrainData(rgb);

            expect(result).toBe(false);
        });

        it('should return false for pure white (no data)', () => {
            const rgb: RGBColor = { red: 255, green: 255, blue: 255 };

            const result = ElevationDecoder.isValidTerrainData(rgb);

            expect(result).toBe(false);
        });

        it('should return true for near-black but not pure black', () => {
            const rgb: RGBColor = { red: 0, green: 0, blue: 1 };

            const result = ElevationDecoder.isValidTerrainData(rgb);

            expect(result).toBe(true);
        });

        it('should return true for near-white but not pure white', () => {
            const rgb: RGBColor = { red: 255, green: 255, blue: 254 };

            const result = ElevationDecoder.isValidTerrainData(rgb);

            expect(result).toBe(true);
        });

        it('should return true for typical terrain values', () => {
            const testCases: RGBColor[] = [
                { red: 128, green: 0, blue: 0 }, // Sea level
                { red: 131, green: 232, blue: 0 }, // Mountain
                { red: 127, green: 156, blue: 0 }, // Below sea level
                { red: 200, green: 100, blue: 50 }, // High elevation
            ];

            testCases.forEach(rgb => {
                expect(ElevationDecoder.isValidTerrainData(rgb)).toBe(true);
            });
        });

        it('should handle edge cases', () => {
            // Only one channel is 0
            expect(ElevationDecoder.isValidTerrainData({ red: 0, green: 100, blue: 100 })).toBe(
                true
            );

            // Only one channel is 255
            expect(ElevationDecoder.isValidTerrainData({ red: 255, green: 100, blue: 100 })).toBe(
                true
            );

            // Two channels are 0
            expect(ElevationDecoder.isValidTerrainData({ red: 0, green: 0, blue: 100 })).toBe(true);

            // Two channels are 255
            expect(ElevationDecoder.isValidTerrainData({ red: 255, green: 255, blue: 100 })).toBe(
                true
            );
        });
    });
});
