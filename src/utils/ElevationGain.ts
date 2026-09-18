import {
    CoordinatesElevation,
    ElevationGainOptions,
    ElevationGainPreset,
    ElevationGainResult,
} from '../types';
import { Distance } from './Distance';
import { ElevationSmoother } from './ElevationSmoother';

/**
 * Dead band and smoothing half-width, in meters, for each {@link ElevationGainPreset}.
 *
 * `dem` is the default because this library's elevation is always DEM-derived. DEM error is
 * spatially correlated rather than white: consecutive samples inside one cell interpolate the same
 * posts, so there is little point-to-point jitter for a band to remove. Strava's 10 m (`gps`) is
 * sized for GPS-altimeter noise and reports 0 m on gentle terrain with a few meters of genuine
 * undulation. 3 m matches GoldenCheetah's default for corrected elevation.
 */
export const ELEVATION_GAIN_PRESETS: Readonly<
    Record<ElevationGainPreset, { readonly thresholdM: number; readonly smoothWindowM: number }>
> = Object.freeze({
    raw: Object.freeze({ thresholdM: 0, smoothWindowM: 0 }),
    barometric: Object.freeze({ thresholdM: 2, smoothWindowM: 15 }),
    dem: Object.freeze({ thresholdM: 3, smoothWindowM: 30 }),
    gps: Object.freeze({ thresholdM: 10, smoothWindowM: 50 }),
});

interface Banked {
    gain: number;
    loss: number;
    legCount: number;
}

/**
 * Cumulative ascent and descent with a hysteresis dead band, on a profile smoothed at its own
 * scale. Port of vcyclist's `ElevationGain`.
 *
 * ## Why not the plain sum of positive deltas
 *
 * It counts every wiggle, so it grows without bound as the sampling gets finer, the coastline
 * problem. This measures a figure that is stable under resampling.
 *
 * ## Why not a per-delta filter either
 *
 * `if (dEle > threshold) gain += dEle` reports **zero** on a smooth 500 m climb sampled every
 * 2 m, since no single delta exceeds the threshold. The accumulator tracks *turning points*
 * instead: a leg is banked once, in full, when the profile reverses by the threshold, so the
 * result depends only on local extrema.
 *
 * ## Why it smooths its own copy
 *
 * A wide smoothing kernel chosen for display or gradients reads D+ systematically low, because it
 * averages away real terrain. Measure on the profile *before* such smoothing; this function
 * applies its own narrow kernel (`smoothWindowM`) to a copy and never mutates its input.
 */
export class ElevationGain {
    /**
     * Measure cumulative ascent and descent along points. Distances are computed with Haversine.
     * @param points - Profile to measure, in path order
     * @param options - Measurement scale (default preset: 'dem')
     */
    public static compute(
        points: CoordinatesElevation[],
        options: ElevationGainOptions = {}
    ): ElevationGainResult {
        return ElevationGain.computeProfile(
            Distance.cumulativeDistances(points),
            points.map(p => p.elevation),
            options
        );
    }

    /**
     * The same measurement on flat arrays.
     * @param distances - Cumulative distance of each point in meters, non-decreasing
     * @param elevations - Elevation of each point in meters
     * @param options - Measurement scale (default preset: 'dem')
     */
    public static computeProfile(
        distances: ArrayLike<number>,
        elevations: ArrayLike<number>,
        options: ElevationGainOptions = {}
    ): ElevationGainResult {
        const { thresholdM, smoothWindowM } = ElevationGain.resolveOptions(options);
        if (distances.length !== elevations.length) {
            throw new Error(
                `distances (${distances.length}) and elevations (${elevations.length}) must have the same length`
            );
        }

        const profile = ElevationSmoother.smoothProfile(distances, elevations, smoothWindowM);

        let rawGain = 0;
        let rawLoss = 0;
        for (let i = 1; i < profile.length; i++) {
            const d = profile[i] - profile[i - 1];
            if (d > 0) {
                rawGain += d;
            } else {
                rawLoss -= d;
            }
        }

        const banked: Banked =
            thresholdM > 0
                ? ElevationGain.accumulate(profile, thresholdM)
                : { gain: rawGain, loss: rawLoss, legCount: 0 };

        return {
            gainM: banked.gain,
            lossM: banked.loss,
            rawGainM: rawGain,
            rawLossM: rawLoss,
            thresholdM,
            smoothWindowM,
            legCount: banked.legCount,
        };
    }

    private static resolveOptions(options: ElevationGainOptions): {
        thresholdM: number;
        smoothWindowM: number;
    } {
        const presetName = options.preset ?? 'dem';
        const preset = Object.prototype.hasOwnProperty.call(ELEVATION_GAIN_PRESETS, presetName)
            ? ELEVATION_GAIN_PRESETS[presetName]
            : undefined;
        if (!preset) {
            throw new Error(
                `Unknown elevation gain preset '${presetName}': expected one of ${Object.keys(ELEVATION_GAIN_PRESETS).join(', ')}`
            );
        }
        const thresholdM = options.thresholdM ?? preset.thresholdM;
        const smoothWindowM = options.smoothWindowM ?? preset.smoothWindowM;
        if (!(Number.isFinite(thresholdM) && thresholdM >= 0)) {
            throw new Error(`thresholdM must be finite and >= 0, was ${thresholdM}`);
        }
        if (!(Number.isFinite(smoothWindowM) && smoothWindowM >= 0)) {
            throw new Error(`smoothWindowM must be finite and >= 0, was ${smoothWindowM}`);
        }
        return { thresholdM, smoothWindowM };
    }

    /**
     * The turning-point accumulator.
     *
     * State is a confirmed turning point `ref`, a running extremum `ext` since `ref`, and a
     * direction. A leg `[ref, ext]` is banked when the profile retraces by `threshold` from `ext`,
     * so the count is all-or-nothing: a bump of exactly `threshold` counts in full, one of
     * `threshold - ε` is dropped entirely *including its matching descent*.
     *
     * Banked legs span consecutive confirmed turning points, so they tile the profile disjointly:
     * a climb with twenty 1 m sub-summits banks one leg, and nothing is counted twice.
     *
     * The `dir === 0` prologue exists because the first leg's direction is unknown until the
     * profile has moved `threshold` in *some* direction; tracking both extrema and their indices
     * until then stops a route that opens with a dip from booking that dip as a climb.
     */
    private static accumulate(h: number[], threshold: number): Banked {
        let gain = 0;
        let loss = 0;
        let legCount = 0;

        let hi = h[0];
        let lo = h[0];
        let iHi = 0;
        let iLo = 0;
        let dir = 0;
        let ref = h[0];
        let ext = h[0];

        for (let i = 1; i < h.length; i++) {
            const e = h[i];
            if (dir === 0) {
                if (e > hi) {
                    hi = e;
                    iHi = i;
                }
                if (e < lo) {
                    lo = e;
                    iLo = i;
                }
                if (hi - lo >= threshold) {
                    if (iHi > iLo) {
                        dir = 1;
                        ref = lo;
                        ext = hi;
                    } else {
                        dir = -1;
                        ref = hi;
                        ext = lo;
                    }
                }
            } else if (dir > 0) {
                if (e > ext) {
                    ext = e;
                } else if (ext - e >= threshold) {
                    gain += ext - ref;
                    legCount++;
                    ref = ext;
                    ext = e;
                    dir = -1;
                }
            } else if (e < ext) {
                ext = e;
            } else if (e - ext >= threshold) {
                loss += ref - ext;
                legCount++;
                ref = ext;
                ext = e;
                dir = 1;
            }
        }

        // Flush the leg still open at the end. Without this a route that finishes at the top of
        // its final climb loses that whole climb. An open leg always spans at least `threshold`.
        if (dir > 0) {
            gain += ext - ref;
            legCount++;
        } else if (dir < 0) {
            loss += ref - ext;
            legCount++;
        }

        return { gain, loss, legCount };
    }
}
