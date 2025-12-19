export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    '**/src/**/*.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  reporters: [
    'default'
  ],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000, // 30 seconds
  maxWorkers: 4,
  maxConcurrency: 8,
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'], plugins: [] }]
  }
};
