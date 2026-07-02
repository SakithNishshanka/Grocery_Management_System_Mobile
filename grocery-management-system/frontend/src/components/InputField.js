import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InputField({
  label,
  leftIcon,
  multiline = false,
  style,
  inputStyle,
  ...props
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color="#94a3b8" style={styles.icon} />
        ) : null}
        <TextInput
          placeholderTextColor="#94a3b8"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  inputWrap: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  icon: {
    marginRight: 9,
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  inputMultiline: {
    minHeight: 72,
  },
});
