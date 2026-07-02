import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, adminColors } from '../theme/colors';
import LogoutButton from './LogoutButton';

const STATUS_BAR_H = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24);

export default function AppHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  isAdmin = false,
  showLogout = true,
}) {
  const palette = isAdmin ? adminColors : colors;

  return (
    <View style={[styles.header, { backgroundColor: palette.primary }]}>
      <View style={styles.content}>
        {onBack ? (
          <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconSpacer} />
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        <View style={styles.rightActions}>
          {showLogout ? <LogoutButton /> : null}
          {rightIcon ? (
            <TouchableOpacity style={styles.iconButton} onPress={onRightPress} activeOpacity={0.75}>
              <Ionicons name={rightIcon} size={24} color="#ffffff" />
            </TouchableOpacity>
          ) : !showLogout ? (
            <View style={styles.iconSpacer} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: STATUS_BAR_H + 6,
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  content: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 44,
    height: 44,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});
