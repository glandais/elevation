# @glandais/elevation - NPM Library Specification

## 📋 Project Overview

### Purpose

Create a TypeScript library for retrieving elevation data from geographic coordinates using terrain RGB tiles.

### Package Information

- **Name**: `@glandais/elevation`
- **Registry**: NPM official repository
- **License**: MIT
- **Node Version**: >=18

## 🎯 Core Features

### Primary API

```typescript
// Basic usage
const elevationProvider = new ElevationProvider();
const elevation = await elevationProvider.getElevation(47.2, -1.5);

// With configuration
const provider = new ElevationProvider({
    zoomLevel: 12, // Tile zoom level (default: 12 for 30m resolution)
    cacheSize: 100, // Maximum tiles in memory
});
```

### Data Source

- **Tile Service**: AWS S3 Terrarium format
- **URL Pattern**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`
- **Tile Format**: RGB-encoded elevation (Terrarium encoding)
- **Coordinate System**: Web Mercator (EPSG:3857) for tiles
- **Elevation Calculation**: `elevation = (red * 256 + green + blue / 256) - 32768`
- **Attribution Required**: Must include attribution as per [Joerd/Tilezen attribution requirements](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)

### Zoom Level Strategy

- **Default Zoom**: Level 12 (38.2m resolution at equator, ~30m SRTM data)
- **Configurable Range**: 0-15 (higher zoom = better resolution but more tiles)

## 🏗️ Technical Architecture

### Core Components

1. **ElevationProvider**: Main API class
2. **TileCache**: In-memory LRU cache with configurable size
3. **TileFetcher**: HTTP client
4. **CoordinateConverter**: WGS84 ↔ tile coordinates conversion
5. **ElevationDecoder**: RGB to elevation conversion with interpolation

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ESNext
- **Strict Mode**: Enabled
- **Source Maps**: Generated
- **Declaration Files**: Generated (.d.ts)
- **Path Aliases**: `@/*` for src directory

### Build Configuration (Vite)

- **Entry Point**: `src/index.ts`
- **Output Formats**:
    - ESM (ES modules) - default
    - UMD (Universal Module Definition) - for CDN
    - IIFE (minified) - for browser scripts
- **External Dependencies**: None
- **Tree Shaking**: Enabled
- **Minification**: Terser for production builds

## 🧪 Testing Strategy

### Test Coverage Requirements

- **Unit Tests**: ≥95% coverage
- **Integration Tests**: Core workflows
- **Edge Cases**: Boundary coordinates, network failures, cache behavior

### Test Framework

- **Runner**: Vitest (Vite-native testing)
- **Assertions**: Built-in Vitest assertions
- **Mocking**: Network requests, tile fetching
- **Coverage**: c8 or built-in Vitest coverage

## 🔧 Development Workflow

### Code Quality Tools

- **Formatter**: Prettier with standard config
- **Linter**: ESLint with TypeScript rules
- **Pre-commit Hooks**: Husky + lint-staged
- **Commit Convention**: Conventional Commits

### Scripts

```json
{
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "test": "vitest --run",
        "test:coverage": "vitest run --coverage",
        "lint": "eslint . --ext .ts",
        "format": "prettier --write .",
        "typecheck": "tsc --noEmit",
        "precommit": "lint-staged",
        "benchmark": "tsx benchmarks/performance.ts",
        "release": "semantic-release"
    }
}
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

#### CI Workflow (on push/PR)

1. Checkout code
2. Setup Node.js (matrix: 18, 20, 22)
3. Install dependencies
4. Run linting
5. Run type checking
6. Run tests with coverage
7. Upload coverage to Codecov
8. Build all formats
9. Check bundle size

#### Release Workflow (on main branch)

1. Semantic Release analysis
2. Version bump based on commits
3. Generate changelog
4. Build production bundles
5. Publish to NPM
6. Create GitHub release
7. Update documentation

### Dependency Management

- **Dependabot**: Configured for weekly updates
- **Security Scanning**: GitHub security advisories
- **License Checking**: Ensure compatible licenses

## 🌍 Browser Compatibility

### Target Browsers

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android

### Polyfills

- None required for modern browsers
- Optional fetch polyfill for older environments

## 📝 Documentation

### API Documentation

- TypeDoc for automatic API docs generation
- JSDoc comments for all public methods
- Usage examples in documentation
- Migration guides for version updates

### README Sections

- Quick start guide
- Installation instructions
- API reference
- Configuration options
- Examples
- Attribution notice (Joerd/Tilezen data sources)
- Contributing guidelines
- License information

## ⚖️ Legal & Attribution

### Data Attribution

The library uses elevation data that requires proper attribution:

- **Required Text**: Include attribution to data sources as specified in [Joerd documentation](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
- **Attribution Example**:
    ```
    Elevation data from multiple sources including SRTM, GMTED, NED and ETOPO1.
    Data processing by Mapzen/Tilezen. See https://github.com/tilezen/joerd for details.
    ```
- **Display Requirements**: Attribution must be visible in:
    - Library documentation (README)
    - Generated API documentation
    - Any application using the library (provide attribution helper method)
