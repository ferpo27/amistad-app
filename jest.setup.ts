import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

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