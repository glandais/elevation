import type { Mocked, MockedClass } from 'vitest';
import { ElevationCalculator } from '../../src/calculator/ElevationCalculator';
import { TileManager } from '../../src/tile/TileManager';
import * as ElevationFunctions from '../../src/calculator/ElevationFunctions';
import type { Coordinates, Pixel } from '../../src/types';
import { Tile } from '../../src/tile';

// Mock TileManager
vi.mock('../../src/tile/TileManager');
const MockedTileManager = TileManager as MockedClass<typeof TileManager>;

describe('ElevationCalculator', () => {
    let calculator: ElevationCalculator;
    let mockTileManager: Mocked<TileManager>;
    let mockTile: Mocked<Tile>;

    beforeEach(() => {
        mockTileManager = new MockedTileManager('', 0) as Mocked<TileManager>;
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

        mockTile = {
            close: vi.fn(),
            width: 256,
            height: 256,
            cache: new Float64Array(256 * 256),
            getRGBFromImageData: vi.fn((index: number) => {
                return {
                    red: mockImageData.data[index],
                    green: mockImageData.data[index + 1],
                    blue: mockImageData.data[index + 2],
                };
            }),
            getElevation: vi.fn((position: Pixel): number => {
                const x = Math.floor(position.x);
                const y = Math.floor(position.y);
                const index = (y * mockImageData.width + x) * 4;

                const rgb = {
                    red: mockImageData.data[index],
                    green: mockImageData.data[index + 1],
                    blue: mockImageData.data[index + 2],
                };

                // Decode elevation using Terrarium formula
                const elevation = rgb.red * 256 + rgb.green + rgb.blue / 256 - 32768;
                return Math.round(elevation * 100) / 100;
            }),
            decodeElevation: vi.fn(),
        } as Mocked<Tile>;

        mockTileManager.getTile = vi.fn().mockResolvedValue(mockTile);
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

        it('should use non-interpolated path when interpolation is false', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 12;

            // Spy on the exported toPixel function to verify the correct execution path
            const toPixelSpy = vi.spyOn(ElevationFunctions, 'toPixel').mockReturnValue({
                tile: { z: 12, x: 2048, y: 2048 },
                x: 128,
                y: 128,
            });

            const getElevationFromPixelSpy = vi
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .spyOn(calculator as any, 'getElevationFromPixel')
                .mockResolvedValue(1500);

            const getInterpolatedElevationInternalSpy = vi.spyOn(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                calculator as any,
                'getInterpolatedElevationInternal'
            );

            // Call with interpolation = false to test the selected branch
            const elevation = await calculator.getElevation(coords, zoomLevel, false);

            // Verify the non-interpolated path was taken (lines 25-27)
            expect(toPixelSpy).toHaveBeenCalledWith(coords, zoomLevel, 256);
            expect(getElevationFromPixelSpy).toHaveBeenCalledWith({
                tile: { z: 12, x: 2048, y: 2048 },
                x: 128,
                y: 128,
            });
            expect(getInterpolatedElevationInternalSpy).not.toHaveBeenCalled();
            expect(elevation).toBe(1500);

            // Clean up spies
            toPixelSpy.mockRestore();
            getElevationFromPixelSpy.mockRestore();
            getInterpolatedElevationInternalSpy.mockRestore();
        });

        it('should use interpolated path when interpolation is true', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 12;

            // Spy on the private methods to verify the correct execution path
            const getInterpolatedElevationInternalSpy = vi
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .spyOn(calculator as any, 'getInterpolatedElevationInternal')
                .mockResolvedValue(1750);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getElevationFromPixelSpy = vi.spyOn(calculator as any, 'getElevationFromPixel');

            // Call with interpolation = true (default)
            const elevation = await calculator.getElevation(coords, zoomLevel, true);

            // Verify the interpolated path was taken
            expect(getInterpolatedElevationInternalSpy).toHaveBeenCalledWith(coords, zoomLevel);
            expect(getElevationFromPixelSpy).not.toHaveBeenCalled();
            expect(elevation).toBe(1750);

            // Clean up spies
            getInterpolatedElevationInternalSpy.mockRestore();
            getElevationFromPixelSpy.mockRestore();
        });
    });

    describe('integration scenarios', () => {
        it('should maintain precision in elevation calculations', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };

            const elevation = await calculator.getElevation(coords, 12);

            // Should maintain precision from calculator
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
