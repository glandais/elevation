# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library (`@glandais/elevation`) for retrieving elevation data from geographic coordinates using terrain RGB tiles. The library fetches elevation tiles from AWS S3 and decodes RGB-encoded elevation data.

## Key Commands

### Development

```bash
npm run build          # Build library with Vite (ES, UMD, IIFE formats)
npm run typecheck      # Type checking with TypeScript
npm run lint           # Lint with ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format with Prettier
```

### Testing

```bash
npm test               # Run Jest tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

### Release

```bash
npm run semantic-release  # Automated release (CI/CD only)
```

## Architecture

### Core Module Structure

The library follows a modular architecture with clear separation of concerns:

- **ElevationProvider** (`src/ElevationProvider.ts`): Main API class that coordinates all operations
- **TileCache** (`src/cache/TileCache.ts`): LRU cache implementation for tile data
- **TileFetcher** (`src/fetcher/TileFetcher.ts`): Handles HTTP requests to fetch terrain tiles
- **CoordinateConverter** (`src/converter/CoordinateConverter.ts`): Converts between WGS84 and Web Mercator tile coordinates
- **ElevationDecoder** (`src/decoder/ElevationDecoder.ts`): Decodes RGB pixels to elevation values using Terrarium encoding

### Data Flow

1. User requests elevation for latitude/longitude
2. CoordinateConverter transforms WGS84 to tile coordinates (z/x/y)
3. TileCache checks for cached tile data
4. If not cached, TileFetcher retrieves PNG tile from AWS S3
5. ElevationDecoder extracts elevation from RGB pixel values
6. Optional bilinear interpolation for smoother results

### Key Technical Details

**Terrarium Encoding Formula:**

```
elevation = (red * 256 + green + blue / 256) - 32768
```

**Path Aliasing:**

- `@/` maps to `src/` directory (configured in tsconfig.json and vite.config.ts)

**Tile URL Pattern:**

```
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
```

**Default Configuration:**

- Zoom Level: 12 (approximately 30m resolution)
- Cache Size: 100 tiles maximum
- Timeout: 5000ms for HTTP requests

## Important Constraints

1. **Attribution Required**: Any usage must include attribution to data sources (SRTM, GMTED, NED, ETOPO1) and Mapzen/Tilezen processing
2. **Browser-Only**: Library uses browser-native ImageData API, not compatible with Node.js
3. **Coordinate Limits**: Latitude must be between -85.0511 and 85.0511 (Web Mercator bounds)
4. **Memory Usage**: Each tile uses ~262KB (256×256×4 bytes)

## Testing Approach

Tests use Jest with jsdom environment. Key test areas:

- Coordinate conversion accuracy
- Cache behavior and LRU eviction
- Network error handling
- Bilinear interpolation correctness
- Edge cases (boundary coordinates, invalid inputs)
