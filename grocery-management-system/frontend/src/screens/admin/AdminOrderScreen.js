import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GreenButton from '../../components/GreenButton';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const TABS = ['All', 'Active', 'Cancelled'];
const fmt  = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const toDateInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};
const DELIVERY_TIME_SLOTS = [
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '6:00 PM - 8:00 PM',
];

const matchesTab = (o, tab) => {
  if (tab === 'Active')    return o.orderStatus === 'Placed';
  if (tab === 'Cancelled') return o.orderStatus === 'Cancelled';
  return true;
};

// Map orderStatus → StatusBadge key
const toBadgeStatus = (s) => {
  const map = { Placed: 'open', Cancelled: 'cancelled', Delivered: 'delivered' };
  return map[s] || (s || '').toLowerCase();
};

export default function AdminOrderScreen() {
  const [orders, setOrders]         = useState([]);
  const [tab, setTab]               = useState('All');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [editItems, setEditItems]   = useState([]);
  const [editAddress, setEditAddress] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryTimeSlot, setEditDeliveryTimeSlot] = useState(DELIVERY_TIME_SLOTS[0]);
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);
  const [expanded, setExpanded]     = useState(null);
  const [saving, setSaving]         = useState(false);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)));
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  const visible     = orders.filter(o => matchesTab(o, tab));
  const activeCount = orders.filter(o => o.orderStatus === 'Placed').length;
  const cancelCount = orders.filter(o => o.orderStatus === 'Cancelled').length;

  const openEdit = (order) => {
    setEditing(order);
    setEditItems(order.items.map(i => ({ ...i, qty: i.quantity })));
    setEditAddress(order.deliveryAddress);
    setEditDeliveryDate(toDateInput(order.deliveryDate || order.placedAt));
    setEditDeliveryTimeSlot(order.deliveryTimeSlot || DELIVERY_TIME_SLOTS[0]);
    setSlotDropdownOpen(false);
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!editDeliveryDate.trim()) {
      Alert.alert('Required', 'Please enter a delivery date');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDeliveryDate.trim())) {
      Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/orders/${editing._id}/delivery`, {
        deliveryAddress: editAddress,
        deliveryDate: editDeliveryDate,
        deliveryTimeSlot: editDeliveryTimeSlot,
      });
      setEditModal(false);
      fetchOrders();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order');
    } finally { setSaving(false); }
  };

  const renderOrder = ({ item }) => {
    const isExpanded  = expanded === item._id;
    const shortId     = `#${item._id.slice(-6).toUpperCase()}`;
    const customerName = item.customerId?.name || 'Customer';
    const customerEmail = item.customerId?.email || '';

    return (
      <View style={[S.card, shadows.small]}>
        {/* Header row */}
        <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : item._id)} activeOpacity={0.8}>
          <View style={S.cardTop}>
            {/* Customer info */}
            <View style={S.customerWrap}>
              <View style={S.avatar}>
                <Text style={S.avatarText}>{customerName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.customerName} numberOfLines={1}>{customerName}</Text>
                <Text style={S.customerEmail} numberOfLines={1}>{customerEmail}</Text>
              </View>
            </View>
            <View style={S.cardTopRight}>
              <Text style={S.orderDate}>{fmt(item.deliveryDate || item.placedAt)}</Text>
              <Text style={S.orderId}>{shortId}</Text>
            </View>
          </View>

          <View style={S.cardMid}>
            <StatusBadge status={toBadgeStatus(item.orderStatus)} />
            <View style={S.midRight}>
              <Text style={S.itemsLabel}>{(item.items || []).length} items</Text>
              <Text style={S.totalAmt}>LKR {Number(item.totalAmount).toFixed(2)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded items */}
        {isExpanded && (
          <View style={S.expandedWrap}>
            {item.items.map((it, idx) => (
              <View key={idx} style={S.itemLine}>
                <Ionicons name="ellipse" size={5} color="#94a3b8" style={{ marginTop: 5 }} />
                <Text style={S.itemLineText}>{it.productName} × {it.quantity} @ LKR {Number(it.priceAtOrder).toFixed(2)}</Text>
              </View>
            ))}
            <View style={S.addressRow}>
              <Ionicons name="location-outline" size={14} color="#2E7D32" />
              <Text style={S.addressText} numberOfLines={2}>{item.deliveryAddress}</Text>
            </View>
            <View style={S.addressRow}>
              <Ionicons name="time-outline" size={14} color="#2E7D32" />
              <Text style={S.addressText}>{item.deliveryTimeSlot || 'Delivery slot not set'}</Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={S.cardActions}>
          <TouchableOpacity
            style={S.viewDetailBtn}
            onPress={() => setExpanded(isExpanded ? null : item._id)}
            activeOpacity={0.7}
          >
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#64748b" />
            <Text style={S.viewDetailText}>{isExpanded ? 'Collapse' : 'View Details'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <Ionicons name="pencil" size={14} color="#1d4ed8" />
            <Text style={S.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={S.container}>
      <AppHeader isAdmin title="Order Management" subtitle="All customer orders" />

      {/* Stats */}
      <View style={S.statsRow}>
        <StatCard title="Total Orders" value={orders.length} icon="document-text-outline" color="#1B5E20" />
        <StatCard title="Active"       value={activeCount}   icon="time-outline"           color="#2E7D32" />
        <StatCard title="Cancelled"    value={cancelCount}   icon="close-circle-outline"   color="#ef4444" />
      </View>

      {/* Tabs */}
      <View style={S.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={S.tab} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[S.tabText, tab === t && S.tabTextActive]}>{t}</Text>
            {tab === t && <View style={S.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator size="large" color="#1B5E20" /></View>
      ) : visible.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No Orders" subtitle={`No ${tab.toLowerCase()} orders found`} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={i => i._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={['#1B5E20']} />}
          renderItem={renderOrder}
        />
      )}

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={S.overlay}
        >
          <View style={S.modalCard}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Edit Order</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={S.modalLabel}>Delivery Date</Text>
              <TextInput
                style={S.singleInput}
                value={editDeliveryDate}
                onChangeText={setEditDeliveryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />

              <Text style={[S.modalLabel, { marginTop: 12 }]}>Delivery Time Slot</Text>
              <View style={S.slotGrid}>
                <TouchableOpacity
                  style={S.dropdownButton}
                  onPress={() => setSlotDropdownOpen(prev => !prev)}
                  activeOpacity={0.75}
                >
                  <Text style={S.dropdownValue}>{editDeliveryTimeSlot}</Text>
                  <Ionicons
                    name={slotDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color="#64748b"
                  />
                </TouchableOpacity>
                {slotDropdownOpen ? (
                  <View style={S.dropdownMenu}>
                    {DELIVERY_TIME_SLOTS.map(slot => (
                      <TouchableOpacity
                        key={slot}
                        style={[S.dropdownOption, editDeliveryTimeSlot === slot && S.dropdownOptionActive]}
                        onPress={() => {
                          setEditDeliveryTimeSlot(slot);
                          setSlotDropdownOpen(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[S.dropdownOptionText, editDeliveryTimeSlot === slot && S.dropdownOptionTextActive]}>
                          {slot}
                        </Text>
                        {editDeliveryTimeSlot === slot ? (
                          <Ionicons name="checkmark-outline" size={17} color="#1B5E20" />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>

              <Text style={[S.modalLabel, { marginTop: 12 }]}>Items</Text>
              {editItems.map((item, idx) => (
                <View key={idx} style={S.editItemRow}>
                  <Text style={S.editItemName} numberOfLines={1}>{item.productName}</Text>
                  <Text style={S.qtyNum}>x{item.qty}</Text>
                </View>
              ))}
              <Text style={[S.modalLabel, { marginTop: 12 }]}>Delivery Address</Text>
              <TextInput
                style={S.addressInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Delivery address"
                placeholderTextColor="#94a3b8"
                multiline
              />
              <View style={{ marginTop: 16 }}>
                <GreenButton title="Save Changes" onPress={handleSave} loading={saving} fullWidth isAdmin />
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
  list:      { paddingHorizontal: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },

  // ── Tab bar ─────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 12,
  },
  tab: { paddingVertical: 12, marginRight: 24, position: 'relative' },
  tabText:       { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#1B5E20' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2.5, backgroundColor: '#1B5E20', borderRadius: 999,
  },

  // ── Order card ──────────────────────────────────────
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customerWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1B5E20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText:    { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  customerName:  { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  customerEmail: { fontSize: 12, color: '#94a3b8' },
  cardTopRight:  { alignItems: 'flex-end' },
  orderDate:     { fontSize: 11, color: '#94a3b8' },
  orderId:       { fontSize: 12, fontWeight: 'bold', color: '#64748b', letterSpacing: 0.5 },

  cardMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  midRight:   { alignItems: 'flex-end' },
  itemsLabel: { fontSize: 12, color: '#64748b' },
  totalAmt:   { fontSize: 15, fontWeight: 'bold', color: '#2E7D32' },

  expandedWrap: {
    borderTopWidth: 1,
    borderTopColor: '#f8f8f8',
    paddingTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  itemLine:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  itemLineText: { fontSize: 13, color: '#0f172a', flex: 1 },
  addressRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  addressText:  { fontSize: 13, color: '#64748b', flex: 1 },

  cardActions:   { flexDirection: 'row', gap: 8 },
  viewDetailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, height: 34, borderRadius: 8, backgroundColor: '#ffffff',
  },
  viewDetailText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: '#eff6ff',
  },
  editBtnText: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },

  // ── Modal ───────────────────────────────────────────
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalLabel:   { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  editItemRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editItemName: { fontSize: 13, color: '#0f172a', flex: 1, marginRight: 8 },
  qtyNum:       { fontSize: 15, fontWeight: 'bold', color: '#0f172a', minWidth: 24, textAlign: 'center' },
  singleInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#0f172a',
  },
  slotGrid: { position: 'relative' },
  dropdownButton: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownOptionActive: { backgroundColor: '#E8F5E9' },
  dropdownOptionText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  dropdownOptionTextActive: { color: '#1B5E20' },
  addressInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#0f172a', minHeight: 60, textAlignVertical: 'top',
  },
});
