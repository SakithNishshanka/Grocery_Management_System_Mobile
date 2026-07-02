import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function GreenButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  isAdmin = false,
  style,
}) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        isAdmin && styles.admin,
        inactive && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={inactive}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  admin: {
    backgroundColor: '#1B5E20',
  },
  disabled: {
    backgroundColor: '#94a3b8',
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
