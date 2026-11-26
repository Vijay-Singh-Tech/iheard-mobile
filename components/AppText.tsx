import { createContext, useContext } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { TextProps, TextInputProps } from 'react-native';

export type TextSize = 'standard' | 'large';

export const AppTextSizeContext = createContext<{
  size: TextSize;
  setSize: (size: TextSize) => void;
}>({ size: 'standard', setSize: () => {} });

function useLargeTextStyle(style: TextProps['style']) {
  const { size } = useContext(AppTextSizeContext);
  if (size === 'standard') return undefined;

  const flattened = StyleSheet.flatten(style);
  return {
    fontSize: Math.round((flattened?.fontSize ?? 14) * 1.18),
    lineHeight: flattened?.lineHeight ? Math.ceil(flattened.lineHeight * 1.18) : undefined,
  };
}

export function Text({ style, ...props }: TextProps) {
  const largeStyle = useLargeTextStyle(style);
  return <NativeText {...props} style={largeStyle ? [style, largeStyle] : style} />;
}

export function TextInput({ style, ref, ...props }: TextInputProps & {
  ref?: React.Ref<NativeTextInput>;
}) {
  const largeStyle = useLargeTextStyle(style);
  return <NativeTextInput {...props} ref={ref} style={largeStyle ? [style, largeStyle] : style} />;
}
