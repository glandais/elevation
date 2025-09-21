# Code Style and Conventions

## TypeScript Configuration

- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Base URL: . (root)
- Path aliasing: @/ maps to src/

## Naming Conventions

- **Classes**: PascalCase (e.g., ElevationProvider, TileManager)
- **Interfaces/Types**: PascalCase with descriptive names
- **Functions/Methods**: camelCase (e.g., getElevation, clearCache)
- **Constants**: UPPER_SNAKE_CASE for module constants
- **Files**: PascalCase for classes, camelCase for utilities
- **Test Files**: \*.test.ts pattern

## Code Organization

- Modular architecture with clear separation of concerns
- Each module has its own directory with index.ts for exports
- Protected/private methods for internal functionality
- Options interfaces for method parameters (modern TypeScript patterns)
- Extended test classes for testing protected/private methods

## Testing Patterns

- Comprehensive mocking of dependencies
- Dependency injection through constructors
- Extended test classes for accessing protected methods
- Edge case coverage mandatory
- Minimum 80% coverage threshold, target ~100%

## Documentation

- CLAUDE.md file for AI assistant guidance
- Comprehensive README with examples
- TypeScript JSDoc comments for public APIs
- No TODO comments in implementation code

## Import/Export Style

- ES6 modules with named and default exports
- Barrel exports through index.ts files
- Consistent import ordering: external, internal, types

## Logging

- Zero-overhead logging system using **DEV** constant
- Logger eliminated in production builds
- Never expose logging to public API

## Git Commit Conventions

- Conventional commits (feat, fix, docs, style, refactor, test, chore)
- Present tense, imperative mood
- Subject line under 100 characters
- Pre-commit hooks for linting and formatting
