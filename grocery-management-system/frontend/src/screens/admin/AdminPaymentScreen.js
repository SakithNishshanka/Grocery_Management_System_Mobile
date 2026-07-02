import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const TABS     = ['All', 'Pending', 'Successful', 'Refunds'];
const STATUSES = ['Pending', 'Successful', 'Failed', 'Refunded'];

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const toStatusBadge = (s) => {
  const map = { Pending: 'pending', Successful: 'successful', Failed: 'failed', Refunded: 'refunded' };
  return map[s] || (s || '').toLowerCase();
};

export default function AdminPaymentScreen() {
  const [payments, setPayments]     = useState([]);
  const [tab, setTab]               = useState('All');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchPayments = async () => {
    try { const { data } = await api.get('/payments'); setPayments(data); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchPayments(); }, []));

  const handleStatusChange = async (paymentId, newStatus) => {
    setUpdatingId(paymentId);
    try {
      const { data: updatedPayment } = await api.put(`/payments/${paymentId}/status`, { status: newStatus });
      setPayments(prev => prev.map(p => p._id === paymentId ? updatedPayment : p));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update payment status');
    } finally { setUpdatingId(null); }
  };

  const visible = payments.filter(p => {
    if (tab === 'Pending')    return p.status === 'Pending';
    if (tab === 'Successful') return p.status === 'Successful';
    if (tab === 'Refunds')    return p.refundRequested;
    return true;
  });

  const totalRevenue  = payments.filter(p => p.status === 'Successful').reduce((s, p) => s + Number(p.amount), 0);
  const pendingCount  = payments.filter(p => p.status === 'Pending').length;
  const refundCount   = payments.filter(p => p.refundRequested).length;

  const renderPayment = ({ item }) => {
    const isRefund = item.refundRequested;
    return (
      <View style={[S.card, shadows.small, isRefund && S.refundBorder]}>
        {/* Customer + order */}
        <View style={S.cardTop}>
          <View style={S.avatarWrap}>
            <View style={S.avatar}>
              <Text style={S.avatarText}>{(item.customerId?.name || 'C').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={S.customerName}>{item.customerId?.name || 'Customer'}</Text>
              <Text style={S.orderId}>Order #{item.orderId?._id?.slice(-6).toUpperCase() || '——'}</Text>
            </View>
          </View>
          <View style={S.amountWrap}>
            <Text style={S.amount}>LKR {Number(item.amount).toFixed(2)}</Text>
            <View style={S.methodPill}>
              <Text style={S.methodText}>{item.method}</Text>
            </View>
          </View>
        </View>

        {/* Refund banner */}
        {isRefund && (
          <View style={S.refundBanner}>
            <Ionicons name="warning-outline" size={14} color="#92400e" />
            <Text style={S.refundBannerText}>Refund Requested</Text>
            {item.refundReason ? (
              <Text style={S.refundReason} numberOfLines={1}>— {item.refundReason}</Text>
            ) : null}
          </View>
        )}

        {/* Status badge + date */}
        <View style={S.statusRow}>
          <StatusBadge status={toStatusBadge(item.status)} />
          <Text style={S.dateText}>{fmt(item.createdAt)}</Text>
        </View>

        {item.method === 'online' && (
          <View style={S.referenceBox}>
            <View style={S.referenceRow}>
              <Ionicons name="receipt-outline" size={15} color="#1B5E20" />
              <Text style={S.referenceLabel}>Transaction Reference</Text>
            </View>
            <Text style={S.referenceValue}>{item.transactionReference || 'No reference entered'}</Text>
          </View>
        )}

        {item.method === 'card' && item.stripePaymentIntentId ? (
          <View style={S.referenceBox}>
            <View style={S.referenceRow}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#1B5E20" />
              <Text style={S.referenceLabel}>Stripe Payment Intent</Text>
            </View>
            <Text style={S.referenceValue}>{item.stripePaymentIntentId}</Text>
          </View>
        ) : null}

        {item.paymentNote ? (
          <View style={S.noteBox}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color="#64748b" />
            <Text style={S.noteText}>{item.paymentNote}</Text>
          </View>
        ) : null}

        {/* Status chips */}
        <View style={S.chipsRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[S.statusChip, item.status === s && S.statusChipActive]}
              onPress={() => item.status !== s && handleStatusChange(item._id, s)}
              disabled={updatingId === item._id}
              activeOpacity={0.75}
            >
              <Text style={[S.statusChipText, item.status === s && S.statusChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {updatingId === item._id && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginTop: 6 }} />
        )}
      </View>
    );
  };

  return (
    <View style={S.container}>
      <AppHeader isAdmin title="Payment Management" subtitle="Revenue & transactions" />

      {/* Stats */}
      <View style={S.statsRow}>
        <StatCard title="Revenue"  value={`LKR ${totalRevenue.toFixed(0)}`} icon="cash-outline"         color="#2E7D32" />
        <StatCard title="Pending"  value={pendingCount}                   icon="time-outline"          color="#f59e0b" />
        <StatCard title="Refunds"  value={refundCount}                    icon="return-down-back-outline" color="#f97316" />
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
        <EmptyState icon="card-outline" title="No Payments" subtitle={`No ${tab.toLowerCase()} payments found`} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={i => i._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments(); }} colors={['#1B5E20']} />}
          renderItem={renderPayment}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  list:      { paddingHorizontal: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 12,
  },
  tab: { paddingVertical: 12, marginRight: 20, position: 'relative' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#1B5E20' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2.5, backgroundColor: '#1B5E20', borderRadius: 999,
  },

  // ── Payment card ────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refundBorder: { borderLeftWidth: 4, borderLeftColor: '#f97316' },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1B5E20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText:    { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  customerName:  { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  orderId:       { fontSize: 12, color: '#94a3b8', marginTop: 2, letterSpacing: 0.3 },
  amountWrap:    { alignItems: 'flex-end' },
  amount:        { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  methodPill: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  methodText: { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },

  refundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  refundBannerText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  refundReason:     { fontSize: 12, color: '#b45309', flex: 1 },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateText: { fontSize: 11, color: '#94a3b8' },

  referenceBox: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    padding: 10,
    marginBottom: 10,
  },
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  referenceLabel: { fontSize: 12, fontWeight: '800', color: '#1B5E20' },
  referenceValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', letterSpacing: 0.3 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    marginBottom: 10,
  },
  noteText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 17 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  statusChipActive:     { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  statusChipText:       { fontSize: 11, color: '#64748b' },
  statusChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
});
