import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['js', 'ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/pw-tests'],
  rootDir: '.',
  testRegex: '.*\\.jest\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
  },
  testEnvironment: 'node',
};

export default config;
