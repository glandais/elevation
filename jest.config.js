module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/', '/test/', '/coverage/'],
    testMatch: ['**/test/**/*.test.ts', '**/__tests__/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/test/__mocks__/styleMock.js',
    },
    transformIgnorePatterns: ['node_modules/(?!(leaflet)/)'],
    coverageThreshold: {
        global: {
            branches: 89,
            functions: 94,
            lines: 95,
            statements: 95,
        },
    },
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
