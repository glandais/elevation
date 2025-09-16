import { ElevationCalculator } from '../../src/calculator/ElevationCalculator';
import { TileManager } from '../../src/tile/TileManager';
import type { Pixel, Tile, Coordinates } from '../../src/types';

// Mock TileManager
jest.mock('../../src/tile/TileManager');
const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;

describe('ElevationCalculator', () => {
    let calculator: ElevationCalculator;
    let mockTileManager: jest.Mocked<TileManager>;
    let mockTile: Tile;

    beforeEach(() => {
        mockTileManager = new MockedTileManager('', 0, 0) as jest.Mocked<TileManager>;
        calculator = new ElevationCalculator(mockTileManager);

        // Create mock ImageData with specific elevation pattern
        const data = new Uint8ClampedArray(256 * 256 * 4);

        // Fill with different elevation values for testing
        // Most pixels at sea level (128, 0, 0) = 0 meters
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 128; // Red
            data[i + 1] = 0; // Green
            data[i + 2] = 0; // Blue
            data[i + 3] = 255; // Alpha
        }

        // Set specific pixels for testing
        // Pixel at (0,0): 1000m elevation
        // 1000 + 32768 = 33768
        // red = 33768 / 256 = 131.90625 -> 131
        // remaining = 33768 - (131 * 256) = 33768 - 33536 = 232
        // green = 232
        // blue = 0
        data[0] = 131; // Red
        data[1] = 232; // Green - corrected value
        data[2] = 0; // Blue
        data[3] = 255; // Alpha

        const mockImageData = new ImageData(data, 256, 256);

        const mockImageBitmap = {
            close: jest.fn(),
            width: 256,
            height: 256,
        } as unknown as ImageBitmap;

        mockTile = {
            data: mockImageData,
            bitmap: mockImageBitmap,
        };

        mockTileManager.getTile = jest.fn().mockResolvedValue(mockTile);
    });

    describe('getElevation', () => {
        it('should get elevation for coordinates', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 12;

            const elevation = await calculator.getElevation(coords, zoomLevel);

            expect(mockTileManager.getTile).toHaveBeenCalled();
            expect(typeof elevation).toBe('number');
            expect(elevation).toBeCloseTo(1000, 0);
        });

        it('should handle different coordinate sets', async () => {
            const testCases = [
                { latitude: 0, longitude: 0 },
                { latitude: 45, longitude: 90 },
                { latitude: -45, longitude: -90 },
            ];

            for (const coords of testCases) {
                const elevation = await calculator.getElevation(coords, 12);
                expect(typeof elevation).toBe('number');
                expect(isFinite(elevation)).toBe(true);
            }
        });

        it('should propagate tile manager errors', async () => {
            const error = new Error('Tile fetch failed');
            mockTileManager.getTile.mockRejectedValueOnce(error);

            const coords: Coordinates = { latitude: 0, longitude: 0 };

            await expect(calculator.getElevation(coords, 12)).rejects.toThrow(
                'Failed to get elevation: Tile fetch failed'
            );
        });

        it('should handle unknown errors', async () => {
            mockTileManager.getTile.mockRejectedValueOnce('Unknown error');

            const coords: Coordinates = { latitude: 0, longitude: 0 };

            await expect(calculator.getElevation(coords, 12)).rejects.toThrow(
                'Failed to get elevation: Unknown error'
            );
        });

        it('should call TileManager with correct tile coordinates', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 8;

            await calculator.getElevation(coords, zoomLevel);

            expect(mockTileManager.getTile).toHaveBeenCalled();
            // Verify the call was made (exact tile coordinates will depend on conversion)
            const call = mockTileManager.getTile.mock.calls[0];
            expect(call[0]).toHaveProperty('z', zoomLevel);
            expect(call[0]).toHaveProperty('x');
            expect(call[0]).toHaveProperty('y');
        });

        it('should reject invalid latitude', async () => {
            const coords: Coordinates = { latitude: 90, longitude: 0 };

            await expect(calculator.getElevation(coords, 12)).rejects.toThrow(
                'Failed to get elevation: Invalid latitude: 90. Must be between -85.0511 and 85.0511'
            );
        });

        it('should reject invalid longitude', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 200 };

            await expect(calculator.getElevation(coords, 12)).rejects.toThrow(
                'Failed to get elevation: Invalid longitude: 200. Must be between -180 and 180'
            );
        });

        it('should reject invalid zoom level', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };

            await expect(calculator.getElevation(coords, 16)).rejects.toThrow(
                'Failed to get elevation: Invalid zoom level: 16. Must be between 0 and 15'
            );
        });
    });

    describe('getInterpolatedElevation', () => {
        it('should perform bilinear interpolation', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 12;

            // Mock calculator to track calls to getElevationFromPixel
            const mockGetElevationFromPixel = jest
                .spyOn(
                    calculator as unknown as {
                        getElevationFromPixel: (
                            pixel: Pixel,
                            tileManager: TileManager
                        ) => Promise<number>;
                    },
                    'getElevationFromPixel'
                )
                .mockResolvedValueOnce(1000) // p00
                .mockResolvedValueOnce(2000) // p10
                .mockResolvedValueOnce(1500) // p01
                .mockResolvedValueOnce(2500); // p11

            const result = await calculator.getInterpolatedElevation(coords, zoomLevel);

            // Should call getElevationFromPixel 4 times for the 4 corners
            expect(mockGetElevationFromPixel).toHaveBeenCalledTimes(4);

            // Result should be the bilinear interpolation of the 4 values
            // With dx=0, dy=0 (since we're at exact pixel coordinates), result should be p00
            expect(result).toBe(1000);

            mockGetElevationFromPixel.mockRestore();
        });

        it('should handle different coordinates for interpolation', async () => {
            const coords: Coordinates = { latitude: 45, longitude: 90 };
            const zoomLevel = 12;

            const result = await calculator.getInterpolatedElevation(coords, zoomLevel);

            expect(typeof result).toBe('number');
            expect(isFinite(result)).toBe(true);
        });

        it('should propagate tile manager errors in interpolation', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const error = new Error('Tile fetch failed');
            mockTileManager.getTile.mockRejectedValueOnce(error);

            await expect(calculator.getInterpolatedElevation(coords, 12)).rejects.toThrow(
                'Tile fetch failed'
            );
        });
    });

    describe('normalizePixel', () => {
        it('should handle normal pixel coordinates', () => {
            const pixel: Pixel = {
                tile: { z: 12, x: 100, y: 200 },
                x: 128,
                y: 64,
            };

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result = calculator.normalizePixel(pixel);

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

            const result0 = calculator.normalizePixel(pixel0);
            expect(result0.tile.x).toBe(0); // Clamped to valid range
            expect(result0.tile.y).toBe(0); // Clamped to valid range

            // Test at zoom level 15 (max zoom)
            const pixel15: Pixel = {
                tile: { z: 15, x: 32767, y: 32767 }, // 2^15 - 1 = 32767
                x: 256,
                y: 256,
            };

            const result15 = calculator.normalizePixel(pixel15);
            expect(result15.tile.x).toBe(32767); // Should remain at max
            expect(result15.tile.y).toBe(32767); // Should remain at max
        });
    });

    describe('integration scenarios', () => {
        it('should maintain precision in elevation calculations', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };

            const elevation = await calculator.getElevation(coords, 12);

            // Should maintain precision from ElevationDecoder
            expect(elevation).toBeCloseTo(1000, 2); // Within 0.01m
        });

        it('should handle concurrent elevation requests', async () => {
            const coordinates = [
                { latitude: 0, longitude: 0 },
                { latitude: 45, longitude: 90 },
                { latitude: -45, longitude: -90 },
            ];

            const promises = coordinates.map(coords => calculator.getElevation(coords, 12));

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            results.forEach(elevation => {
                expect(typeof elevation).toBe('number');
                expect(isFinite(elevation)).toBe(true);
            });
        });
    });
});
