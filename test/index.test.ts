import { ElevationProvider } from '../src/index';
import type { ElevationProviderConfig } from '../src/index';

describe('index exports', () => {
    it('should export ElevationProvider class', () => {
        expect(ElevationProvider).toBeDefined();
        expect(typeof ElevationProvider).toBe('function');
    });

    it('should allow creating ElevationProvider instance', () => {
        const config: ElevationProviderConfig = {
            zoomLevel: 10,
            cacheSize: 50,
        };

        expect(() => new ElevationProvider(config)).not.toThrow();
    });

    it('should export type correctly', () => {
        // This test ensures the type export works correctly
        const config: ElevationProviderConfig = {
            zoomLevel: 12,
            cacheSize: 100,
            tileUrlTemplate: 'https://example.com/{z}/{x}/{y}.png',
            timeout: 5000,
        };

        expect(config).toBeDefined();
        expect(typeof config.zoomLevel).toBe('number');
        expect(typeof config.cacheSize).toBe('number');
        expect(typeof config.tileUrlTemplate).toBe('string');
        expect(typeof config.timeout).toBe('number');
    });
});
