import React, { useState, useContext, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Image, RefreshControl, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import api, { getImageUri } from '../../config/api';
import LoadingCard from '../../components/LoadingCard';
import EmptyState from '../../components/EmptyState';
import ProductCard from '../../components/ProductCard';
import Toast from '../../components/Toast';
import AnimatedPressable from '../../components/AnimatedPressable';
import { shadows } from '../../theme/styles';

const PROMO_IMAGE = require('../../../assets/promo-basket-cutout.png');

const CATEGORY_DATA = [
  { label: 'All',        bg: '#ffffff', ring: '#2E7D32', icon: 'grid-outline',        iconColor: '#2E7D32' },
  { label: 'Fruits',     bg: '#FCE4EC', ring: 'transparent', icon: 'nutrition-outline', iconColor: '#E53935' },
  { label: 'Vegetables', bg: '#E8F5E9', ring: 'transparent', icon: 'leaf-outline',        iconColor: '#2E7D32' },
  { label: 'Dairy',      bg: '#E3F2FD', ring: 'transparent', icon: 'water-outline',       iconColor: '#1E88E5' },
  { label: 'Bakery',     bg: '#FFF3E0', ring: 'transparent', icon: 'cafe-outline',        iconColor: '#FB8C00' },
  { label: 'Meat',       bg: '#FBE9E7', ring: 'transparent', icon: 'restaurant-outline',  iconColor: '#D84315' },
  { label: 'Drinks',     bg: '#EDE7F6', ring: 'transparent', icon: 'wine-outline',        iconColor: '#5E35B1' },
];

const CATEGORIES = CATEGORY_DATA.map(c => c.label);

let Haptics;
try { Haptics = require('expo-haptics'); } catch (_) {}

const toCard = (item, storeId, storeName) => ({
  ...item,
  storeId: item.store?._id || item.store || storeId,
  storeName: item.store?.name || storeName,
  image: getImageUri(item.imageUrl),
  stock: item.stockQuantity,
});

function FeaturedCard({ item, onPress, onAdd, justAdded }) {
  const [imgError, setImgError] = useState(false);
  const inStock = Number(item.stockQuantity || 0) > 0;
  return (
    <AnimatedPressable
      style={[S.featCard, shadows.medium]}
      onPress={onPress}
      scaleTo={0.96}
      haptic="light"
    >
      {item.imageUrl && !imgError ? (
        <Image source={{ uri: getImageUri(item.imageUrl) }} style={S.featImage} onError={() => setImgError(true)} />
      ) : (
        <View style={[S.featImage, S.featPlaceholder]}>
          <Ionicons name="bag-outline" size={36} color="#2E7D32" />
        </View>
      )}
      <View style={S.featContent}>
        <Text style={S.featName} numberOfLines={1}>{item.name}</Text>
        <Text style={[S.featStock, item.stockQuantity === 0 && S.featStockEmpty]}>
          Stock: {item.stockQuantity ?? 0}
        </Text>
        <View style={S.featBottom}>
          <Text style={S.featPrice}>LKR {Number(item.price).toFixed(2)}</Text>
          <TouchableOpacity
            style={[S.featAddBtn, justAdded && S.featAddBtnDone, !inStock && S.featAddBtnDisabled]}
            onPress={onAdd}
            activeOpacity={0.8}
            disabled={!inStock}
          >
            <Ionicons name={justAdded ? 'checkmark' : 'add'} size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ProductListScreen({ route, navigation }) {
  const { user, logout }          = useContext(AuthContext);
  const { addToCart, replaceCartWithProduct, cartCount }  = useContext(CartContext);
  const { storeId, storeName } = route.params || {};

  const [products, setProducts]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [justAddedId, setJustAddedId] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Animated.Value for cart icon bounce in header
  const cartScale = useRef(new Animated.Value(1)).current;

  const bounceCart = () => {
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.35, duration: 140, useNativeDriver: true }),
      Animated.spring(cartScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }),
    ]).start();
  };

  const applyFilters = (data, text, cat) => {
    let result = data;
    if (cat !== 'All') result = result.filter(p => p.category === cat);
    if (text)          result = result.filter(p => p.name.toLowerCase().includes(text.toLowerCase()));
    setFiltered(result);
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get(storeId ? `/products?storeId=${storeId}` : '/products');
      setProducts(data);
      applyFilters(data, search, selectedCat);
      setError('');
    } catch (err) {
      setError(!err.response ? 'Cannot connect to server' : 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProducts(); }, [storeId]));

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(products, text, selectedCat);
  };

  const handleCategory = (cat) => {
    setSelectedCat(cat);
    applyFilters(products, search, cat);
  };

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleAddToCart = (product) => {
    const cartProduct = toCard(product, storeId, storeName);
    const result = addToCart(cartProduct);
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
              replaceCartWithProduct(cartProduct);
              showAddedFeedback(product._id);
            },
          },
        ]
      );
      return;
    }

    showAddedFeedback(product._id);
  };

  const showAddedFeedback = (productId) => {
    // Haptic feedback
    try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle?.Medium); } catch (_) {}

    // Bounce cart icon
    bounceCart();

    // Show checkmark on button
    setJustAddedId(productId);
    setToastVisible(true);

    setTimeout(() => {
      setJustAddedId(null);
      setToastVisible(false);
    }, 1800);
  };

  const featured    = products.slice(0, 5);
  const showFeatured = !search && selectedCat === 'All' && featured.length > 0;
  const firstName   = user?.name?.split(' ')[0] || 'there';

  const ListHeader = () => (
    <>
      {/* Promo banner */}
      {!search && selectedCat === 'All' && (
        <View style={S.promoBanner}>
          <View style={S.promoLeft}>
            <Text style={S.promoTitle}>Sameday delivery!</Text>
            <Text style={S.promoSub}>Fresh Groceries at</Text>
            <Text style={S.promoSub}>your doorstep</Text>
          </View>
          <Image source={PROMO_IMAGE} style={S.promoImage} resizeMode="contain" />
        </View>
      )}

      {showFeatured && (
        <View style={S.section}>
          <View style={S.sectionRow}>
            <Text style={S.sectionTitle}>Featured</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={S.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.featRow}
          >
            {featured.map(item => (
              <FeaturedCard
                key={item._id}
                item={item}
                justAdded={justAddedId === item._id}
                onPress={() => navigation.navigate('ProductDetail', { productId: item._id, storeId, storeName })}
                onAdd={() => handleAddToCart(item)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      <View style={S.sectionRow}>
        <Text style={S.sectionTitle}>
          {selectedCat === 'All' ? 'All Products' : selectedCat}
        </Text>
        <Text style={S.countLabel}>{filtered.length} items</Text>
      </View>
    </>
  );

  return (
    <View style={S.container}>
      <View style={S.greetHeader}>
        <View style={S.greetLeft}>
          <View style={S.locationRow}>
            <Ionicons name="location-outline" size={14} color="#2E7D32" />
            <Text style={S.locationText} numberOfLines={1}>{storeName || 'Select a store'}</Text>
          </View>
          <Text style={S.greetText}>Hey {firstName}!</Text>
        </View>
        <TouchableOpacity
          style={S.changeStoreBtn}
          onPress={() => navigation.getParent()?.navigate('StoresTab', { screen: 'StoreList' })}
          activeOpacity={0.75}
        >
          <Ionicons name="storefront-outline" size={16} color="#2E7D32" />
        </TouchableOpacity>
        <TouchableOpacity style={S.logoutBtn} onPress={confirmLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={20} color="#64748b" />
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: cartScale }] }}>
          <TouchableOpacity
            style={S.cartBtn}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={24} color="#1a1a1a" />
            {cartCount > 0 && (
              <View style={S.cartBadge}>
                <Text style={S.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Search bar */}
      <View style={S.searchSection}>
        <View style={[S.searchPill, shadows.small]}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={S.searchInput}
            placeholder="Search fresh products..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={handleSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories */}
      <View style={S.catSection}>
        <View style={S.catHeader}>
          <Text style={S.catHeaderTitle}>Categories</Text>
          <Text style={S.catHeaderSeeAll}>See all</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.catRow}
        >
          {CATEGORY_DATA.map(cat => {
            const active = selectedCat === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={S.catCard}
                onPress={() => handleCategory(cat.label)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    S.catCardWrap,
                    active && S.catCardWrapActive,
                  ]}
                >
                  <View
                    style={[
                      S.catCircle,
                      { backgroundColor: cat.bg },
                      { borderColor: active ? '#2E7D32' : (cat.ring || 'transparent') },
                    ]}
                  >
                    <Ionicons name={cat.icon} size={26} color={cat.iconColor} />
                  </View>
                </View>
                <Text style={[S.catLabel, active && S.catLabelActive]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={S.skeletonGrid}>
          {[1, 2, 3, 4].map(i => <LoadingCard key={i} />)}
        </ScrollView>
      ) : error ? (
        <EmptyState
          icon="wifi-outline"
          title="Connection Error"
          subtitle={error}
          buttonTitle="Try Again"
          onButtonPress={() => { setLoading(true); fetchProducts(); }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="bag-outline" title="No Products Found" subtitle="Try a different search or category" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          numColumns={2}
          contentContainerStyle={S.list}
          columnWrapperStyle={S.colWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<ListHeader />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchProducts(); }}
              tintColor="#2E7D32"
              colors={['#2E7D32']}
              progressBackgroundColor="#ffffff"
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={toCard(item)}
              viewType="grid"
              onPress={() => navigation.navigate('ProductDetail', { productId: item._id, storeId, storeName })}
              onAddToCart={() => handleAddToCart(item)}
            />
          )}
        />
      )}

      {/* Floating cart shortcut (only when items > 0) */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={[S.floatingCart, shadows.large]}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.85}
        >
          <Ionicons name="cart-outline" size={26} color="#fff" />
          <View style={S.floatingBadge}>
            <Text style={S.floatingBadgeText}>{cartCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Add-to-cart toast */}
      <Toast visible={toastVisible} message="Added to cart!" type="success" />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  // ── Greeting header ─────────────────────────────────
  greetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  greetLeft: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { fontSize: 13, color: '#64748b', fontWeight: '500', maxWidth: 190 },
  greetText: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a' },
  changeStoreBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a' },

  // ── Categories ───────────────────────────────────────
  catSection: {
    backgroundColor: '#ffffff',
    paddingTop: 8,
    paddingBottom: 4,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  catHeaderTitle:  { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  catHeaderSeeAll: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  catRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  catCard: {
    alignItems: 'center',
    width: 74,
  },
  catCardWrap: {
    borderRadius: 18,
    padding: 4,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catCardWrapActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#ffffff',
  },
  catCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  catLabelActive: { color: '#2E7D32', fontWeight: '800' },

  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
  },

  list:       { paddingHorizontal: 12, paddingBottom: 100, backgroundColor: '#ffffff' },
  colWrapper: { gap: 12, justifyContent: 'space-between' },

  // ── Promo banner ─────────────────────────────────────
  promoBanner: {
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    marginBottom: 8,
    marginTop: 8,
    overflow: 'hidden',
    height: 148,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  promoLeft: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 132,
    paddingVertical: 18,
    justifyContent: 'center',
    zIndex: 2,
  },
  promoTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff', lineHeight: 30 },
  promoSub: { fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 4, fontWeight: '500' },
  promoImage: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 190,
    height: 124,
  },

  section:    { marginBottom: 4 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  seeAll:       { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  countLabel:   { fontSize: 13, color: '#94a3b8' },

  featRow:   { gap: 12, paddingBottom: 4 },
  featCard: {
    width: 180,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  featImage:       { width: '100%', height: 160, resizeMode: 'contain', backgroundColor: 'transparent' },
  featPlaceholder: { backgroundColor: '#f8f8f8', alignItems: 'center', justifyContent: 'center' },
  featContent:     { padding: 10 },
  featName:        { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  featStock:       { fontSize: 12, color: '#2E7D32', fontWeight: '700', marginBottom: 6 },
  featStockEmpty:  { color: '#ef4444' },
  featBottom:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featPrice:       { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  featAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featAddBtnDone: { backgroundColor: '#1B5E20' },
  featAddBtnDisabled: { backgroundColor: '#94a3b8' },

  floatingCart: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  floatingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
