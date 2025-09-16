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
- **Protected/Private Method Testing**: Extended test classes used for accessing protected and private methods
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

#### Testing Protected and Private Methods Pattern

When refactoring public methods to protected, or when needing to test private methods, use an **Extended Test Class** pattern to maintain proper encapsulation while enabling comprehensive testing.

**Pattern Implementation**:

```typescript
// Extended class for testing protected methods
class CacheExtended<K, T> extends Cache<K, T> {
    // Expose protected methods as public for testing
    public has(k: K): boolean {
        return super.has(k);
    }

    public getKeys(): string[] {
        return super.getKeys();
    }

    public getLRUKeys(count?: number): string[] {
        return super.getLRUKeys(count);
    }

    // Expose private methods with different names to avoid TypeScript conflicts
    public callRemoveFromLRU(key: string): void {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.removeFromLRU.call(this, key);
    }

    public callDelete(key: string): boolean {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.delete.call(this, key);
    }

    public callEvictLeastRecentlyUsed(): void {
        const parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
        return parent.evictLeastRecentlyUsed.call(this);
    }

    // Expose private properties with getter/setter methods
    public getTail(): string | null {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).tail;
    }

    public setTail(value: string | null): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).tail = value;
    }

    public getLruOrder(): Map<string, { prev: string | null; next: string | null }> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).lruOrder;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getLock(): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).lock;
    }
}
```

**Usage in Tests**:

```typescript
describe('Protected method tests', () => {
    it('should access protected methods', () => {
        const extendedCache = new CacheExtended<string, string>(3, keyMapper, valueBuilder);

        // Test protected methods
        expect(extendedCache.getKeys()).toEqual([]);
        expect(extendedCache.getLRUKeys()).toEqual([]);
        expect(extendedCache.has('nonexistent')).toBe(false);
    });

    it('should access private methods for edge case testing', () => {
        const extendedCache = new CacheExtended<string, string>(3, keyMapper, valueBuilder);

        // Test private methods for edge cases
        expect(() => extendedCache.callRemoveFromLRU('nonexistent')).not.toThrow();
        const result = extendedCache.callDelete('nonexistent');
        expect(result).toBe(false);

        // Test private properties
        extendedCache.setTail(null);
        expect(() => extendedCache.callEvictLeastRecentlyUsed()).not.toThrow();
    });
});
```

**Key Guidelines**:

1. **Inheritance-Based Access**: Use class extension rather than TypeScript casting for protected methods
2. **Name Differentiation**: Use different method names (e.g., `callRemoveFromLRU`) to avoid TypeScript conflicts with private methods
3. **Prototype Chain Access**: Use `Object.getPrototypeOf()` pattern to access private methods safely
4. **Property Access Methods**: Use getter/setter methods rather than direct property access for private fields
5. **ESLint Suppression**: Add appropriate `eslint-disable-next-line` comments for necessary `any` types
6. **Comprehensive Coverage**: Ensure all edge cases and private method branches are tested
7. **Encapsulation Preservation**: Keep the extended class in test files only, maintaining proper encapsulation in source code

**Benefits**:

- ✅ Maintains proper TypeScript encapsulation in source code
- ✅ Enables comprehensive testing of all code paths
- ✅ Avoids TypeScript compilation errors
- ✅ Provides clear separation between public API and internal testing
- ✅ Supports future refactoring with minimal test changes

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

## Interactive Demo

The project includes a comprehensive interactive demo consisting of three main files that showcase the library's capabilities and serve as integration validation.

### Demo File Structure

#### `index.html` - Demo Application Structure

**Purpose**: Main HTML structure for the interactive elevation demo
**Dependencies**:

- Leaflet 1.9.4 (mapping library)
- Chart.js (elevation profile visualization)
- Built library (`dist/index.min.js`)

**Key Features**:

- Responsive layout with mobile optimization
- Interactive Leaflet map with OpenStreetMap tiles
- Real-time elevation display and coordinate tracking
- Elevation profile chart with Chart.js integration
- Point mode: Click anywhere for single elevation queries
- Path mode: Multi-point path creation with elevation profiling

**Layout Components**:

- Header with project branding and GitHub link
- Compact controls panel with mode switching and processing options
- Map container with status bar for real-time feedback
- Chart panel for elevation profile visualization (hidden until path created)

#### `demo.js` - Interactive Demo Logic

**Purpose**: Main JavaScript implementation demonstrating library usage patterns
**Global Dependencies**: Leaflet (`L`), Chart.js (`Chart`), library namespace (`window.Elevation`)

**Core Functionality**:

**Two Operating Modes**:

- **Point Mode**: Single location elevation queries with marker placement
- **Path Mode**: Multi-point path creation with continuous elevation profiling

**Elevation Processing Pipeline**:

1. **Raw Data Collection**: `getElevation()` for points, `getElevationsAlong()` for paths
2. **Optional Smoothing**: Distance-based smoothing with configurable window size (10-200m)
3. **Optional Filtering**: Douglas-Peucker 3D filtering with tolerance and Z-exaggeration controls
4. **Visualization**: Real-time Chart.js elevation profile updates

**Advanced Features**:

- **Real-time Processing**: Live updates when smoothing/filtering parameters change
- **Statistics Calculation**: Distance, elevation gain/loss, ascent/descent totals
- **Performance Metrics**: Variance reduction tracking for smoothing effectiveness
- **Data Point Reduction**: Filtering efficiency statistics with before/after counts

**User Interface**:

- Synchronized slider/input controls for all parameters
- Visual feedback with loading states and error handling
- Mobile-responsive design with touch-friendly controls
- Popup markers with detailed elevation and coordinate information

**Key API Usage Patterns**:

```javascript
// Single point elevation
const elevation = await elevationProvider.getElevation(lat, lng);

// Path elevation profiling with processing
const profile = await elevationProvider.getElevationsAlong(pathPoints, {
    step: 25,
    interpolation: true,
    smoothingOptions: { enabled: true, windowSize: 50 },
    filterOptions: { enabled: true, tolerance: 10, zExaggeration: 3 },
});
```

#### `demo.css` - Demo Styling and Layout

**Purpose**: Responsive styling for optimal user experience across devices
**Design System**: Modern flat design with consistent spacing and color scheme

**Responsive Breakpoints**:

- Desktop: Full layout with side-by-side controls
- Tablet (≤768px): Stacked layout with optimized spacing
- Mobile (≤480px): Single-column layout with touch-friendly controls

**Key Style Components**:

- **Color Palette**: Primary blue (#2c5aa0), success green, warning orange, error red
- **Interactive Elements**: Hover states, disabled states, loading animations
- **Status Indicators**: Color-coded feedback (loading/success/error states)
- **Chart Integration**: Responsive canvas sizing with optimal mobile display
- **Button System**: Primary/secondary/danger button variants with consistent styling

**Layout Features**:

- Flexbox-based responsive grid system
- Touch-friendly control sizes for mobile devices
- Optimized map height for different screen sizes
- Collapsible chart panel that appears when path data is available

### Demo Development Guidelines

**When modifying the library, always verify**:

**API Compatibility**: All demo functionality continues to work without modification. Use Playwright MCP if there is a doubt

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
9. ✅ **Demo verification**: root demo.js should use up to date API calls

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
