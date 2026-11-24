/**
 * Lightweight logger for development debugging
 * All logging is completely removed in production builds via __DEV__ constant
 */
export type LogLevelValue = 0 | 1 | 2 | 3 | 4;
export declare class LogLevel {
    static readonly ERROR: LogLevelValue;
    static readonly WARN: LogLevelValue;
    static readonly INFO: LogLevelValue;
    static readonly DEBUG: LogLevelValue;
    static readonly TRACE: LogLevelValue;
}
/**
 * Logger class that provides conditional logging based on build environment
 * In production builds, all logging code is eliminated by the bundler
 *
 * Matches the full console API signatures for compatibility with printf-style formatting
 * and all console features
 */
declare class Logger {
    private namespace;
    private level;
    constructor(namespace: string);
    private shouldLog;
    private doLog;
    private log;
    /**
     * Log debug information (verbose output for development)
     * Supports printf-style formatting: logger.debug('Value: %s, Count: %d', value, count)
     */
    trace(message?: any, ...optionalParams: any[]): void;
    /**
     * Log debug information (verbose output for development)
     * Supports printf-style formatting: logger.debug('Value: %s, Count: %d', value, count)
     */
    debug(message?: any, ...optionalParams: any[]): void;
    /**
     * Log general information
     * Supports printf-style formatting: logger.info('User %s logged in', username)
     */
    info(message?: any, ...optionalParams: any[]): void;
    /**
     * Log warnings
     * Supports printf-style formatting: logger.warn('Timeout after %dms', timeout)
     */
    warn(message?: any, ...optionalParams: any[]): void;
    /**
     * Log errors
     * Supports printf-style formatting: logger.error('Failed to load %s: %o', file, error)
     */
    error(message?: any, ...optionalParams: any[]): void;
    private getTimeLabel;
    private doTime;
    private doTimeEnd;
    /**
     * Log with timing information
     * Useful for performance debugging
     */
    timeLevel(level: LogLevelValue, label: string): void;
    /**
     * End timing and log duration
     */
    timeEndLevel(level: LogLevelValue, label: string): void;
    /**
     * Log with timing information
     * Useful for performance debugging
     */
    time(label: string): void;
    /**
     * End timing and log duration
     */
    timeEnd(label: string): void;
    private logDir;
    /**
     * Display an interactive list of object properties
     * Useful for exploring complex objects in development
     * @param obj - The object to inspect
     * @param options - Optional display options
     */
    dirLevel(level: LogLevelValue, message?: any, obj?: any, options?: any): void;
    /**
     * Display an interactive list of object properties
     * Useful for exploring complex objects in development
     * @param obj - The object to inspect
     * @param options - Optional display options
     */
    dir(message?: any, obj?: any, options?: any): void;
    /**
     * Clear the console
     */
    clear(): void;
}
/**
 * Create a logger instance with a specific namespace
 * @param namespace - The namespace for this logger (e.g., 'Cache', 'TileFetcher')
 * @returns A new Logger instance with the specified namespace
 * @example
 * const logger = createLogger('MyModule');
 * logger.debug('Module initialized');
 */
export declare const createLogger: (namespace: string) => Logger;
export { Logger };
//# sourceMappingURL=Logger.d.ts.map