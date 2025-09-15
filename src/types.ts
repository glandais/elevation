/**
 * Geographic coordinates in WGS84
 */
export interface Coordinates {
    readonly latitude: number;
    readonly longitude: number;
}

/**
 * Tile coordinates in Web Mercator projection
 */
export interface TileCoordinates {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/**
 * Position within a tile (0-255 range)
 */
export interface TilePixelPosition {
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
 * Cached tile data with ImageBitmap for proper memory management
 */
export interface CachedTile {
    readonly key: string;
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
