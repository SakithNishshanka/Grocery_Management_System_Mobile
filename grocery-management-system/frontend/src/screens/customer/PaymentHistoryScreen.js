import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import GreenButton from '../../components/GreenButton';
import { shadows } from '../../theme/styles';

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Map Payment.status → StatusBadge status string
const toStatusBadge = (status) => {
  const map = { Pending: 'pending', Successful: 'successful', Failed: 'failed', Refunded: 'refunded' };
  return map[status] || status?.toLowerCase();
};

export default function PaymentHistoryScreen({ navigation }) {
  const [payments, setPayments]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [refundModal, setRefundModal]     = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundReason, setRefundReason]   = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const fetchPayments = async () => {
    try {
      const { data } = await api.get('/payments/my');
      setPayments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchPayments(); }, []));

  const openRefundModal = (payment) => {
    setSelectedPayment(payment);
    setRefundReason('');
    setRefundModal(true);
  };

  const submitRefund = async () => {
    if (!refundReason.trim()) { Alert.alert('Required', 'Please enter a refund reason'); return; }
    setSubmitting(true);
    try {
      await api.put(`/payments/${selectedPayment._id}/refund`, { refundReason });
      setRefundModal(false);
      fetchPayments();
      Alert.alert('Request Sent', 'Your refund request has been submitted.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit refund');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpent = payments
    .filter(p => p.status === 'Successful')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const renderPayment = ({ item }) => (
    <View style={[S.card, shadows.medium]}>
      <View style={S.cardRow}>
        <Text style={S.orderId}>
          #{item.orderId?._id?.slice(-6).toUpperCase() || '——'}
        </Text>
        <Text style={S.date}>{fmt(item.createdAt)}</Text>
      </View>

      <View style={S.cardRow}>
        <Text style={S.amount}>LKR {Number(item.amount).toFixed(2)}</Text>
        <View style={S.methodPill}>
          <Text style={S.methodText}>{item.method}</Text>
        </View>
      </View>

      <StatusBadge status={toStatusBadge(item.status)} />

      {item.method === 'online' && item.transactionReference ? (
        <View style={S.referenceBox}>
          <Ionicons name="receipt-outline" size={14} color="#2E7D32" />
          <Text style={S.referenceText}>Ref: {item.transactionReference}</Text>
        </View>
      ) : null}

      {item.method === 'card' && item.stripePaymentIntentId ? (
        <View style={S.referenceBox}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#2E7D32" />
          <Text style={S.referenceText}>Stripe: {item.stripePaymentIntentId}</Text>
        </View>
      ) : null}

      {item.orderId?.deliveryAddress ? (
        <View style={S.detailRow}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={S.detailText} numberOfLines={2}>{item.orderId.deliveryAddress}</Text>
        </View>
      ) : null}

      {(item.orderId?.items || []).length > 0 ? (
        <View style={S.itemsBox}>
          <Text style={S.itemsTitle}>Order Items</Text>
          {item.orderId.items.map((orderItem, index) => (
            <View key={`${orderItem.productId}-${index}`} style={S.itemRow}>
              <Text style={S.itemName} numberOfLines={1}>
                {orderItem.productName || 'Product'} × {orderItem.quantity}
              </Text>
              <Text style={S.itemPrice}>
                LKR {(Number(orderItem.priceAtOrder || 0) * Number(orderItem.quantity || 1)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {item.refundRequested && (
        <View style={S.refundBanner}>
          <Ionicons name="time-outline" size={14} color="#92400e" />
          <Text style={S.refundBannerText}>Refund request under review</Text>
        </View>
      )}

      {item.status === 'Successful' && !item.refundRequested && (
        <TouchableOpacity
          style={S.refundBtn}
          onPress={() => openRefundModal(item)}
          activeOpacity={0.8}
        >
          <Text style={S.refundBtnText}>Request Refund</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={S.container}>
      <AppHeader
        title="Payments"
        rightIcon="add-circle-outline"
        onRightPress={() => navigation.navigate('Payment')}
      />

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : payments.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title="No Payments Yet"
          subtitle="Your payment history will appear here"
        />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={i => i._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPayments(); }}
              colors={['#2E7D32']}
            />
          }
          ListHeaderComponent={
            /* Total spent summary card */
            <View style={[S.summaryCard, shadows.medium]}>
              <Text style={S.summaryLabel}>Total Spent</Text>
              <Text style={S.summaryAmount}>LKR {totalSpent.toFixed(2)}</Text>
              <Text style={S.summarySubLabel}>{payments.filter(p => p.status === 'Successful').length} successful payments</Text>
            </View>
          }
          renderItem={renderPayment}
        />
      )}

      {/* Refund bottom sheet */}
      <Modal visible={refundModal} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Request Refund</Text>
            {selectedPayment && (
              <Text style={S.sheetAmount}>
                LKR {Number(selectedPayment.amount).toFixed(2)}
              </Text>
            )}
            <Text style={S.sheetLabel}>Reason for refund</Text>
            <TextInput
              style={S.reasonInput}
              placeholder="Describe your reason for requesting a refund..."
              placeholderTextColor="#94a3b8"
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={{ marginTop: 8 }}>
              <GreenButton
                title="Submit Refund Request"
                onPress={submitRefund}
                loading={submitting}
                fullWidth
              />
            </View>
            <TouchableOpacity style={S.cancelBtn} onPress={() => setRefundModal(false)} activeOpacity={0.7}>
              <Text style={S.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  list:      { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Summary card ────────────────────────────────────
  summaryCard: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryLabel:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 0.5 },
  summaryAmount:   { fontSize: 40, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  summarySubLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // ── Payment card ────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', letterSpacing: 0.5 },
  date:    { fontSize: 12, color: '#94a3b8' },
  amount:  { fontSize: 22, fontWeight: 'bold', color: '#2E7D32' },
  methodPill: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  methodText: { fontSize: 12, color: '#64748b', textTransform: 'capitalize' },

  referenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  referenceText: { fontSize: 12, color: '#166534', fontWeight: '700', flex: 1 },

  refundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  refundBannerText: { fontSize: 12, color: '#92400e', flex: 1 },
  refundBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  refundBtnText: { color: '#b45309', fontWeight: '600', fontSize: 13 },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  detailText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  itemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  itemsTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  itemName: { flex: 1, fontSize: 13, color: '#334155' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  // ── Bottom sheet ─────────────────────────────────────
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle:  { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  sheetAmount: { fontSize: 28, fontWeight: 'bold', color: '#ef4444', marginBottom: 16 },
  sheetLabel:  { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 90,
    marginBottom: 4,
  },
  cancelBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
});
