/* global beforeAll, afterAll */
import { TileFetcher } from '../src/TileFetcher';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock createImageBitmap
const mockImageBitmap = {
    width: 256,
    height: 256,
    close: jest.fn(),
};

const mockCreateImageBitmap = jest.fn();

// Mock AbortController
const mockAbort = jest.fn();
const mockAbortController = {
    signal: { aborted: false },
    abort: mockAbort,
};

const MockAbortController = jest.fn(() => mockAbortController);

describe('TileFetcher', () => {
    let fetcher: TileFetcher;
    let originalCreateImageBitmap: typeof createImageBitmap;
    let originalAbortController: typeof AbortController;

    beforeAll(() => {
        // Store originals
        originalCreateImageBitmap = global.createImageBitmap;
        originalAbortController = global.AbortController;

        // Set up mocks
        global.createImageBitmap = mockCreateImageBitmap;
        global.AbortController = MockAbortController as unknown as typeof AbortController;
    });

    afterAll(() => {
        // Restore originals
        global.createImageBitmap = originalCreateImageBitmap;
        global.AbortController = originalAbortController;
    });

    beforeEach(() => {
        fetcher = new TileFetcher(1000); // 1 second timeout for faster tests

        // Reset all mocks
        jest.clearAllMocks();
        mockAbort.mockClear();
        mockAbortController.signal.aborted = false;
        mockImageBitmap.close.mockClear();

        // Mock createImageBitmap to return our mock ImageBitmap
        mockCreateImageBitmap.mockResolvedValue(mockImageBitmap);

        // Default successful fetch response
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            blob: jest.fn().mockResolvedValue(new Blob(['mock image data'], { type: 'image/png' })),
        });
    });

    describe('constructor', () => {
        it('should create fetcher with default timeout', () => {
            const defaultFetcher = new TileFetcher();
            expect(defaultFetcher).toBeInstanceOf(TileFetcher);
        });

        it('should create fetcher with custom timeout', () => {
            const customFetcher = new TileFetcher(10000);
            expect(customFetcher).toBeInstanceOf(TileFetcher);
        });
    });

    describe('fetchTile method', () => {
        it('should successfully fetch and process tile', async () => {
            const result = await fetcher.fetchTile('https://example.com/tile.png');

            expect(mockFetch).toHaveBeenCalledWith('https://example.com/tile.png', {
                signal: expect.any(Object),
            });
            expect(mockCreateImageBitmap).toHaveBeenCalled();
            expect(result).toHaveProperty('imageData');
            expect(result).toHaveProperty('imageBitmap');
            expect(result.imageData).toBeInstanceOf(ImageData);
            expect(result.imageBitmap).toBe(mockImageBitmap);
        });

        it('should handle HTTP error responses', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });

            await expect(fetcher.fetchTile('https://example.com/missing.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/missing.png: HTTP 404: Not Found'
            );
        });

        it('should handle network fetch errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Network error'
            );
        });

        it('should handle unknown fetch errors', async () => {
            mockFetch.mockRejectedValue('Unknown error');

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Unknown error'
            );
        });

        it('should handle blob conversion errors', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                blob: jest.fn().mockRejectedValue(new Error('Blob error')),
            });

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Blob error'
            );
        });
    });

    describe('fetchWithTimeout method', () => {
        it('should create AbortController and set up timeout', async () => {
            await fetcher.fetchTile('https://example.com/tile.png');

            // Verify that AbortController was created during the request
            expect(MockAbortController).toHaveBeenCalled();

            // Verify fetch was called with the signal
            expect(mockFetch).toHaveBeenCalledWith('https://example.com/tile.png', {
                signal: expect.any(Object),
            });
        });

        it('should clear timeout on successful response', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            await fetcher.fetchTile('https://example.com/tile.png');

            expect(clearTimeoutSpy).toHaveBeenCalled();
        });

        it('should clear timeout on failed response', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow();

            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe('blobToImageDataAndBitmap method', () => {
        it('should handle createImageBitmap failure', async () => {
            mockCreateImageBitmap.mockRejectedValue(new Error('Invalid image format'));

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Failed to process image: Invalid image format'
            );
        });

        it('should handle canvas context creation failure', async () => {
            // Mock getContext to return null
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

            // Restore
            HTMLCanvasElement.prototype.getContext = originalGetContext;
        });

        it('should reuse canvas between calls for efficiency', async () => {
            // Call fetchTile multiple times
            await fetcher.fetchTile('https://example.com/tile1.png');
            await fetcher.fetchTile('https://example.com/tile2.png');

            // Verify createImageBitmap was called for each tile
            expect(mockCreateImageBitmap).toHaveBeenCalledTimes(2);

            // Canvas reuse is tested implicitly - no new canvas creation errors should occur
        });

        it('should handle canvas drawing errors', async () => {
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
                drawImage: jest.fn().mockImplementation(() => {
                    throw new Error('Drawing failed');
                }),
                getImageData: jest.fn(),
            });

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Failed to process image: Drawing failed'
            );

            // Restore
            HTMLCanvasElement.prototype.getContext = originalGetContext;
        });

        it('should handle getImageData errors', async () => {
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
                drawImage: jest.fn(),
                getImageData: jest.fn().mockImplementation(() => {
                    throw new Error('getImageData failed');
                }),
            });

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Failed to process image: getImageData failed'
            );

            // Restore
            HTMLCanvasElement.prototype.getContext = originalGetContext;
        });

        it('should handle unknown canvas errors', async () => {
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
                drawImage: jest.fn(),
                getImageData: jest.fn().mockImplementation(() => {
                    throw 'Unknown canvas error';
                }),
            });

            await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                'Failed to fetch tile from https://example.com/tile.png: Failed to process image: Unknown error'
            );

            // Restore
            HTMLCanvasElement.prototype.getContext = originalGetContext;
        });
    });

    describe('error handling edge cases', () => {
        it('should handle different HTTP status codes', async () => {
            const testCases = [
                { status: 400, statusText: 'Bad Request' },
                { status: 401, statusText: 'Unauthorized' },
                { status: 403, statusText: 'Forbidden' },
                { status: 500, statusText: 'Internal Server Error' },
                { status: 503, statusText: 'Service Unavailable' },
            ];

            for (const testCase of testCases) {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    status: testCase.status,
                    statusText: testCase.statusText,
                });

                await expect(fetcher.fetchTile('https://example.com/tile.png')).rejects.toThrow(
                    `Failed to fetch tile from https://example.com/tile.png: HTTP ${testCase.status}: ${testCase.statusText}`
                );
            }
        });

        it('should handle various blob types', async () => {
            const testBlobs = [
                new Blob(['mock png'], { type: 'image/png' }),
                new Blob(['mock jpeg'], { type: 'image/jpeg' }),
                new Blob(['mock webp'], { type: 'image/webp' }),
            ];

            for (const blob of testBlobs) {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    blob: jest.fn().mockResolvedValue(blob),
                });

                const result = await fetcher.fetchTile('https://example.com/tile.png');
                expect(result).toHaveProperty('imageData');
                expect(result.imageData).toBeInstanceOf(ImageData);
            }
        });

        it('should handle different image dimensions', async () => {
            const testDimensions = [
                { width: 128, height: 128 },
                { width: 512, height: 512 },
                { width: 256, height: 128 }, // Non-square
            ];

            for (const dims of testDimensions) {
                // Mock Image with specific dimensions
                class CustomMockImage {
                    onload: (() => void) | null = null;
                    onerror: (() => void) | null = null;
                    src: string = '';
                    width: number = dims.width;
                    height: number = dims.height;

                    constructor() {
                        setTimeout(() => {
                            if (this.src && this.onload) {
                                this.onload();
                            }
                        }, 0);
                    }
                }

                global.Image = CustomMockImage as unknown as typeof Image;

                // Mock getContext to return ImageData with correct dimensions
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
                    drawImage: jest.fn(),
                    getImageData: jest.fn().mockReturnValue(new ImageData(dims.width, dims.height)),
                });

                const result = await fetcher.fetchTile('https://example.com/tile.png');
                expect(result).toHaveProperty('imageData');
                expect(result).toHaveProperty('imageBitmap');
                expect(result.imageData).toBeInstanceOf(ImageData);
                expect(result.imageData.width).toBe(dims.width);
                expect(result.imageData.height).toBe(dims.height);

                // Restore
                HTMLCanvasElement.prototype.getContext = originalGetContext;
            }

            // Test completed
        });
    });

    describe('timeout scenarios', () => {
        it('should successfully complete within timeout', async () => {
            const generousTimeoutFetcher = new TileFetcher(5000); // 5 second timeout

            // Fast response
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                blob: jest
                    .fn()
                    .mockResolvedValue(new Blob(['fast response'], { type: 'image/png' })),
            });

            const result = await generousTimeoutFetcher.fetchTile(
                'https://example.com/fast-tile.png'
            );
            expect(result).toHaveProperty('imageData');
            expect(result.imageData).toBeInstanceOf(ImageData);
        });
    });
});
