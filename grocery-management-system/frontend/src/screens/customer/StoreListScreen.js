import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image,
  RefreshControl, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { getImageUri } from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

function InfoRow({ icon, text }) {
  if (!text) return null;
  return (
    <View style={S.infoRow}>
      <Ionicons name={icon} size={14} color="#64748b" />
      <Text style={S.infoText}>{text}</Text>
    </View>
  );
}

function ProductStockList({ products = [] }) {
  const visibleProducts = products.slice(0, 4);
  const extraCount = products.length - visibleProducts.length;

  if (products.length === 0) {
    return (
      <View style={S.productListBox}>
        <Text style={S.productListTitle}>Products in this store</Text>
        <Text style={S.emptyProductText}>No products assigned yet</Text>
      </View>
    );
  }

  return (
    <View style={S.productListBox}>
      <Text style={S.productListTitle}>Products in this store</Text>
      {visibleProducts.map(product => (
        <View key={product._id} style={S.productStockRow}>
          <Text style={S.productStockName} numberOfLines={1}>{product.name}</Text>
          <Text style={S.productStockCount}>Stock: {product.stockQuantity ?? 0}</Text>
        </View>
      ))}
      {extraCount > 0 ? (
        <Text style={S.moreProductsText}>+{extraCount} more product{extraCount !== 1 ? 's' : ''}</Text>
      ) : null}
    </View>
  );
}

function StoreCard({ item, onPress }) {
  const isOpen = item.availabilityStatus === 'open';
  const storeImage = getImageUri(item.imageUrl);
  return (
    <TouchableOpacity
      style={[S.card, shadows.medium]}
      onPress={onPress}
      activeOpacity={0.78}
      disabled={!isOpen}
    >
      {storeImage ? (
        <Image source={{ uri: storeImage }} style={S.storeImage} />
      ) : (
        <View style={S.storeImageFallback}>
          <Ionicons name="storefront-outline" size={34} color="#2E7D32" />
        </View>
      )}
      <View style={S.cardTop}>
        <Text style={S.storeName} numberOfLines={1}>{item.name}</Text>
        <StatusBadge status={isOpen ? 'open' : 'failed'} />
      </View>
      <InfoRow icon="location-outline"  text={item.location} />
      <InfoRow icon="cube-outline"      text={`${item.productCount || 0} products · ${item.totalStock || 0} stock`} />
      <ProductStockList products={item.products} />
      <InfoRow icon="call-outline"      text={item.contactNumber} />
      <InfoRow icon="time-outline"      text={item.openingHours} />
      <View style={S.shopRow}>
        <Text style={[S.shopText, !isOpen && S.shopTextMuted]}>{isOpen ? 'Shop products' : 'Currently closed'}</Text>
        <Ionicons name="chevron-forward" size={16} color={isOpen ? '#2E7D32' : '#94a3b8'} />
      </View>
      <View style={[S.accentBar, { backgroundColor: isOpen ? '#2E7D32' : '#94a3b8' }]} />
    </TouchableOpacity>
  );
}

export default function StoreListScreen({ navigation }) {
  const [stores, setStores]         = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  const fetchStores = async () => {
    try {
      const { data } = await api.get('/stores');
      setStores(data);
      setError('');
    } catch {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchStores(); }, []));

  const visibleStores = stores.filter(s =>
    !search.trim() || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={S.container}>
      <AppHeader title="Our Stores" />

      {/* Search bar */}
      <View style={S.searchSection}>
        <View style={[S.searchPill, shadows.small]}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={S.searchInput}
            placeholder="Search stores or locations..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={S.center}>
          <Ionicons name="storefront-outline" size={48} color="#C8E6C9" />
          <Text style={S.loadingText}>Loading stores...</Text>
        </View>
      ) : error ? (
        <EmptyState
          icon="wifi-outline"
          title="Connection Error"
          subtitle={error}
          buttonTitle="Try Again"
          onButtonPress={() => { setLoading(true); fetchStores(); }}
        />
      ) : stores.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title="No Stores Available"
          subtitle="Check back later for store listings"
        />
      ) : visibleStores.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No Stores Found"
          subtitle={`No stores match "${search}"`}
        />
      ) : (
        <FlatList
          data={visibleStores}
          keyExtractor={i => i._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchStores(); }}
              colors={['#2E7D32']}
            />
          }
          ListHeaderComponent={
            /* Decorative map placeholder card */
            <View style={[S.mapCard, shadows.medium]}>
              <View style={S.mapIconWrap}>
                <Ionicons name="map-outline" size={36} color="#ffffff" />
              </View>
              <View style={S.mapTextWrap}>
                <Text style={S.mapTitle}>Find stores near you</Text>
                <Text style={S.mapSub}>{visibleStores.length} location{visibleStores.length !== 1 ? 's' : ''} available</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </View>
          }
          renderItem={({ item }) => (
            <StoreCard
              item={item}
              onPress={() => navigation.getParent()?.navigate('ProductsTab', {
                screen: 'ProductList',
                params: { storeId: item._id, storeName: item.name },
              })}
            />
          )}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  list:      { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748b', marginTop: 8 },

  // ── Search ───────────────────────────────────────────
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
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

  // ── Map placeholder ─────────────────────────────────
  mapCard: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mapTextWrap: { flex: 1 },
  mapTitle:    { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  mapSub:      { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // ── Store card ──────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  storeImage: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    resizeMode: 'cover',
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  storeImageFallback: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storeName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flex: 1, marginRight: 8 },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText:  { fontSize: 13, color: '#64748b', flex: 1 },
  productListBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  productListTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  productStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  productStockName: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '600' },
  productStockCount: { fontSize: 12, color: '#2E7D32', fontWeight: '800' },
  moreProductsText: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 2 },
  emptyProductText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  shopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  shopText:  { fontSize: 13, color: '#2E7D32', fontWeight: '700' },
  shopTextMuted: { color: '#94a3b8' },
  accentBar: { height: 3, marginHorizontal: -16, marginTop: 12 },
});
