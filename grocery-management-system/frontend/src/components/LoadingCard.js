import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;

export default function LoadingCard() {
  return (
    <View style={styles.card}>
      <View style={styles.image} />
      <View style={styles.lineWide} />
      <View style={styles.lineShort} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    minHeight: 230,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  image: {
    height: 150,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginBottom: 14,
  },
  lineWide: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  lineShort: {
    width: '62%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
});
