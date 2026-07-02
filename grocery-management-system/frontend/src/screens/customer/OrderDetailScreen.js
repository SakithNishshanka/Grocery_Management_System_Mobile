import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import GreenButton from '../../components/GreenButton';
import { shadows } from '../../theme/styles';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const normalizeStatus = (status = '') => String(status).trim().toLowerCase();

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId, readOnly = false } = route.params;
  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editModal, setEditModal]   = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editItems, setEditItems]   = useState([]);
  const [saving, setSaving]         = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
      setEditAddress(data.deliveryAddress);
      setEditItems(data.items.map(i => ({ ...i, qty: i.quantity })));
    } catch {
      Alert.alert('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  // FIX #27: retry button on error state
  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  if (!order)  return (
    <View style={S.center}>
      <Text style={{ color: '#ef4444', marginBottom: 12 }}>Failed to load order</Text>
      <TouchableOpacity onPress={() => { setLoading(true); fetchOrder(); }} style={S.retryBtn}>
        <Text style={S.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const trackingStatus = normalizeStatus(order.trackingStatus);
  const isProcessing = ['processing', 'out for delivery', 'delivered'].includes(trackingStatus);
  const editDeadline = order.editDeadline ? new Date(order.editDeadline).getTime() : NaN;
  const withinEditWindow = !Number.isNaN(editDeadline) && Date.now() < editDeadline;
  const editable = !readOnly && (typeof order.canEdit === 'boolean' ? order.canEdit : withinEditWindow && !isProcessing);
  const shortId  = `#${order._id.slice(-6).toUpperCase()}`;
  // FIX #21: show delivery date only if it actually exists — not placedAt as a fake fallback
  const deliveryDate     = order.deliveryDate || null;
  const deliveryTimeSlot = order.deliveryTimeSlot || 'Delivery slot not set';
  const editDeadlineText = order.editDeadline ? fmtTime(order.editDeadline) : 'the edit deadline';

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/orders/${orderId}`);
            Alert.alert('Cancelled', 'Your order has been cancelled.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const items = editItems.map(i => ({ ...i, quantity: i.qty }));
      await api.put(`/orders/${orderId}`, { items, deliveryAddress: editAddress });
      setEditModal(false);
      fetchOrder();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  // FIX #20: cap quantity at available stock from the product snapshot
  const adjustQty = (idx, delta) =>
    setEditItems(prev => prev.map((i, ii) => {
      if (ii !== idx) return i;
      const maxStock = Number(i.stockQuantity ?? i.stock ?? 999);
      return { ...i, qty: Math.min(Math.max(1, i.qty + delta), maxStock) };
    }));

  const handleConfirmOrder = async () => {
    setConfirming(true);
    try {
      const { data } = await api.put(`/orders/${orderId}/confirm`);
      setOrder(data);
      navigation.getParent()?.navigate('PaymentsTab', {
        screen: 'Payment',
        params: { orderId: data._id },
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to confirm order');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={S.flex}>
      <AppHeader
        title="Order Details"
        subtitle={shortId}
        onBack={() => navigation.goBack()}
      />

      {/* Edit window banner */}
      {!readOnly ? (
        <View style={[S.banner, editable ? S.bannerGreen : S.bannerGray]}>
          <Ionicons
            name={editable ? 'checkmark-circle-outline' : 'lock-closed-outline'}
            size={16}
            color={editable ? '#1B5E20' : '#64748b'}
          />
          <Text style={[S.bannerText, { color: editable ? '#1B5E20' : '#64748b' }]}>
            {editable
              ? `Order editable until ${editDeadlineText} or until it starts processing`
              : isProcessing
                ? 'Order is processing — editing is locked'
                : 'Edit window has closed — order is locked'}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* Order info card */}
        <View style={[S.card, shadows.medium]}>
          <View style={S.infoRow}>
            <Text style={S.orderId}>Order {shortId}</Text>
            <Text style={S.date}>{fmtDate(deliveryDate)}</Text>
          </View>
          {/* FIX #21: only show delivery date if it is actually set */}
          <View style={S.metaGrid}>
            <View style={S.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#2E7D32" />
              <View>
                <Text style={S.metaLabel}>Delivery Date</Text>
                <Text style={S.metaValue}>{deliveryDate ? fmtDate(deliveryDate) : 'Not scheduled'}</Text>
              </View>
            </View>
            <View style={S.metaItem}>
              <Ionicons name="time-outline" size={16} color="#2E7D32" />
              <View>
                <Text style={S.metaLabel}>Time Slot</Text>
                <Text style={S.metaValue}>{deliveryTimeSlot}</Text>
              </View>
            </View>
          </View>
          <View style={S.infoRow}>
            <StatusBadge status={order.orderStatus} />
            <Text style={S.totalAmt}>LKR {Number(order.totalAmount).toFixed(2)}</Text>
          </View>
        </View>

        {/* Items ordered */}
        <View style={[S.card, shadows.medium]}>
          <Text style={S.cardTitle}>Items Ordered</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={[S.itemRow, idx < order.items.length - 1 && S.itemBorder]}>
              <Text style={S.itemName} numberOfLines={1}>{item.productName}</Text>
              <View style={S.itemRight}>
                <Text style={S.itemCalc}>{item.quantity} × LKR {Number(item.priceAtOrder).toFixed(2)}</Text>
                <Text style={S.itemTotal}>LKR {(item.quantity * item.priceAtOrder).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View style={[S.card, shadows.medium]}>
          <View style={S.cardHeaderRow}>
            <Ionicons name="location-outline" size={17} color="#2E7D32" />
            <Text style={S.cardTitle}>Delivery Address</Text>
          </View>
          <Text style={S.addressText}>{order.deliveryAddress}</Text>
        </View>

        {/* FIX #17: show Confirm OR Edit+Cancel — never both simultaneously */}
        {order.orderStatus === 'Pending Confirmation' ? (
          // While awaiting confirmation: show confirm + cancel only (no edit)
          <View style={S.confirmBlock}>
            {!readOnly ? (
              <>
                <GreenButton
                  title="Confirm Order & Make Payment"
                  onPress={handleConfirmOrder}
                  loading={confirming}
                  fullWidth
                />
                {editable ? (
                  <TouchableOpacity
                    style={[S.actionBtn, S.cancelBtn, { marginTop: 10, flex: undefined, width: '100%' }]}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                    <Text style={S.cancelBtnText}>Cancel Order</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </View>
        ) : !readOnly && order.orderStatus !== 'Cancelled' && editable ? (
          // Confirmed + within edit window: show Edit and Cancel
          <View style={S.actionRow}>
            <TouchableOpacity
              style={[S.actionBtn, S.editBtn]}
              onPress={() => setEditModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={16} color="#1d4ed8" />
              <Text style={S.editBtnText}>Edit Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.actionBtn, S.cancelBtn]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={S.cancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        ) : !readOnly && order.orderStatus !== 'Cancelled' ? (
          // Edit window closed
          <View style={S.actionRow}>
            <View style={[S.actionBtn, S.disabledBtn, { flex: 1 }]}>
              <Ionicons name="lock-closed-outline" size={15} color="#94a3b8" />
              <Text style={S.disabledText}>Order can no longer be modified</Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={S.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={S.modalCard}
          >
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Edit Order</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={S.modalLabel}>Items</Text>
              {editItems.map((item, idx) => (
                <View key={idx} style={S.editItemRow}>
                  <Text style={S.editItemName} numberOfLines={1}>{item.productName}</Text>
                  <View style={S.editQtyRow}>
                    <TouchableOpacity style={[S.editQtyBtn, { borderColor: '#ef4444' }]} onPress={() => adjustQty(idx, -1)}>
                      <Ionicons name="remove" size={14} color="#ef4444" />
                    </TouchableOpacity>
                    <Text style={S.editQtyNum}>{item.qty}</Text>
                    <TouchableOpacity style={[S.editQtyBtn, { borderColor: '#2E7D32' }]} onPress={() => adjustQty(idx, 1)}>
                      <Ionicons name="add" size={14} color="#2E7D32" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text style={[S.modalLabel, { marginTop: 16 }]}>Delivery Address</Text>
              <TextInput
                style={S.editInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Delivery address"
                placeholderTextColor="#94a3b8"
                multiline
              />
              <View style={{ marginTop: 16 }}>
                <GreenButton title="Save Changes" onPress={handleSaveEdit} loading={saving} fullWidth />
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },

  // ── Banner ──────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  bannerGreen: { backgroundColor: '#E8F5E9', borderBottomColor: '#86efac' },
  bannerGray:  { backgroundColor: '#ffffff', borderBottomColor: '#cbd5e1' },
  bannerText:  { fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Cards ───────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle:     { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId:  { fontSize: 14, fontWeight: 'bold', color: '#0f172a', letterSpacing: 0.5 },
  date:     { fontSize: 12, color: '#94a3b8' },
  totalAmt: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 10,
  },
  metaLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  metaValue: { fontSize: 12, color: '#0f172a', fontWeight: '800', marginTop: 2 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  itemName:   { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 8 },
  itemRight:  { alignItems: 'flex-end' },
  itemCalc:   { fontSize: 12, color: '#64748b' },
  itemTotal:  { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },

  addressText: { fontSize: 14, color: '#64748b', lineHeight: 20, marginTop: 4 },
  confirmBlock: { marginBottom: 12 },

  // ── Action buttons ──────────────────────────────────
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 6,
  },
  editBtn:       { backgroundColor: '#eff6ff' },
  cancelBtn:     { backgroundColor: '#fef2f2' },
  disabledBtn:   { backgroundColor: '#ffffff' },
  editBtnText:   { color: '#1d4ed8', fontWeight: 'bold', fontSize: 14 },
  cancelBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  disabledText:  { color: '#94a3b8', fontSize: 13 },

  // ── Edit modal ──────────────────────────────────────
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },

  editItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editItemName: { flex: 1, fontSize: 13, color: '#0f172a', marginRight: 8 },
  editQtyRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editQtyNum: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', minWidth: 24, textAlign: 'center' },
  editInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
