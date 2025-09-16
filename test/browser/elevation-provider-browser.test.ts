import { test, expect } from '@playwright/test';
import { ElevationProvider } from 'src';
import type { DouglasPeucker } from 'src/utils/DouglasPeucker';
import type { EcefConverter } from 'src/utils/EcefConverter';
import type { Vector3D } from 'src/utils/Vector3D';
import type { ElevationSmoother } from 'src/utils/ElevationSmoother';

// Extend Window interface for browser tests
declare global {
    interface Window {
        Elevation: {
            ElevationProvider: typeof ElevationProvider;
            DouglasPeucker: typeof DouglasPeucker;
            EcefConverter: typeof EcefConverter;
            Vector3D: typeof Vector3D;
            ElevationSmoother: typeof ElevationSmoother;
        };
    }
}

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

    test('should getElevation with and without interpolation', async ({ page }) => {
        const readmeExampleResult = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();
                const elevation = await elevationProvider.getElevation(47.2, -1.5, {
                    interpolation: false,
                });
                const interpolatedElevation = await elevationProvider.getElevation(47.2, -1.5, {
                    interpolation: true,
                });
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
            'getElevation with and without interpolation executed successfully:',
            readmeExampleResult
        );
    });

    test('should getElevationsFromArray with interpolation', async ({ page }) => {
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

                const elevations = await elevationProvider.getElevationsFrom(array, {
                    interpolation: true,
                });
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
            'getElevationsFromArray with interpolation executed successfully:',
            `${readmeExampleResult.coordinateCount} coordinates processed, got ${readmeExampleResult.elevations?.length} elevations`
        );
    });

    test('should getElevationsAlong a multi-point path', async ({ page }) => {
        const result = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();

                // Create a path through France
                const path = [
                    { latitude: 47.0, longitude: -1.0 }, // Western France
                    { latitude: 47.005, longitude: -0.995 }, // ~700m northeast
                    { latitude: 47.01, longitude: -0.99 }, // ~700m northeast
                    { latitude: 47.015, longitude: -0.985 }, // ~700m northeast
                ];

                const elevations = await elevationProvider.getElevationsAlong(
                    path,
                    { step: 50, interpolation: true } // 50m step with interpolation
                );

                return {
                    success: true,
                    elevations,
                    count: elevations.length,
                    pathLength: path.length,
                    firstPoint: elevations[0],
                    lastPoint: elevations[elevations.length - 1],
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(result.success).toBe(true);
        expect(result.elevations).toBeDefined();
        expect(Array.isArray(result.elevations)).toBe(true);
        expect(result.count).toBeGreaterThan(result.pathLength!); // Should have interpolated points

        // Check that each point has latitude, longitude, and elevation
        expect(result.firstPoint).toBeDefined();
        expect(result.firstPoint).toHaveProperty('latitude');
        expect(result.firstPoint).toHaveProperty('longitude');
        expect(result.firstPoint).toHaveProperty('elevation');
        expect(typeof result.firstPoint!.elevation).toBe('number');

        expect(result.lastPoint).toBeDefined();
        expect(result.lastPoint).toHaveProperty('latitude');
        expect(result.lastPoint).toHaveProperty('longitude');
        expect(result.lastPoint).toHaveProperty('elevation');
        expect(typeof result.lastPoint!.elevation).toBe('number');

        console.log(
            'getElevationsAlong executed successfully:',
            `${result.count} points generated along ${result.pathLength}-point path`
        );
    });

    test('should apply Douglas-Peucker filtering to elevation profile', async ({ page }) => {
        const result = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();

                // Create a mountainous path with varying elevations
                const mountainPath = [
                    { latitude: 46.0207, longitude: 7.7491 }, // Zermatt area
                    { latitude: 46.025, longitude: 7.752 },
                    { latitude: 46.03, longitude: 7.755 },
                    { latitude: 46.035, longitude: 7.758 },
                    { latitude: 46.04, longitude: 7.761 },
                ];

                // Get elevations without filtering
                const unfiltered = await elevationProvider.getElevationsAlong(
                    mountainPath,
                    { step: 25, interpolation: true } // 25m steps
                );

                // Get elevations with light filtering
                const lightFiltered = await elevationProvider.getElevationsAlong(mountainPath, {
                    step: 25,
                    interpolation: true,
                    filterOptions: { enabled: true, tolerance: 5, zExaggeration: 3 },
                });

                // Get elevations with aggressive filtering
                const aggressiveFiltered = await elevationProvider.getElevationsAlong(
                    mountainPath,
                    {
                        step: 25,
                        interpolation: true,
                        filterOptions: { enabled: true, tolerance: 25, zExaggeration: 3 },
                    }
                );

                return {
                    success: true,
                    unfilteredCount: unfiltered.length,
                    lightFilteredCount: lightFiltered.length,
                    aggressiveFilteredCount: aggressiveFiltered.length,
                    unfilteredSample: unfiltered.slice(0, 3),
                    filteredSample: aggressiveFiltered.slice(0, 3),
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(result.success).toBe(true);
        expect(result.unfilteredCount).toBeGreaterThan(0);
        expect(result.lightFilteredCount).toBeLessThanOrEqual(result.unfilteredCount!);
        expect(result.aggressiveFilteredCount).toBeLessThanOrEqual(result.lightFilteredCount!);

        // Check that filtered results still contain valid elevation data
        expect(result.filteredSample).toBeDefined();
        expect(Array.isArray(result.filteredSample)).toBe(true);
        if (result.filteredSample && result.filteredSample.length > 0) {
            expect(result.filteredSample[0]).toHaveProperty('latitude');
            expect(result.filteredSample[0]).toHaveProperty('longitude');
            expect(result.filteredSample[0]).toHaveProperty('elevation');
            expect(typeof result.filteredSample[0].elevation).toBe('number');
        }

        console.log('Douglas-Peucker filtering executed successfully:', {
            unfiltered: result.unfilteredCount,
            lightFiltered: result.lightFilteredCount,
            aggressive: result.aggressiveFilteredCount,
        });
    });

    test('should apply elevation smoothing along a path', async ({ page }) => {
        const result = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();

                // Create a noisy path
                const noisyPath = [
                    { latitude: 47.0, longitude: -1.0 },
                    { latitude: 47.005, longitude: -0.995 },
                    { latitude: 47.01, longitude: -0.99 },
                    { latitude: 47.015, longitude: -0.985 },
                    { latitude: 47.02, longitude: -0.98 },
                ];

                // Get elevations without smoothing
                const unsmoothed = await elevationProvider.getElevationsAlong(noisyPath, {
                    step: 50,
                    interpolation: true,
                    smoothingOptions: { enabled: false },
                });

                // Get elevations with small smoothing window
                const lightSmoothed = await elevationProvider.getElevationsAlong(noisyPath, {
                    step: 50,
                    interpolation: true,
                    smoothingOptions: {
                        enabled: true,
                        windowSize: 30,
                    },
                });

                // Get elevations with large smoothing window
                const heavySmoothed = await elevationProvider.getElevationsAlong(noisyPath, {
                    step: 50,
                    interpolation: true,
                    smoothingOptions: {
                        enabled: true,
                        windowSize: 100,
                    },
                });

                // Calculate variance for each set
                function calculateVariance(values: number[]): number {
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
                    return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
                }

                const unsmoothedVariance = calculateVariance(unsmoothed.map(p => p.elevation));
                const lightVariance = calculateVariance(lightSmoothed.map(p => p.elevation));
                const heavyVariance = calculateVariance(heavySmoothed.map(p => p.elevation));

                return {
                    success: true,
                    pointCount: unsmoothed.length,
                    unsmoothedVariance,
                    lightVariance,
                    heavyVariance,
                    elevationRange: {
                        unsmoothed: {
                            min: Math.min(...unsmoothed.map(p => p.elevation)),
                            max: Math.max(...unsmoothed.map(p => p.elevation)),
                        },
                        heavySmoothed: {
                            min: Math.min(...heavySmoothed.map(p => p.elevation)),
                            max: Math.max(...heavySmoothed.map(p => p.elevation)),
                        },
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(result.success).toBe(true);
        expect(result.pointCount).toBeGreaterThan(0);

        // Heavier smoothing should reduce variance more
        expect(result.lightVariance).toBeLessThanOrEqual(result.unsmoothedVariance!);
        expect(result.heavyVariance).toBeLessThanOrEqual(result.lightVariance!);

        // Smoothing should reduce the elevation range
        const unsmoothedRange =
            result.elevationRange?.unsmoothed?.max! - result.elevationRange?.unsmoothed?.min!;
        const smoothedRange =
            result.elevationRange?.heavySmoothed?.max! - result.elevationRange?.heavySmoothed?.min!;
        expect(smoothedRange).toBeLessThanOrEqual(unsmoothedRange);

        console.log('Elevation smoothing executed successfully:', {
            points: result.pointCount,
            variance: {
                unsmoothed: result.unsmoothedVariance?.toFixed(2),
                light: result.lightVariance?.toFixed(2),
                heavy: result.heavyVariance?.toFixed(2),
            },
            ranges: result.elevationRange,
        });
    });

    test('should combine smoothing and filtering for optimal results', async ({ page }) => {
        const result = await page.evaluate(async () => {
            try {
                const elevationProvider: ElevationProvider =
                    new window.Elevation.ElevationProvider();

                // Create a detailed path
                const detailedPath = [
                    { latitude: 47.0, longitude: -1.0 },
                    { latitude: 47.01, longitude: -0.99 },
                    { latitude: 47.02, longitude: -0.98 },
                    { latitude: 47.03, longitude: -0.97 },
                ];

                // 1. Raw elevation data
                const raw = await elevationProvider.getElevationsAlong(detailedPath, {
                    step: 25,
                    interpolation: true,
                });

                // 2. Smoothed only
                const smoothedOnly = await elevationProvider.getElevationsAlong(detailedPath, {
                    step: 25,
                    interpolation: true,
                    smoothingOptions: {
                        enabled: true,
                        windowSize: 75,
                    },
                });

                // 3. Filtered only
                const filteredOnly = await elevationProvider.getElevationsAlong(detailedPath, {
                    step: 25,
                    interpolation: true,
                    filterOptions: {
                        enabled: true,
                        tolerance: 10,
                    },
                });

                // 4. Smoothed then filtered (optimal)
                const smoothedAndFiltered = await elevationProvider.getElevationsAlong(
                    detailedPath,
                    {
                        step: 25,
                        interpolation: true,
                        smoothingOptions: {
                            enabled: true,
                            windowSize: 75,
                        },
                        filterOptions: {
                            enabled: true,
                            tolerance: 10,
                        },
                    }
                );

                return {
                    success: true,
                    rawCount: raw.length,
                    smoothedOnlyCount: smoothedOnly.length,
                    filteredOnlyCount: filteredOnly.length,
                    combinedCount: smoothedAndFiltered.length,
                    samples: {
                        raw: raw.slice(0, 3),
                        combined: smoothedAndFiltered.slice(0, 3),
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        expect(result.success).toBe(true);
        expect(result.rawCount).toBeGreaterThan(0);
        expect(result.smoothedOnlyCount).toBe(result.rawCount); // Smoothing doesn't reduce points
        expect(result.filteredOnlyCount).toBeLessThanOrEqual(result.rawCount!); // Filtering reduces points
        expect(result.combinedCount).toBeLessThanOrEqual(result.smoothedOnlyCount!); // Final filtering after smoothing

        console.log('Combined smoothing and filtering executed successfully:', {
            raw: result.rawCount,
            smoothedOnly: result.smoothedOnlyCount,
            filteredOnly: result.filteredOnlyCount,
            combined: result.combinedCount,
        });
    });
});
