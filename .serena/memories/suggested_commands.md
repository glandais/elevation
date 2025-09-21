# Suggested Commands for Development

## Primary Development Commands

### Quality Check (MUST RUN BEFORE COMMITTING)

```bash
npm run check  # Comprehensive check: lint, typecheck, test, browser test, build
```

### Development

```bash
npm run dev          # Build and serve demo locally
npm run dev:watch    # Watch mode for development
npm run build        # Production build
npm run build:dev    # Development build with source maps
```

### Testing

```bash
npm test             # Run Jest unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:browser # Run Playwright browser tests
```

### Code Quality

```bash
npm run lint         # Check for linting errors
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
```

## Git Commands

```bash
git status          # Always check status first
git branch          # Check current branch (use feature branches)
git diff            # Review changes before committing
```

## System Utilities (Linux)

```bash
ls -la              # List files with details
grep -r "pattern"   # Search for pattern in files
find . -name "*.ts" # Find TypeScript files
```

## Important Notes

- Always run `npm run check` before considering any feature complete
- Never work directly on main/master branch
- Coverage must be ~100% (minimum 98%)
- All features must pass lint, typecheck, and tests
