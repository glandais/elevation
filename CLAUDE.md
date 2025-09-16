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
- **Cache** (`src/cache/Cache.ts`): LRU cache implementation for tile data
- **TileFetcher** (`src/fetcher/TileFetcher.ts`): Handles HTTP requests to fetch terrain tiles
- **CoordinateConverter** (`src/converter/CoordinateConverter.ts`): Converts between WGS84 and Web Mercator tile coordinates
- **ElevationDecoder** (`src/decoder/ElevationDecoder.ts`): Decodes RGB pixels to elevation values using Terrarium encoding

### Data Flow

1. User requests elevation for latitude/longitude
2. CoordinateConverter transforms WGS84 to tile coordinates (z/x/y)
3. Cache checks for cached tile data
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

## Feature Completion Requirements

**IMPORTANT: A feature is NOT considered complete until ALL of the following criteria are met:**

### Mandatory Completion Checklist

1. ✅ **Tests Updated**: All new functionality must have corresponding test cases
2. ✅ **Coverage Target**: Must achieve ~100% test coverage (minimum 98%)
3. ✅ **Quality Check**: `npm run check` must pass without any errors or warnings
4. ✅ **TypeScript**: No TypeScript errors (`npm run typecheck`)
5. ✅ **Linting**: No ESLint errors or warnings (`npm run lint`)
6. ✅ **Formatting**: Code properly formatted (`npm run format`)
7. ✅ **Build Success**: Distribution files build successfully (`npm run build`)
8. ✅ **Browser Tests**: Browser tests pass (`npm run test:browser`)

### Verification Command

Always run this command before considering any feature complete:

```bash
npm run check  # Must pass with 100% coverage and no errors/warnings
```

### Coverage Requirements

- **Statements**: ~100%
- **Branches**: ~100%
- **Functions**: ~100%
- **Lines**: ~100%

Any feature implementation or refactoring that doesn't meet these criteria is incomplete and must be fixed before committing.

## Git Commit Guidelines

This project uses conventional commits with commitlint enforcement. Commit messages must follow these rules:

### Format

```
<type>: <subject>

<body>

<footer>
```

### Rules

1. **Type** must be one of: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
2. **Subject** line must be under 100 characters
3. **Body** lines must be under 100 characters each (break long lines)
4. **Use present tense** ("add feature" not "added feature")
5. **Use imperative mood** ("move cursor to..." not "moves cursor to...")

### Example

```
refactor: wrap optional parameters in TypeScript Options interfaces

Refactor ElevationProvider API to use modern TypeScript patterns:
- Create options interfaces for all public methods
- Replace boolean and step parameters with options objects
- Maintain backward compatibility with default values
```

### Pre-commit Hooks

The project has pre-commit hooks that automatically:

- Run ESLint with auto-fix
- Run Prettier formatting
- Build the distribution files
- Validate commit message format
