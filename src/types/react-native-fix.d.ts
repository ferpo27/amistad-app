import "react-native";
declare module 'react-native' {
  interface ViewProps { 
    children?: import("react").ReactNode; 
  }
  interface TextProps { 
    children?: import("react").ReactNode; 
  }
  interface TextInputProps { 
    children?: import("react").ReactNode; 
  }
  interface ActivityIndicatorProps { 
    children?: import("react").ReactNode; 
  }
  interface ImageProps { 
    children?: import("react").ReactNode; 
  }
  interface Animated {
    View: any;
  }
  interface FlatListProps<T> {
    children?: import("react").ReactNode;
  }
  interface SectionListProps<T> {
    children?: import("react").ReactNode;
  }
  interface ScrollViewProps {
    children?: import("react").ReactNode;
  }
  interface TouchableOpacityProps {
    children?: import("react").ReactNode;
  }
  interface TouchableHighlightProps {
    children?: import("react").ReactNode;
  }
  interface TouchableWithoutFeedbackProps {
    children?: import("react").ReactNode;
  }
  interface TouchableNativeFeedbackProps {
    children?: import("react").ReactNode;
  }
}