import type { Mocked } from 'vitest';
import { TileLoader } from '../../../src/tile/fetcher/TileLoader';
import type { TileFetcher } from '../../../src/tile/fetcher/TileFetcher';
import type { TileCoordinates } from '../../../src/types';
import { Tile } from '../../../src/tile';

describe('TileLoader', () => {
    let tileLoader: TileLoader;
    let mockTileFetcher: Mocked<TileFetcher>;
    let mockTile: Tile;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock tile
        mockTile = {
            close: vi.fn(),
            width: 256,
            height: 256,
            cache: new Float64Array(256 * 256),
            getRGBFromImageData: vi.fn().mockReturnValue({
                red: 128,
                green: 0,
                blue: 0,
            }),
            getElevation: vi.fn(),
            decodeElevation: vi.fn(),
        } as Mocked<Tile>;

        // Create mock TileFetcher
        mockTileFetcher = {
            fetchTile: vi.fn().mockResolvedValue(mockTile),
        } as Mocked<TileFetcher>;

        // Create TileLoader with mock fetcher
        tileLoader = new TileLoader('https://example.com/{z}/{x}/{y}.png', mockTileFetcher);
    });

    describe('constructor', () => {
        it('should create TileLoader with tile URL template and fetcher', () => {
            const urlTemplate = 'https://tiles.example.com/{z}/{x}/{y}.png';
            const loader = new TileLoader(urlTemplate, mockTileFetcher);

            expect(loader).toBeDefined();
            expect(loader).toBeInstanceOf(TileLoader);
        });

        it('should accept different URL templates', () => {
            const urlTemplates = [
                'https://server1.com/{z}/{x}/{y}.png',
                'https://server2.com/tiles/{z}/{x}/{y}.jpg',
                'https://elevation.com/terrain/{z}/{x}/{y}.png',
            ];

            urlTemplates.forEach(template => {
                const loader = new TileLoader(template, mockTileFetcher);
                expect(loader).toBeInstanceOf(TileLoader);
            });
        });
    });

    describe('loadTile method', () => {
        it('should successfully load tile', async () => {
            const tileCoords: TileCoordinates = { z: 12, x: 1024, y: 1536 };
            const result = await tileLoader.loadTile(tileCoords);

            expect(mockTileFetcher.fetchTile).toHaveBeenCalledWith(
                'https://example.com/12/1024/1536.png'
            );
            expect(result).toBe(mockTile);
        });

        it('should generate correct tile URL from coordinates', async () => {
            const testCases = [
                { coords: { z: 0, x: 0, y: 0 }, expectedUrl: 'https://example.com/0/0/0.png' },
                {
                    coords: { z: 15, x: 32767, y: 32767 },
                    expectedUrl: 'https://example.com/15/32767/32767.png',
                },
                {
                    coords: { z: 8, x: 128, y: 96 },
                    expectedUrl: 'https://example.com/8/128/96.png',
                },
            ];

            for (const { coords, expectedUrl } of testCases) {
                await tileLoader.loadTile(coords);
                expect(mockTileFetcher.fetchTile).toHaveBeenLastCalledWith(expectedUrl);
            }
        });

        it('should handle different URL templates', async () => {
            const urlTemplates = [
                'https://server1.com/tiles/{z}/{x}/{y}.jpg',
                'https://server2.com/terrain/{z}/{x}/{y}.webp',
                'https://elevation.com/{z}/{x}/{y}.png',
            ];

            const tileCoords: TileCoordinates = { z: 10, x: 512, y: 256 };

            for (const template of urlTemplates) {
                const loader = new TileLoader(template, mockTileFetcher);
                await loader.loadTile(tileCoords);

                const expectedUrl = template
                    .replace('{z}', '10')
                    .replace('{x}', '512')
                    .replace('{y}', '256');

                expect(mockTileFetcher.fetchTile).toHaveBeenLastCalledWith(expectedUrl);
            }
        });

        it('should propagate tile fetcher errors with context', async () => {
            const fetchError = new Error('Network timeout');
            mockTileFetcher.fetchTile.mockRejectedValueOnce(fetchError);

            const tileCoords: TileCoordinates = { z: 12, x: 1024, y: 1536 };

            await expect(tileLoader.loadTile(tileCoords)).rejects.toThrow(
                'Failed to fetch tile from https://example.com/12/1024/1536.png: Network timeout'
            );
        });

        it('should handle unknown fetcher errors', async () => {
            mockTileFetcher.fetchTile.mockRejectedValueOnce('Unknown error string');

            const tileCoords: TileCoordinates = { z: 12, x: 1024, y: 1536 };

            await expect(tileLoader.loadTile(tileCoords)).rejects.toThrow(
                'Failed to fetch tile from https://example.com/12/1024/1536.png: Unknown error'
            );
        });

        it('should handle HTTP errors from fetcher', async () => {
            const httpError = new Error('HTTP 404: Not Found');
            mockTileFetcher.fetchTile.mockRejectedValueOnce(httpError);

            const tileCoords: TileCoordinates = { z: 12, x: 1024, y: 1536 };

            await expect(tileLoader.loadTile(tileCoords)).rejects.toThrow(
                'Failed to fetch tile from https://example.com/12/1024/1536.png: HTTP 404: Not Found'
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle concurrent tile loading', async () => {
            const tileCoords = [
                { z: 12, x: 1024, y: 1536 },
                { z: 12, x: 1025, y: 1536 },
                { z: 12, x: 1024, y: 1537 },
            ];

            // Create different mock tiles for each request
            const mockTiles: Tile[] = tileCoords.map((_, index) => ({
                close: vi.fn(),
                width: 256,
                height: 256,
                cache: new Float64Array(256 * 256),
                getRGBFromImageData: vi.fn().mockReturnValue({
                    red: 128 + index,
                    green: 0,
                    blue: 0,
                }),
                getElevation: vi.fn(),
                decodeElevation: vi.fn(),
            }));

            mockTileFetcher.fetchTile
                .mockResolvedValueOnce(mockTiles[0])
                .mockResolvedValueOnce(mockTiles[1])
                .mockResolvedValueOnce(mockTiles[2]);

            const promises = tileCoords.map(coords => tileLoader.loadTile(coords));
            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            expect(mockTileFetcher.fetchTile).toHaveBeenCalledTimes(3);

            // Verify correct URLs were called
            expect(mockTileFetcher.fetchTile).toHaveBeenNthCalledWith(
                1,
                'https://example.com/12/1024/1536.png'
            );
            expect(mockTileFetcher.fetchTile).toHaveBeenNthCalledWith(
                2,
                'https://example.com/12/1025/1536.png'
            );
            expect(mockTileFetcher.fetchTile).toHaveBeenNthCalledWith(
                3,
                'https://example.com/12/1024/1537.png'
            );
        });

        it('should handle edge case coordinates', async () => {
            const edgeCases = [
                { z: 0, x: 0, y: 0 },
                { z: 15, x: 32767, y: 32767 },
                { z: 1, x: 1, y: 1 },
            ];

            for (const coords of edgeCases) {
                await tileLoader.loadTile(coords);
                expect(mockTileFetcher.fetchTile).toHaveBeenCalledWith(
                    `https://example.com/${coords.z}/${coords.x}/${coords.y}.png`
                );
            }
        });
    });

    describe('URL template processing', () => {
        it('should handle URL templates with different patterns', async () => {
            const urlTemplateTests = [
                {
                    template: 'https://server.com/tiles/{z}/{x}/{y}.png',
                    coords: { z: 8, x: 128, y: 96 },
                    expected: 'https://server.com/tiles/8/128/96.png',
                },
                {
                    template: 'https://elevation.tiles.com/{z}/{x}/{y}.jpg',
                    coords: { z: 12, x: 2048, y: 1536 },
                    expected: 'https://elevation.tiles.com/12/2048/1536.jpg',
                },
                {
                    template: 'https://terrain.example.com/data/{z}/{x}/{y}.webp',
                    coords: { z: 15, x: 16384, y: 8192 },
                    expected: 'https://terrain.example.com/data/15/16384/8192.webp',
                },
            ];

            for (const test of urlTemplateTests) {
                const loader = new TileLoader(test.template, mockTileFetcher);
                await loader.loadTile(test.coords);
                expect(mockTileFetcher.fetchTile).toHaveBeenLastCalledWith(test.expected);
            }
        });

        it('should preserve URL structure with special characters', async () => {
            const specialUrlTemplate =
                'https://tiles.example.com/v1/terrain/{z}/{x}/{y}.png?key=abc123&format=rgb';
            const loader = new TileLoader(specialUrlTemplate, mockTileFetcher);
            const coords: TileCoordinates = { z: 10, x: 512, y: 256 };

            await loader.loadTile(coords);

            expect(mockTileFetcher.fetchTile).toHaveBeenCalledWith(
                'https://tiles.example.com/v1/terrain/10/512/256.png?key=abc123&format=rgb'
            );
        });
    });

    describe('error propagation', () => {
        it('should maintain error context through the loading process', async () => {
            const originalError = new Error('Original fetch error');
            originalError.stack = 'Original stack trace';
            mockTileFetcher.fetchTile.mockRejectedValueOnce(originalError);

            const tileCoords: TileCoordinates = { z: 12, x: 1024, y: 1536 };

            try {
                await tileLoader.loadTile(tileCoords);
                throw new Error('Expected error to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain(
                    'Failed to fetch tile from https://example.com/12/1024/1536.png'
                );
                expect((error as Error).message).toContain('Original fetch error');
            }
        });

        it('should handle non-Error objects appropriately', async () => {
            mockTileFetcher.fetchTile.mockRejectedValueOnce({ message: 'Object error' });

            const tileCoords: TileCoordinates = { z: 12, x: 1024, y: 1536 };

            await expect(tileLoader.loadTile(tileCoords)).rejects.toThrow(
                'Failed to fetch tile from https://example.com/12/1024/1536.png: Unknown error'
            );
        });
    });
});
