import { View, type ViewProps } from 'react-native'

export type ThemedViewProps = ViewProps

const ViewFixed = View as any

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  return <ViewFixed style={style} {...otherProps} />
}

export default ViewFixed
