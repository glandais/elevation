/**
 * Global type declarations for build-time constants
 */

/**
 * Build-time constant that indicates if the code is running in development mode.
 * This constant is replaced by Vite at build time:
 * - `true` in development builds
 * - `false` in production builds
 *
 * When `__DEV__` is false, TypeScript and the bundler will eliminate
 * all code blocks that check this condition, resulting in zero overhead
 * in production builds.
 *
 * @example
 * if (__DEV__) {
 *   console.log('This will only appear in development');
 * }
 */
declare const __DEV__: boolean;
declare const __NODE__: boolean;
