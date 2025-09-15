import { CoordinateConverter } from '../src/CoordinateConverter';
import type { Coordinates, TileCoordinates } from '../src/types';

describe('CoordinateConverter', () => {
    describe('toTileCoordinates method', () => {
        it('should convert valid coordinates to tile coordinates', () => {
            const coords: Coordinates = { latitude: 40.7128, longitude: -74.006 }; // New York City
            const zoomLevel = 12;

            const result = CoordinateConverter.toTileCoordinates(coords, zoomLevel);

            expect(result).toEqual({
                x: 1205,
                y: 1540,
                z: 12,
            });
        });

        it('should handle coordinates at the equator and prime meridian', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 1;

            const result = CoordinateConverter.toTileCoordinates(coords, zoomLevel);

            expect(result).toEqual({
                x: 1,
                y: 1,
                z: 1,
            });
        });

        it('should handle coordinates at maximum latitude', () => {
            const coords: Coordinates = { latitude: 85.0511, longitude: 0 };
            const zoomLevel = 1;

            const result = CoordinateConverter.toTileCoordinates(coords, zoomLevel);

            expect(result.x).toBe(1);
            expect(result.y).toBe(0);
            expect(result.z).toBe(1);
        });

        it('should handle coordinates at minimum latitude', () => {
            const coords: Coordinates = { latitude: -85.0511, longitude: 0 };
            const zoomLevel = 1;

            const result = CoordinateConverter.toTileCoordinates(coords, zoomLevel);

            expect(result.x).toBe(1);
            expect(result.y).toBe(1);
            expect(result.z).toBe(1);
        });

        it('should handle coordinates at maximum longitude', () => {
            const coords: Coordinates = { latitude: 0, longitude: 180 };
            const zoomLevel = 1;

            const result = CoordinateConverter.toTileCoordinates(coords, zoomLevel);

            expect(result.x).toBe(2);
            expect(result.y).toBe(1);
            expect(result.z).toBe(1);
        });

        it('should handle coordinates at minimum longitude', () => {
            const coords: Coordinates = { latitude: 0, longitude: -180 };
            const zoomLevel = 1;

            const result = CoordinateConverter.toTileCoordinates(coords, zoomLevel);

            expect(result.x).toBe(0);
            expect(result.y).toBe(1);
            expect(result.z).toBe(1);
        });

        it('should handle different zoom levels', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };

            for (let zoom = 0; zoom <= 15; zoom++) {
                const result = CoordinateConverter.toTileCoordinates(coords, zoom);
                expect(result.z).toBe(zoom);
                expect(result.x).toBeGreaterThanOrEqual(0);
                expect(result.y).toBeGreaterThanOrEqual(0);
            }
        });

        it('should throw error for invalid latitude (too high)', () => {
            const coords: Coordinates = { latitude: 85.0512, longitude: 0 };
            const zoomLevel = 12;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid latitude: 85.0512. Must be between -85.0511 and 85.0511'
            );
        });

        it('should throw error for invalid latitude (too low)', () => {
            const coords: Coordinates = { latitude: -85.0512, longitude: 0 };
            const zoomLevel = 12;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid latitude: -85.0512. Must be between -85.0511 and 85.0511'
            );
        });

        it('should throw error for invalid longitude (too high)', () => {
            const coords: Coordinates = { latitude: 0, longitude: 180.0001 };
            const zoomLevel = 12;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid longitude: 180.0001. Must be between -180 and 180'
            );
        });

        it('should throw error for invalid longitude (too low)', () => {
            const coords: Coordinates = { latitude: 0, longitude: -180.0001 };
            const zoomLevel = 12;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid longitude: -180.0001. Must be between -180 and 180'
            );
        });

        it('should throw error for invalid zoom level (too high)', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 16;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid zoom level: 16. Must be between 0 and 15'
            );
        });

        it('should throw error for invalid zoom level (negative)', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = -1;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid zoom level: -1. Must be between 0 and 15'
            );
        });

        it('should throw error for non-integer zoom level', () => {
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const zoomLevel = 12.5;

            expect(() => CoordinateConverter.toTileCoordinates(coords, zoomLevel)).toThrow(
                'Invalid zoom level: 12.5. Must be between 0 and 15'
            );
        });
    });

    describe('getTilePixelPosition method', () => {
        it('should calculate pixel position within tile', () => {
            const coords: Coordinates = { latitude: 40.7128, longitude: -74.006 };
            const tileCoords: TileCoordinates = { x: 1206, y: 1539, z: 12 };

            const result = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThan(256);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThan(256);
        });

        it('should handle coordinates at tile boundaries', () => {
            // Coordinates that should be at the edge of a tile
            const coords: Coordinates = { latitude: 0, longitude: 0 };
            const tileCoords: TileCoordinates = { x: 1, y: 1, z: 1 };

            const result = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThan(256);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThan(256);
        });

        it('should clamp pixel positions to valid range', () => {
            // Test with coordinates that might produce out-of-bounds pixels
            const coords: Coordinates = { latitude: 85.0511, longitude: 180 };
            const tileCoords: TileCoordinates = { x: 0, y: 0, z: 1 };

            const result = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(255);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThanOrEqual(255);
        });

        it('should handle different zoom levels consistently', () => {
            const coords: Coordinates = { latitude: 40.7128, longitude: -74.006 };

            for (let zoom = 1; zoom <= 15; zoom++) {
                const tileCoords = CoordinateConverter.toTileCoordinates(coords, zoom);
                const pixelPos = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

                expect(pixelPos.x).toBeGreaterThanOrEqual(0);
                expect(pixelPos.x).toBeLessThanOrEqual(255);
                expect(pixelPos.y).toBeGreaterThanOrEqual(0);
                expect(pixelPos.y).toBeLessThanOrEqual(255);
            }
        });

        it('should return consistent results for the same inputs', () => {
            const coords: Coordinates = { latitude: 51.5074, longitude: -0.1278 }; // London
            const tileCoords: TileCoordinates = { x: 2047, y: 1360, z: 12 };

            const result1 = CoordinateConverter.getTilePixelPosition(coords, tileCoords);
            const result2 = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

            expect(result1).toEqual(result2);
        });
    });

    describe('fromTileCoordinates method', () => {
        it('should convert tile coordinates back to WGS84 coordinates', () => {
            const tileCoords: TileCoordinates = { x: 1205, y: 1540, z: 12 };

            const result = CoordinateConverter.fromTileCoordinates(tileCoords);

            expect(result.latitude).toBeCloseTo(40.714, 2);
            expect(result.longitude).toBeCloseTo(-74.092, 2);
        });

        it('should handle tile coordinates at zoom level 0', () => {
            const tileCoords: TileCoordinates = { x: 0, y: 0, z: 0 };

            const result = CoordinateConverter.fromTileCoordinates(tileCoords);

            expect(result.latitude).toBeCloseTo(85.0511, 4);
            expect(result.longitude).toBe(-180);
        });

        it('should handle tile coordinates at different zoom levels', () => {
            for (let zoom = 0; zoom <= 15; zoom++) {
                const tileCoords: TileCoordinates = { x: 0, y: 0, z: zoom };
                const result = CoordinateConverter.fromTileCoordinates(tileCoords);

                expect(result.latitude).toBeGreaterThan(-90);
                expect(result.latitude).toBeLessThan(90);
                expect(result.longitude).toBeGreaterThanOrEqual(-180);
                expect(result.longitude).toBeLessThanOrEqual(180);
            }
        });

        it('should be inverse operation of toTileCoordinates (approximately)', () => {
            const originalCoords: Coordinates = { latitude: 40.7128, longitude: -74.006 };
            const zoomLevel = 12;

            const tileCoords = CoordinateConverter.toTileCoordinates(originalCoords, zoomLevel);
            const convertedBack = CoordinateConverter.fromTileCoordinates(tileCoords);

            // Should be close due to tile discretization
            expect(convertedBack.latitude).toBeCloseTo(originalCoords.latitude, 0);
            expect(convertedBack.longitude).toBeCloseTo(originalCoords.longitude, 0);
        });

        it('should handle edge tile coordinates', () => {
            const tileCoords: TileCoordinates = {
                x: Math.pow(2, 10) - 1,
                y: Math.pow(2, 10) - 1,
                z: 10,
            };

            const result = CoordinateConverter.fromTileCoordinates(tileCoords);

            expect(result.latitude).toBeGreaterThan(-90);
            expect(result.latitude).toBeLessThan(90);
            expect(result.longitude).toBeGreaterThanOrEqual(-180);
            expect(result.longitude).toBeLessThanOrEqual(180);
        });
    });

    describe('getTileKey method', () => {
        it('should generate correct tile key format', () => {
            const tileCoords: TileCoordinates = { x: 1206, y: 1539, z: 12 };

            const result = CoordinateConverter.getTileKey(tileCoords);

            expect(result).toBe('12/1206/1539');
        });

        it('should handle tile coordinates at zoom level 0', () => {
            const tileCoords: TileCoordinates = { x: 0, y: 0, z: 0 };

            const result = CoordinateConverter.getTileKey(tileCoords);

            expect(result).toBe('0/0/0');
        });

        it('should handle large tile coordinates', () => {
            const tileCoords: TileCoordinates = { x: 65535, y: 65535, z: 15 };

            const result = CoordinateConverter.getTileKey(tileCoords);

            expect(result).toBe('15/65535/65535');
        });

        it('should create unique keys for different coordinates', () => {
            const tileCoords1: TileCoordinates = { x: 1, y: 2, z: 3 };
            const tileCoords2: TileCoordinates = { x: 2, y: 1, z: 3 };
            const tileCoords3: TileCoordinates = { x: 1, y: 2, z: 4 };

            const key1 = CoordinateConverter.getTileKey(tileCoords1);
            const key2 = CoordinateConverter.getTileKey(tileCoords2);
            const key3 = CoordinateConverter.getTileKey(tileCoords3);

            expect(key1).not.toBe(key2);
            expect(key1).not.toBe(key3);
            expect(key2).not.toBe(key3);
        });

        it('should be consistent for the same coordinates', () => {
            const tileCoords: TileCoordinates = { x: 123, y: 456, z: 10 };

            const key1 = CoordinateConverter.getTileKey(tileCoords);
            const key2 = CoordinateConverter.getTileKey(tileCoords);

            expect(key1).toBe(key2);
        });
    });

    describe('getTileUrl method', () => {
        it('should generate URL with default template', () => {
            const tileCoords: TileCoordinates = { x: 1206, y: 1539, z: 12 };

            const result = CoordinateConverter.getTileUrl(tileCoords);

            expect(result).toBe(
                'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/1206/1539.png'
            );
        });

        it('should generate URL with custom template', () => {
            const tileCoords: TileCoordinates = { x: 123, y: 456, z: 10 };
            const customTemplate = 'https://example.com/tiles/{z}/{x}/{y}.jpg';

            const result = CoordinateConverter.getTileUrl(tileCoords, customTemplate);

            expect(result).toBe('https://example.com/tiles/10/123/456.jpg');
        });

        it('should handle template with multiple placeholders in different order', () => {
            const tileCoords: TileCoordinates = { x: 1, y: 2, z: 3 };
            const customTemplate = 'https://tiles.example.com/{x}/{y}/{z}/tile.png';

            const result = CoordinateConverter.getTileUrl(tileCoords, customTemplate);

            expect(result).toBe('https://tiles.example.com/1/2/3/tile.png');
        });

        it('should handle template with repeated placeholders', () => {
            const tileCoords: TileCoordinates = { x: 5, y: 10, z: 8 };
            const customTemplate = 'https://example.com/{z}/{x}/{y}/{z}_{x}_{y}.png';

            const result = CoordinateConverter.getTileUrl(tileCoords, customTemplate);

            // The implementation replaces the first occurrence of each placeholder
            expect(result).toBe('https://example.com/8/5/10/{z}_{x}_{y}.png');
        });

        it('should handle template with no placeholders', () => {
            const tileCoords: TileCoordinates = { x: 1, y: 2, z: 3 };
            const customTemplate = 'https://example.com/static/tile.png';

            const result = CoordinateConverter.getTileUrl(tileCoords, customTemplate);

            expect(result).toBe('https://example.com/static/tile.png');
        });

        it('should handle coordinates at zoom level 0', () => {
            const tileCoords: TileCoordinates = { x: 0, y: 0, z: 0 };

            const result = CoordinateConverter.getTileUrl(tileCoords);

            expect(result).toBe(
                'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/0/0/0.png'
            );
        });

        it('should handle large coordinate values', () => {
            const tileCoords: TileCoordinates = { x: 32767, y: 32767, z: 15 };

            const result = CoordinateConverter.getTileUrl(tileCoords);

            expect(result).toBe(
                'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/15/32767/32767.png'
            );
        });
    });

    describe('edge cases and boundary conditions', () => {
        it('should handle coordinates very close to latitude boundaries', () => {
            const coords1: Coordinates = { latitude: 85.0510999, longitude: 0 };
            const coords2: Coordinates = { latitude: -85.0510999, longitude: 0 };

            expect(() => CoordinateConverter.toTileCoordinates(coords1, 12)).not.toThrow();
            expect(() => CoordinateConverter.toTileCoordinates(coords2, 12)).not.toThrow();
        });

        it('should handle coordinates very close to longitude boundaries', () => {
            const coords1: Coordinates = { latitude: 0, longitude: 179.9999 };
            const coords2: Coordinates = { latitude: 0, longitude: -179.9999 };

            expect(() => CoordinateConverter.toTileCoordinates(coords1, 12)).not.toThrow();
            expect(() => CoordinateConverter.toTileCoordinates(coords2, 12)).not.toThrow();
        });

        it('should handle very small coordinate values', () => {
            const coords: Coordinates = { latitude: 0.0001, longitude: 0.0001 };

            const result = CoordinateConverter.toTileCoordinates(coords, 15);

            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.z).toBe(15);
        });

        it('should handle negative zero coordinates', () => {
            const coords: Coordinates = { latitude: -0, longitude: -0 };

            const result = CoordinateConverter.toTileCoordinates(coords, 10);

            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.z).toBe(10);
        });

        it('should validate that pixel positions are always in bounds', () => {
            // Test with many random valid coordinates
            for (let i = 0; i < 100; i++) {
                const lat = (Math.random() - 0.5) * 170; // -85 to 85
                const lon = (Math.random() - 0.5) * 360; // -180 to 180
                const zoom = Math.floor(Math.random() * 16); // 0 to 15

                if (lat >= -85.0511 && lat <= 85.0511) {
                    const coords: Coordinates = { latitude: lat, longitude: lon };
                    const tileCoords = CoordinateConverter.toTileCoordinates(coords, zoom);
                    const pixelPos = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

                    expect(pixelPos.x).toBeGreaterThanOrEqual(0);
                    expect(pixelPos.x).toBeLessThanOrEqual(255);
                    expect(pixelPos.y).toBeGreaterThanOrEqual(0);
                    expect(pixelPos.y).toBeLessThanOrEqual(255);
                }
            }
        });

        it('should maintain consistency across coordinate conversions', () => {
            const testCases = [
                { lat: 0, lon: 0 },
                { lat: 40.7128, lon: -74.006 }, // New York
                { lat: 51.5074, lon: -0.1278 }, // London
                { lat: 35.6762, lon: 139.6503 }, // Tokyo
                { lat: -33.8688, lon: 151.2093 }, // Sydney
            ];

            testCases.forEach(({ lat, lon }) => {
                const coords: Coordinates = { latitude: lat, longitude: lon };

                for (let zoom = 8; zoom <= 15; zoom++) {
                    // Skip very low zoom levels that have high discretization
                    const tileCoords = CoordinateConverter.toTileCoordinates(coords, zoom);
                    const backToCoords = CoordinateConverter.fromTileCoordinates(tileCoords);
                    const tileKey = CoordinateConverter.getTileKey(tileCoords);
                    const tileUrl = CoordinateConverter.getTileUrl(tileCoords);
                    const pixelPos = CoordinateConverter.getTilePixelPosition(coords, tileCoords);

                    // Validate tile coordinates
                    expect(tileCoords.z).toBe(zoom);
                    expect(tileCoords.x).toBeGreaterThanOrEqual(0);
                    expect(tileCoords.y).toBeGreaterThanOrEqual(0);

                    // Validate reverse conversion is approximately correct
                    const latDiff = Math.abs(backToCoords.latitude - lat);
                    const lonDiff = Math.abs(backToCoords.longitude - lon);

                    // Use zoom-based tolerance accounting for tile discretization
                    // At each zoom level, longitude range is 360 / 2^zoom degrees per tile
                    const degreesPerTile = 360 / Math.pow(2, zoom);
                    // Allow up to one tile width of error since fromTileCoordinates returns tile center
                    const tolerance = Math.max(0.01, degreesPerTile);
                    expect(latDiff).toBeLessThan(tolerance);
                    expect(lonDiff).toBeLessThan(tolerance);

                    // Validate tile key format
                    expect(tileKey).toMatch(/^\d+\/\d+\/\d+$/);

                    // Validate tile URL contains coordinates
                    expect(tileUrl).toContain(zoom.toString());
                    expect(tileUrl).toContain(tileCoords.x.toString());
                    expect(tileUrl).toContain(tileCoords.y.toString());

                    // Validate pixel position bounds
                    expect(pixelPos.x).toBeGreaterThanOrEqual(0);
                    expect(pixelPos.x).toBeLessThanOrEqual(255);
                    expect(pixelPos.y).toBeGreaterThanOrEqual(0);
                    expect(pixelPos.y).toBeLessThanOrEqual(255);
                }
            });
        });
    });
});
