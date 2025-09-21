# Elevation Library Project Overview

## Project Purpose

@glandais/elevation is a TypeScript library for retrieving elevation data from geographic coordinates using terrain RGB tiles. It fetches elevation tiles from AWS S3 and decodes RGB-encoded elevation data.

## Tech Stack

- **Language**: TypeScript (target: ES2020)
- **Build Tool**: Vite
- **Test Framework**: Jest (with ts-jest) for unit tests, Playwright for browser tests
- **Package Manager**: npm (Node >=18)
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Version Control**: Git with Husky hooks
- **CI/CD**: GitHub Actions with semantic-release

## Key Features

- Zero runtime dependencies (browser-native only)
- High-precision elevation data from SRTM, GMTED, NED, ETOPO1 sources
- LRU cache for performance optimization
- Bilinear interpolation for smoother elevation values
- Elevation profiling along paths
- Distance-based smoothing with configurable window sizes
- Douglas-Peucker filtering for profile simplification
- Multiple build formats (ES modules, UMD, IIFE)

## Architecture

- Modular design with clear separation of concerns
- Main API: ElevationProvider class
- Core modules: Cache, TileFetcher, CoordinateConverter, ElevationDecoder
- Path aliasing: @/ maps to src/ directory
- Terrarium encoding: elevation = (red \* 256 + green + blue / 256) - 32768

## Important Constraints

1. **Zero Runtime Dependencies**: Must remain completely dependency-free
2. **Attribution Required**: Must include data source attribution
3. **Browser-Only**: Uses browser-native ImageData API
4. **Coordinate Limits**: Latitude between -85.0511 and 85.0511 (Web Mercator bounds)
5. **Memory Usage**: Each tile uses ~262KB (256×256×4 bytes)
