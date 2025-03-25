module.exports = {
  // Testmiljö för att köra tester
  testEnvironment: 'jsdom',

  // Filändelser som Jest ska leta efter
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transformationer för olika filtyper
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
      plugins: ['@babel/plugin-transform-runtime'],
    }],
  },

  // Ignorera dessa mönster vid transformation
  transformIgnorePatterns: [
    '/node_modules/(?!(@react-dnd|react-dnd|dnd-core|@react-dnd/invariant|react-dnd-html5-backend)/)',
  ],

  // Mönster för att hitta testfiler
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  
  // Ignorera dessa mappar vid testning
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Konfiguration för täckningsrapport
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
  ],
  coverageDirectory: 'coverage',
  
  // Mocka vissa moduler
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mocka CSS-moduler
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mocka tillgångsfiler
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Sätt upp testmiljön
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Global täckningströskel
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}; 