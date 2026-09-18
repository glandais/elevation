/**
 * Geographic coordinates in WGS84
 */
export interface Coordinates {
    readonly latitude: number;
    readonly longitude: number;
    elevation?: number;
}

export interface CoordinatesElevation extends Coordinates {
    elevation: number;
}

export function asCoordinatesElevation(coordinates: Coordinates): CoordinatesElevation {
    return { ...coordinates, elevation: coordinates.elevation ?? 0 };
}

/**
 * Tile coordinates in Web Mercator projection
 */
export interface TileCoordinates {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface TileCoordinatesFloat {
    readonly x: number;
    readonly y: number;
    readonly xFloat: number;
    readonly yFloat: number;
    readonly z: number;
}

export interface Pixel {
    readonly tile: TileCoordinates;
    readonly x: number;
    readonly y: number;
}

/**
 * RGB color values from terrain tile
 */
export interface RGBColor {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
}

/**
 * Configuration options for ElevationProvider
 */
export interface ElevationProviderConfig {
    /**
     * Tile zoom level (0-15, default: 12)
     * Higher zoom = better resolution but more tiles
     */
    readonly zoomLevel?: number;

    /**
     * Maximum number of tiles to keep in memory cache
     * Default: 100
     */
    readonly cacheSize?: number;

    /**
     * Custom tile URL template
     * Default: AWS S3 Terrarium tiles
     */
    readonly tileUrlTemplate?: string;

    /**
     * Tile size in pixels (default: 256)
     * Use 512 for providers like mapterhorn.com
     */
    readonly tileSize?: number;

    /**
     * Attribution for the tile data source
     */
    readonly attribution?: Attribution;
}

/**
 * Attribution information for elevation data
 */
export interface Attribution {
    readonly text: string;
    readonly url?: string;
}

/**
 * Options for Douglas-Peucker filtering of elevation profiles
 */
export interface FilterOptions {
    /**
     * Maximum allowed perpendicular distance from simplified line in meters
     * Default: 10 meters
     */
    readonly tolerance?: number;

    /**
     * Elevation exaggeration factor for ECEF coordinate conversion
     * Higher values emphasize elevation differences more
     * Default: 3
     */
    readonly zExaggeration?: number;

    /**
     * Whether filtering is enabled
     * Default: false
     */
    readonly enabled?: boolean;
}

/**
 * Options for distance-based elevation smoothing
 */
export interface SmoothingOptions {
    /**
     * Smoothing window size in meters
     * Points within this distance will be weighted and averaged
     * Default: 50 meters
     */
    readonly windowSize?: number;

    /**
     * Whether smoothing is enabled
     * Default: false
     */
    readonly enabled?: boolean;
}

/**
 * 3D vector in ECEF (Earth-Centered, Earth-Fixed) coordinates
 */
export interface Vector3D {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/**
 * Options for getElevation method
 */
export interface GetElevationOptions {
    /**
     * Use bilinear interpolation for smoother results
     * Default: true
     */
    readonly interpolation?: boolean;
}

/**
 * Options for setElevations method
 */
export interface SetElevationsOptions {
    /**
     * Use bilinear interpolation for smoother results
     * Default: true
     */
    readonly interpolation?: boolean;
}

/**
 * Options for getElevationsAlong method
 */
export interface GetElevationsAlongOptions {
    /**
     * Distance between elevation points in meters
     * Default: 10
     */
    readonly step?: number;

    readonly minDistance?: number;

    /**
     * Use bilinear interpolation for smoother results
     * Default: true
     */
    readonly interpolation?: boolean;

    /**
     * Optional distance-based smoothing options
     */
    readonly smoothingOptions?: SmoothingOptions;

    /**
     * Optional Douglas-Peucker filtering options
     */
    readonly filterOptions?: FilterOptions;
}

/**
 * Named (threshold, smoothing) pairs for {@link ElevationGainOptions}.
 *
 * - `raw`: no dead band, no smoothing, the plain sum of positive deltas (0 m / 0 m)
 * - `barometric`: Strava's threshold for a barometric altimeter (2 m / 15 m)
 * - `dem`: for DEM-derived elevation such as this library's, and the default (3 m / 30 m)
 * - `gps`: Strava's threshold for a GPS-only trace (10 m / 50 m)
 */
export type ElevationGainPreset = 'raw' | 'barometric' | 'dem' | 'gps';

/**
 * How to measure cumulative ascent and descent.
 *
 * Cumulative ascent is a property of a route *and* a measurement scale, so a preset pairs a dead
 * band with a smoothing window. Setting `thresholdM` or `smoothWindowM` overrides that half of the
 * preset.
 */
export interface ElevationGainOptions {
    /**
     * Named scale to measure at
     * Default: 'dem'
     */
    readonly preset?: ElevationGainPreset;

    /**
     * Hysteresis dead band in meters: a climb or descent counts only once the profile has
     * reversed by at least this much. 0 disables it.
     * Default: the preset's threshold
     */
    readonly thresholdM?: number;

    /**
     * Triangular-kernel half-width in meters, applied to a private copy of the profile.
     * 0 disables it.
     * Default: the preset's window
     */
    readonly smoothWindowM?: number;
}

/**
 * What {@link ElevationGainOptions} measured.
 */
export interface ElevationGainResult {
    /** Cumulative ascent in meters, >= 0 */
    readonly gainM: number;

    /** Cumulative descent in meters, >= 0 */
    readonly lossM: number;

    /**
     * Unfiltered sum of positive deltas on the same smoothed profile. Compared with `gainM`, it
     * isolates what the dead band did from what the smoothing did.
     */
    readonly rawGainM: number;

    /** Unfiltered sum of negative deltas on the same smoothed profile, as a positive number */
    readonly rawLossM: number;

    /** Dead band actually applied, in meters */
    readonly thresholdM: number;

    /** Smoothing half-width actually applied, in meters */
    readonly smoothWindowM: number;

    /**
     * Number of legs banked, climbs plus descents. A diagnostic: a route with 3 real climbs that
     * reports 400 legs has a threshold too small for its noise.
     */
    readonly legCount: number;
}
