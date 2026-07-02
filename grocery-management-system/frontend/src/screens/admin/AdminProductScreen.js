import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  Modal, ScrollView, ActivityIndicator, Alert, RefreshControl,
  TextInput, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import api, { getImageUri } from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatCard from '../../components/StatCard';
import InputField from '../../components/InputField';
import GreenButton from '../../components/GreenButton';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const EMPTY_FORM = { name: '', description: '', price: '', stock: '', category: '', storeId: '' };
const STATUS_BAR_H = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24);
const PRODUCT_CATEGORIES = ['Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Meat', 'Drinks', 'Other'];

export default function AdminProductScreen() {
  const [products, setProducts]     = useState([]);
  const [stores, setStores]         = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [image, setImage]           = useState(null);
  const [saving, setSaving]         = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const fetchStores = async () => {
    try {
      const { data } = await api.get('/stores');
      setStores(data);
    } catch { /* silent */ }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
      applySearch(data, search);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchProducts(); fetchStores(); }, []));

  const applySearch = (data, text) => {
    setFiltered(text ? data.filter(p => p.name.toLowerCase().includes(text.toLowerCase())) : data);
  };

  const handleSearch = (text) => { setSearch(text); applySearch(products, text); };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImage(null);
    setCategoryOpen(false);
    setModalVisible(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stockQuantity),
      category: p.category || '',
      storeId: p.store?._id || p.store || '',
    });
    setImage(null);
    setCategoryOpen(false);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock || !form.storeId) {
      Alert.alert('Required', 'Name, price, stock, and store are required');
      return;
    }

    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.stock);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Invalid Price', 'Price must be a valid number greater than or equal to 0');
      return;
    }
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      Alert.alert('Invalid Stock', 'Stock quantity must be a whole number greater than or equal to 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parsedPrice,
        stockQuantity: parsedStock,
        category: form.category,
        storeId: form.storeId,
      };
      if (image) {
        const mime = image.mimeType || 'image/jpeg';
        payload.imageBase64 = `data:${mime};base64,${image.base64}`;
      }
      if (editing) await api.put(`/products/${editing._id}`, payload);
      else         await api.post('/products', payload);
      setModalVisible(false);
      fetchProducts();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save product');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Product', 'This action cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/products/${id}`); fetchProducts(); }
        catch { Alert.alert('Error', 'Failed to delete product'); }
      }},
    ]);
  };

  const totalCount    = products.length;
  const availCount    = products.filter(p => p.stockQuantity > 0).length;
  const outOfStockCnt = products.filter(p => p.stockQuantity === 0).length;

  const renderItem = ({ item }) => (
    <View style={[S.card, shadows.small]}>
      <View style={S.cardRow}>
        {item.imageUrl ? (
          <Image source={{ uri: getImageUri(item.imageUrl) }} style={S.thumb} />
        ) : (
          <View style={[S.thumb, S.thumbFallback]}>
            <Ionicons name="image-outline" size={22} color="#94a3b8" />
          </View>
        )}
        <View style={S.cardBody}>
          <Text style={S.productName} numberOfLines={1}>{item.name}</Text>
          {item.category ? (
            <View style={S.catPill}><Text style={S.catText}>{item.category}</Text></View>
          ) : null}
          {item.store?.name ? <Text style={S.storeText}>{item.store.name}</Text> : null}
          <Text style={S.productPrice}>LKR {Number(item.price).toFixed(2)}</Text>
          <Text style={S.stockText}>Stock: {item.stockQuantity}</Text>
        </View>
        <View style={S.cardActions}>
          <TouchableOpacity style={S.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <Ionicons name="pencil" size={15} color="#1d4ed8" />
          </TouchableOpacity>
          <TouchableOpacity style={S.deleteBtn} onPress={() => handleDelete(item._id)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const hasImage = image?.uri || editing?.imageUrl;
  const imageUri = image?.uri || getImageUri(editing?.imageUrl);

  return (
    <View style={S.container}>
      <AppHeader
        isAdmin
        title="Product Management"
        subtitle="Manage your inventory"
        rightIcon="add-circle-outline"
        onRightPress={openAdd}
      />

      {/* Stats row */}
      <View style={S.statsRow}>
        <StatCard title="Total"     value={totalCount}    icon="cube-outline"           color="#1B5E20" />
        <StatCard title="Available" value={availCount}    icon="checkmark-circle-outline" color="#2E7D32" />
        <StatCard title="No Stock"  value={outOfStockCnt} icon="alert-circle-outline"   color="#ef4444" />
      </View>

      {/* Search */}
      <View style={[S.searchWrap, shadows.small]}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          style={S.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={handleSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={17} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator size="large" color="#1B5E20" /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon="cube-outline" title="No Products" subtitle={search ? 'No results for your search' : 'Tap + to add your first product'} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} colors={['#1B5E20']} />}
          renderItem={renderItem}
        />
      )}

      {/* Add/Edit modal — full screen */}
      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView
          style={S.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal header */}
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>{editing ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={S.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <InputField label="Product Name *" placeholder="e.g. Organic Tomatoes" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} leftIcon="pricetag-outline" />
            <Text style={S.fieldLabel}>Store *</Text>
            <View style={S.storeOptions}>
              {stores.length === 0 ? (
                <View style={S.emptyStoreBox}>
                  <Ionicons name="storefront-outline" size={18} color="#94a3b8" />
                  <Text style={S.emptyStoreText}>Add a store before creating products</Text>
                </View>
              ) : stores.map(store => {
                const selected = form.storeId === store._id;
                return (
                  <TouchableOpacity
                    key={store._id}
                    style={[S.storeOption, selected && S.storeOptionActive]}
                    onPress={() => setForm(f => ({ ...f, storeId: store._id }))}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'storefront-outline'}
                      size={18}
                      color={selected ? '#1B5E20' : '#64748b'}
                    />
                    <View style={S.storeOptionTextWrap}>
                      <Text style={[S.storeOptionName, selected && S.storeOptionNameActive]} numberOfLines={1}>{store.name}</Text>
                      <Text style={S.storeOptionLocation} numberOfLines={1}>{store.location}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={S.fieldLabel}>Category</Text>
            <View style={S.dropdownWrap}>
              <TouchableOpacity
                style={[S.dropdownButton, categoryOpen && S.dropdownButtonActive]}
                onPress={() => setCategoryOpen(open => !open)}
                activeOpacity={0.75}
              >
                <View style={S.dropdownLeft}>
                  <Ionicons name="folder-outline" size={18} color={form.category ? '#1B5E20' : '#94a3b8'} />
                  <Text style={[S.dropdownText, !form.category && S.dropdownPlaceholder]}>
                    {form.category || 'Select a category'}
                  </Text>
                </View>
                <Ionicons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
              </TouchableOpacity>

              {categoryOpen && (
                <View style={S.dropdownMenu}>
                  {PRODUCT_CATEGORIES.map(category => {
                    const selected = form.category === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[S.dropdownOption, selected && S.dropdownOptionActive]}
                        onPress={() => {
                          setForm(f => ({ ...f, category }));
                          setCategoryOpen(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[S.dropdownOptionText, selected && S.dropdownOptionTextActive]}>
                          {category}
                        </Text>
                        {selected ? <Ionicons name="checkmark-circle" size={18} color="#1B5E20" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            <InputField label="Price *" placeholder="0.00" value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} keyboardType="decimal-pad" leftIcon="cash-outline" />
            <InputField label="Stock Quantity *" placeholder="0" value={form.stock} onChangeText={v => setForm(f => ({ ...f, stock: v }))} keyboardType="numeric" leftIcon="layers-outline" />
            <InputField label="Description" placeholder="Describe this product..." value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} leftIcon="document-text-outline" multiline numberOfLines={3} />

            {/* Image picker */}
            <Text style={S.imageLabel}>Product Image</Text>
            {hasImage ? (
              <TouchableOpacity style={S.imagePreviewWrap} onPress={pickImage} activeOpacity={0.85}>
                <Image source={{ uri: imageUri }} style={S.imagePreview} />
                <View style={S.imageOverlay}>
                  <Ionicons name="camera-outline" size={20} color="#ffffff" />
                  <Text style={S.imageOverlayText}>Change Photo</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={S.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                <Text style={S.imagePickerText}>Add Photo</Text>
                <Text style={S.imagePickerSub}>Tap to select from gallery</Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 24 }}>
              <GreenButton title="Save Product" onPress={handleSave} loading={saving} fullWidth isAdmin />
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  list:      { paddingHorizontal: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Stats ────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },

  // ── Search ──────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },

  // ── Product card ────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardRow:     { flexDirection: 'row', alignItems: 'center' },
  thumb:       { width: 64, height: 64, borderRadius: 10, resizeMode: 'cover' },
  thumbFallback: { backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  cardBody:    { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  catPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  catText:       { fontSize: 10, color: '#2E7D32', fontWeight: '600' },
  productPrice:  { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
  stockText:     { fontSize: 12, color: '#64748b' },
  storeText:     { fontSize: 12, color: '#64748b', marginBottom: 2 },
  cardActions:   { alignItems: 'center', gap: 8 },
  editBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },

  // ── Modal ───────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    paddingTop: STATUS_BAR_H + 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle:  { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  modalScroll: { padding: 20 },

  fieldLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  storeOptions: { gap: 8, marginBottom: 16 },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  storeOptionActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#E8F5E9',
  },
  storeOptionTextWrap: { flex: 1 },
  storeOptionName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  storeOptionNameActive: { color: '#1B5E20' },
  storeOptionLocation: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyStoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  emptyStoreText: { flex: 1, fontSize: 13, color: '#64748b' },

  dropdownWrap: { marginBottom: 16 },
  dropdownButton: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  dropdownButtonActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#E8F5E9',
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dropdownText: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  dropdownPlaceholder: { color: '#94a3b8', fontWeight: '500' },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownOptionActive: { backgroundColor: '#E8F5E9' },
  dropdownOptionText: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  dropdownOptionTextActive: { color: '#1B5E20', fontWeight: '800' },

  imageLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  imagePreviewWrap: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  imageOverlayText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  imagePicker: {
    height: 160,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 16,
    gap: 6,
  },
  imagePickerText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  imagePickerSub:  { fontSize: 12, color: '#94a3b8' },
});
