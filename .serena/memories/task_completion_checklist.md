# Task Completion Checklist

## MANDATORY: Feature Completion Requirements

A feature is NOT considered complete until ALL of the following criteria are met:

### Required Checks

1. ✅ **Tests Updated**: All new functionality must have corresponding test cases
2. ✅ **Coverage Target**: Must achieve ~100% test coverage (minimum 98%)
3. ✅ **Quality Check**: `npm run check` must pass without any errors or warnings
4. ✅ **TypeScript**: No TypeScript errors (`npm run typecheck`)
5. ✅ **Linting**: No ESLint errors or warnings (`npm run lint`)
6. ✅ **Formatting**: Code properly formatted (`npm run format`)
7. ✅ **Build Success**: Distribution files build successfully (`npm run build`)
8. ✅ **Browser Tests**: Browser tests pass (`npm run test:browser`)
9. ✅ **Demo Verification**: root demo.js should use up-to-date API calls

### Verification Command

```bash
npm run check  # MUST pass with 100% coverage and no errors/warnings
```

### Coverage Requirements

- Statements: ~100%
- Branches: ~100%
- Functions: ~100%
- Lines: ~100%

### Important Rules

- NO partial features - if started, must be completed to working state
- NO TODO comments for core functionality
- NO mock objects or stub implementations
- NO incomplete functions (no "not implemented" errors)
- Build ONLY what's asked - no adding unrequested features
- Clean up temporary files after operations

### Before Committing

1. Run `npm run check` and ensure it passes completely
2. Verify you're on a feature branch (not main/master)
3. Review changes with `git diff`
4. Ensure commit message follows conventional format

Any implementation that doesn't meet these criteria is incomplete and must be fixed before committing.
