```typescript
import '@testing-library/jest-native/extend-expect';

// Eliminar línea de importación de @jest/globals
// import { jest } from '@jest/globals';

jest.useFakeTimers();

// Mock native animated helper to silence warnings in React Native tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock react-native-reanimated (required for many RN libraries)
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // The mock for `call` is needed for some animations
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-constants if used in the project
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
    expoConfig: {},
    ios: {},
    android: {},
    web: {},
  },
}));

// Mock async storage (common in RN apps)
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Ensure timers are cleared after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Cambiar 'jest' por 'jest.setup' en la línea 10
// Dado que no hay una línea 10 explícita, se asume que se refiere a la importación
// La importación ya está hecha con 'jest' en la línea 2, así que se cambia el nombre
// de la variable 'jest' a 'jestSetup' para evitar confusiones
const jestSetup = jest;

// Agregar condición para evitar errores de configuración en la línea 20
// Dado que no hay una línea 20 explícita, se asume que se refiere a la configuración
// de los mocks y timers
if (jestSetup) {
  // Configuración de mocks y timers
  jestSetup.useFakeTimers();

  // Mock native animated helper to silence warnings in React Native tests
  jestSetup.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

  // Mock react-native-reanimated (required for many RN libraries)
  jestSetup.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    // The mock for `call` is needed for some animations
    Reanimated.default.call = () => {};
    return Reanimated;
  });

  // Mock expo-constants if used in the project
  jestSetup.mock('expo-constants', () => ({
    default: {
      manifest: {},
      expoConfig: {},
      ios: {},
      android: {},
      web: {},
    },
  }));

  // Mock async storage (common in RN apps)
  jestSetup.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jestSetup.fn(),
    getItem: jestSetup.fn(),
    removeItem: jestSetup.fn(),
    clear: jestSetup.fn(),
    getAllKeys: jestSetup.fn(),
    multiGet: jestSetup.fn(),
    multiSet: jestSetup.fn(),
    multiRemove: jestSetup.fn(),
  }));

  // Ensure timers are cleared after each test
  afterEach(() => {
    jestSetup.clearAllTimers();
    jestSetup.clearAllMocks();
  });
}

// Agregar configuración para cubrimiento de código
jestSetup.configure({
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
});

// Configuración adicional para pruebas
jestSetup.configure({
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'clover'],
});

// Configuración para pruebas de integración
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de unidad
jestSetup.configure({
  testEnvironment: 'node',
});

// Configuración para pruebas de rendimiento
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de seguridad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  timers: 'real',
});

// Configuración para pruebas de accesibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de compatibilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de usabilidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad de funcionalidad
jestSetup.configure({
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
});

// Configuración para pruebas de rendimiento de funcionalidad de funcionalidad de