// Main API exports
export { ElevationProvider } from './ElevationProvider';
export { ElevationProvider as default } from './ElevationProvider';
export { ElevationSmoother } from './utils/ElevationSmoother';
export { ElevationGain, ELEVATION_GAIN_PRESETS } from './utils/ElevationGain';

// Type exports
export type {
    Coordinates,
    CoordinatesElevation,
    ElevationProviderConfig,
    Attribution,
    FilterOptions,
    SmoothingOptions,
    ElevationGainPreset,
    ElevationGainOptions,
    ElevationGainResult,
    GetElevationOptions,
    SetElevationsOptions,
    GetElevationsAlongOptions,
} from './types';
