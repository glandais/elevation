import { ElevationDecoder } from '../../src/calculator/ElevationDecoder';
import type { RGBColor, Pixel } from '../../src/types';

describe('ElevationDecoder', () => {
    describe('decodeElevation method', () => {
        it('should decode elevation from RGB values using Terrarium encoding', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 0 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 128 * 256 + 0 + 0/256 - 32768 = 32768 - 32768 = 0
            expect(elevation).toBe(0);
        });

        it('should handle sea level elevation (zero)', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 0 };
            const elevation = ElevationDecoder.decodeElevation(rgb);
            expect(elevation).toBe(0);
        });

        it('should handle positive elevation', () => {
            const rgb: RGBColor = { red: 129, green: 0, blue: 0 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 129 * 256 + 0 + 0/256 - 32768 = 33024 - 32768 = 256
            expect(elevation).toBe(256);
        });

        it('should handle negative elevation (below sea level)', () => {
            const rgb: RGBColor = { red: 127, green: 255, blue: 255 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 127 * 256 + 255 + 255/256 - 32768 = 32767.996... - 32768 ≈ -0.004
            expect(elevation).toBeCloseTo(-0.004, 2);
        });

        it('should handle maximum elevation', () => {
            const rgb: RGBColor = { red: 255, green: 255, blue: 255 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 255 * 256 + 255 + 255/256 - 32768 = 65535.996... - 32768 ≈ 32767.996
            expect(elevation).toBeCloseTo(32767.996, 2);
        });

        it('should handle minimum elevation', () => {
            const rgb: RGBColor = { red: 0, green: 0, blue: 0 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 0 * 256 + 0 + 0/256 - 32768 = -32768
            expect(elevation).toBe(-32768);
        });

        it('should round elevation to 2 decimal places', () => {
            const rgb: RGBColor = { red: 128, green: 1, blue: 128 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 128 * 256 + 1 + 128/256 - 32768 = 32769.5 - 32768 = 1.5
            expect(elevation).toBe(1.5);
        });

        it('should handle fractional blue values', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 64 };
            const elevation = ElevationDecoder.decodeElevation(rgb);

            // 128 * 256 + 0 + 64/256 - 32768 = 32768.25 - 32768 = 0.25
            expect(elevation).toBe(0.25);
        });

        it('should be consistent with known test values', () => {
            // Test some known elevation encodings
            // Formula: elevation = (red * 256 + green + blue / 256) - 32768
            const testCases = [
                { rgb: { red: 130, green: 100, blue: 50 }, expected: 612.2 }, // 130*256 + 100 + 50/256 - 32768
                { rgb: { red: 120, green: 200, blue: 150 }, expected: -1847.41 }, // 120*256 + 200 + 150/256 - 32768
                { rgb: { red: 140, green: 50, blue: 200 }, expected: 3122.78 }, // 140*256 + 50 + 200/256 - 32768
            ];

            testCases.forEach(({ rgb, expected }) => {
                const result = ElevationDecoder.decodeElevation(rgb);
                expect(result).toBeCloseTo(expected, 2);
            });
        });
    });

    describe('getRGBFromImageData method', () => {
        let imageData: ImageData;

        beforeEach(() => {
            // Create a 2x2 test image
            const data = new Uint8ClampedArray([
                255,
                0,
                0,
                255, // Red pixel at (0,0)
                0,
                255,
                0,
                255, // Green pixel at (1,0)
                0,
                0,
                255,
                255, // Blue pixel at (0,1)
                128,
                128,
                128,
                255, // Gray pixel at (1,1)
            ]);
            imageData = new ImageData(data, 2, 2);
        });

        it('should extract RGB from top-left pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 0,
            };
            const rgb = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(rgb).toEqual({ red: 255, green: 0, blue: 0 });
        });

        it('should extract RGB from top-right pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 0,
            };
            const rgb = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(rgb).toEqual({ red: 0, green: 255, blue: 0 });
        });

        it('should extract RGB from bottom-left pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 1,
            };
            const rgb = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(rgb).toEqual({ red: 0, green: 0, blue: 255 });
        });

        it('should extract RGB from bottom-right pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 1,
            };
            const rgb = ElevationDecoder.getRGBFromImageData(imageData, position);

            expect(rgb).toEqual({ red: 128, green: 128, blue: 128 });
        });

        it('should throw error for invalid x position (negative)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: -1,
                y: 0,
            };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid x position: -1. Must be between 0 and 1'
            );
        });

        it('should throw error for invalid x position (too large)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 2,
                y: 0,
            };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid x position: 2. Must be between 0 and 1'
            );
        });

        it('should throw error for invalid y position (negative)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: -1,
            };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid y position: -1. Must be between 0 and 1'
            );
        });

        it('should throw error for invalid y position (too large)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 2,
            };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).toThrow(
                'Invalid y position: 2. Must be between 0 and 1'
            );
        });

        it('should handle edge positions correctly', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1, // Last valid x
                y: 1, // Last valid y
            };

            expect(() => ElevationDecoder.getRGBFromImageData(imageData, position)).not.toThrow();
        });

        it('should handle larger image data', () => {
            // Create a 256x256 test image (standard tile size)
            const size = 256;
            const data = new Uint8ClampedArray(size * size * 4);

            // Fill with test pattern
            for (let i = 0; i < data.length; i += 4) {
                data[i] = (i / 4) % 256; // Red
                data[i + 1] = (i / 4) % 128; // Green
                data[i + 2] = (i / 4) % 64; // Blue
                data[i + 3] = 255; // Alpha
            }

            const largeImageData = new ImageData(data, size, size);

            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 128,
                y: 128,
            };

            const rgb = ElevationDecoder.getRGBFromImageData(largeImageData, position);
            expect(rgb).toBeDefined();
            expect(rgb.red).toBeGreaterThanOrEqual(0);
            expect(rgb.red).toBeLessThanOrEqual(255);
            expect(rgb.green).toBeGreaterThanOrEqual(0);
            expect(rgb.green).toBeLessThanOrEqual(255);
            expect(rgb.blue).toBeGreaterThanOrEqual(0);
            expect(rgb.blue).toBeLessThanOrEqual(255);
        });
    });

    describe('getElevationFromImageData method', () => {
        let imageData: ImageData;

        beforeEach(() => {
            // Create test image with known elevation values
            const data = new Uint8ClampedArray([
                128,
                0,
                0,
                255, // Sea level (0m) at (0,0)
                129,
                0,
                0,
                255, // 256m elevation at (1,0)
                127,
                255,
                255,
                255, // Below sea level at (0,1)
                140,
                50,
                200,
                255, // High elevation at (1,1)
            ]);
            imageData = new ImageData(data, 2, 2);
        });

        it('should get elevation from pixel position', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 0,
            };

            const elevation = ElevationDecoder.getElevationFromImageData(imageData, position);
            expect(elevation).toBe(0); // Sea level
        });

        it('should get positive elevation', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 0,
            };

            const elevation = ElevationDecoder.getElevationFromImageData(imageData, position);
            expect(elevation).toBe(256);
        });

        it('should get negative elevation', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 1,
            };

            const elevation = ElevationDecoder.getElevationFromImageData(imageData, position);
            expect(elevation).toBeCloseTo(-0.004, 2);
        });

        it('should handle invalid positions', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: -1,
                y: 0,
            };

            expect(() => ElevationDecoder.getElevationFromImageData(imageData, position)).toThrow(
                'Invalid x position: -1. Must be between 0 and 1'
            );
        });

        it('should be consistent with separate getRGB and decode calls', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 1,
            };

            const elevation1 = ElevationDecoder.getElevationFromImageData(imageData, position);

            const rgb = ElevationDecoder.getRGBFromImageData(imageData, position);
            const elevation2 = ElevationDecoder.decodeElevation(rgb);

            expect(elevation1).toBe(elevation2);
        });
    });
});
