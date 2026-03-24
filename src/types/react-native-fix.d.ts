import 'react-native';
declare module 'react-native' {
  interface ViewProps { children?: React.ReactNode; }
  interface TextProps { children?: React.ReactNode; }
  interface TextInputProps { children?: React.ReactNode; }
  interface ActivityIndicatorProps { children?: React.ReactNode; }
}
