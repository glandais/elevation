# Special Considerations for Elevation Project

## Critical Constraints

### Zero Dependencies Philosophy

- **NEVER** add runtime dependencies to package.json
- All functionality must use browser-native APIs only
- This is a core requirement that cannot be compromised

### Browser-Only Compatibility

- Library uses browser-native ImageData API
- Not compatible with Node.js environment
- Canvas operations require browser context

### Memory Management

- Each tile uses ~262KB (256×256×4 bytes)
- LRU cache with configurable size (default 100 tiles)
- Monitor memory usage for large-scale operations

## Testing Strategy

### Dual Testing Approach

1. **Jest Unit Tests**: Mock browser APIs, test logic
2. **Playwright Browser Tests**: Real browser validation

### Testing Protected/Private Methods

- Use Extended Test Class pattern
- Access protected methods through inheritance
- Use Object.getPrototypeOf() for private methods
- Maintain encapsulation in source code

## Demo Maintenance

- Interactive demo at index.html must always work
- demo.js showcases all library features
- Update demo when API changes
- Verify with Playwright if uncertain

## Performance Considerations

- Tile fetching timeout: 5000ms default
- Zoom level 12 gives ~30m resolution
- Bilinear interpolation adds smoothness but costs performance
- Batch operations more efficient than individual calls

## Coordinate System

- WGS84 input coordinates
- Web Mercator tile system internally
- Latitude limits: -85.0511 to 85.0511
- Terrarium encoding formula: (R\*256 + G + B/256) - 32768

## Logging System

- Development-only logging with **DEV** constant
- Zero overhead in production (dead code elimination)
- Never expose Logger in public API
- Use createLogger('ModuleName') pattern

## Git Workflow

- Always work on feature branches
- Never commit to main/master directly
- Run `npm run check` before committing
- Follow conventional commit format
