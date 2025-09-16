import { test, expect } from '@playwright/test';
import { ElevationProvider } from 'src';

test.describe('ElevationProvider Browser Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the test page before each test
        await page.goto('/test/browser/html/test.html');
    });

    test('should handle ElevationProvider instantiation correctly', async ({ page }) => {
        // Check that the library is available globally
        const hasElevationLibrary = await page.evaluate(() => {
            return (
                typeof window.Elevation !== 'undefined' &&
                typeof window.Elevation.ElevationProvider === 'function'
            );
        });

        expect(hasElevationLibrary).toBe(true);

        // Test that we can create an instance
        const canCreateInstance = await page.evaluate(() => {
            try {
                const provider = new window.Elevation.ElevationProvider();
                return provider !== null && typeof provider.getElevation === 'function';
            } catch {
                return false;
            }
        });

        expect(canCreateInstance).toBe(true);
    });

    test('should verify browser environment compatibility', async ({ page }) => {
        // Check for required browser APIs
        const browserCompatibility = await page.evaluate(() => {
            return {
                hasImageData: typeof ImageData !== 'undefined',
                hasCanvas: typeof HTMLCanvasElement !== 'undefined',
                hasFetch: typeof fetch !== 'undefined',
                hasCreateImageBitmap: typeof createImageBitmap !== 'undefined',
            };
        });

        expect(browserCompatibility.hasImageData).toBe(true);
        expect(browserCompatibility.hasCanvas).toBe(true);
        expect(browserCompatibility.hasFetch).toBe(true);
        expect(browserCompatibility.hasCreateImageBitmap).toBe(true);

        console.log('Browser compatibility verified:', browserCompatibility);
    });

    test('should getElevation/getInterpolatedElevation', async ({ page }) => {
        const readmeExampleResult = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();
                const elevation = await elevationProvider.getElevation(47.2, -1.5);
                const interpolatedElevation = await elevationProvider.getInterpolatedElevation(
                    47.2,
                    -1.5
                );
                return {
                    success: true,
                    elevation,
                    interpolatedElevation,
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(readmeExampleResult.success).toBe(true);
        expect(typeof readmeExampleResult.elevation).toBe('number');
        expect(typeof readmeExampleResult.interpolatedElevation).toBe('number');

        console.log(
            'getElevation/getInterpolatedElevation executed successfully:',
            readmeExampleResult
        );
    });

    test('should getInterpolatedElevations', async ({ page }) => {
        const readmeExampleResult = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();

                // Create array with 150 coordinates targeting >50 tiles
                // At zoom 12, each tile covers ~0.0879° longitude
                // Mix widely distributed coordinates with some clusters
                const array = [];

                // 1. Wide distribution across different continents (80 points across ~60 tiles)
                const regions = [
                    { lat: 47.0, lng: -1.0, name: 'France' },
                    { lat: 40.7, lng: -74.0, name: 'New York' },
                    { lat: 51.5, lng: -0.1, name: 'London' },
                    { lat: 35.7, lng: 139.7, name: 'Tokyo' },
                    { lat: -33.9, lng: 151.2, name: 'Sydney' },
                    { lat: 37.8, lng: -122.4, name: 'San Francisco' },
                    { lat: 55.8, lng: 37.6, name: 'Moscow' },
                    { lat: 19.4, lng: -99.1, name: 'Mexico City' },
                    { lat: -23.5, lng: -46.6, name: 'São Paulo' },
                    { lat: 28.6, lng: 77.2, name: 'Delhi' },
                ];

                // Add main points and nearby variations
                for (const region of regions) {
                    // Main point
                    array.push({ latitude: region.lat, longitude: region.lng });

                    // Add 7 nearby points (within same or adjacent tiles)
                    for (let i = 0; i < 7; i++) {
                        array.push({
                            latitude: region.lat + (Math.random() - 0.5) * 0.02, // ±0.01°
                            longitude: region.lng + (Math.random() - 0.5) * 0.02,
                        });
                    }
                }

                // 2. Grid pattern to ensure tile coverage (70 points across different tiles)
                const startLat = 45.0;
                const startLng = 0.0;
                const tileSpacing = 0.1; // ~1.14 tiles apart at zoom 12

                for (let i = 0; i < 7; i++) {
                    for (let j = 0; j < 10; j++) {
                        array.push({
                            latitude: startLat + i * tileSpacing,
                            longitude: startLng + j * tileSpacing,
                        });
                    }
                }

                console.log(`Created array with ${array.length} coordinates`);

                const elevations =
                    await elevationProvider.getInterpolatedElevationsFromArray(array);
                return {
                    success: true,
                    elevations,
                    coordinateCount: array.length,
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(readmeExampleResult.success).toBe(true);
        expect(readmeExampleResult.elevations).toBeDefined();
        expect(Array.isArray(readmeExampleResult.elevations)).toBe(true);
        expect(readmeExampleResult.elevations?.length).toBe(150);
        expect(readmeExampleResult.coordinateCount).toBe(150);

        console.log(
            'getInterpolatedElevations executed successfully:',
            `${readmeExampleResult.coordinateCount} coordinates processed, got ${readmeExampleResult.elevations?.length} elevations`
        );
    });
});
