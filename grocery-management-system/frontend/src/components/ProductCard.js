import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../theme/styles';
import { getProductUnitText } from '../utils/productUnits';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;

const CARD_COLORS = [
  '#FFE0B2',
  '#FFCDD2',
  '#FFF9C4',
  '#E8F5E9',
  '#F3E5F5',
  '#FBE9E7',
  '#E1F5FE',
  '#FCE4EC',
];

function getCardColor(name = '', id = '') {
  const str = name + id;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

export default function ProductCard({
  product,
  onPress,
  onAddToCart,
  onEdit,
  onDelete,
  viewType = 'grid',
}) {
  const { name, price, stock, category, image } = product || {};
  const cardColor = getCardColor(name, product?._id);
  const [imgError, setImgError] = useState(false);
  const unitText = getProductUnitText(category);

  if (viewType === 'list') {
    return (
      <>
        <AnimatedPressable style={styles.listCard} onPress={onPress} scaleTo={0.98} haptic="light">
          <View style={[styles.listImageWrap, { backgroundColor: image && !imgError ? 'transparent' : cardColor }]}>
            {image && !imgError ? (
              <Image source={{ uri: image }} style={styles.listImage} onError={() => setImgError(true)} />
            ) : (
              <Ionicons name="bag-outline" size={28} color="#2E7D32" />
            )}
          </View>

          <View style={styles.listContent}>
            <Text style={styles.listName} numberOfLines={2}>{name}</Text>
            {category ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ) : null}
            <Text style={styles.listPrice}>LKR {Number(price || 0).toFixed(2)}</Text>
            <Text style={styles.stockMuted}>Stock: {stock ?? 0}</Text>
          </View>

          <View style={styles.listActions}>
            <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="pencil" size={16} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </AnimatedPressable>
        <View style={styles.listDivider} />
      </>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.gridCard, shadows.medium]}
      onPress={onPress}
      scaleTo={0.96}
      haptic="light"
    >
      <View style={[styles.gridImageWrap, { backgroundColor: image && !imgError ? 'transparent' : cardColor }]}>
        {image && !imgError ? (
          <Image source={{ uri: image }} style={styles.gridImage} onError={() => setImgError(true)} />
        ) : (
          <Ionicons name="bag-outline" size={48} color="#2E7D32" />
        )}
      </View>

      <View style={styles.gridContent}>
        <Text style={styles.gridName} numberOfLines={2}>{name}</Text>
        {unitText ? <Text style={styles.gridUnit}>{unitText}</Text> : null}
        <Text style={[styles.gridStock, stock === 0 && styles.gridStockEmpty]}>
          Stock: {stock ?? 0}
        </Text>
        <View style={styles.gridBottom}>
          <Text style={styles.gridPrice}>LKR {Number(price || 0).toFixed(2)}</Text>
          <TouchableOpacity
            style={[styles.addButton, stock === 0 && styles.addButtonDisabled]}
            onPress={onAddToCart}
            activeOpacity={0.7}
            disabled={stock === 0}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // ── Grid ──────────────────────────────────────────
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gridImageWrap: {
    width: '100%',
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  gridContent: {
    padding: 12,
    paddingTop: 10,
  },
  gridName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  gridUnit: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  gridStock: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
    marginBottom: 8,
  },
  gridStockEmpty: {
    color: '#ef4444',
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  gridBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#94a3b8',
  },

  // ── List ──────────────────────────────────────────
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  listName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 4,
  },
  listActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#f8f8f8',
    marginHorizontal: 16,
  },

  // ── Shared ────────────────────────────────────────
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  stockMuted: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
