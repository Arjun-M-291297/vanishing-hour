import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../theme';

export function Screen({ children, style }: ViewProps) {
  return (
    <LinearGradient colors={[colors.inkRaised, colors.ink]} style={styles.fill}>
      <SafeAreaView style={[styles.fill, style]}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

export function CaseFileLabel({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.label, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Heading({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.heading, style]} {...rest}>
      {children}
    </Text>
  );
}

export function BodyText({ children, style, ...rest }: TextProps) {
  return (
    <Text style={[styles.body, style]} {...rest}>
      {children}
    </Text>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && styles.buttonTextPrimary,
            variant !== 'primary' && styles.buttonTextSecondary,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'characters';
  maxLength?: number;
}

export function TextField({ value, onChangeText, placeholder, autoCapitalize = 'none', maxLength }: TextFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.paperDim}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      maxLength={maxLength}
      style={styles.input}
    />
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  label: {
    fontFamily: fonts.display,
    color: colors.brass,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: fonts.display,
    color: colors.paper,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: fonts.serif,
    color: colors.paperDim,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.brass,
    borderColor: colors.brass,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingVertical: spacing.xs + 2,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  buttonTextPrimary: { color: colors.ink },
  buttonTextSecondary: { color: colors.paper },
  input: {
    fontFamily: fonts.serif,
    color: colors.paper,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inkElevated,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});
