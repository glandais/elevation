// Main API exports
export { ElevationProvider } from './ElevationProvider';

// Filtering and smoothing utilities
export { DouglasPeucker } from './utils/DouglasPeucker';
export { EcefConverter } from './utils/EcefConverter';
export { Vector3D } from './utils/Vector3D';
export { ElevationSmoother } from './utils/ElevationSmoother';

// Type exports
export type {
    Coordinates,
    CoordinatesElevation,
    ElevationProviderConfig,
    Attribution,
    FilterOptions,
    SmoothingOptions,
    GetElevationOptions,
    GetElevationsFromOptions,
    GetElevationsAlongOptions,
} from './types';
