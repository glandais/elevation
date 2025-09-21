// Test setup

// Define __DEV__ as true for tests to enable logging in test environment
// This allows us to test the logger functionality
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__DEV__ = true;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__NODE__ = false;

// Global mock for Logger to silence console output during tests
// Only applies to imports from '../src/utils/Logger' and '../src/utils'
// The Logger.test.ts file will override this mock for its own testing
jest.mock('../src/utils/Logger', () => ({
    createLogger: jest.fn(() => ({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        timeLevel: jest.fn(),
        timeEndLevel: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        dirLevel: jest.fn(),
        dir: jest.fn(),
        clear: jest.fn(),
    })),
    Logger: jest.fn().mockImplementation(() => ({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        timeLevel: jest.fn(),
        timeEndLevel: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        dirLevel: jest.fn(),
        dir: jest.fn(),
        clear: jest.fn(),
    })),
    LogLevel: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4,
    },
}));

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
