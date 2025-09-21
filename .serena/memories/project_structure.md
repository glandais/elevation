# Project Structure

## Directory Layout

```
elevation/
├── src/                     # Source code
│   ├── calculator/          # Elevation calculation logic
│   │   ├── BatchCalculator.ts
│   │   ├── ElevationCalculator.ts
│   │   ├── ElevationDecoder.ts
│   │   ├── ElevationFunctions.ts
│   │   └── Reactive.ts
│   ├── tile/               # Tile management
│   │   ├── cache/          # LRU cache implementation
│   │   │   ├── Cache.ts
│   │   │   └── ReentrantLock.ts
│   │   ├── fetcher/        # Tile fetching
│   │   │   ├── TileFetcher.ts
│   │   │   └── CanvasPool.ts
│   │   └── TileManager.ts
│   ├── utils/              # Utility functions
│   │   ├── Constants.ts
│   │   ├── Distance.ts
│   │   ├── DouglasPeucker.ts
│   │   ├── EcefConverter.ts
│   │   ├── ElevationSmoother.ts
│   │   ├── Logger.ts
│   │   └── Vector3D.ts
│   ├── ElevationProvider.ts # Main API class
│   ├── types.ts            # TypeScript type definitions
│   └── index.ts            # Public exports
├── test/                   # Test files (mirror src structure)
│   ├── calculator/
│   ├── tile/
│   ├── utils/
│   ├── browser/            # Playwright browser tests
│   └── setup.ts            # Test setup and mocks
├── dist/                   # Build output
├── .github/                # GitHub Actions workflows
├── .husky/                 # Git hooks
├── demo.js                 # Interactive demo
├── index.html              # Demo HTML
├── CLAUDE.md              # AI assistant instructions
└── package.json           # Project configuration
```

## Key Files

- **ElevationProvider.ts**: Main public API
- **TileManager.ts**: Coordinates tile fetching and caching
- **Cache.ts**: LRU cache with reentrant lock support
- **TileFetcher.ts**: HTTP fetching with timeout handling
- **ElevationDecoder.ts**: RGB to elevation conversion

## Module Exports

- Each directory has index.ts for barrel exports
- Main export: default ElevationProvider class
- Additional exports: types and interfaces

## Test Organization

- Unit tests mirror source structure
- Browser tests in test/browser/
- Global test setup in test/setup.ts
- Extended test classes for protected method testing
