import { ViewProps, TextProps, ImageProps, ScrollViewProps, TouchableOpacityProps, FlatListProps, SectionListProps, ImageBackgroundProps, PressableProps } from 'react-native';

export type {
  ViewProps,
  TextProps,
  ImageProps,
  ScrollViewProps,
  TouchableOpacityProps,
  FlatListProps,
  SectionListProps,
  ImageBackgroundProps,
  PressableProps,
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}