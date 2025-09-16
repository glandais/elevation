import { ElevationProvider } from '../../src';

declare global {
    interface Window {
        Elevation: {
            ElevationProvider: typeof ElevationProvider;
        };
    }
}

export {};
