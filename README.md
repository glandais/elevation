# @glandais/elevation

[![npm version](https://badge.fury.io/js/@glandais%2Felevation.svg)](https://badge.fury.io/js/@glandais%2Felevation)
[![Build Status](https://github.com/glandais/elevation/workflows/Develop/badge.svg)](https://github.com/glandais/elevation/actions)
[![Coverage Status](https://coveralls.io/repos/github/glandais/elevation/badge.svg)](https://coveralls.io/github/glandais/elevation)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/glandais/elevation/blob/main/LICENSE)

A TypeScript library for retrieving elevation data from geographic coordinates using terrain RGB tiles.

- 🚀 **[GitHub](https://github.com/glandais/elevation)**
- 📦 **[npm package](https://www.npmjs.com/package/@glandais/elevation)**
- 📦 **[jsdelivr](https://www.jsdelivr.com/package/npm/@glandais/elevation)**
- 🌐 **[Live Demo](https://glandais.github.io/elevation/)**

## Features

- 🗺️ **High-precision elevation data** from SRTM, GMTED, NED, and ETOPO1 sources
- 🚀 **High-performance caching** with LRU cache for optimal memory usage
- 🌐 **Cross-platform support** for Browser and Node.js environments
- 🎯 **TypeScript-first** with complete type definitions
- 🔧 **Configurable zoom levels** (0-15) for different resolution requirements
- 📦 **Multiple build formats** (ES modules, CommonJS, UMD, IIFE)
- 🧪 **Thoroughly tested** with >95% code coverage
- 🌍 **Bilinear interpolation** for smoother elevation values
- 📈 **Elevation profiling** between coordinates and along multi-point paths
- 🎛️ **Distance-based smoothing** with configurable window sizes
- 🔬 **Douglas-Peucker filtering** for elevation profile simplification

## Installation

### npm

#### Browser

```bash
npm install @glandais/elevation
```

```javascript
// ES6 import (recommended)
import ElevationProvider, { Coordinates } from '@glandais/elevation';

// CommonJS
const { ElevationProvider } = require('@glandais/elevation');
// or
const ElevationProvider = require('@glandais/elevation').default;
```

#### Node.js

For Node.js environments, install with optional dependencies:

```bash
npm install @glandais/elevation canvas node-fetch abort-controller
```

```javascript
// ES6 import
import ElevationProvider from '@glandais/elevation';

// CommonJS
const { ElevationProvider } = require('@glandais/elevation');
```

### CDN

```html
<!-- Modern ES Module (recommended) -->
<script
    src="https://cdn.jsdelivr.net/npm/@glandais/elevation@3/dist/index.esm.js"
    type="module"
></script>

<!-- UMD (browser global) -->
<script src="https://cdn.jsdelivr.net/npm/@glandais/elevation@3/dist/index.umd.js"></script>

<!-- Minified version -->
<script src="https://cdn.jsdelivr.net/npm/@glandais/elevation@3/dist/index.min.js"></script>
```

### Local Download

```html
<!-- Download and host locally -->
<!-- For production, use the minified version -->
<script src="path/to/elevation.min.js"></script>

<!-- Or use the UMD version -->
<script src="path/to/elevation.umd.js"></script>
```

## Quick Start

### Basic usage

```typescript
// Get elevation at specific coordinates (with interpolation enabled by default)
const elevation = await elevationProvider.getElevation(47.2, -1.5);
console.log(`Elevation: ${elevation}m`);

// Get elevation without interpolation
const rawElevation = await elevationProvider.getElevation(47.2, -1.5, { interpolation: false });
console.log(`Raw elevation: ${rawElevation}m`);
```

### TypeScript

Full TypeScript support with accurate type definitions:

```typescript
import ElevationProvider from '@glandais/elevation';

// Create elevation elevationProvider with default settings
const elevationProvider = new ElevationProvider();
```

### JavaScript (ES Module)

```javascript
// Modern ES Module import from jsdelivr (recommended for browsers)
import ElevationProvider from 'https://cdn.jsdelivr.net/npm/@glandais/elevation@latest/+esm';

// Or with a custom name (you can use any name you want)
import MyElevation from 'https://cdn.jsdelivr.net/npm/@glandais/elevation@latest/+esm';

// Direct file import (alternative)
import ElevationProvider from 'https://cdn.jsdelivr.net/npm/@glandais/elevation@latest/dist/index.esm.js';

// Create elevation provider with default settings
const elevationProvider = new ElevationProvider();
```

### JavaScript (UMD/minified)

```javascript
// Create elevation elevationProvider with default settings
const elevationProvider = new window.Elevation.ElevationProvider();
```

### Advanced Configuration

```typescript
// or new window.Elevation.ElevationProvider
const elevationProvider = new ElevationProvider({
    zoomLevel: 12, // Tile zoom level (default: 12 for ~30m resolution)
    cacheSize: 100, // Maximum tiles in memory cache (default: 100)
    tileUrlTemplate: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
});

// Batch elevation requests
const coordinates = [
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 48.8, longitude: 2.3 },
    { latitude: 51.5, longitude: -0.1 },
];

await elevationProvider.setElevations(coordinates);
console.log('Elevations:', elevations); // [elevation1, elevation2, elevation3]
```

### Elevation Profiling

The library provides advanced elevation profiling capabilities for analyzing terrain along paths.

#### Simple Elevation Profile

```typescript
// Get elevation profile between two points using getElevationsAlong
const profile = await elevationProvider.getElevationsAlong(
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
const trailProfile = await elevationProvider.getElevationsAlong(hikingTrail, {
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
| `tileUrlTemplate` | `string` | AWS S3 URL | Custom tile URL template                           |

#### Methods

##### `getElevation(latitude: number, longitude: number, options?: GetElevationOptions): Promise<number>`

Get elevation at specific coordinates.

```typescript
// With default interpolation (enabled)
const elevation = await elevationProvider.getElevation(47.2, -1.5);

// Without interpolation
const rawElevation = await elevationProvider.getElevation(47.2, -1.5, { interpolation: false });
```

##### `setElevations(coordinates: Iterable<Coordinates>, options?: SetElevationsOptions): Promise<void>`

Batch get elevations for multiple coordinates from an iterable.

```typescript
await elevationProvider.setElevations([
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 48.8, longitude: 2.3 },
]);

// Without interpolation
await elevationProvider.setElevations(coordinates, {
    interpolation: false,
});
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
const profile = await elevationProvider.getElevationsAlong(path, { step: 10 });

// With smoothing and filtering
const smoothedProfile = await elevationProvider.getElevationsAlong(path, {
    step: 10,
    smoothingOptions: { enabled: true, windowSize: 50 },
    filterOptions: { enabled: true, tolerance: 5, zExaggeration: 3 },
});
```

##### `getConfig(): ElevationProviderConfig`

Get current configuration.

```typescript
const config = elevationProvider.getConfig();
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

interface SetElevationsOptions {
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

## Platform Compatibility

### Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android

### Node.js Support

- Node.js 18+ with optional dependencies:
    - `canvas`: For image processing
    - `node-fetch`: For HTTP requests (Node.js < 18)
    - `abort-controller`: For request cancellation (Node.js < 15)

## Performance Considerations

### Memory Usage

Each tile uses approximately 262KB of memory (256×256×4 bytes). With the default cache size of 100 tiles, expect ~25MB memory usage for the cache.

### Network Requests

- Consider reducing `zoomLevel` for applications with lower precision requirements

### Optimization Tips

```typescript
// Good: Reuse elevationProvider instance
const elevationProvider = new ElevationProvider();
const elevation1 = await elevationProvider.getElevation(47.2, -1.5);
const elevation2 = await elevationProvider.getElevation(47.3, -1.6);

// Better: Batch requests
await elevationProvider.setElevations([
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 47.3, longitude: -1.6 },
]);

// Best: Use elevation profiling for paths
const profile = await elevationProvider.getElevationsAlong(
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
    const elevation = await elevationProvider.getElevation(90, 0); // Invalid latitude
} catch (error) {
    console.error(error.message); // "Failed to get elevation: Invalid latitude: 90. Must be between -85.0511 and 85.0511"
}
```

Common errors:

- Invalid coordinates (latitude: -85.0511 to 85.0511, longitude: -180 to 180)
- Network timeouts or failures
- Invalid configuration parameters

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

### Logging (Development Only)

The library includes a lightweight logging system that is **completely removed in production builds** through build-time dead code elimination. This ensures zero overhead in production while providing helpful debugging information during development.

#### How It Works

- **Build-time constant**: Uses `__DEV__` constant that's replaced during build
- **Development**: `__DEV__ = true` - Logging is active
- **Production**: `__DEV__ = false` - All logging code is removed by the bundler
- **Zero dependencies**: Uses native console methods

#### Usage

```typescript
import { createLogger } from '@glandais/elevation';

// Create a logger with a namespace
const logger = createLogger('MyModule');

// Available log methods (only in development)
logger.debug('Detailed debug information', { data });
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred', error);

// Performance timing
logger.time('operation');
// ... perform operation ...
logger.timeEnd('operation');

// Grouped logging
logger.group('Processing batch');
logger.info('Item 1');
logger.info('Item 2');
logger.groupEnd();
```

#### Example Integration

```typescript
import { createLogger } from '@glandais/elevation';

class MyElevationProcessor {
    private logger = createLogger('Processor');

    async process(coordinates: Coordinates): Promise<number> {
        this.logger.debug('Processing coordinates', coordinates);
        this.logger.time('elevation-fetch');

        try {
            const elevation = await this.getElevation(coordinates);
            this.logger.info('Elevation retrieved', { elevation });
            return elevation;
        } catch (error) {
            this.logger.error('Failed to process', error);
            throw error;
        } finally {
            this.logger.timeEnd('elevation-fetch');
        }
    }
}
```

**Note**: All logging statements are completely eliminated from production builds, so you can freely add detailed logging without worrying about bundle size or performance impact.

### Development Workflow

The project includes an interactive demo that showcases library capabilities:

```bash
# Build and serve demo (one-time)
npm run dev              # Builds library and starts server at http://localhost:3000

# For active development (run in separate terminals):
npm run dev:serve        # Serves demo at http://localhost:3000
npm run dev:watch        # Watches and rebuilds library on changes
```

**Development Process:**

1. Run `npm run dev` to build and start the demo server
2. Open http://localhost:3000 to view the interactive demo
3. In a separate terminal, run `npm run dev:watch` for auto-rebuilding
4. Edit TypeScript files in `src/` - they'll automatically rebuild
5. Refresh browser to see changes in the demo

### Scripts

```bash
npm run check         # Verify all (lint, typecheck, test, build)
npm run build         # Build library
npm run dev           # Build and serve demo
npm run dev:watch     # Watch and rebuild library
npm run dev:serve     # Serve demo only
npm run test          # Run tests
npm run test:coverage # Run tests with coverage
npm run test:browser  # Run browser integration tests
npm run lint          # Lint code
npm run format        # Format code
npm run typecheck     # Type checking
```

### Testing

The library includes comprehensive tests with >95% coverage:

```bash
# Run all tests
npm test
npm test:browser

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
