// @vitest-environment node
//
// This is the only test that runs the real Node.js code path: the whole rest of
// the suite runs under jsdom with `__NODE__ = false` and therefore always goes
// through BrowserTileFetcher. Here the real fetcher and the real sharp decoder
// are exercised, with only the network stubbed.

import sharp from 'sharp';
import type { Pixel } from '../../../../src/types';
import { NodeJsTileFetcher } from '../../../../src/tile/fetcher/nodejs/NodeJsTileFetcher';

// 4x2 RGBA fixture. Values are chosen to be meaningful as Terrarium data:
// - neighbouring pixels differ by a single LSB in the red channel (256 m apart),
//   so any colour transform shows up immediately
// - two pixels are semi-transparent, so any alpha premultiplication rewrites
//   their RGB
const FIXTURE_WIDTH = 4;
const FIXTURE_HEIGHT = 2;
const FIXTURE_RGBA = new Uint8Array([
    // row 0
    130, 13, 133, 255, 131, 13, 133, 255, 129, 191, 237, 128, 0, 0, 0, 255,
    // row 1
    128, 0, 0, 128, 255, 255, 255, 255, 129, 143, 253, 255, 1, 2, 3, 255,
]);

async function encodeLosslessWebp(
    rgba: Uint8Array,
    width: number,
    height: number,
    channels: 3 | 4
) {
    return await sharp(Buffer.from(rgba), { raw: { width, height, channels } })
        .webp({ lossless: true })
        .toBuffer();
}

// Tile.getElevation only uses x/y; the tile coordinates are irrelevant here
function pixel(x: number, y: number): Pixel {
    return { tile: { z: 12, x: 0, y: 0 }, x, y };
}

function stubFetch(
    body: Buffer | undefined,
    init?: { ok?: boolean; status?: number; statusText?: string }
) {
    const response = {
        ok: init?.ok ?? true,
        status: init?.status ?? 200,
        statusText: init?.statusText ?? 'OK',
        arrayBuffer: async () =>
            body
                ? body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
                : new ArrayBuffer(0),
    };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

describe('NodeJsTileFetcher', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('decodes a lossless WebP tile to raw, unpremultiplied RGBA', async () => {
        const webp = await encodeLosslessWebp(FIXTURE_RGBA, FIXTURE_WIDTH, FIXTURE_HEIGHT, 4);
        // Sanity check: the fixture really is a lossless WebP (RIFF/WEBP/VP8L)
        expect(webp.subarray(0, 4).toString('ascii')).toBe('RIFF');
        expect(webp.subarray(8, 15).toString('ascii')).toBe('WEBPVP8');

        const fetchMock = stubFetch(webp);

        const tile = await new NodeJsTileFetcher().fetchTile('https://example.test/12/1/2.webp');

        expect(fetchMock).toHaveBeenCalledWith('https://example.test/12/1/2.webp');
        expect(tile.width).toBe(FIXTURE_WIDTH);
        expect(tile.height).toBe(FIXTURE_HEIGHT);

        // Byte-for-byte: no premultiply, no colour management, no resample
        for (let i = 0; i < FIXTURE_RGBA.length; i += 4) {
            expect(tile.getRGBFromImageData(i)).toEqual({
                red: FIXTURE_RGBA[i],
                green: FIXTURE_RGBA[i + 1],
                blue: FIXTURE_RGBA[i + 2],
            });
        }

        // Terrarium decoding of the first two pixels: one LSB of red is 256 m
        expect(tile.getElevation(pixel(0, 0))).toBeCloseTo(525.52, 2);
        expect(tile.getElevation(pixel(1, 0))).toBeCloseTo(781.52, 2);

        // Semi-transparent pixel keeps its RGB (premultiplication would give 64/95/118)
        expect(tile.getRGBFromImageData(2 * 4)).toEqual({ red: 129, green: 191, blue: 237 });

        tile.close();
    });

    it('adds an alpha channel when the tile has no alpha', async () => {
        const rgb = new Uint8Array(FIXTURE_WIDTH * FIXTURE_HEIGHT * 3);
        for (let p = 0; p < FIXTURE_WIDTH * FIXTURE_HEIGHT; p++) {
            rgb[p * 3] = FIXTURE_RGBA[p * 4];
            rgb[p * 3 + 1] = FIXTURE_RGBA[p * 4 + 1];
            rgb[p * 3 + 2] = FIXTURE_RGBA[p * 4 + 2];
        }
        const webp = await encodeLosslessWebp(rgb, FIXTURE_WIDTH, FIXTURE_HEIGHT, 3);
        stubFetch(webp);

        const tile = await new NodeJsTileFetcher().fetchTile('https://example.test/rgb.webp');

        // A 3-channel decode would shift every pixel; assert the 4-channel layout
        for (let p = 0; p < FIXTURE_WIDTH * FIXTURE_HEIGHT; p++) {
            expect(tile.getRGBFromImageData(p * 4)).toEqual({
                red: rgb[p * 3],
                green: rgb[p * 3 + 1],
                blue: rgb[p * 3 + 2],
            });
        }
    });

    it('decodes PNG tiles as well', async () => {
        const png = await sharp(Buffer.from(FIXTURE_RGBA), {
            raw: { width: FIXTURE_WIDTH, height: FIXTURE_HEIGHT, channels: 4 },
        })
            .png()
            .toBuffer();
        stubFetch(png);

        const tile = await new NodeJsTileFetcher().fetchTile('https://example.test/tile.png');

        expect(tile.getRGBFromImageData(0)).toEqual({ red: 130, green: 13, blue: 133 });
    });

    it('throws on a non-ok HTTP response', async () => {
        stubFetch(undefined, { ok: false, status: 404, statusText: 'Not Found' });

        await expect(
            new NodeJsTileFetcher().fetchTile('https://example.test/missing.webp')
        ).rejects.toThrow('HTTP 404: Not Found');
    });

    it('rejects when the payload is not a decodable image', async () => {
        stubFetch(Buffer.from('not an image'));

        await expect(
            new NodeJsTileFetcher().fetchTile('https://example.test/garbage.webp')
        ).rejects.toThrow();
    });

    it('rejects a premultiplied or non-RGBA decode instead of returning wrong metres', async () => {
        vi.resetModules();
        vi.doMock('sharp', () => {
            const chain = {
                ensureAlpha: () => chain,
                raw: () => chain,
                toBuffer: async () => ({
                    data: Buffer.alloc(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4),
                    info: {
                        width: FIXTURE_WIDTH,
                        height: FIXTURE_HEIGHT,
                        channels: 4,
                        premultiplied: true,
                    },
                }),
            };
            return { default: () => chain };
        });

        stubFetch(Buffer.from('ignored'));
        const { NodeJsTileFetcher: MockedFetcher } =
            await import('../../../../src/tile/fetcher/nodejs/NodeJsTileFetcher');

        await expect(new MockedFetcher().fetchTile('https://example.test/pm.webp')).rejects.toThrow(
            /premultiplied=true/
        );

        vi.doUnmock('sharp');
        vi.resetModules();
    });
});

// Live network check against the default tile source. Opt-in:
//   INTEGRATION=1 npx vitest run test/tile/fetcher/nodejs/NodeJsTileFetcher.test.ts
describe.skipIf(!process.env.INTEGRATION)('NodeJsTileFetcher (live tiles)', () => {
    it('decodes a mapterhorn WebP tile with the default URL template', async () => {
        const tile = await new NodeJsTileFetcher().fetchTile(
            'https://tiles.mapterhorn.com/12/2109/1465.webp'
        );

        expect(tile.width).toBe(512);
        expect(tile.height).toBe(512);

        const expected: Array<[number, number, [number, number, number], number]> = [
            [0, 0, [130, 13, 133], 525.52],
            [1, 0, [130, 13, 32], 525.13],
            [255, 255, [129, 191, 237], 447.93],
            [300, 120, [129, 190, 198], 446.77],
            [511, 511, [129, 143, 253], 399.99],
        ];

        for (const [x, y, [red, green, blue], elevation] of expected) {
            const index = (y * tile.width + x) * 4;
            expect(tile.getRGBFromImageData(index)).toEqual({ red, green, blue });
            expect(tile.getElevation(pixel(x, y))).toBeCloseTo(elevation, 2);
        }
    }, 30000);
});
