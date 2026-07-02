import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Alert, RefreshControl, Switch,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import api, { getImageUri } from '../../config/api';
import AppHeader from '../../components/AppHeader';
import InputField from '../../components/InputField';
import GreenButton from '../../components/GreenButton';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const EMPTY = { name: '', location: '', contactNumber: '', openingHours: '', availabilityStatus: 'open' };
const OPENING_HOURS_OPTIONS = [
  '6:00 AM - 10:00 PM',
  '7:00 AM - 9:00 PM',
  '8:00 AM - 8:00 PM',
  '9:00 AM - 9:00 PM',
  '10:00 AM - 10:00 PM',
  '24 Hours',
];

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

export default function AdminStoreScreen() {
  const [stores, setStores]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [image, setImage]           = useState(null);
  const [saving, setSaving]         = useState(false);
  const [hoursOpen, setHoursOpen]   = useState(false);

  const fetchStores = async () => {
    try { const { data } = await api.get('/stores'); setStores(data); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchStores(); }, []));

  const openAdd  = () => {
    setEditing(null);
    setForm(EMPTY);
    setImage(null);
    setHoursOpen(false);
    setModal(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, location: s.location, contactNumber: s.contactNumber || '', openingHours: s.openingHours || '', availabilityStatus: s.availabilityStatus });
    setImage(null);
    setHoursOpen(false);
    setModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSave = async () => {
    if (!form.name || !form.location) { Alert.alert('Required', 'Name and location are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (image) {
        const mime = image.mimeType || 'image/jpeg';
        payload.imageBase64 = `data:${mime};base64,${image.base64}`;
      }

      if (editing) await api.put(`/stores/${editing._id}`, payload);
      else         await api.post('/stores', payload);
      setModal(false);
      fetchStores();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save store');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Store', 'This action cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/stores/${id}`); fetchStores(); }
        catch { Alert.alert('Error', 'Failed to delete store'); }
      }},
    ]);
  };

  const quickToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
      await api.put(`/stores/${id}`, { availabilityStatus: newStatus });
      setStores(prev => prev.map(s => s._id === id ? { ...s, availabilityStatus: newStatus } : s));
    } catch {
      Alert.alert('Error', 'Failed to update store status');
    }
  };

  const renderStore = ({ item }) => {
    const isOpen = item.availabilityStatus === 'open';
    const storeImage = getImageUri(item.imageUrl);
    return (
      <View style={[S.card, shadows.small]}>
        {/* Store name + switch */}
        <View style={S.cardTop}>
          {storeImage ? (
            <Image source={{ uri: storeImage }} style={S.storeImage} />
          ) : (
            <View style={S.storeIcon}>
              <Ionicons name="storefront-outline" size={20} color="#1B5E20" />
            </View>
          )}
          <Text style={S.storeName} numberOfLines={1}>{item.name}</Text>
          <Switch
            value={isOpen}
            onValueChange={() => quickToggle(item._id, item.availabilityStatus)}
            trackColor={{ false: '#e2e8f0', true: '#C8E6C9' }}
            thumbColor={isOpen ? '#2E7D32' : '#94a3b8'}
          />
        </View>

        {/* Info rows */}
        {item.location ? (
          <View style={S.infoRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={S.infoText}>{item.location}</Text>
          </View>
        ) : null}
        <View style={S.infoRow}>
          <Ionicons name="cube-outline" size={14} color="#64748b" />
          <Text style={S.infoText}>{item.productCount || 0} products · {item.totalStock || 0} stock</Text>
        </View>
        <ProductStockList products={item.products} />
        {item.contactNumber ? (
          <View style={S.infoRow}>
            <Ionicons name="call-outline" size={14} color="#64748b" />
            <Text style={S.infoText}>{item.contactNumber}</Text>
          </View>
        ) : null}
        {item.openingHours ? (
          <View style={S.infoRow}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={S.infoText}>{item.openingHours}</Text>
          </View>
        ) : null}

        {/* Status + actions */}
        <View style={S.cardBottom}>
          <StatusBadge status={isOpen ? 'open' : 'failed'} />
          <View style={S.actions}>
            <TouchableOpacity style={S.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
              <Ionicons name="pencil" size={14} color="#1d4ed8" />
              <Text style={S.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.deleteBtn} onPress={() => handleDelete(item._id)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <Text style={S.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const hasImage = image?.uri || editing?.imageUrl;
  const imageUri = image?.uri || getImageUri(editing?.imageUrl);

  return (
    <View style={S.container}>
      <AppHeader
        isAdmin
        title="Store Management"
        subtitle="Manage store locations"
        rightIcon="add-circle-outline"
        onRightPress={openAdd}
      />

      {loading ? (
        <View style={S.center}><ActivityIndicator size="large" color="#1B5E20" /></View>
      ) : stores.length === 0 ? (
        <EmptyState icon="storefront-outline" title="No Stores" subtitle="Tap + to add your first store" />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={i => i._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStores(); }} colors={['#1B5E20']} />}
          renderItem={renderStore}
        />
      )}

      {/* Add/Edit modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={S.overlay}
        >
          <View style={S.modalCard}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>{editing ? 'Edit Store' : 'Add Store'}</Text>
              <TouchableOpacity onPress={() => setModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <InputField label="Store Name *"   placeholder="e.g. Downtown Branch" value={form.name}          onChangeText={v => setForm(f => ({ ...f, name: v }))}          leftIcon="storefront-outline" />
              <InputField label="Location *"     placeholder="Full address"          value={form.location}      onChangeText={v => setForm(f => ({ ...f, location: v }))}      leftIcon="location-outline" />
              <InputField label="Contact Number" placeholder="+1 234 567 8900"       value={form.contactNumber} onChangeText={v => setForm(f => ({ ...f, contactNumber: v }))} leftIcon="call-outline"     keyboardType="phone-pad" />
              <Text style={S.modalLabel}>Opening Hours</Text>
              <View style={S.dropdownWrap}>
                <TouchableOpacity
                  style={[S.dropdownButton, hoursOpen && S.dropdownButtonActive]}
                  onPress={() => setHoursOpen(open => !open)}
                  activeOpacity={0.75}
                >
                  <View style={S.dropdownLeft}>
                    <Ionicons name="time-outline" size={18} color={form.openingHours ? '#1B5E20' : '#94a3b8'} />
                    <Text style={[S.dropdownText, !form.openingHours && S.dropdownPlaceholder]}>
                      {form.openingHours || 'Select opening hours'}
                    </Text>
                  </View>
                  <Ionicons name={hoursOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
                </TouchableOpacity>

                {hoursOpen && (
                  <View style={S.dropdownMenu}>
                    {OPENING_HOURS_OPTIONS.map(hours => {
                      const selected = form.openingHours === hours;
                      return (
                        <TouchableOpacity
                          key={hours}
                          style={[S.dropdownOption, selected && S.dropdownOptionActive]}
                          onPress={() => {
                            setForm(f => ({ ...f, openingHours: hours }));
                            setHoursOpen(false);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[S.dropdownOptionText, selected && S.dropdownOptionTextActive]}>
                            {hours}
                          </Text>
                          {selected ? <Ionicons name="checkmark-circle" size={18} color="#1B5E20" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <Text style={S.modalLabel}>Store Image</Text>
              {hasImage ? (
                <TouchableOpacity style={S.imagePreviewWrap} onPress={pickImage} activeOpacity={0.85}>
                  <Image source={{ uri: imageUri }} style={S.imagePreview} />
                  <View style={S.imageOverlay}>
                    <Ionicons name="camera-outline" size={18} color="#ffffff" />
                    <Text style={S.imageOverlayText}>Change Image</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={S.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                  <Ionicons name="camera-outline" size={30} color="#94a3b8" />
                  <Text style={S.imagePickerText}>Add Store Image</Text>
                  <Text style={S.imagePickerSub}>Tap to select from gallery</Text>
                </TouchableOpacity>
              )}

              <Text style={S.modalLabel}>Status</Text>
              <View style={S.statusRow}>
                {['open', 'closed'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[S.statusOption, form.availabilityStatus === s && S.statusOptionActive]}
                    onPress={() => setForm(f => ({ ...f, availabilityStatus: s }))}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={s === 'open' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                      size={18}
                      color={form.availabilityStatus === s ? '#1B5E20' : '#94a3b8'}
                    />
                    <Text style={[S.statusOptionText, form.availabilityStatus === s && S.statusOptionTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginTop: 8 }}>
                <GreenButton title="Save Store" onPress={handleSave} loading={saving} fullWidth isAdmin />
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  list:      { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Store card ──────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  storeIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
  },
  storeImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    resizeMode: 'cover',
    backgroundColor: '#f8fafc',
  },
  storeName: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText:  { fontSize: 13, color: '#64748b', flex: 1 },
  productListBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
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
  productStockCount: { fontSize: 12, color: '#1B5E20', fontWeight: '800' },
  moreProductsText: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 2 },
  emptyProductText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8f8f8',
  },
  actions:    { flexDirection: 'row', gap: 8 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnText:   { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },

  // ── Modal ───────────────────────────────────────────
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  imagePreviewWrap: {
    height: 150,
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
    height: 130,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 16,
    gap: 5,
  },
  imagePickerText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  imagePickerSub: { fontSize: 12, color: '#94a3b8' },
  statusRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusOption: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#e2e8f0', backgroundColor: '#ffffff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  statusOptionActive:     { borderColor: '#1B5E20', backgroundColor: '#ffffff' },
  statusOptionText:       { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  statusOptionTextActive: { color: '#1B5E20' },
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
});
