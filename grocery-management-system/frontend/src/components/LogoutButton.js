import React from 'react';
import { TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LogoutButton({ color = '#ffffff', size = 24, style }) {
  const { logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={confirmLogout}
      activeOpacity={0.75}
      accessibilityLabel="Log out"
      accessibilityRole="button"
    >
      <Ionicons name="log-out-outline" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
