// Test setup

// Mock ImageData for tests
global.ImageData = class ImageData {
    public readonly data: Uint8ClampedArray;
    public readonly width: number;
    public readonly height: number;

    constructor(width: number, height: number);
    constructor(data: Uint8ClampedArray, width: number, height?: number);
    constructor(dataOrWidth: Uint8ClampedArray | number, width: number, height?: number) {
        if (typeof dataOrWidth === 'number') {
            this.width = dataOrWidth;
            this.height = width;
            this.data = new Uint8ClampedArray(dataOrWidth * width * 4);
        } else {
            this.data = dataOrWidth;
            this.width = width;
            this.height = height || Math.floor(dataOrWidth.length / (width * 4));
        }
    }
} as unknown as typeof ImageData;

// Mock canvas for TileFetcher tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        getImageData: jest.fn().mockReturnValue(new ImageData(256, 256)),
    }),
    writable: true,
});
