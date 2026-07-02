import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Toast({ visible, message, type = 'success' }) {
  if (!visible) return null;

  const success = type === 'success';
  return (
    <View style={[styles.toast, { backgroundColor: success ? '#1B5E20' : '#ef4444' }]}>
      <Ionicons name={success ? 'checkmark-circle' : 'alert-circle'} size={18} color="#ffffff" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
