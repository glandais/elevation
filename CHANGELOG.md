## [3.1.4](https://github.com/glandais/elevation/compare/v3.1.3...v3.1.4) (2025-10-17)


### Performance Improvements

* remove some awaits ([c15cde0](https://github.com/glandais/elevation/commit/c15cde07f302d4909471f23f46b11102539076ec))

## [3.1.3](https://github.com/glandais/elevation/compare/v3.1.2...v3.1.3) (2025-10-17)


### Performance Improvements

* elevation cache per tile ([32064b5](https://github.com/glandais/elevation/commit/32064b531212905a908ab2cd5e0bc7056a5e15df))

## [3.1.2](https://github.com/glandais/elevation/compare/v3.1.1...v3.1.2) (2025-10-16)


### Bug Fixes

* export ElevationSmoother ([782b0b9](https://github.com/glandais/elevation/commit/782b0b91d4928008a67a712595c8557b20a2941b))

## [3.1.1](https://github.com/glandais/elevation/compare/v3.1.0...v3.1.1) (2025-10-15)


### Bug Fixes

* remove dist ([5504e96](https://github.com/glandais/elevation/commit/5504e967c449cab10122e5a2460c15b81a0edafc))

# [3.1.0](https://github.com/glandais/elevation/compare/v3.0.1...v3.1.0) (2025-10-15)


### Features

* add minDistance in options ([6755bec](https://github.com/glandais/elevation/commit/6755bec58ac69c3a96d61e34be980f80ff8c0c24))

## [3.0.1](https://github.com/glandais/elevation/compare/v3.0.0...v3.0.1) (2025-09-21)


### Bug Fixes

* update GitHub Pages deployment to bypass environment protection ([2270f82](https://github.com/glandais/elevation/commit/2270f8242a7c6c29c13d28c96c282b641eb82397))

# [3.0.0](https://github.com/glandais/elevation/compare/v2.1.0...v3.0.0) (2025-09-21)


### Features

* add Node.js support with environment-specific implementations ([0da3695](https://github.com/glandais/elevation/commit/0da3695b447d3661324ebe098a54d5a71457841b))


### BREAKING CHANGES

* Removed clearCache() method from public API - cache is now managed
internally with LRU eviction only
* Removed timeout parameter from ElevationProviderConfig - timeout
handling is now environment-specific

# [2.1.0](https://github.com/glandais/elevation/compare/v2.0.2...v2.1.0) (2025-09-18)


### Features

* complete setElevations implementation and add Reactive module tests ([60839c0](https://github.com/glandais/elevation/commit/60839c000c1766bfb0ce633f7d077ec97cd62f6c))
* implement advanced configurable logging system ([5c402b7](https://github.com/glandais/elevation/commit/5c402b76783cff8306d099502307036b2ce391ab))

## [2.0.2](https://github.com/glandais/elevation/compare/v2.0.1...v2.0.2) (2025-09-16)


### Bug Fixes

* improve CDN compatibility and default export for jsdelivr ([6e46c24](https://github.com/glandais/elevation/commit/6e46c2421ce7dfa9ad7eef0209267f61dc70b586))

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
