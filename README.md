# @glandais/elevation

[![npm version](https://badge.fury.io/js/@glandais%2Felevation.svg)](https://badge.fury.io/js/@glandais%2Felevation)
[![Build Status](https://github.com/glandais/elevation/workflows/Develop/badge.svg)](https://github.com/glandais/elevation/actions)
[![Coverage Status](https://coveralls.io/repos/github/glandais/elevation/badge.svg)](https://coveralls.io/github/glandais/elevation)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/glandais/elevation/blob/main/LICENSE)

A TypeScript library for retrieving elevation data from geographic coordinates using terrain RGB tiles.

- 🚀 **[GitHub](https://github.com/glandais/elevation)**
- 📦 **[npm package](https://www.npmjs.com/package/@glandais/elevation)**
- 🌐 **[Live Demo](https://glandais.github.io/elevation/)**

## Features

- 🗺️ **High-precision elevation data** from SRTM, GMTED, NED, and ETOPO1 sources
- 🚀 **High-performance caching** with LRU cache for optimal memory usage
- 📱 **Browser-native** with no external dependencies
- 🎯 **TypeScript-first** with complete type definitions
- 🔧 **Configurable zoom levels** (0-15) for different resolution requirements
- 📦 **Multiple build formats** (ES modules, UMD, IIFE)
- 🧪 **Thoroughly tested** with >95% code coverage
- 🌍 **Bilinear interpolation** for smoother elevation values
- 📈 **Elevation profiling** between coordinates and along multi-point paths
- 🎛️ **Distance-based smoothing** with configurable window sizes
- 🔬 **Douglas-Peucker filtering** for elevation profile simplification

## Quick Start

### Installation

```bash
npm install @glandais/elevation
```

### Basic Usage

```typescript
import { ElevationProvider } from '@glandais/elevation';

// Create elevation provider with default settings
const elevationProvider = new ElevationProvider();

// Get elevation at specific coordinates (with interpolation enabled by default)
const elevation = await elevationProvider.getElevation(47.2, -1.5);
console.log(`Elevation: ${elevation}m`);

// Get elevation without interpolation
const rawElevation = await elevationProvider.getElevation(47.2, -1.5, { interpolation: false });
console.log(`Raw elevation: ${rawElevation}m`);
```

### Advanced Configuration

```typescript
import { ElevationProvider } from '@glandais/elevation';

const provider = new ElevationProvider({
    zoomLevel: 12, // Tile zoom level (default: 12 for ~30m resolution)
    cacheSize: 100, // Maximum tiles in memory cache (default: 100)
    timeout: 5000, // Request timeout in milliseconds (default: 5000)
    tileUrlTemplate: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
});

// Batch elevation requests
const coordinates = [
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 48.8, longitude: 2.3 },
    { latitude: 51.5, longitude: -0.1 },
];

const elevations = await provider.getElevationsFrom(coordinates);
console.log('Elevations:', elevations); // [elevation1, elevation2, elevation3]
```

### Cache Management

```typescript
// Clear cache when needed
provider.clearCache();
```

### Elevation Profiling

The library provides advanced elevation profiling capabilities for analyzing terrain along paths.

#### Simple Elevation Profile

```typescript
// Get elevation profile between two points using getElevationsAlong
const profile = await provider.getElevationsAlong(
    [
        { latitude: 47.2, longitude: -1.5 }, // Start point
        { latitude: 47.25, longitude: -1.45 }, // End point
    ],
    { step: 25 }
); // 25 meters between points

console.log(`Profile contains ${profile.length} elevation points`);
profile.forEach((point, index) => {
    console.log(`Point ${index}: ${point.latitude}, ${point.longitude} - ${point.elevation}m`);
});
```

#### Multi-Point Path Profile

```typescript
// Define a hiking trail with multiple waypoints
const hikingTrail = [
    { latitude: 47.2, longitude: -1.5 }, // Trailhead
    { latitude: 47.22, longitude: -1.48 }, // First viewpoint
    { latitude: 47.24, longitude: -1.46 }, // Ridge
    { latitude: 47.26, longitude: -1.44 }, // Summit
];

// Get detailed elevation profile with smoothing
const trailProfile = await provider.getElevationsAlong(hikingTrail, {
    step: 10, // 10 meters between points
    smoothingOptions: {
        enabled: true,
        windowSize: 30, // 30-meter smoothing window
    },
    filterOptions: {
        enabled: true,
        tolerance: 3, // 3-meter tolerance for filtering
        zExaggeration: 2, // Emphasize elevation changes
    },
});

// Analyze the trail
const elevations = trailProfile.map(p => p.elevation);
const minElevation = Math.min(...elevations);
const maxElevation = Math.max(...elevations);
const totalClimb = elevations.reduce((climb, elev, i) => {
    return i > 0 && elev > elevations[i - 1] ? climb + (elev - elevations[i - 1]) : climb;
}, 0);

console.log(`Trail analysis:`);
console.log(`- Distance: ${trailProfile.length * 10}m`);
console.log(`- Elevation range: ${minElevation}m to ${maxElevation}m`);
console.log(`- Total climb: ${totalClimb.toFixed(1)}m`);
```

## API Reference

### ElevationProvider

The main class for elevation data retrieval.

#### Constructor

```typescript
new ElevationProvider(config?: ElevationProviderConfig)
```

**Parameters:**

- `config` (optional): Configuration options

**Configuration Options:**

| Option            | Type     | Default    | Description                                        |
| ----------------- | -------- | ---------- | -------------------------------------------------- |
| `zoomLevel`       | `number` | `12`       | Tile zoom level (0-15). Higher = better resolution |
| `cacheSize`       | `number` | `100`      | Maximum tiles in memory cache                      |
| `timeout`         | `number` | `5000`     | Request timeout in milliseconds                    |
| `tileUrlTemplate` | `string` | AWS S3 URL | Custom tile URL template                           |

#### Methods

##### `getElevation(latitude: number, longitude: number, options?: GetElevationOptions): Promise<number>`

Get elevation at specific coordinates.

```typescript
// With default interpolation (enabled)
const elevation = await provider.getElevation(47.2, -1.5);

// Without interpolation
const rawElevation = await provider.getElevation(47.2, -1.5, { interpolation: false });
```

##### `getElevationsFrom(coordinates: Iterable<Coordinates>, options?: GetElevationsFromOptions): Promise<number[]>`

Batch get elevations for multiple coordinates from an iterable.

```typescript
const elevations = await provider.getElevationsFrom([
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 48.8, longitude: 2.3 },
]);

// Without interpolation
const rawElevations = await provider.getElevationsFrom(coordinates, { interpolation: false });
```

##### `getElevationsAlong(path: Coordinates[], options?: GetElevationsAlongOptions): Promise<CoordinatesElevation[]>`

Get elevation profile along a multi-point path with optional smoothing and filtering.

```typescript
const path = [
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 47.25, longitude: -1.45 },
    { latitude: 47.3, longitude: -1.4 },
];

// Basic elevation profile
const profile = await provider.getElevationsAlong(path, { step: 10 });

// With smoothing and filtering
const smoothedProfile = await provider.getElevationsAlong(path, {
    step: 10,
    smoothingOptions: { enabled: true, windowSize: 50 },
    filterOptions: { enabled: true, tolerance: 5, zExaggeration: 3 },
});
```

##### `clearCache(): void`

Clear the tile cache.

```typescript
provider.clearCache();
```

##### `getConfig(): ElevationProviderConfig`

Get current configuration.

```typescript
const config = provider.getConfig();
```

#### Static Methods

##### `getAttribution(): Attribution`

Get required attribution information for elevation data.

```typescript
const attribution = ElevationProvider.getAttribution();
console.log(attribution.text);
// "Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1.
//  Data processing by Mapzen/Tilezen."
```

### Types

#### Core Interfaces

```typescript
interface ElevationProviderConfig {
    readonly zoomLevel?: number;
    readonly cacheSize?: number;
    readonly timeout?: number;
    readonly tileUrlTemplate?: string;
}

interface Coordinates {
    readonly latitude: number;
    readonly longitude: number;
}

interface CoordinatesElevation extends Coordinates {
    readonly elevation: number;
}

interface Attribution {
    readonly text: string;
    readonly url?: string;
}
```

#### Options Interfaces

```typescript
interface GetElevationOptions {
    readonly interpolation?: boolean; // Default: true
}

interface GetElevationsFromOptions {
    readonly interpolation?: boolean; // Default: true
}

interface GetElevationsAlongOptions {
    readonly step?: number; // Distance between points in meters (default: 10)
    readonly interpolation?: boolean; // Default: true
    readonly smoothingOptions?: SmoothingOptions;
    readonly filterOptions?: FilterOptions;
}

interface SmoothingOptions {
    readonly enabled?: boolean; // Default: false
    readonly windowSize?: number; // Smoothing window in meters (default: 50)
}

interface FilterOptions {
    readonly enabled?: boolean; // Default: false
    readonly tolerance?: number; // Max distance from simplified line in meters (default: 10)
    readonly zExaggeration?: number; // Elevation exaggeration factor (default: 3)
}
```

## Resolution and Accuracy

| Zoom Level   | Resolution at Equator | Use Case                    |
| ------------ | --------------------- | --------------------------- |
| 0-4          | >10km                 | Continental overview        |
| 5-8          | 1-10km                | Regional analysis           |
| 9-11         | 100m-1km              | Local area analysis         |
| 12 (default) | ~30m                  | Detailed terrain analysis   |
| 13-15        | <30m                  | High-precision applications |

The library uses terrain data processed from multiple sources:

- **SRTM** (Shuttle Radar Topography Mission) - Global 30m resolution
- **GMTED** (Global Multi-resolution Terrain Elevation Data)
- **NED** (National Elevation Dataset) - US high-resolution data
- **ETOPO1** - Global relief model for bathymetry

## Browser Compatibility

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android

## Performance Considerations

### Memory Usage

Each tile uses approximately 262KB of memory (256×256×4 bytes). With the default cache size of 100 tiles, expect ~25MB memory usage for the cache.

### Network Requests

- Consider reducing `zoomLevel` for applications with lower precision requirements

### Optimization Tips

```typescript
// Good: Reuse provider instance
const provider = new ElevationProvider();
const elevation1 = await provider.getElevation(47.2, -1.5);
const elevation2 = await provider.getElevation(47.3, -1.6);

// Better: Batch requests
const elevations = await provider.getElevationsFrom([
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 47.3, longitude: -1.6 },
]);

// Best: Use elevation profiling for paths
const profile = await provider.getElevationsAlong(
    [
        { latitude: 47.2, longitude: -1.5 },
        { latitude: 47.3, longitude: -1.6 },
    ],
    { step: 50 }
);
```

## Error Handling

The library provides detailed error messages for common issues:

```typescript
try {
    const elevation = await provider.getElevation(90, 0); // Invalid latitude
} catch (error) {
    console.error(error.message); // "Failed to get elevation: Invalid latitude: 90. Must be between -85.0511 and 85.0511"
}
```

Common errors:

- Invalid coordinates (latitude: -85.0511 to 85.0511, longitude: -180 to 180)
- Network timeouts or failures
- Invalid configuration parameters
- Browser environment not supported

## Attribution Requirements

**IMPORTANT**: This library uses elevation data that requires proper attribution. You must include the following attribution in your application:

### Required Attribution Text

```
Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1.
Data processing by Mapzen/Tilezen.
See https://github.com/tilezen/joerd for details.
```

### Implementation

```typescript
// Get attribution programmatically
const attribution = ElevationProvider.getAttribution();

// Display in your application's footer, about page, or credits
document.getElementById('attribution').textContent = attribution.text;

// Or include in your application's legal notices
console.log('Data attribution:', attribution.text);
console.log('More info:', attribution.url);
```

### Legal Requirements

- Attribution must be visible to end users
- Include in documentation, about pages, or credits
- Required for all applications using this library
- See [Joerd attribution requirements](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) for complete details

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/glandais/elevation.git
cd elevation

# Install dependencies
npm install

# Run development server
npm run dev
```

### Scripts

```bash
npm run build         # Build library
npm run test          # Run tests
npm run test:coverage # Run tests with coverage
npm run lint          # Lint code
npm run format        # Format code
npm run typecheck     # Type checking
```

### Testing

The library includes comprehensive tests with >95% coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## TODO

[ ] Consider WebWorker support for large batch operations
[ ] Add streaming/progressive loading for large paths

---

**Data Attribution**: Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1. Data processing by Mapzen/Tilezen. See https://github.com/tilezen/joerd for details.
