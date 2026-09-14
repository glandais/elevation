import { TileFetcher } from '..';
import { Tile } from '../..';
/**
 * Node.js implementation of TileFetcher.
 *
 * Terrain tiles are decoded with sharp (libvips + libwebp), which handles WebP
 * (lossy and lossless/VP8L) as well as PNG. The `canvas` package is not used for
 * decoding: it links no libwebp and rejects every WebP with
 * `Unsupported image type`.
 *
 * IMPORTANT - Terrarium tiles are data, not pictures. Elevation is packed into
 * the raw RGB bit patterns (`red * 256 + green + blue / 256 - 32768`), so the
 * decode must stay byte-exact:
 * - no alpha premultiplication (it would rewrite R, G and B),
 * - no colour management / ICC / colourspace conversion,
 * - no resize or resample.
 * `sharp(...).raw()` guarantees this by default; nothing here may add
 * `.premultiply()`, `.toColourspace()` or `.resize()`. Getting it wrong throws
 * nothing - a one-LSB change in the red channel is silently 256 metres.
 */
export declare class NodeJsTileFetcher implements TileFetcher {
    /**
     * Fetch a tile image and decode it to raw RGBA pixels
     * @param url - The URL of the tile to fetch
     * @returns Promise<Tile> - Tile giving access to the decoded pixels
     */
    fetchTile(url: string): Promise<Tile>;
}
//# sourceMappingURL=NodeJsTileFetcher.d.ts.map