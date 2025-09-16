import { ElevationProvider } from '../src/ElevationProvider';
import { TileFetcher } from '../src/TileFetcher';

// Minimal mocking for integration testing
jest.mock('../src/TileFetcher');

const MockedTileFetcher = TileFetcher as jest.MockedClass<typeof TileFetcher>;

describe('ElevationProvider Integration Tests', () => {
    let mockTile: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a realistic mock tile
        const data = new Uint8ClampedArray(256 * 256 * 4);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 128; // Red - sea level
            data[i + 1] = 0; // Green
            data[i + 2] = 0; // Blue
            data[i + 3] = 255; // Alpha
        }

        mockTile = {
            data: new ImageData(data, 256, 256),
            bitmap: {
                close: jest.fn(),
                width: 256,
                height: 256,
            } as unknown as ImageBitmap,
        };

        // Mock TileFetcher to return our tile
        const mockFetchTile = jest.fn().mockResolvedValue(mockTile);
        MockedTileFetcher.prototype.fetchTile = mockFetchTile;
    });

    it('should exercise cache creation and tile loading with real cache', async () => {
        // Create provider with small cache to trigger cleanup
        const provider = new ElevationProvider({
            cacheSize: 1,
            zoomLevel: 1,
            tileUrlTemplate: 'https://test.example.com/{z}/{x}/{y}.png',
            timeout: 1000,
        });

        // Make elevation requests that will exercise:
        // 1. Cache constructor with keyMapper, valueBuilder, cleanupFunction
        // 2. loadTile method
        // 3. getTileUrl method
        // 4. Cleanup function when cache evicts items

        await provider.getElevation(0, 0); // First tile
        await provider.getElevation(45, 90); // Second tile (should evict first due to cache size = 1)

        // Verify TileFetcher was called with correct URLs
        expect(MockedTileFetcher.prototype.fetchTile).toHaveBeenCalledWith(
            expect.stringMatching(/https:\/\/test\.example\.com\/1\/\d+\/\d+\.png/)
        );

        // Verify cleanup was called on evicted tile
        expect(mockTile.bitmap.close).toHaveBeenCalled();
    });

    it('should exercise interpolation pixel normalization paths', async () => {
        const provider = new ElevationProvider({
            zoomLevel: 2, // Low zoom for easier boundary testing
            cacheSize: 10,
        });

        // Test interpolation at precise coordinates that should trigger pixel normalization
        const testCoords = [
            { lat: 0.001, lon: 0.001 }, // Should create sub-pixel positioning
            { lat: 45.999, lon: 89.999 }, // Near tile boundaries
            { lat: -0.001, lon: -0.001 }, // Negative coordinates near zero
        ];

        for (const { lat, lon } of testCoords) {
            const elevation = await provider.getInterpolatedElevation(lat, lon);
            expect(typeof elevation).toBe('number');
            expect(isFinite(elevation)).toBe(true);
        }

        // Should have called fetchTile multiple times for different tiles
        expect(MockedTileFetcher.prototype.fetchTile).toHaveBeenCalled();
    });

    it('should test cache cleanup function execution', async () => {
        const provider = new ElevationProvider({
            cacheSize: 2, // Very small cache
            zoomLevel: 3,
        });

        // Fill cache beyond capacity to trigger cleanup
        await provider.getElevation(0, 0);
        await provider.getElevation(30, 60);
        await provider.getElevation(60, 120); // Should trigger eviction

        // Verify cleanup function was called
        expect(mockTile.bitmap.close).toHaveBeenCalled();

        // Test manual cache clear
        provider.clearCache();

        // Should call cleanup on all remaining items
        expect(mockTile.bitmap.close).toHaveBeenCalledTimes(3); // Once for eviction, twice for clear
    });

    it('should exercise tile URL generation', async () => {
        const provider = new ElevationProvider({
            tileUrlTemplate: 'https://custom.tiles.example/{z}/{x}/{y}.png',
            zoomLevel: 5,
        });

        await provider.getElevation(40.7128, -74.006); // NYC coordinates

        // Should have generated URL with correct z/x/y pattern
        expect(MockedTileFetcher.prototype.fetchTile).toHaveBeenCalledWith(
            expect.stringMatching(/https:\/\/custom\.tiles\.example\/5\/\d+\/\d+\.png/)
        );
    });
});
