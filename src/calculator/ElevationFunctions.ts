import { Coordinates, Pixel, TileCoordinates, TileCoordinatesFloat } from '../types';

// ========================================================================
// INTERNAL FUNCTIONS (exported for tests)
// ========================================================================

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Validate latitude is within Web Mercator bounds
 */
export function isValidLatitude(lat: number): boolean {
    return lat >= -85.0511 && lat <= 85.0511;
}

/**
 * Validate longitude is within valid range
 */
export function isValidLongitude(lon: number): boolean {
    return lon >= -180 && lon <= 180;
}

/**
 * Validate zoom level is within supported range
 */
export function isValidZoomLevel(zoom: number): boolean {
    return Number.isInteger(zoom) && zoom >= 0 && zoom <= 15;
}

export function normalizePixel(pixel: Pixel, tileSize: number): Pixel {
    let { x, y } = pixel;
    const tile = pixel.tile;
    let tileX = tile.x;
    let tileY = tile.y;
    const z = tile.z;

    if (x < 0) {
        x += tileSize;
        tileX -= 1;
    }
    if (x >= tileSize) {
        x -= tileSize;
        tileX += 1;
    }
    if (y < 0) {
        y += tileSize;
        tileY -= 1;
    }
    if (y >= tileSize) {
        y -= tileSize;
        tileY += 1;
    }

    const maxTile = Math.pow(2, z) - 1;
    tileX = Math.max(0, Math.min(maxTile, tileX));
    tileY = Math.max(0, Math.min(maxTile, tileY));

    return { tile: { z, x: tileX, y: tileY }, x, y };
}

export function toTileCoordinatesFloat(coords: Coordinates, z: number): TileCoordinatesFloat {
    // Input validation
    if (!isValidLatitude(coords.latitude)) {
        throw new Error(
            `Invalid latitude: ${coords.latitude}. Must be between -85.0511 and 85.0511`
        );
    }

    if (!isValidLongitude(coords.longitude)) {
        throw new Error(`Invalid longitude: ${coords.longitude}. Must be between -180 and 180`);
    }

    if (!isValidZoomLevel(z)) {
        throw new Error(`Invalid zoom level: ${z}. Must be between 0 and 15`);
    }

    // Web Mercator projection calculation
    const lat = degToRad(coords.latitude);
    const n = Math.pow(2, z);
    const xFloat = ((coords.longitude + 180) / 360) * n;
    const yFloat = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n;

    let x = Math.floor(xFloat);
    let y = Math.floor(yFloat);

    // Clamp tile coordinates to valid range for the zoom level
    const maxTile = n - 1;
    x = Math.max(0, Math.min(maxTile, x));
    y = Math.max(0, Math.min(maxTile, y));

    return {
        x,
        y,
        xFloat,
        yFloat,
        z,
    };
}

export function toTileCoordinates(coords: Coordinates, z: number): TileCoordinates {
    const tile = toTileCoordinatesFloat(coords, z);
    return {
        x: tile.x,
        y: tile.y,
        z: tile.z,
    };
}

/**
 * Convert WGS84 coordinates to Web Mercator tile pixel coordinates
 * @param coords - WGS84 latitude/longitude coordinates
 * @param z - Zoom level (0-15)
 * @returns Pixel coordinates within the appropriate tile
 */
export function toPixel(coords: Coordinates, z: number, tileSize: number): Pixel {
    const tile = toTileCoordinatesFloat(coords, z);

    // Calculate pixel coordinates within the tile
    const x = Math.floor((tile.xFloat - tile.x) * tileSize);
    const y = Math.floor((tile.yFloat - tile.y) * tileSize);

    return {
        tile: {
            z,
            x: tile.x,
            y: tile.y,
        },
        x: Math.max(0, Math.min(tileSize - 1, x)),
        y: Math.max(0, Math.min(tileSize - 1, y)),
    };
}
