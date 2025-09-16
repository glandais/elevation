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
7. For elevation profiling: BatchCalculator generates coordinate sequences
8. Optional distance-based smoothing using ElevationSmoother
9. Optional Douglas-Peucker filtering for profile simplification

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

## Testing Strategy

The project employs a comprehensive dual-testing approach to ensure both unit-level correctness and real-world browser compatibility.

### Testing Infrastructure

#### 1. Jest Unit Tests (Primary Testing Layer)

- **Framework**: Jest with TypeScript support (`ts-jest`)
- **Environment**: jsdom for browser API simulation
- **Setup**: Custom global mocks for ImageData and Canvas APIs (`test/setup.ts`)
- **Structure**: 17 test files mirroring `src/` directory structure
- **Coverage**: 80% minimum threshold, targeting ~100% coverage

```bash
npm test              # Run Jest unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

#### 2. Playwright Browser Tests (Integration Layer)

- **Framework**: Playwright for real browser testing
- **Browsers**: Chromium (default), Firefox and Safari available
- **Server**: Local development server (`serve . -l 3000`)
- **Purpose**: End-to-end validation of browser compatibility

```bash
npm run test:browser  # Run Playwright tests
```

### Testing Patterns and Best Practices

#### Jest Unit Testing Approach

- **Comprehensive Mocking**: All external dependencies mocked using `jest.mock()`
- **Dependency Injection**: Mock instances injected into constructors
- **Private Method Testing**: TypeScript interfaces used when testing private methods is necessary
- **Edge Case Coverage**: Boundary conditions, error scenarios, invalid inputs systematically tested

**Example Mocking Pattern**:

```typescript
// Mock dependencies
jest.mock('../../src/tile/TileManager');
jest.mock('../../src/calculator/ElevationCalculator');

const MockedTileManager = TileManager as jest.MockedClass<typeof TileManager>;
const mockElevationCalculator = new MockedElevationCalculator(mockTileManager);

// Test with mocked dependencies
batchCalculator = new BatchCalculator(mockElevationCalculator);
```

#### Browser Testing Approach

- **Global Library Testing**: Validates `window.Elevation` namespace accessibility
- **Real Browser APIs**: Tests actual ImageData, Canvas, and fetch implementations
- **Cross-browser Validation**: Ensures compatibility across modern browsers

### Specific Testing Areas

#### Core API Testing

- **ElevationProvider Methods**: All public methods with options interfaces
- **Batch Operations**: getElevationsFrom, getElevationsAlong
- **Configuration Validation**: Constructor options and validation logic
- **Cache Management**: clearCache functionality

#### Algorithm Testing

- **Distance Calculations**: Haversine, Euclidean 3D, point-to-segment distance
- **Elevation Smoothing**: Distance-based smoothing with triangular kernel
- **Profile Filtering**: Douglas-Peucker algorithm accuracy and 3D ECEF conversion
- **Coordinate Generation**: Path interpolation and step-based coordinate sequences

#### Mathematical Utilities

- **Vector3D Operations**: Distance, dot product, cross product, normalization
- **ECEF Conversion**: Geographic to Earth-Centered coordinates with elevation exaggeration
- **Coordinate Systems**: WGS84 to Web Mercator tile coordinate conversion

#### Infrastructure Testing

- **Cache Behavior**: LRU eviction, memory management, performance
- **Tile Fetching**: HTTP request handling, timeout management, error recovery
- **Canvas Pool**: Resource management and cleanup

#### Error Handling and Edge Cases

- **Input Validation**: Invalid coordinates, zoom levels, parameters
- **Boundary Conditions**: Coordinate limits, empty datasets, single points
- **Network Failures**: Timeout handling, retry logic, graceful degradation
- **Memory Management**: Large dataset handling, cache overflow scenarios

### Test Organization

#### Directory Structure

```
test/
├── setup.ts                          # Global test setup and mocks
├── calculator/                       # Calculator module tests
│   ├── BatchCalculator.test.ts
│   ├── ElevationCalculator.test.ts
│   └── ElevationDecoder.test.ts
├── utils/                            # Utility class tests
│   ├── Distance.test.ts
│   ├── ElevationSmoother.test.ts
│   └── Constants.test.ts
├── tile/                             # Tile management tests
│   ├── cache/Cache.test.ts
│   └── fetcher/TileFetcher.test.ts
├── browser/                          # Browser integration tests
│   └── elevation-provider-browser.test.ts
├── ElevationProvider.test.ts         # Main API tests
├── filtering.test.ts                 # 3D filtering algorithm tests
└── index.test.ts                     # Public exports tests
```

#### Coverage Configuration

- **Statements**: 80% minimum (targeting 100%)
- **Branches**: 80% minimum (targeting 100%)
- **Functions**: 80% minimum (targeting 100%)
- **Lines**: 80% minimum (targeting 100%)
- **Files**: All `src/**/*.ts` except test and declaration files

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
