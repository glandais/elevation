/**
 * Geographic coordinates in WGS84
 */
export interface Coordinates {
    readonly latitude: number;
    readonly longitude: number;
}
/**
 * Geographic coordinates in WGS84
 */
export interface CoordinatesElevation extends Coordinates {
    readonly elevation: number;
}
/**
 * Tile coordinates in Web Mercator projection
 */
export interface TileCoordinates {
    readonly x: number;
    readonly y: number;
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
     * Request timeout in milliseconds
     * Default: 5000
     */
    readonly timeout?: number;
}
/**
 * Tile data with ImageBitmap for proper memory management
 */
export interface Tile {
    readonly data: ImageData;
    readonly bitmap: ImageBitmap;
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
 * Options for getElevationsFrom method
 */
export interface GetElevationsFromOptions {
    /**
     * Use bilinear interpolation for smoother results
     * Default: true
     */
    readonly interpolation?: boolean;
}
/**
 * Options for getElevationsBetween method
 */
export interface GetElevationsBetweenOptions {
    /**
     * Distance between elevation points in meters
     * Default: 10
     */
    readonly step?: number;
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