import '@testing-library/jest-native/extend-expect';

jest.useFakeTimers();

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
    expoConfig: {},
    ios: {},
    android: {},
    web: {},
  },
}));

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

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});