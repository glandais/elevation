import { ElevationProvider, DouglasPeucker, EcefConverter, Vector3D } from '../src/index';
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
            timeout: 5000,
        };

        expect(config).toBeDefined();
        expect(typeof config.zoomLevel).toBe('number');
        expect(typeof config.cacheSize).toBe('number');
        expect(typeof config.tileUrlTemplate).toBe('string');
        expect(typeof config.timeout).toBe('number');
    });

    it('should export filtering utilities', () => {
        expect(DouglasPeucker).toBeDefined();
        expect(typeof DouglasPeucker.simplify).toBe('function');
        expect(typeof DouglasPeucker.estimateTolerance).toBe('function');
        expect(typeof DouglasPeucker.calculateReduction).toBe('function');

        expect(EcefConverter).toBeDefined();
        expect(typeof EcefConverter.toEcef).toBe('function');
        expect(typeof EcefConverter.convertBatch).toBe('function');

        expect(Vector3D).toBeDefined();
        expect(typeof Vector3D).toBe('function');
        // Test constructor
        const vector = new Vector3D(1, 2, 3);
        expect(vector.x).toBe(1);
        expect(vector.y).toBe(2);
        expect(vector.z).toBe(3);
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
