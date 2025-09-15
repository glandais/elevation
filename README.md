# @glandais/elevation

[![npm version](https://badge.fury.io/js/@glandais%2Felevation.svg)](https://badge.fury.io/js/@glandais%2Felevation)
[![Build Status](https://github.com/glandais/elevation/workflows/release/badge.svg)](https://github.com/glandais/elevation/actions)
[![Coverage Status](https://coveralls.io/repos/github/glandais/elevation/badge.svg)](https://coveralls.io/github/glandais/elevation)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/glandais/elevation/blob/main/LICENSE)

A TypeScript library for retrieving elevation data from geographic coordinates using terrain RGB tiles.

📦 **[npm package](https://www.npmjs.com/package/@glandais/elevation)** | 🌐 **[Live Demo](https://glandais.github.io/elevation/)**

## Features

- 🗺️ **High-precision elevation data** from SRTM, GMTED, NED, and ETOPO1 sources
- 🚀 **High-performance caching** with LRU cache for optimal memory usage
- 📱 **Browser-native** with no external dependencies
- 🎯 **TypeScript-first** with complete type definitions
- 🔧 **Configurable zoom levels** (0-15) for different resolution requirements
- 📦 **Multiple build formats** (ES modules, UMD, IIFE)
- 🧪 **Thoroughly tested** with >95% code coverage
- 🌍 **Bilinear interpolation** for smoother elevation values

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

// Get elevation at specific coordinates
const elevation = await elevationProvider.getElevation(47.2, -1.5);
console.log(`Elevation: ${elevation}m`);

// Get smoother elevation with bilinear interpolation
const interpolatedElevation = await elevationProvider.getInterpolatedElevation(47.2, -1.5);
console.log(`Interpolated elevation: ${interpolatedElevation}m`);
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

const elevations = await provider.getElevations(coordinates);
console.log('Elevations:', elevations); // [elevation1, elevation2, elevation3]
```

### Preloading for Performance

```typescript
// Preload tiles for a bounding box
const southWest = { latitude: 47.0, longitude: -2.0 };
const northEast = { latitude: 47.5, longitude: -1.0 };

await provider.preloadTiles(southWest, northEast);
console.log('Tiles preloaded for region');

// Subsequent requests in this area will be much faster
const elevation = await provider.getElevation(47.2, -1.5); // Uses cached tile
```

### Cache Management

```typescript
// Get cache statistics
const stats = provider.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize} tiles, ${stats.memoryUsage} bytes`);

// Clear cache
provider.clearCache();
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

##### `getElevation(latitude: number, longitude: number): Promise<number>`

Get elevation at specific coordinates.

```typescript
const elevation = await provider.getElevation(47.2, -1.5);
```

##### `getInterpolatedElevation(latitude: number, longitude: number): Promise<number>`

Get interpolated elevation for smoother results.

```typescript
const elevation = await provider.getInterpolatedElevation(47.2, -1.5);
```

##### `getElevations(coordinates: Coordinates[]): Promise<number[]>`

Batch get elevations for multiple coordinates.

```typescript
const elevations = await provider.getElevations([
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 48.8, longitude: 2.3 },
]);
```

##### `preloadTiles(southWest: Coordinates, northEast: Coordinates): Promise<void>`

Preload tiles for a bounding box.

```typescript
await provider.preloadTiles(
    { latitude: 47.0, longitude: -2.0 },
    { latitude: 47.5, longitude: -1.0 }
);
```

##### `getCacheStats(): CacheStats`

Get cache usage statistics.

```typescript
const stats = provider.getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize} tiles`);
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

##### `isEnvironmentSupported(): boolean`

Check if the current environment supports the elevation provider.

```typescript
if (ElevationProvider.isEnvironmentSupported()) {
    const provider = new ElevationProvider();
}
```

### Types

```typescript
interface Coordinates {
    readonly latitude: number;
    readonly longitude: number;
}

interface ElevationProviderConfig {
    readonly zoomLevel?: number;
    readonly cacheSize?: number;
    readonly timeout?: number;
    readonly tileUrlTemplate?: string;
}

interface Attribution {
    readonly text: string;
    readonly url?: string;
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

- Tiles are cached with `Cache-Control: max-age=86400` (24 hours)
- Use `preloadTiles()` for areas with known usage patterns
- Consider reducing `zoomLevel` for applications with lower precision requirements

### Optimization Tips

```typescript
// Good: Reuse provider instance
const provider = new ElevationProvider();
const elevation1 = await provider.getElevation(47.2, -1.5);
const elevation2 = await provider.getElevation(47.3, -1.6);

// Better: Batch requests
const elevations = await provider.getElevations([
    { latitude: 47.2, longitude: -1.5 },
    { latitude: 47.3, longitude: -1.6 },
]);

// Best: Preload + batch
await provider.preloadTiles(
    { latitude: 47.0, longitude: -2.0 },
    { latitude: 47.5, longitude: -1.0 }
);
const elevations = await provider.getElevations(coordinates);
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
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Data Attribution**: Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1. Data processing by Mapzen/Tilezen. See https://github.com/tilezen/joerd for details.
