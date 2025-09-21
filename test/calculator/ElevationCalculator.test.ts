import { ElevationCalculator } from '../../src/calculator/ElevationCalculator';
import { TileManager } from '../../src/tile/TileManager';
import * as ElevationFunctions from '../../src/calculator/ElevationFunctions';
import type { Coordinates, Pixel, RGBColor } from '../../src/types';
import { Tile } from 'src/tile';

// Mock TileManager
jest.mock('../../src/tile/TileManager');
const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;

// Extended class for testing private methods
class ElevationCalculatorExtended extends ElevationCalculator {
    // Expose private method as public for testing
    public callDecodeElevation(rgb: RGBColor): number {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.decodeElevation.call(this, rgb);
    }
}

describe('ElevationCalculator', () => {
    let calculator: ElevationCalculator;
    let extendedCalculator: ElevationCalculatorExtended;
    let mockTileManager: jest.Mocked<TileManager>;
    let mockTile: Tile;

    beforeEach(() => {
        mockTileManager = new MockedTileManager('', 0) as jest.Mocked<TileManager>;
        calculator = new ElevationCalculator(mockTileManager);
        extendedCalculator = new ElevationCalculatorExtended(mockTileManager);

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
            close: jest.fn(),
            getRGBFromImageData: jest.fn((position: Pixel): RGBColor => {
                const x = Math.floor(position.x);
                const y = Math.floor(position.y);
                const index = (y * mockImageData.width + x) * 4;

                return {
                    red: mockImageData.data[index],
                    green: mockImageData.data[index + 1],
                    blue: mockImageData.data[index + 2],
                };
            }),
        } as jest.Mocked<Tile>;

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

        it('should use non-interpolated path when interpolation is false', async () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 12;

            // Spy on the exported toPixel function to verify the correct execution path
            const toPixelSpy = jest.spyOn(ElevationFunctions, 'toPixel').mockReturnValue({
                tile: { z: 12, x: 2048, y: 2048 },
                x: 128,
                y: 128,
            });

            const getElevationFromPixelSpy = jest
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .spyOn(calculator as any, 'getElevationFromPixel')
                .mockResolvedValue(1500);

            const getInterpolatedElevationInternalSpy = jest.spyOn(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                calculator as any,
                'getInterpolatedElevationInternal'
            );

            // Call with interpolation = false to test the selected branch
            const elevation = await calculator.getElevation(coords, zoomLevel, false);

            // Verify the non-interpolated path was taken (lines 25-27)
            expect(toPixelSpy).toHaveBeenCalledWith(coords, zoomLevel);
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
            const getInterpolatedElevationInternalSpy = jest
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .spyOn(calculator as any, 'getInterpolatedElevationInternal')
                .mockResolvedValue(1750);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getElevationFromPixelSpy = jest.spyOn(calculator as any, 'getElevationFromPixel');

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

    describe('decodeElevation method', () => {
        it('should decode elevation from RGB values using Terrarium encoding', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 0 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

            // 128 * 256 + 0 + 0/256 - 32768 = 32768 - 32768 = 0
            expect(elevation).toBe(0);
        });

        it('should handle sea level elevation (zero)', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 0 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);
            expect(elevation).toBe(0);
        });

        it('should handle positive elevation', () => {
            const rgb: RGBColor = { red: 129, green: 0, blue: 0 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

            // 129 * 256 + 0 + 0/256 - 32768 = 33024 - 32768 = 256
            expect(elevation).toBe(256);
        });

        it('should handle negative elevation (below sea level)', () => {
            const rgb: RGBColor = { red: 127, green: 255, blue: 255 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

            // 127 * 256 + 255 + 255/256 - 32768 = 32767.996... - 32768 ≈ -0.004
            expect(elevation).toBeCloseTo(-0.004, 2);
        });

        it('should handle maximum elevation', () => {
            const rgb: RGBColor = { red: 255, green: 255, blue: 255 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

            // 255 * 256 + 255 + 255/256 - 32768 = 65535.996... - 32768 ≈ 32767.996
            expect(elevation).toBeCloseTo(32767.996, 2);
        });

        it('should handle minimum elevation', () => {
            const rgb: RGBColor = { red: 0, green: 0, blue: 0 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

            // 0 * 256 + 0 + 0/256 - 32768 = -32768
            expect(elevation).toBe(-32768);
        });

        it('should round elevation to 2 decimal places', () => {
            const rgb: RGBColor = { red: 128, green: 1, blue: 128 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

            // 128 * 256 + 1 + 128/256 - 32768 = 32769.5 - 32768 = 1.5
            expect(elevation).toBe(1.5);
        });

        it('should handle fractional blue values', () => {
            const rgb: RGBColor = { red: 128, green: 0, blue: 64 };
            const elevation = extendedCalculator.callDecodeElevation(rgb);

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
                const result = extendedCalculator.callDecodeElevation(rgb);
                expect(result).toBeCloseTo(expected, 2);
            });
        });
    });
});
