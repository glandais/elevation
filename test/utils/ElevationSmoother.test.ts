import { CoordinatesElevation } from '../../src/types';
import { Distance } from '../../src/utils/Distance';
import { ElevationSmoother } from '../../src/utils/ElevationSmoother';

describe('ElevationSmoother', () => {
    describe('smooth', () => {
        it('should return original data for less than 3 points', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.001, longitude: 0.0, elevation: 150 },
            ];

            const result = ElevationSmoother.smooth(points);
            expect(result).toEqual(points);
        });

        it('should throw error for invalid window size', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.001, longitude: 0.0, elevation: 150 },
                { latitude: 45.002, longitude: 0.0, elevation: 200 },
            ];

            expect(() => ElevationSmoother.smooth(points, 0)).toThrow(
                'Invalid window size: 0. Must be positive'
            );

            expect(() => ElevationSmoother.smooth(points, -50)).toThrow(
                'Invalid window size: -50. Must be positive'
            );
        });

        it('should smooth elevation data with default window size', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.0001, longitude: 0.0, elevation: 200 }, // ~11m apart
                { latitude: 45.0002, longitude: 0.0, elevation: 120 }, // ~11m apart
                { latitude: 45.0003, longitude: 0.0, elevation: 180 }, // ~11m apart
                { latitude: 45.0004, longitude: 0.0, elevation: 150 }, // ~11m apart
            ];

            const result = ElevationSmoother.smooth(points, 50);

            // All points should be smoothed
            expect(result.length).toBe(points.length);

            // Middle points should be more smoothed
            expect(result[2].elevation).not.toBe(120); // Middle point should be smoothed

            // Smoothed values should be weighted averages
            expect(result[1].elevation).toBeGreaterThan(100);
            expect(result[1].elevation).toBeLessThan(200);

            // All points within window are averaged with weights
            expect(result[0].elevation).toBeGreaterThan(100);
            expect(result[4].elevation).toBeLessThan(180);
        });

        it('should apply different smoothing with different window sizes', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.0001, longitude: 0.0, elevation: 300 }, // Spike
                { latitude: 45.0002, longitude: 0.0, elevation: 100 },
                { latitude: 45.0003, longitude: 0.0, elevation: 100 },
                { latitude: 45.0004, longitude: 0.0, elevation: 100 },
            ];

            const smallWindow = ElevationSmoother.smooth(points, 15);
            const largeWindow = ElevationSmoother.smooth(points, 100);

            // Larger window should smooth more aggressively
            expect(largeWindow[1].elevation).toBeLessThan(smallWindow[1].elevation);

            // Both should reduce the spike
            expect(smallWindow[1].elevation).toBeLessThan(300);
            expect(largeWindow[1].elevation).toBeLessThan(300);
        });

        it('should preserve elevation at edges with appropriate weights', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 500 }, // High start
                { latitude: 45.0001, longitude: 0.0, elevation: 100 },
                { latitude: 45.0002, longitude: 0.0, elevation: 100 },
                { latitude: 45.0003, longitude: 0.0, elevation: 100 },
                { latitude: 45.0004, longitude: 0.0, elevation: 600 }, // High end
            ];

            const result = ElevationSmoother.smooth(points, 30);

            // With a 30m window and ~11m spacing, each point is influenced by its neighbors
            // Edge points are influenced by fewer neighbors
            expect(result[0].elevation).toBeGreaterThan(200); // Influenced by 100s nearby
            expect(result[0].elevation).toBeLessThan(500); // Smoothed down

            expect(result[4].elevation).toBeGreaterThan(200); // Influenced by 100s nearby
            expect(result[4].elevation).toBeLessThan(600); // Smoothed down

            // Middle points should be smoothed
            expect(result[2].elevation).toBeGreaterThan(100);
            expect(result[2].elevation).toBeLessThan(400);
        });

        it('should handle points far apart correctly', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.01, longitude: 0.0, elevation: 200 }, // ~1110m apart
                { latitude: 45.02, longitude: 0.0, elevation: 150 }, // ~1110m apart
            ];

            const result = ElevationSmoother.smooth(points, 50);

            // Points are too far apart for smoothing with 50m window
            expect(result[0].elevation).toBe(100);
            expect(result[1].elevation).toBe(200);
            expect(result[2].elevation).toBe(150);
        });

        it('should handle dense points correctly', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.00001, longitude: 0.0, elevation: 200 }, // ~1.1m apart
                { latitude: 45.00002, longitude: 0.0, elevation: 150 }, // ~1.1m apart
                { latitude: 45.00003, longitude: 0.0, elevation: 250 }, // ~1.1m apart
                { latitude: 45.00004, longitude: 0.0, elevation: 120 }, // ~1.1m apart
            ];

            const result = ElevationSmoother.smooth(points, 10);

            // All points within window should influence each other
            expect(result[2].elevation).not.toBe(150);
            expect(result[2].elevation).toBeGreaterThan(150); // Influenced by neighboring higher values
        });

        it('should apply triangular kernel weighting correctly', () => {
            // Create points with known distances for precise testing
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 0 },
                { latitude: 45.0001, longitude: 0.0, elevation: 100 }, // ~11.1m apart
                { latitude: 45.0002, longitude: 0.0, elevation: 0 },
            ];

            const result = ElevationSmoother.smooth(points, 25);

            // Middle point should be weighted average
            // With triangular kernel, all points within 25m window influence each other
            expect(result[1].elevation).toBeLessThan(100); // Influenced by zeros
            expect(result[1].elevation).toBeGreaterThan(0); // Not completely zero

            // Edges should also be influenced
            expect(result[0].elevation).toBeGreaterThan(0); // Influenced by middle 100
            expect(result[2].elevation).toBeGreaterThan(0); // Influenced by middle 100
        });

        it('should handle edge case where no points are within window', () => {
            // Create points that are very far apart to test totalWeight = 0 scenario
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 46.0, longitude: 0.0, elevation: 200 }, // ~110km apart
                { latitude: 47.0, longitude: 0.0, elevation: 300 }, // ~110km apart
            ];

            const result = ElevationSmoother.smooth(points, 10); // Very small 10m window

            // Points are too far apart for smoothing with 10m window
            // Each point should remain unchanged (fallback to original elevation)
            expect(result[0].elevation).toBe(100);
            expect(result[1].elevation).toBe(200);
            expect(result[2].elevation).toBe(300);
        });

        it('should preserve coordinates while smoothing elevations', () => {
            const points: CoordinatesElevation[] = [
                { latitude: 45.123, longitude: -122.456, elevation: 100 },
                { latitude: 45.1231, longitude: -122.456, elevation: 200 }, // Close points
                { latitude: 45.1232, longitude: -122.456, elevation: 150 },
            ];

            const result = ElevationSmoother.smooth(points, 50);

            // Coordinates should remain unchanged
            expect(result[0].latitude).toBe(45.123);
            expect(result[0].longitude).toBe(-122.456);
            expect(result[1].latitude).toBe(45.1231);
            expect(result[1].longitude).toBe(-122.456);
            expect(result[2].latitude).toBe(45.1232);
            expect(result[2].longitude).toBe(-122.456);

            // Elevations should change due to smoothing
            expect(result[0].elevation).not.toBe(100);
            expect(result[1].elevation).not.toBe(200);
            expect(result[2].elevation).not.toBe(150);
        });

        it('should smooth realistic elevation profile', () => {
            // Simulate a hill profile with noise
            const points: CoordinatesElevation[] = [
                { latitude: 45.0, longitude: 0.0, elevation: 100 },
                { latitude: 45.0001, longitude: 0.0, elevation: 105 },
                { latitude: 45.0002, longitude: 0.0, elevation: 112 },
                { latitude: 45.0003, longitude: 0.0, elevation: 108 }, // Noise
                { latitude: 45.0004, longitude: 0.0, elevation: 120 },
                { latitude: 45.0005, longitude: 0.0, elevation: 125 },
                { latitude: 45.0006, longitude: 0.0, elevation: 130 },
                { latitude: 45.0007, longitude: 0.0, elevation: 128 }, // Noise
                { latitude: 45.0008, longitude: 0.0, elevation: 125 },
                { latitude: 45.0009, longitude: 0.0, elevation: 120 },
                { latitude: 45.001, longitude: 0.0, elevation: 115 },
            ];

            const result = ElevationSmoother.smooth(points, 40);

            // Check that noise is reduced
            expect(result[3].elevation).toBeGreaterThan(108); // Smoothed up from dip
            expect(result[7].elevation).toBeLessThan(130); // Smoothed from peak

            // Overall trend should be preserved
            const maxOriginal = Math.max(...points.map(p => p.elevation));
            const maxSmoothed = Math.max(...result.map(p => p.elevation));
            expect(maxSmoothed).toBeLessThanOrEqual(maxOriginal);

            // Smoothed profile should have less variation
            const variations = [];
            for (let i = 1; i < result.length; i++) {
                variations.push(Math.abs(result[i].elevation - result[i - 1].elevation));
            }
            const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
            expect(avgVariation).toBeLessThan(10);
        });
    });

    describe('smoothProfile', () => {
        // Per-point window search, as `smooth` computed it before the two-cursor sweep
        const reference = (d: number[], e: number[], w: number): number[] =>
            e.map((_, i) => {
                let tw = 0;
                let ws = 0;
                for (let j = 0; j < e.length; j++) {
                    const dist = Math.abs(d[j] - d[i]);
                    if (dist <= w) {
                        const weight = 1 - dist / w;
                        tw += weight;
                        ws += e[j] * weight;
                    }
                }
                return ws / tw;
            });

        it('should match the per-point reference on irregular spacing', () => {
            const distances: number[] = [0];
            const elevations: number[] = [100];
            let seed = 42;
            const rand = (): number => {
                seed = (seed * 16807) % 2147483647;
                return seed / 2147483647;
            };
            for (let i = 1; i < 300; i++) {
                distances.push(distances[i - 1] + (i % 17 === 0 ? 0 : rand() * 40));
                elevations.push(elevations[i - 1] + (rand() - 0.5) * 10);
            }

            for (const w of [5, 30, 150]) {
                const result = ElevationSmoother.smoothProfile(distances, elevations, w);
                const expected = reference(distances, elevations, w);
                result.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
            }
        });

        it('should agree with smooth on the same points', () => {
            const points: CoordinatesElevation[] = [0, 1, 2, 3, 4, 5].map(i => ({
                latitude: 45 + i * 0.0001,
                longitude: 0,
                elevation: [100, 200, 120, 180, 150, 90][i],
            }));
            const distances = Distance.cumulativeDistances(points);

            const viaPoints = ElevationSmoother.smooth(points, 25).map(p => p.elevation);
            const viaArrays = ElevationSmoother.smoothProfile(
                distances,
                points.map(p => p.elevation),
                25
            );
            expect(viaArrays).toEqual(viaPoints);
        });

        it('should return an unsmoothed copy when window is not strictly positive', () => {
            const distances = [0, 10, 20, 30];
            const elevations = [100, 200, 100, 200];

            for (const w of [0, -10, Number.NaN]) {
                const result = ElevationSmoother.smoothProfile(distances, elevations, w);
                expect(result).toEqual(elevations);
                expect(result).not.toBe(elevations);
            }
        });

        it('should return a copy for fewer than 3 points', () => {
            const elevations = [100, 200];
            const result = ElevationSmoother.smoothProfile([0, 10], elevations, 50);
            expect(result).toEqual(elevations);
            expect(result).not.toBe(elevations);
            expect(ElevationSmoother.smoothProfile([], [], 50)).toEqual([]);
        });

        it('should accept typed arrays and not mutate its inputs', () => {
            const distances = Float64Array.from([0, 10, 20, 30, 40]);
            const elevations = Float64Array.from([100, 110, 90, 120, 100]);

            const result = ElevationSmoother.smoothProfile(distances, elevations, 15);
            expect(Array.isArray(result)).toBe(true);
            expect(Array.from(elevations)).toEqual([100, 110, 90, 120, 100]);
            // Middle point: neighbours at 10 m weigh 1/3 each
            expect(result[2]).toBeCloseTo((90 + (110 + 120) / 3) / (1 + 2 / 3), 9);
        });

        it('should throw when arrays differ in length', () => {
            expect(() => ElevationSmoother.smoothProfile([0, 10, 20], [1, 2], 10)).toThrow(
                'distances (3) and elevations (2) must have the same length'
            );
        });
    });
});
