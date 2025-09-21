import { NodeTile } from '../../../../src/tile/fetcher/nodejs/NodeJsTile';
import type { Pixel } from '../../../../src/types';

// Mock canvas module for testing
jest.mock('canvas', () => ({
    ImageData: class MockImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;

        constructor(data: Uint8ClampedArray, width: number, height: number) {
            this.data = data;
            this.width = width;
            this.height = height;
        }
    },
}));

describe('NodeTile', () => {
    describe('getRGBFromImageData method', () => {
        let tile: NodeTile;
        let imageData: { data: Uint8ClampedArray; width: number; height: number };

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

            // Create mock ImageData structure for Node.js
            imageData = {
                data,
                width: 2,
                height: 2,
            };

            tile = new NodeTile(imageData);
        });

        it('should extract RGB from top-left pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 0,
            };
            const rgb = tile.getRGBFromImageData(position);

            expect(rgb).toEqual({ red: 255, green: 0, blue: 0 });
        });

        it('should extract RGB from top-right pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 0,
            };
            const rgb = tile.getRGBFromImageData(position);

            expect(rgb).toEqual({ red: 0, green: 255, blue: 0 });
        });

        it('should extract RGB from bottom-left pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 1,
            };
            const rgb = tile.getRGBFromImageData(position);

            expect(rgb).toEqual({ red: 0, green: 0, blue: 255 });
        });

        it('should extract RGB from bottom-right pixel', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 1,
            };
            const rgb = tile.getRGBFromImageData(position);

            expect(rgb).toEqual({ red: 128, green: 128, blue: 128 });
        });

        it('should throw error for invalid x position (negative)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: -1,
                y: 0,
            };

            expect(() => tile.getRGBFromImageData(position)).toThrow(
                'Invalid x position: -1. Must be between 0 and 1'
            );
        });

        it('should throw error for invalid x position (too large)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 2,
                y: 0,
            };

            expect(() => tile.getRGBFromImageData(position)).toThrow(
                'Invalid x position: 2. Must be between 0 and 1'
            );
        });

        it('should throw error for invalid y position (negative)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: -1,
            };

            expect(() => tile.getRGBFromImageData(position)).toThrow(
                'Invalid y position: -1. Must be between 0 and 1'
            );
        });

        it('should throw error for invalid y position (too large)', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 2,
            };

            expect(() => tile.getRGBFromImageData(position)).toThrow(
                'Invalid y position: 2. Must be between 0 and 1'
            );
        });

        it('should handle edge positions correctly', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1, // Last valid x
                y: 1, // Last valid y
            };

            expect(() => tile.getRGBFromImageData(position)).not.toThrow();
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

            const largeImageData = {
                data,
                width: size,
                height: size,
            };

            const largeTile = new NodeTile(largeImageData);

            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 128,
                y: 128,
            };

            const rgb = largeTile.getRGBFromImageData(position);
            expect(rgb).toBeDefined();
            expect(rgb.red).toBeGreaterThanOrEqual(0);
            expect(rgb.red).toBeLessThanOrEqual(255);
            expect(rgb.green).toBeGreaterThanOrEqual(0);
            expect(rgb.green).toBeLessThanOrEqual(255);
            expect(rgb.blue).toBeGreaterThanOrEqual(0);
            expect(rgb.blue).toBeLessThanOrEqual(255);
        });
    });

    describe('close method', () => {
        it('should handle close() method (no-op for Node.js)', () => {
            const data = new Uint8ClampedArray(4);
            const imageData = {
                data,
                width: 1,
                height: 1,
            };

            const tile = new NodeTile(imageData);

            // Should not throw - close is a no-op for Node.js tiles
            expect(() => tile.close()).not.toThrow();
        });
    });

    describe('elevation decoding integration', () => {
        let tile: NodeTile;
        let imageData: { data: Uint8ClampedArray; width: number; height: number };

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

            imageData = {
                data,
                width: 2,
                height: 2,
            };

            tile = new NodeTile(imageData);
        });

        it('should get RGB for sea level elevation', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 0,
            };

            const rgb = tile.getRGBFromImageData(position);
            expect(rgb).toEqual({ red: 128, green: 0, blue: 0 });
        });

        it('should get RGB for positive elevation', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 0,
            };

            const rgb = tile.getRGBFromImageData(position);
            expect(rgb).toEqual({ red: 129, green: 0, blue: 0 });
        });

        it('should get RGB for negative elevation', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 0,
                y: 1,
            };

            const rgb = tile.getRGBFromImageData(position);
            expect(rgb).toEqual({ red: 127, green: 255, blue: 255 });
        });

        it('should get RGB for complex elevation values', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: 1,
                y: 1,
            };

            const rgb = tile.getRGBFromImageData(position);
            expect(rgb).toEqual({ red: 140, green: 50, blue: 200 });
        });

        it('should handle invalid positions for elevation data', () => {
            const position: Pixel = {
                tile: { z: 1, x: 0, y: 0 },
                x: -1,
                y: 0,
            };

            expect(() => tile.getRGBFromImageData(position)).toThrow(
                'Invalid x position: -1. Must be between 0 and 1'
            );
        });
    });
});
