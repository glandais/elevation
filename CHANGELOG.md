## [2.0.1](https://github.com/glandais/elevation/compare/v2.0.0...v2.0.1) (2025-09-16)


### Bug Fixes

* npm ([40768ae](https://github.com/glandais/elevation/commit/40768ae5ba566568453db427f9c9a14bd7eeb705))

# [2.0.0](https://github.com/glandais/elevation/compare/v1.0.3...v2.0.0) (2025-09-16)


### Code Refactoring

* major architectural restructure and API improvements ([4dd1690](https://github.com/glandais/elevation/commit/4dd1690596a42c00e5b64837bdc3315346594229))


### Features

* add 3D elevation profile filtering with Douglas-Peucker algorithm ([f0ab586](https://github.com/glandais/elevation/commit/f0ab5866af578b385fc2e4383c09f9b2a59a9d84))
* add distance-based elevation smoothing with comprehensive utility classes ([52c8011](https://github.com/glandais/elevation/commit/52c8011d1aeaaf35a955feed416f33ff35389cef))
* elevation between/along ([5577531](https://github.com/glandais/elevation/commit/5577531ffc909ffcf8b3f37b5dfa0b6e020e1a79))
* interpolate by default ([2cd460a](https://github.com/glandais/elevation/commit/2cd460ae7a651128af22ec1a6691bb4f6b45279c))
* load elevations from iterator/array ([0e53550](https://github.com/glandais/elevation/commit/0e53550bf6a048e02e5a2045b18cdb172d538133))


### BREAKING CHANGES

* ElevationCalculator constructor now requires TileManager parameter

- Restructure codebase with modular architecture
  * Move elevation calculation logic to calculator/ directory
  * Consolidate CoordinateConverter functionality into ElevationCalculator
  * Organize tile management in tile/ directory with cache/ and fetcher/ subdirectories

- Improve ElevationCalculator API design
  * Add TileManager as constructor dependency (BREAKING)
  * Simplify method signatures by removing repeated tileManager parameters
  * Make coordinate conversion methods private for better encapsulation
  * Add normalizePixel method as public API for pixel boundary handling

- Enhance ElevationProvider
  * Simplify internal architecture with improved dependency injection
  * Maintain backward compatibility for public API
  * Optimize method calls with cleaner parameter passing

- Improve test coverage and quality
  * Add comprehensive input validation tests for latitude, longitude, and zoom level
  * Achieve 100% test coverage for ElevationCalculator
  * Add missing tests for previously untested error paths
  * Reorganize test files to match new directory structure
  * Update test mocks and validation strategies

- File organization improvements
  * src/calculator/ - elevation calculation and coordinate conversion logic
  * src/tile/ - tile management, caching, and fetching functionality
  * test/ structure mirrors src/ for better maintainability

- Code quality enhancements
  * Improve error handling with proper async/await patterns
  * Better separation of concerns between components
  * Enhanced type safety and validation

## [1.0.3](https://github.com/glandais/elevation/compare/v1.0.2...v1.0.3) (2025-09-16)


### Bug Fixes

* interpolation across tiles ([c697d75](https://github.com/glandais/elevation/commit/c697d75db55e9370d8ef0fa917ae534b4b0a3dce))

## [1.0.2](https://github.com/glandais/elevation/compare/v1.0.1...v1.0.2) (2025-09-15)


### Bug Fixes

* do not create img DOM elements ([7733991](https://github.com/glandais/elevation/commit/773399168bd1a79cb15cfcaf3f82b854ad514427))

## [1.0.1](https://github.com/glandais/elevation/compare/v1.0.0...v1.0.1) (2025-09-15)


### Bug Fixes

* public package ([6242472](https://github.com/glandais/elevation/commit/6242472766a23a7a308516754fd8aa55e8b5437c))

# 1.0.0 (2025-09-15)


### Features

* initial version ([840f20f](https://github.com/glandais/elevation/commit/840f20f51a820ea38a20e1eb1dedca18770d06d6))
