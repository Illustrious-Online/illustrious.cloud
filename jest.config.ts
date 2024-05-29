import type { Config } from 'jest'

const config: Config = {
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.json'
    }
  },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coveragePathIgnorePatterns: [
    './src/drizzle/',
    './src/services/'
  ],
  testEnvironment: 'node'
}

export default config;
