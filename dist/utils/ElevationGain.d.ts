import { CoordinatesElevation, ElevationGainOptions, ElevationGainPreset, ElevationGainResult } from '../types';
/**
 * Dead band and smoothing half-width, in meters, for each {@link ElevationGainPreset}.
 *
 * `dem` is the default because this library's elevation is always DEM-derived. DEM error is
 * spatially correlated rather than white: consecutive samples inside one cell interpolate the same
 * posts, so there is little point-to-point jitter for a band to remove. Strava's 10 m (`gps`) is
 * sized for GPS-altimeter noise and reports 0 m on gentle terrain with a few meters of genuine
 * undulation. 3 m matches GoldenCheetah's default for corrected elevation.
 */
export declare const ELEVATION_GAIN_PRESETS: Readonly<Record<ElevationGainPreset, {
    readonly thresholdM: number;
    readonly smoothWindowM: number;
}>>;
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
export declare class ElevationGain {
    /**
     * Measure cumulative ascent and descent along points. Distances are computed with Haversine.
     * @param points - Profile to measure, in path order
     * @param options - Measurement scale (default preset: 'dem')
     */
    static compute(points: CoordinatesElevation[], options?: ElevationGainOptions): ElevationGainResult;
    /**
     * The same measurement on flat arrays.
     * @param distances - Cumulative distance of each point in meters, non-decreasing
     * @param elevations - Elevation of each point in meters
     * @param options - Measurement scale (default preset: 'dem')
     */
    static computeProfile(distances: ArrayLike<number>, elevations: ArrayLike<number>, options?: ElevationGainOptions): ElevationGainResult;
    private static resolveOptions;
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
    private static accumulate;
}
//# sourceMappingURL=ElevationGain.d.ts.map