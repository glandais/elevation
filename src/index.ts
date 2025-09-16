// Main API exports
export { ElevationProvider } from './ElevationProvider';

// Filtering utilities
export { DouglasPeucker } from './utils/DouglasPeucker';
export { EcefConverter } from './utils/EcefConverter';
export { Vector3D } from './utils/Vector3D';

// Type exports
export type {
    Coordinates,
    CoordinatesElevation,
    ElevationProviderConfig,
    Attribution,
    FilterOptions,
    GetElevationOptions,
    GetElevationsFromOptions,
    GetElevationsBetweenOptions,
    GetElevationsAlongOptions,
} from './types';
