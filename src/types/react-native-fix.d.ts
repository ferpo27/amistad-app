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
}