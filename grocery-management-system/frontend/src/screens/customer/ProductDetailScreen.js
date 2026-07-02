import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import api, { getImageUri } from '../../config/api';
import GreenButton from '../../components/GreenButton';
import { shadows } from '../../theme/styles';
import { getProductUnitText } from '../../utils/productUnits';

const HERO_COLORS = [
  '#EF5350', '#FF7043', '#FFCA28',
  '#66BB6A', '#42A5F5', '#AB47BC',
  '#EC407A', '#26A69A',
];

function getHeroColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return HERO_COLORS[Math.abs(hash) % HERO_COLORS.length];
}

export default function ProductDetailScreen({ route, navigation }) {
  const { productId, storeId, storeName } = route.params;
  const { logout } = useContext(AuthContext);
  const { addToCart, replaceCartWithProduct } = useContext(CartContext);
  const insets = useSafeAreaInsets();
  const [product, setProduct]   = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [imgError, setImgError] = useState(false);
  const [isFav, setIsFav]       = useState(false);

  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    api.get(`/products/${productId}`)
      .then(({ data }) => setProduct(data))
      .catch(() => setFetchError('Failed to load product. Please check your connection.'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return (
    <View style={S.center}>
      <ActivityIndicator size="large" color="#2E7D32" />
      <Text style={S.centerText}>Loading product...</Text>
    </View>
  );

  if (fetchError || !product) return (
    <View style={S.center}>
      <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
      <Text style={S.errorTitle}>Something went wrong</Text>
      <Text style={S.errorSub}>{fetchError || 'Product not found'}</Text>
      <TouchableOpacity
        style={S.retryBtn}
        onPress={() => {
          setLoading(true);
          setFetchError('');
          api.get(`/products/${productId}`)
            .then(({ data }) => setProduct(data))
            .catch(() => setFetchError('Failed to load product. Please check your connection.'))
            .finally(() => setLoading(false));
        }}
        activeOpacity={0.8}
      >
        <Text style={S.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }} activeOpacity={0.7}>
        <Text style={{ color: '#64748b', fontSize: 14 }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const inStock  = product.stockQuantity > 0;
  const total    = (product.price * quantity).toFixed(2);
  const heroColor = getHeroColor(product.name);
  const unitText = getProductUnitText(product.category);

  const handleAddToCart = () => {
    if (quantity > product.stockQuantity) {
      Alert.alert('Stock Limit', `Only ${product.stockQuantity} item(s) available.`);
      return;
    }

    const cartProduct = {
      ...product,
      storeId: product.store?._id || product.store || storeId,
      storeName: product.store?.name || storeName,
      image: getImageUri(product.imageUrl),
      stock: product.stockQuantity,
    };
    const result = addToCart(cartProduct, quantity);
    if (result?.reason === 'OUT_OF_STOCK') {
      Alert.alert('Out of Stock', 'This product is currently unavailable.');
      return;
    }
    if (result?.reason === 'STORE_MISMATCH') {
      Alert.alert(
        'Start a new cart?',
        'Your cart has items from another store. Starting a cart for this store will remove the current cart items.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start New Cart',
            style: 'destructive',
            onPress: () => {
              replaceCartWithProduct(cartProduct, quantity);
              navigation.navigate('Cart');
            },
          },
        ]
      );
      return;
    }

    if (Platform.OS === 'web') {
      navigation.navigate('Cart');
    } else {
      Alert.alert('Added to Cart! 🛒', `${product.name} × ${quantity} added.`, [
        { text: 'Keep Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={S.flex}>
      <StatusBar barStyle="light-content" backgroundColor={heroColor} translucent />

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Colored hero background */}
        <View style={[S.heroWrap, { backgroundColor: product.imageUrl && !imgError ? 'transparent' : heroColor }]}>
          {product.imageUrl && !imgError ? (
            <Image
              source={{ uri: getImageUri(product.imageUrl) }}
              style={S.heroImage}
              onError={() => setImgError(true)}
            />
          ) : (
            <Ionicons name="bag-outline" size={100} color="rgba(255,255,255,0.8)" />
          )}
        </View>

        {/* Back button */}
        <TouchableOpacity
          style={[S.fab, S.fabLeft, { top: insets.top + 12 }, shadows.medium]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>

        {/* Favourite button */}
        <TouchableOpacity
          style={[S.fab, S.fabRight, { top: insets.top + 12 }, shadows.medium]}
          onPress={confirmLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={22} color="#64748b" />
        </TouchableOpacity>

        {/* Favourite button */}
        <TouchableOpacity
          style={[S.fab, S.fabRight, { top: insets.top + 60 }, shadows.medium]}
          onPress={() => setIsFav(v => !v)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={22}
            color={isFav ? '#ef4444' : '#64748b'}
          />
        </TouchableOpacity>

        {/* White content card */}
        <View style={[S.card, shadows.large]}>

          {/* Category + stock */}
          <View style={S.topRow}>
            {product.category ? (
              <View style={S.catPill}>
                <Text style={S.catText}>{product.category}</Text>
              </View>
            ) : <View />}
            <View style={[S.stockBadge, { backgroundColor: inStock ? '#E8F5E9' : '#fee2e2' }]}>
              <View style={[S.stockDot, { backgroundColor: inStock ? '#2E7D32' : '#ef4444' }]} />
              <Text style={[S.stockText, { color: inStock ? '#1B5E20' : '#991b1b' }]}>
                Stock: {product.stockQuantity ?? 0}
              </Text>
            </View>
          </View>

          {/* Name + unit */}
          <Text style={S.name}>{product.name}</Text>
          {unitText ? <Text style={S.unit}>{unitText}</Text> : null}

          {/* Price row */}
          <View style={S.priceRow}>
            <Text style={S.price}>LKR {Number(product.price).toFixed(2)}</Text>
            <Text style={S.perUnit}>per item</Text>
          </View>

          <View style={S.divider} />

          {/* Description */}
          {product.description ? (
            <>
              <Text style={S.sectionLabel}>Description</Text>
              <Text style={S.description}>{product.description}</Text>
              <View style={S.divider} />
            </>
          ) : null}

          {/* Quantity */}
          <View style={S.qtySection}>
            <Text style={S.sectionLabel}>Quantity</Text>
            <View style={S.qtyControls}>
              <TouchableOpacity
                style={[S.qtyBtn, { borderColor: quantity > 1 ? '#ef4444' : '#e2e8f0' }]}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={18} color={quantity > 1 ? '#ef4444' : '#94a3b8'} />
              </TouchableOpacity>
              <Text style={S.qtyNum}>{quantity}</Text>
              <TouchableOpacity
                style={[S.qtyBtn, { borderColor: inStock ? '#2E7D32' : '#e2e8f0' }]}
                onPress={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))}
                disabled={!inStock}
              >
                <Ionicons name="add" size={18} color={inStock ? '#2E7D32' : '#94a3b8'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={S.totalRow}>
            <Text style={S.totalLabel}>Total</Text>
            <Text style={S.totalAmt}>LKR {total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + 12 }, shadows.large]}>
        <GreenButton
          title={inStock ? 'Add to Cart' : 'Out of Stock'}
          onPress={handleAddToCart}
          fullWidth
          disabled={!inStock}
        />
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  centerText:  { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorTitle:  { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginTop: 16, marginBottom: 8 },
  errorSub:    { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn:    { backgroundColor: '#2E7D32', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 },
  retryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  heroWrap: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  fab: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLeft:  { left: 16 },
  fabRight: { right: 16 },

  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    padding: 24,
    paddingTop: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catPill: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  catText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  stockDot:  { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 12, fontWeight: '600' },

  name:    { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  unit:    { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  price:   { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  perUnit: { fontSize: 13, color: '#94a3b8' },

  divider:      { height: 1, backgroundColor: '#ffffff', marginVertical: 16 },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  description:  { fontSize: 14, color: '#64748b', lineHeight: 22 },

  qtySection:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    minWidth: 40,
    textAlign: 'center',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8f8f8',
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  totalAmt:   { fontSize: 26, fontWeight: 'bold', color: '#2E7D32' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8f8f8',
  },
});
