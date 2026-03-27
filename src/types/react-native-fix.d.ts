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
  interface View {
    props: ViewProps;
  }
  interface Text {
    props: TextProps;
  }
  interface TextInput {
    props: TextInputProps;
  }
  interface ActivityIndicator {
    props: ActivityIndicatorProps;
  }
  interface Image {
    props: ImageProps;
  }
  interface JSX {
    IntrinsicElements: {
      View: ViewProps;
      Text: TextProps;
      TextInput: TextInputProps;
      ActivityIndicator: ActivityIndicatorProps;
      Image: ImageProps;
      AnimatedView: any;
      WebView: any;
      Modal: any;
      Picker: any;
      Slider: any;
      Switch: any;
    };
  }
  interface RNCWebViewProps {
    children?: import("react").ReactNode;
  }
  interface WebViewProps {
    children?: import("react").ReactNode;
  }
  interface ModalProps {
    children?: import("react").ReactNode;
  }
  interface PickerProps {
    children?: import("react").ReactNode;
  }
  interface SliderProps {
    children?: import("react").ReactNode;
  }
  interface SwitchProps {
    children?: import("react").ReactNode;
  }
  interface Animated {
    View: any;
  }
  interface WebView {
    props: WebViewProps;
  }
  interface Modal {
    props: ModalProps;
  }
  interface Picker {
    props: PickerProps;
  }
  interface Slider {
    props: SliderProps;
  }
  interface Switch {
    props: SwitchProps;
  }
  interface RNCWebView {
    props: RNCWebViewProps;
  }
  interface IntrinsicElements {
    view: ViewProps;
    text: TextProps;
    textinput: TextInputProps;
    activityindicator: ActivityIndicatorProps;
    image: ImageProps;
  }
}