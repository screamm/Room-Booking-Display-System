module.exports = {
  // Testmiljö för att köra tester
  testEnvironment: 'jsdom',

  // Filändelser som Jest ska leta efter
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transformationer för olika filtyper
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Mönster för att hitta testfiler
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  
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
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/scripts/**/*',
    '!src/types/**/*',
  ],
  coverageDirectory: 'coverage',
  
  // Mocka vissa moduler
  moduleNameMapper: {
    // Mocka CSS-moduler
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mocka tillgångsfiler
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__mocks__/fileMock.js',
  },

  // Sätt upp testmiljön
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Global täckningströskel
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}; 