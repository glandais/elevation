import { CoordinatesElevation, ElevationGainOptions, ElevationGainPreset } from '../../src/types';
import { ELEVATION_GAIN_PRESETS, ElevationGain } from '../../src/utils/ElevationGain';

/** Evenly spaced distances for `elevations` at `spacingM` meters */
const spaced = (elevations: number[], spacingM: number): number[] =>
    elevations.map((_, i) => i * spacingM);

/** Dead band only, no smoothing */
const banded = (thresholdM: number): ElevationGainOptions => ({ thresholdM, smoothWindowM: 0 });

const gainOf = (spacingM: number, thresholdM: number, ...elevations: number[]) =>
    ElevationGain.computeProfile(spaced(elevations, spacingM), elevations, banded(thresholdM));

/** A linear ramp from `from` to `to` over `n` samples */
const ramp = (n: number, from: number, to: number): number[] =>
    Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

describe('ElevationGain', () => {
    describe('turning-point accumulator', () => {
        it('should count a finely sampled smooth climb in full', () => {
            // 0.2 m per sample: a per-delta filter `if (dEle > 3)` would report 0 here
            const e = ramp(2501, 100, 600);
            const r = ElevationGain.computeProfile(spaced(e, 2), e, banded(3));
            expect(r.gainM).toBeCloseTo(500, 9);
            expect(r.lossM).toBeCloseTo(0, 9);
            expect(r.legCount).toBe(1);
        });

        it('should bank a staircase climb as one leg, not one per step', () => {
            const e = [0];
            for (let i = 0; i < 20; i++) {
                e.push(e[e.length - 1] + 1);
                e.push(e[e.length - 1] - 0.5);
            }
            const r = ElevationGain.computeProfile(spaced(e, 10), e, banded(3));
            expect(r.rawGainM).toBeCloseTo(20, 9);
            // 10.5: the high point is the last sub-summit; the final 0.5 m dip never confirms
            expect(r.gainM).toBeCloseTo(10.5, 9);
            expect(r.legCount).toBe(1);
        });

        it('should count a bump of exactly the threshold in full', () => {
            const r = gainOf(10, 3, 0, 3, 0);
            expect(r.gainM).toBeCloseTo(3, 9);
            expect(r.lossM).toBeCloseTo(3, 9);
            expect(r.legCount).toBe(2);
        });

        it('should drop a bump just below the threshold with its matching descent', () => {
            const r = gainOf(10, 3, 0, 2.99, 0);
            expect(r.gainM).toBe(0);
            expect(r.lossM).toBe(0);
            expect(r.rawGainM).toBeCloseTo(2.99, 9);
            expect(r.rawLossM).toBeCloseTo(2.99, 9);
        });

        it('should ignore a sawtooth below the threshold', () => {
            const e = Array.from({ length: 201 }, (_, i) => (i % 2 === 0 ? 100 : 101));
            const r = ElevationGain.computeProfile(spaced(e, 5), e, banded(3));
            expect(r.gainM).toBe(0);
            expect(r.lossM).toBe(0);
            expect(r.rawGainM).toBeCloseTo(100, 9);
        });

        it('should telescope gain minus loss to the net change', () => {
            const e = [100, 180, 120, 260, 200, 240];
            const r = ElevationGain.computeProfile(spaced(e, 500), e, banded(3));
            expect(Math.abs(r.gainM - r.lossM - (e[e.length - 1] - e[0]))).toBeLessThanOrEqual(3);
        });

        it('should net a closed loop to zero', () => {
            const e = [0, 50, 10, 90, 30, 0];
            const r = ElevationGain.computeProfile(spaced(e, 400), e, banded(3));
            expect(r.gainM).toBeCloseTo(130, 9);
            expect(r.lossM).toBeCloseTo(130, 9);
            expect(r.legCount).toBe(4);
        });

        it('should agree on the same terrain at 2 m and at 10 m spacing', () => {
            const build = (spacingM: number) => {
                const up = 5000 / spacingM;
                const down = 3000 / spacingM;
                const e = Array.from({ length: up + down + 1 }, (_, i) =>
                    i <= up ? (300 * i) / up : 300 - (200 * (i - up)) / down
                );
                return ElevationGain.computeProfile(spaced(e, spacingM), e, banded(3));
            };
            const fine = build(2);
            const coarse = build(10);
            expect(Math.abs(fine.gainM - coarse.gainM)).toBeLessThanOrEqual(0.01 * coarse.gainM);
            expect(Math.abs(fine.lossM - coarse.lossM)).toBeLessThanOrEqual(0.01 * coarse.lossM);
        });

        it('should never report more gain with a larger threshold', () => {
            const e = Array.from({ length: 500 }, (_, i) => 100 + 40 * Math.sin(i / 7) + 0.05 * i);
            const d = spaced(e, 20);
            let previous = Number.MAX_VALUE;
            for (const t of [0, 1, 2, 3, 5, 10, 25]) {
                const g = ElevationGain.computeProfile(d, e, banded(t)).gainM;
                expect(g).toBeLessThanOrEqual(previous + 1e-9);
                previous = g;
            }
        });

        it('should report no gain on a descent-only profile', () => {
            const e = ramp(501, 1000, 200);
            const r = ElevationGain.computeProfile(spaced(e, 10), e, banded(3));
            expect(r.gainM).toBe(0);
            expect(r.lossM).toBeCloseTo(800, 9);
            expect(r.legCount).toBe(1);
        });

        it('should not book an opening dip as a climb', () => {
            const r = gainOf(100, 3, 100, 80, 90);
            expect(r.lossM).toBeCloseTo(20, 9);
            expect(r.gainM).toBeCloseTo(10, 9);
        });

        it('should report positive gain and loss', () => {
            const r = gainOf(100, 3, 500, 400, 450);
            expect(r.gainM).toBeGreaterThanOrEqual(0);
            expect(r.lossM).toBeGreaterThanOrEqual(0);
        });

        it('should report nothing when the profile never moves by the threshold', () => {
            const r = gainOf(10, 3, 100, 101, 100.5);
            expect(r.gainM).toBe(0);
            expect(r.lossM).toBe(0);
            expect(r.legCount).toBe(0);
        });
    });

    describe('smoothing', () => {
        it('should remove noise that no dead band can reach', () => {
            // A 100 m climb over 2 km with a 20 m-wavelength, 4 m-amplitude ripple
            const n = 1001;
            const d = Array.from({ length: n }, (_, i) => i * 2);
            const e = d.map((x, i) => (100 * i) / (n - 1) + 4 * Math.sin((x * 2 * Math.PI) / 20));

            const bandOnly = ElevationGain.computeProfile(d, e, banded(3));
            const smoothed = ElevationGain.computeProfile(d, e, {
                thresholdM: 3,
                smoothWindowM: 30,
            });

            expect(bandOnly.gainM).toBeGreaterThan(500);
            expect(Math.abs(smoothed.gainM - 100)).toBeLessThanOrEqual(5);
            expect(smoothed.smoothWindowM).toBe(30);
        });

        it('should not mutate its inputs', () => {
            const e = [100, 150, 120, 200, 180];
            const copy = [...e];
            ElevationGain.computeProfile(spaced(e, 10), e);
            expect(e).toEqual(copy);
        });
    });

    describe('raw preset', () => {
        it('should reproduce the plain sum of positive and negative deltas', () => {
            const e = [100, 150, 120, 200, 180];
            const r = ElevationGain.computeProfile(spaced(e, 100), e, { preset: 'raw' });
            expect(r.gainM).toBeCloseTo(130, 9);
            expect(r.lossM).toBeCloseTo(50, 9);
            expect(r.rawGainM).toBe(r.gainM);
            expect(r.rawLossM).toBe(r.lossM);
            expect(r.thresholdM).toBe(0);
            expect(r.smoothWindowM).toBe(0);
            expect(r.legCount).toBe(0);
        });
    });

    describe('options', () => {
        it('should default to the dem preset', () => {
            const r = ElevationGain.computeProfile([0, 10], [0, 5]);
            expect(r.thresholdM).toBe(3);
            expect(r.smoothWindowM).toBe(30);
        });

        it('should let either knob override its half of the preset', () => {
            const r = ElevationGain.computeProfile([0, 10], [0, 5], {
                preset: 'gps',
                thresholdM: 1,
            });
            expect(r.thresholdM).toBe(1);
            expect(r.smoothWindowM).toBe(50);
        });

        it('should expose the documented presets', () => {
            expect(ELEVATION_GAIN_PRESETS).toEqual({
                raw: { thresholdM: 0, smoothWindowM: 0 },
                barometric: { thresholdM: 2, smoothWindowM: 15 },
                dem: { thresholdM: 3, smoothWindowM: 30 },
                gps: { thresholdM: 10, smoothWindowM: 50 },
            });
            expect(Object.isFrozen(ELEVATION_GAIN_PRESETS)).toBe(true);
            expect(Object.isFrozen(ELEVATION_GAIN_PRESETS.dem)).toBe(true);
        });

        it('should reject an unknown preset and name the alternatives', () => {
            for (const preset of ['strava', 'toString']) {
                expect(() =>
                    ElevationGain.computeProfile([0], [0], {
                        preset: preset as ElevationGainPreset,
                    })
                ).toThrow(
                    `Unknown elevation gain preset '${preset}': expected one of raw, barometric, dem, gps`
                );
            }
        });

        it('should reject negative or non-finite knobs', () => {
            for (const v of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
                expect(() => ElevationGain.computeProfile([0], [0], { thresholdM: v })).toThrow(
                    `thresholdM must be finite and >= 0, was ${v}`
                );
                expect(() => ElevationGain.computeProfile([0], [0], { smoothWindowM: v })).toThrow(
                    `smoothWindowM must be finite and >= 0, was ${v}`
                );
            }
        });

        it('should reject arrays of different lengths', () => {
            expect(() => ElevationGain.computeProfile([0, 10], [0])).toThrow(
                'distances (2) and elevations (1) must have the same length'
            );
        });
    });

    describe('degenerate inputs', () => {
        it('should report zeros for fewer than two points', () => {
            for (const e of [[], [100]]) {
                const r = ElevationGain.computeProfile(e, e);
                expect(r).toEqual({
                    gainM: 0,
                    lossM: 0,
                    rawGainM: 0,
                    rawLossM: 0,
                    thresholdM: 3,
                    smoothWindowM: 30,
                    legCount: 0,
                });
            }
        });
    });

    describe('compute on points', () => {
        it('should match computeProfile on Haversine distances', () => {
            const points: CoordinatesElevation[] = [100, 150, 120, 200, 180].map(
                (elevation, i) => ({
                    latitude: 45,
                    longitude: i * 0.001,
                    elevation,
                })
            );
            const r = ElevationGain.compute(points, banded(3));
            expect(r.gainM).toBeCloseTo(130, 9);
            expect(r.lossM).toBeCloseTo(50, 9);

            const defaults = ElevationGain.compute(points);
            expect(defaults.thresholdM).toBe(3);
        });
    });
});
