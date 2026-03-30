import { normalizePixel } from '../../src/calculator/ElevationFunctions';
import type { Pixel } from '../../src/types';

describe('ElevationFunctions', () => {
    describe('normalizePixel', () => {
        it('should handle normal pixel coordinates', () => {
            const pixel: Pixel = {
                tile: { z: 12, x: 100, y: 200 },
                x: 128,
                y: 64,
            };

            const result = normalizePixel(pixel, 256);

            expect(result).toEqual({
                tile: { z: 12, x: 100, y: 200 },
                x: 128,
                y: 64,
            });
        });

        it('should handle negative x coordinate', () => {
            const pixel: Pixel = {
                tile: { z: 12, x: 100, y: 200 },
                x: -1,
                y: 128,
            };

            const result = normalizePixel(pixel, 256);

            expect(result.x).toBe(255);
            expect(result.tile.x).toBe(99);
            expect(result.y).toBe(128);
            expect(result.tile.y).toBe(200);
        });

        it('should handle negative y coordinate', () => {
            const pixel: Pixel = {
                tile: { z: 12, x: 100, y: 200 },
                x: 128,
                y: -1,
            };

            const result = normalizePixel(pixel, 256);

            expect(result.x).toBe(128);
            expect(result.tile.x).toBe(100);
            expect(result.y).toBe(255);
            expect(result.tile.y).toBe(199);
        });

        it('should handle x coordinate >= TILE_SIZE', () => {
            const pixel: Pixel = {
                tile: { z: 12, x: 100, y: 200 },
                x: 256,
                y: 128,
            };

            const result = normalizePixel(pixel, 256);

            expect(result.x).toBe(0);
            expect(result.tile.x).toBe(101);
            expect(result.y).toBe(128);
            expect(result.tile.y).toBe(200);
        });

        it('should handle y coordinate >= TILE_SIZE', () => {
            const pixel: Pixel = {
                tile: { z: 12, x: 100, y: 200 },
                x: 128,
                y: 256,
            };

            const result = normalizePixel(pixel, 256);

            expect(result.x).toBe(128);
            expect(result.tile.x).toBe(100);
            expect(result.y).toBe(0);
            expect(result.tile.y).toBe(201);
        });

        it('should clamp tile coordinates to valid range', () => {
            const pixel: Pixel = {
                tile: { z: 2, x: 0, y: 0 }, // z=2 means max tile is 3 (2^2 - 1)
                x: -10,
                y: -10,
            };

            const result = normalizePixel(pixel, 256);

            expect(result.tile.x).toBe(0); // Clamped to minimum
            expect(result.tile.y).toBe(0); // Clamped to minimum
            expect(result.tile.z).toBe(2);
        });

        it('should clamp tile coordinates to maximum range', () => {
            const pixel: Pixel = {
                tile: { z: 2, x: 3, y: 3 }, // z=2 means max tile is 3
                x: 300, // Will cause tile x to exceed bounds
                y: 300, // Will cause tile y to exceed bounds
            };

            const result = normalizePixel(pixel, 256);

            expect(result.tile.x).toBe(3); // Clamped to maximum (2^2 - 1 = 3)
            expect(result.tile.y).toBe(3); // Clamped to maximum
            expect(result.tile.z).toBe(2);
        });

        it('should handle multiple adjustments', () => {
            const pixel: Pixel = {
                tile: { z: 4, x: 8, y: 8 }, // z=4 means max tile is 15
                x: -10,
                y: 300,
            };

            const result = normalizePixel(pixel, 256);

            // x: -10 → 246, tileX: 8-1 = 7
            expect(result.x).toBe(246);
            expect(result.tile.x).toBe(7);

            // y: 300 → 44, tileY: 8+1 = 9
            expect(result.y).toBe(44);
            expect(result.tile.y).toBe(9);
        });

        it('should handle edge cases at zoom level boundaries', () => {
            // Test at zoom level 0 (only one tile: 0,0)
            const pixel0: Pixel = {
                tile: { z: 0, x: 0, y: 0 },
                x: -1,
                y: -1,
            };

            const result0 = normalizePixel(pixel0, 256);
            expect(result0.tile.x).toBe(0); // Clamped to valid range
            expect(result0.tile.y).toBe(0); // Clamped to valid range

            // Test at zoom level 15 (max zoom)
            const pixel15: Pixel = {
                tile: { z: 15, x: 32767, y: 32767 }, // 2^15 - 1 = 32767
                x: 256,
                y: 256,
            };

            const result15 = normalizePixel(pixel15, 256);
            expect(result15.tile.x).toBe(32767); // Should remain at max
            expect(result15.tile.y).toBe(32767); // Should remain at max
        });
    });
});
