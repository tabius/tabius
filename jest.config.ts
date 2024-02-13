import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['js', 'ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/pw-tests', '/app'],
  rootDir: '.',
  testRegex: '.*\\.jest\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
  },
  testEnvironment: 'node',
};

export default config;
