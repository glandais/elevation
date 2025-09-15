import { ElevationProvider } from '../src/ElevationProvider';
import { CoordinateConverter } from '../src/CoordinateConverter';
import { TileFetcher } from '../src/TileFetcher';
import { ElevationDecoder } from '../src/ElevationDecoder';
import { Cache } from '../src/Cache';
import type { ElevationProviderConfig, CachedTile } from '../src/types';

// Mock the dependencies
jest.mock('../src/CoordinateConverter');
jest.mock('../src/TileFetcher');
jest.mock('../src/ElevationDecoder');
jest.mock('../src/Cache');

describe('ElevationProvider', () => {
    let provider: ElevationProvider;
    let mockTileFetcher: jest.Mocked<TileFetcher>;
    let mockTileCache: jest.Mocked<Cache<CachedTile>>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock implementations
        mockTileFetcher = {
            fetchTile: jest.fn(),
        } as unknown as jest.Mocked<TileFetcher>;

        mockTileCache = {
            get: jest.fn(),
            set: jest.fn(),
            clear: jest.fn(),
        } as unknown as jest.Mocked<Cache<CachedTile>>;

        // Mock constructors
        (TileFetcher as jest.MockedClass<typeof TileFetcher>).mockImplementation(
            () => mockTileFetcher
        );
        (Cache as jest.MockedClass<typeof Cache>).mockImplementation(() => mockTileCache as any);

        // Setup coordinate converter mocks
        (CoordinateConverter.toTileCoordinates as jest.Mock).mockReturnValue({
            x: 1205,
            y: 1540,
            z: 12,
        });
        (CoordinateConverter.getTileKey as jest.Mock).mockReturnValue('12/1205/1540');
        (CoordinateConverter.getTileUrl as jest.Mock).mockReturnValue(
            'https://example.com/tile.png'
        );
        (CoordinateConverter.getTilePixelPosition as jest.Mock).mockReturnValue({ x: 128, y: 128 });

        // Setup elevation decoder mocks
        (ElevationDecoder.getElevationFromImageData as jest.Mock).mockReturnValue(100.5);
        (ElevationDecoder.getInterpolatedElevation as jest.Mock).mockReturnValue(101.2);
    });

    describe('constructor', () => {
        it('should create provider with default configuration', () => {
            provider = new ElevationProvider();

            expect(TileFetcher).toHaveBeenCalledWith(5000);
            expect(Cache).toHaveBeenCalledWith(100, expect.any(Function));
        });

        it('should create provider with custom configuration', () => {
            const config: ElevationProviderConfig = {
                zoomLevel: 10,
                cacheSize: 50,
                tileUrlTemplate: 'https://custom.com/{z}/{x}/{y}.png',
                timeout: 10000,
            };

            provider = new ElevationProvider(config);

            expect(TileFetcher).toHaveBeenCalledWith(10000);
            expect(Cache).toHaveBeenCalledWith(50, expect.any(Function));
        });

        it('should use partial custom configuration with defaults', () => {
            const config: ElevationProviderConfig = {
                zoomLevel: 14,
            };

            provider = new ElevationProvider(config);

            expect(TileFetcher).toHaveBeenCalledWith(5000); // default timeout
            expect(Cache).toHaveBeenCalledWith(100, expect.any(Function)); // default cache size
        });

        it('should throw error for invalid zoom level (too high)', () => {
            const config: ElevationProviderConfig = {
                zoomLevel: 16,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid zoom level: 16. Must be an integer between 0 and 15'
            );
        });

        it('should throw error for invalid zoom level (negative)', () => {
            const config: ElevationProviderConfig = {
                zoomLevel: -1,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid zoom level: -1. Must be an integer between 0 and 15'
            );
        });

        it('should throw error for non-integer zoom level', () => {
            const config: ElevationProviderConfig = {
                zoomLevel: 12.5,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid zoom level: 12.5. Must be an integer between 0 and 15'
            );
        });

        it('should throw error for invalid cache size (zero)', () => {
            const config: ElevationProviderConfig = {
                cacheSize: 0,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid cache size: 0. Must be a positive integer'
            );
        });

        it('should throw error for invalid cache size (negative)', () => {
            const config: ElevationProviderConfig = {
                cacheSize: -10,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid cache size: -10. Must be a positive integer'
            );
        });

        it('should throw error for non-integer cache size', () => {
            const config: ElevationProviderConfig = {
                cacheSize: 50.5,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid cache size: 50.5. Must be a positive integer'
            );
        });

        it('should throw error for invalid timeout (zero)', () => {
            const config: ElevationProviderConfig = {
                timeout: 0,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid timeout: 0. Must be a positive integer'
            );
        });

        it('should throw error for invalid timeout (negative)', () => {
            const config: ElevationProviderConfig = {
                timeout: -1000,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid timeout: -1000. Must be a positive integer'
            );
        });

        it('should throw error for non-integer timeout', () => {
            const config: ElevationProviderConfig = {
                timeout: 5000.5,
            };

            expect(() => new ElevationProvider(config)).toThrow(
                'Invalid timeout: 5000.5. Must be a positive integer'
            );
        });
    });

    describe('getElevation method', () => {
        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should get elevation from cache if available', async () => {
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });

            const result = await provider.getElevation(40.7128, -74.006);

            expect(mockTileCache.get).toHaveBeenCalledWith('12/1205/1540');
            expect(mockTileFetcher.fetchTile).not.toHaveBeenCalled();
            expect(ElevationDecoder.getElevationFromImageData).toHaveBeenCalledWith(mockImageData, {
                x: 128,
                y: 128,
            });
            expect(result).toBe(100.5);
        });

        it('should fetch tile if not in cache', async () => {
            const mockImageData = new ImageData(256, 256);
            mockTileCache.get.mockReturnValue(null);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValue({
                imageData: mockImageData,
                imageBitmap: mockImageBitmap,
            });

            const result = await provider.getElevation(40.7128, -74.006);

            expect(mockTileCache.get).toHaveBeenCalledWith('12/1205/1540');
            expect(mockTileFetcher.fetchTile).toHaveBeenCalledWith('https://example.com/tile.png');
            expect(mockTileCache.set).toHaveBeenCalledWith('12/1205/1540', {
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: expect.any(Object),
            });
            expect(ElevationDecoder.getElevationFromImageData).toHaveBeenCalledWith(mockImageData, {
                x: 128,
                y: 128,
            });
            expect(result).toBe(100.5);
        });

        it('should use custom tile URL template', async () => {
            provider = new ElevationProvider({
                tileUrlTemplate: 'https://custom.com/{z}/{x}/{y}.jpg',
            });

            mockTileCache.get.mockReturnValue(null);
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValue({
                imageData: mockImageData,
                imageBitmap: mockImageBitmap,
            });

            await provider.getElevation(40.7128, -74.006);

            expect(CoordinateConverter.getTileUrl).toHaveBeenCalledWith(
                { x: 1205, y: 1540, z: 12 },
                'https://custom.com/{z}/{x}/{y}.jpg'
            );
        });

        it('should handle coordinate conversion errors', async () => {
            (CoordinateConverter.toTileCoordinates as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid coordinates');
            });

            await expect(provider.getElevation(91, 0)).rejects.toThrow(
                'Failed to get elevation: Invalid coordinates'
            );
        });

        it('should handle tile fetch errors', async () => {
            mockTileCache.get.mockReturnValue(null);
            mockTileFetcher.fetchTile.mockRejectedValue(new Error('Network error'));

            await expect(provider.getElevation(40.7128, -74.006)).rejects.toThrow(
                'Failed to get elevation: Network error'
            );
        });

        it('should handle elevation decoding errors', async () => {
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });
            (ElevationDecoder.getElevationFromImageData as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid pixel position');
            });

            await expect(provider.getElevation(40.7128, -74.006)).rejects.toThrow(
                'Failed to get elevation: Invalid pixel position'
            );
        });

        it('should handle non-Error exceptions', async () => {
            mockTileCache.get.mockImplementation(() => {
                throw 'String error';
            });

            await expect(provider.getElevation(40.7128, -74.006)).rejects.toThrow(
                'Failed to get elevation: Unknown error'
            );
        });

        it('should work with different zoom levels', async () => {
            provider = new ElevationProvider({ zoomLevel: 10 });
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });

            await provider.getElevation(40.7128, -74.006);

            expect(CoordinateConverter.toTileCoordinates).toHaveBeenCalledWith(
                { latitude: 40.7128, longitude: -74.006 },
                10
            );
        });
    });

    describe('getInterpolatedElevation method', () => {
        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should get interpolated elevation from cache if available', async () => {
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });

            const result = await provider.getInterpolatedElevation(40.7128, -74.006);

            expect(mockTileCache.get).toHaveBeenCalledWith('12/1205/1540');
            expect(mockTileFetcher.fetchTile).not.toHaveBeenCalled();
            expect(ElevationDecoder.getInterpolatedElevation).toHaveBeenCalledWith(
                mockImageData,
                128,
                128
            );
            expect(result).toBe(101.2);
        });

        it('should fetch tile if not in cache', async () => {
            const mockImageData = new ImageData(256, 256);
            mockTileCache.get.mockReturnValue(null);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValue({
                imageData: mockImageData,
                imageBitmap: mockImageBitmap,
            });

            const result = await provider.getInterpolatedElevation(40.7128, -74.006);

            expect(mockTileCache.get).toHaveBeenCalledWith('12/1205/1540');
            expect(mockTileFetcher.fetchTile).toHaveBeenCalledWith('https://example.com/tile.png');
            expect(mockTileCache.set).toHaveBeenCalledWith('12/1205/1540', {
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: expect.any(Object),
            });
            expect(ElevationDecoder.getInterpolatedElevation).toHaveBeenCalledWith(
                mockImageData,
                128,
                128
            );
            expect(result).toBe(101.2);
        });

        it('should handle coordinate conversion errors', async () => {
            (CoordinateConverter.toTileCoordinates as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid coordinates');
            });

            await expect(provider.getInterpolatedElevation(91, 0)).rejects.toThrow(
                'Failed to get interpolated elevation: Invalid coordinates'
            );
        });

        it('should handle tile fetch errors', async () => {
            mockTileCache.get.mockReturnValue(null);
            mockTileFetcher.fetchTile.mockRejectedValue(new Error('Network error'));

            await expect(provider.getInterpolatedElevation(40.7128, -74.006)).rejects.toThrow(
                'Failed to get interpolated elevation: Network error'
            );
        });

        it('should handle interpolation errors', async () => {
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });
            (ElevationDecoder.getInterpolatedElevation as jest.Mock).mockImplementation(() => {
                throw new Error('Interpolation failed');
            });

            await expect(provider.getInterpolatedElevation(40.7128, -74.006)).rejects.toThrow(
                'Failed to get interpolated elevation: Interpolation failed'
            );
        });

        it('should handle non-Error exceptions', async () => {
            mockTileCache.get.mockImplementation(() => {
                throw 'String error';
            });

            await expect(provider.getInterpolatedElevation(40.7128, -74.006)).rejects.toThrow(
                'Failed to get interpolated elevation: Unknown error'
            );
        });

        it('should use custom tile URL template', async () => {
            provider = new ElevationProvider({
                tileUrlTemplate: 'https://custom.com/{z}/{x}/{y}.jpg',
            });

            mockTileCache.get.mockReturnValue(null);
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValue({
                imageData: mockImageData,
                imageBitmap: mockImageBitmap,
            });

            await provider.getInterpolatedElevation(40.7128, -74.006);

            expect(CoordinateConverter.getTileUrl).toHaveBeenCalledWith(
                { x: 1205, y: 1540, z: 12 },
                'https://custom.com/{z}/{x}/{y}.jpg'
            );
        });
    });

    describe('getElevations method', () => {
        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should get elevations for multiple coordinates', async () => {
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });

            const coordinates = [
                { latitude: 40.7128, longitude: -74.006 },
                { latitude: 51.5074, longitude: -0.1278 },
                { latitude: 35.6762, longitude: 139.6503 },
            ];

            // Mock different elevations for each call
            (ElevationDecoder.getElevationFromImageData as jest.Mock)
                .mockReturnValueOnce(100.5)
                .mockReturnValueOnce(50.3)
                .mockReturnValueOnce(200.7);

            const results = await provider.getElevations(coordinates);

            expect(results).toEqual([100.5, 50.3, 200.7]);
            expect(ElevationDecoder.getElevationFromImageData).toHaveBeenCalledTimes(3);
        });

        it('should handle empty array', async () => {
            const results = await provider.getElevations([]);

            expect(results).toEqual([]);
        });

        it('should handle single coordinate', async () => {
            const mockImageData = new ImageData(256, 256);
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValue({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });

            const results = await provider.getElevations([
                { latitude: 40.7128, longitude: -74.006 },
            ]);

            expect(results).toEqual([100.5]);
        });

        it('should handle errors in batch processing', async () => {
            mockTileCache.get.mockReturnValue(null);
            mockTileFetcher.fetchTile.mockRejectedValue(new Error('Network error'));

            const coordinates = [
                { latitude: 40.7128, longitude: -74.006 },
                { latitude: 51.5074, longitude: -0.1278 },
            ];

            await expect(provider.getElevations(coordinates)).rejects.toThrow(
                'Failed to get elevation: Network error'
            );
        });

        it('should process coordinates in parallel', async () => {
            const mockImageData = new ImageData(256, 256);
            let fetchCount = 0;

            mockTileCache.get.mockReturnValue(null);
            mockTileFetcher.fetchTile.mockImplementation(() => {
                fetchCount++;
                return new Promise(resolve => {
                    const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
                    setTimeout(
                        () => resolve({ imageData: mockImageData, imageBitmap: mockImageBitmap }),
                        10
                    );
                });
            });

            const coordinates = Array.from({ length: 5 }, (_, i) => ({
                latitude: 40 + i,
                longitude: -74 - i,
            }));

            const startTime = Date.now();
            await provider.getElevations(coordinates);
            const endTime = Date.now();

            // All fetches should happen in parallel, so total time should be ~10ms, not ~50ms
            expect(endTime - startTime).toBeLessThan(30);
            expect(fetchCount).toBe(5);
        });
    });

    describe('getConfig method', () => {
        it('should return a copy of the configuration', () => {
            const config: ElevationProviderConfig = {
                zoomLevel: 10,
                cacheSize: 50,
                tileUrlTemplate: 'https://custom.com/{z}/{x}/{y}.png',
                timeout: 10000,
            };

            provider = new ElevationProvider(config);
            const returnedConfig = provider.getConfig();

            expect(returnedConfig).toEqual({
                zoomLevel: 10,
                cacheSize: 50,
                tileUrlTemplate: 'https://custom.com/{z}/{x}/{y}.png',
                timeout: 10000,
            });

            // Verify it's a copy, not the same object
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(returnedConfig).not.toBe((provider as any).config);
        });

        it('should return default configuration when none provided', () => {
            provider = new ElevationProvider();
            const returnedConfig = provider.getConfig();

            expect(returnedConfig).toEqual({
                zoomLevel: 12,
                cacheSize: 100,
                tileUrlTemplate:
                    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
                timeout: 5000,
            });
        });

        it('should prevent modification of internal config', () => {
            provider = new ElevationProvider();
            const config1 = provider.getConfig();
            // Try to modify config (should not affect internal config due to readonly)
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (config1 as any).zoomLevel = 15;
            } catch {
                // Expected to fail due to readonly
            }

            const config2 = provider.getConfig();
            expect(config2.zoomLevel).toBe(12); // Should still be the original value
        });
    });

    describe('clearCache method', () => {
        it('should clear the tile cache', () => {
            provider = new ElevationProvider();
            provider.clearCache();

            expect(mockTileCache.clear).toHaveBeenCalledTimes(1);
        });

        it('should allow getting elevation after cache clear', async () => {
            provider = new ElevationProvider();
            const mockImageData = new ImageData(256, 256);

            // First call - tile in cache
            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValueOnce({
                key: '12/1205/1540',
                data: mockImageData,
                bitmap: mockImageBitmap,
            });
            await provider.getElevation(40.7128, -74.006);

            // Clear cache
            provider.clearCache();

            // Second call - tile not in cache, needs fetching
            mockTileCache.get.mockReturnValueOnce(null);
            const mockImageBitmap2 = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValue({
                imageData: mockImageData,
                imageBitmap: mockImageBitmap2,
            });
            await provider.getElevation(40.7128, -74.006);

            expect(mockTileCache.clear).toHaveBeenCalledTimes(1);
            expect(mockTileFetcher.fetchTile).toHaveBeenCalledTimes(1);
        });
    });

    describe('getAttribution static method', () => {
        it('should return attribution information', () => {
            const attribution = ElevationProvider.getAttribution();

            expect(attribution).toEqual({
                text: 'Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1. Data processing by Mapzen/Tilezen.',
                url: 'https://github.com/tilezen/joerd',
            });
        });

        it('should be callable without instance', () => {
            // Should not require creating an instance
            const attribution = ElevationProvider.getAttribution();
            expect(attribution.text).toBeDefined();
            expect(attribution.url).toBeDefined();
        });
    });

    describe('integration scenarios', () => {
        beforeEach(() => {
            provider = new ElevationProvider();
        });

        it('should reuse cached tiles for nearby coordinates', async () => {
            const mockImageData = new ImageData(256, 256);
            mockTileCache.get
                .mockReturnValueOnce(null) // First call - not cached
                .mockReturnValueOnce({
                    key: '12/1205/1540',
                    data: mockImageData,
                    bitmap: { width: 256, height: 256, close: jest.fn() } as any,
                }); // Second call - cached

            const mockImageBitmap = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValue({
                imageData: mockImageData,
                imageBitmap: mockImageBitmap,
            });

            // Two coordinates in the same tile
            await provider.getElevation(40.7128, -74.006);
            await provider.getElevation(40.7129, -74.0061);

            // Should only fetch once
            expect(mockTileFetcher.fetchTile).toHaveBeenCalledTimes(1);
            expect(mockTileCache.set).toHaveBeenCalledTimes(1);
        });

        it('should handle mixed cached and uncached tiles', async () => {
            const mockImageData1 = new ImageData(256, 256);
            const mockImageData2 = new ImageData(256, 256);

            // First coordinate - not cached
            mockTileCache.get.mockReturnValueOnce(null);
            const mockImageBitmap1 = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileFetcher.fetchTile.mockResolvedValueOnce({
                imageData: mockImageData1,
                imageBitmap: mockImageBitmap1,
            });

            // Second coordinate - cached
            (CoordinateConverter.getTileKey as jest.Mock).mockReturnValueOnce('12/1206/1540');
            const mockImageBitmap2 = { width: 256, height: 256, close: jest.fn() } as any;
            mockTileCache.get.mockReturnValueOnce({
                key: '12/1206/1540',
                data: mockImageData2,
                bitmap: mockImageBitmap2,
            });

            const coordinates = [
                { latitude: 40.7128, longitude: -74.006 },
                { latitude: 41.0, longitude: -74.0 },
            ];

            await provider.getElevations(coordinates);

            expect(mockTileFetcher.fetchTile).toHaveBeenCalledTimes(1);
            expect(mockTileCache.set).toHaveBeenCalledTimes(1);
        });
    });
});
