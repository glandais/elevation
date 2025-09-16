import { CoordinateConverter } from '../src/CoordinateConverter';
import type { Coordinates } from '../src/types';

describe('CoordinateConverter', () => {
    describe('toPixel method', () => {
        it('should convert valid coordinates to pixel position', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const result = CoordinateConverter.toPixel(coords, 1);

            expect(result).toEqual({
                tile: { z: 1, x: 1, y: 1 },
                x: 0,
                y: 0,
            });
        });

        it('should handle coordinates at equator and prime meridian', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const result = CoordinateConverter.toPixel(coords, 0);

            expect(result).toEqual({
                tile: { z: 0, x: 0, y: 0 },
                x: 128,
                y: 128,
            });
        });

        it('should handle positive latitude and longitude', () => {
            const coords: Coordinates = { latitude: 45, longitude: 90 };
            const result = CoordinateConverter.toPixel(coords, 2);

            expect(result.tile.z).toBe(2);
            expect(result.tile.x).toBeGreaterThanOrEqual(0);
            expect(result.tile.y).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThan(256);
            expect(result.y).toBeLessThan(256);
        });

        it('should handle negative latitude and longitude', () => {
            const coords: Coordinates = { latitude: -45, longitude: -90 };
            const result = CoordinateConverter.toPixel(coords, 2);

            expect(result.tile.z).toBe(2);
            expect(result.tile.x).toBeGreaterThanOrEqual(0);
            expect(result.tile.y).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThan(256);
            expect(result.y).toBeLessThan(256);
        });

        it('should handle maximum valid latitude', () => {
            const coords: Coordinates = { latitude: 85.0511, longitude: 0 };
            const result = CoordinateConverter.toPixel(coords, 1);

            expect(result.tile.z).toBe(1);
            expect(result.tile.y).toBe(0);
        });

        it('should handle minimum valid latitude', () => {
            const coords: Coordinates = { latitude: -85.0511, longitude: 0 };
            const result = CoordinateConverter.toPixel(coords, 1);

            expect(result.tile.z).toBe(1);
            expect(result.tile.y).toBe(1);
        });

        it('should handle maximum longitude', () => {
            const coords: Coordinates = { latitude: 0, longitude: 180 };
            const result = CoordinateConverter.toPixel(coords, 1);

            expect(result.tile.z).toBe(1);
            expect(result.tile.x).toBe(1); // 180 longitude clamped to max valid tile (1) at zoom 1
        });

        it('should handle minimum longitude', () => {
            const coords: Coordinates = { latitude: 0, longitude: -180 };
            const result = CoordinateConverter.toPixel(coords, 1);

            expect(result.tile.z).toBe(1);
            expect(result.tile.x).toBe(0);
        });

        it('should clamp pixel coordinates to valid range', () => {
            const coords: Coordinates = { latitude: 85.0511, longitude: 180 };
            const result = CoordinateConverter.toPixel(coords, 10);

            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThan(256);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThan(256);
        });

        it('should handle different zoom levels', () => {
            const coords: Coordinates = { latitude: 40.7128, longitude: -74.006 }; // NYC

            for (let z = 0; z <= 15; z++) {
                const result = CoordinateConverter.toPixel(coords, z);
                expect(result.tile.z).toBe(z);
                expect(result.tile.x).toBeGreaterThanOrEqual(0);
                expect(result.tile.y).toBeGreaterThanOrEqual(0);
                expect(result.tile.x).toBeLessThan(Math.pow(2, z));
                expect(result.tile.y).toBeLessThan(Math.pow(2, z));
            }
        });

        it('should be consistent across multiple calls', () => {
            const coords: Coordinates = { latitude: 51.5074, longitude: -0.1278 }; // London
            const result1 = CoordinateConverter.toPixel(coords, 5);
            const result2 = CoordinateConverter.toPixel(coords, 5);

            expect(result1).toEqual(result2);
        });
    });

    describe('validation', () => {
        describe('latitude validation', () => {
            it('should reject latitude above maximum', () => {
                const coords: Coordinates = { latitude: 85.0512, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid latitude: 85.0512. Must be between -85.0511 and 85.0511'
                );
            });

            it('should reject latitude below minimum', () => {
                const coords: Coordinates = { latitude: -85.0512, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid latitude: -85.0512. Must be between -85.0511 and 85.0511'
                );
            });

            it('should reject extreme latitude values', () => {
                const coords: Coordinates = { latitude: 90, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid latitude: 90. Must be between -85.0511 and 85.0511'
                );
            });

            it('should reject NaN latitude', () => {
                const coords: Coordinates = { latitude: NaN, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid latitude: NaN. Must be between -85.0511 and 85.0511'
                );
            });

            it('should reject Infinity latitude', () => {
                const coords: Coordinates = { latitude: Infinity, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid latitude: Infinity. Must be between -85.0511 and 85.0511'
                );
            });
        });

        describe('longitude validation', () => {
            it('should reject longitude above maximum', () => {
                const coords: Coordinates = { latitude: 0, longitude: 180.1 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid longitude: 180.1. Must be between -180 and 180'
                );
            });

            it('should reject longitude below minimum', () => {
                const coords: Coordinates = { latitude: 0, longitude: -180.1 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid longitude: -180.1. Must be between -180 and 180'
                );
            });

            it('should reject extreme longitude values', () => {
                const coords: Coordinates = { latitude: 0, longitude: 360 };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid longitude: 360. Must be between -180 and 180'
                );
            });

            it('should reject NaN longitude', () => {
                const coords: Coordinates = { latitude: 0, longitude: NaN };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid longitude: NaN. Must be between -180 and 180'
                );
            });

            it('should reject Infinity longitude', () => {
                const coords: Coordinates = { latitude: 0, longitude: Infinity };
                expect(() => CoordinateConverter.toPixel(coords, 1)).toThrow(
                    'Invalid longitude: Infinity. Must be between -180 and 180'
                );
            });
        });

        describe('zoom level validation', () => {
            it('should reject negative zoom level', () => {
                const coords: Coordinates = { latitude: 0, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, -1)).toThrow(
                    'Invalid zoom level: -1. Must be between 0 and 15'
                );
            });

            it('should reject zoom level above maximum', () => {
                const coords: Coordinates = { latitude: 0, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 16)).toThrow(
                    'Invalid zoom level: 16. Must be between 0 and 15'
                );
            });

            it('should reject non-integer zoom level', () => {
                const coords: Coordinates = { latitude: 0, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, 1.5)).toThrow(
                    'Invalid zoom level: 1.5. Must be between 0 and 15'
                );
            });

            it('should reject NaN zoom level', () => {
                const coords: Coordinates = { latitude: 0, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, NaN)).toThrow(
                    'Invalid zoom level: NaN. Must be between 0 and 15'
                );
            });

            it('should reject Infinity zoom level', () => {
                const coords: Coordinates = { latitude: 0, longitude: 0 };
                expect(() => CoordinateConverter.toPixel(coords, Infinity)).toThrow(
                    'Invalid zoom level: Infinity. Must be between 0 and 15'
                );
            });
        });
    });

    describe('real world coordinates', () => {
        const testCases = [
            { name: 'New York City', lat: 40.7128, lon: -74.006 },
            { name: 'London', lat: 51.5074, lon: -0.1278 },
            { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
            { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
            { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
            { name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
            { name: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
        ];

        testCases.forEach(({ name, lat, lon }) => {
            it(`should handle ${name} coordinates`, () => {
                const coords: Coordinates = { latitude: lat, longitude: lon };
                const result = CoordinateConverter.toPixel(coords, 10);

                expect(result.tile.z).toBe(10);
                expect(result.tile.x).toBeGreaterThanOrEqual(0);
                expect(result.tile.y).toBeGreaterThanOrEqual(0);
                expect(result.tile.x).toBeLessThan(1024); // 2^10
                expect(result.tile.y).toBeLessThan(1024); // 2^10
                expect(result.x).toBeGreaterThanOrEqual(0);
                expect(result.y).toBeGreaterThanOrEqual(0);
                expect(result.x).toBeLessThan(256);
                expect(result.y).toBeLessThan(256);
            });
        });
    });
});
