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
export declare function asCoordinatesElevation(coordinates: Coordinates): CoordinatesElevation;
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
//# sourceMappingURL=types.d.ts.map