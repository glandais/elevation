import { ElevationProvider } from '../src/index';
import type { ElevationProviderConfig, FilterOptions } from '../src/index';

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
        };

        expect(config).toBeDefined();
        expect(typeof config.zoomLevel).toBe('number');
        expect(typeof config.cacheSize).toBe('number');
        expect(typeof config.tileUrlTemplate).toBe('string');
    });

    it('should export FilterOptions type correctly', () => {
        const filterOptions: FilterOptions = {
            enabled: true,
            tolerance: 10,
            zExaggeration: 3,
        };

        expect(filterOptions).toBeDefined();
        expect(typeof filterOptions.enabled).toBe('boolean');
        expect(typeof filterOptions.tolerance).toBe('number');
        expect(typeof filterOptions.zExaggeration).toBe('number');
    });
});

describe('elevation gain exports', () => {
    it('should export ElevationGain and its presets', async () => {
        const index = await import('../src/index');
        expect(typeof index.ElevationGain.compute).toBe('function');
        expect(typeof index.ElevationGain.computeProfile).toBe('function');
        expect(index.ELEVATION_GAIN_PRESETS.dem).toEqual({ thresholdM: 3, smoothWindowM: 30 });
    });
});
