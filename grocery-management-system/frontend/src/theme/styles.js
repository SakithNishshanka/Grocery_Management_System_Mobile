import { StyleSheet } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  small: 6,
  medium: 10,
  large: 16,
  xlarge: 24,
  full: 999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  body: { fontSize: 14, fontWeight: 'normal' },
  caption: { fontSize: 12, fontWeight: 'normal' },
};

export const shadows = StyleSheet.create({
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
});
