import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import TrackingStepper from '../../components/TrackingStepper';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default function TrackingScreen({ route }) {
  const preselectedOrderId = route.params?.orderId;
  const [records, setRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTracking = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await api.get('/tracking/my');
      setRecords(data);
      if (data.length > 0) {
        const preferred = preselectedOrderId
          ? data.find(r => String(r.orderId?._id || r.orderId) === String(preselectedOrderId))
          : null;
        setSelectedId(preferred?._id || data[0]._id);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTracking(); }, [preselectedOrderId]));

  useEffect(() => {
    if (!preselectedOrderId || records.length === 0) return;
    const match = records.find(r => String(r.orderId?._id || r.orderId) === String(preselectedOrderId));
    if (match) setSelectedId(match._id);
  }, [preselectedOrderId, records]);

  const selected = records.find(r => r._id === selectedId);
  const history = [...(selected?.trackingHistory || [])].reverse();
  const isDelivered = (selected?.currentStatus || '').toLowerCase() === 'delivered';

  const handleDeleteTracking = () => {
    if (!selected || !isDelivered) return;
    Alert.alert(
      'Remove Delivery',
      'Delete this delivered order from tracking? It will also be removed from My Orders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tracking/${selected._id}`);
              const next = records.filter(r => r._id !== selected._id);
              setRecords(next);
              setSelectedId(next[0]?._id || null);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete tracking record');
            }
          },
        },
      ]
    );
  };

  const orderShortId = selected?.orderId?._id
    ? `#${String(selected.orderId._id).slice(-6).toUpperCase()}`
    : '';

  if (loading) {
    return (
      <View style={S.container}>
        <AppHeader title="Track My Order" />
        <View style={S.center}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <View style={S.container}>
        <AppHeader title="Track My Order" />
        <EmptyState
          icon="navigate-outline"
          title="No deliveries to track"
          subtitle="Place an order first, then track its delivery status here."
        />
      </View>
    );
  }

  return (
    <View style={S.container}>
      <AppHeader title="Track My Order" />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTracking(true); }} colors={['#2E7D32']} />
        }
      >
        {records.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.orderRow}>
            {records.map(record => {
              const id = record.orderId?._id || record.orderId;
              const shortId = id ? `#${String(id).slice(-6).toUpperCase()}` : 'Order';
              const active = record._id === selectedId;
              return (
                <TouchableOpacity
                  key={record._id}
                  style={[S.orderChip, active && S.orderChipActive]}
                  onPress={() => setSelectedId(record._id)}
                  activeOpacity={0.8}
                >
                  <Text style={[S.orderChipText, active && S.orderChipTextActive]}>{shortId}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={[S.statusCard, shadows.medium]}>
          <View style={S.statusTop}>
            <Text style={S.cardTitle}>Current Status</Text>
            <View style={S.statusTopRight}>
              <StatusBadge status={selected?.currentStatus || 'Order Placed'} />
              {isDelivered ? (
                <TouchableOpacity style={S.deleteBtn} onPress={handleDeleteTracking} activeOpacity={0.75}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={S.locationRow}>
            <Ionicons name="location-outline" size={16} color="#2E7D32" />
            <View>
              <Text style={S.locationLabel}>CURRENT LOCATION</Text>
              <Text style={S.locationValue}>{selected?.currentLocation || 'Warehouse'}</Text>
            </View>
          </View>

          <TrackingStepper currentStatus={selected?.currentStatus} />

          {orderShortId ? (
            <Text style={S.orderRef}>Order {orderShortId}</Text>
          ) : null}
        </View>

        <View style={[S.historyCard, shadows.medium]}>
          <Text style={S.cardTitle}>Tracking History</Text>

          {history.map((entry, index) => (
            <View key={`${entry.timestamp}-${index}`} style={S.historyItem}>
              <View style={S.historyLeft}>
                <View style={[S.historyDot, index === 0 && S.historyDotActive]} />
                {index < history.length - 1 ? <View style={S.historyLine} /> : null}
              </View>
              <View style={S.historyBody}>
                <Text style={S.historyStatus}>{entry.status}</Text>
                {entry.location ? <Text style={S.historyLocation}>{entry.location}</Text> : null}
                {entry.note ? <Text style={S.historyNote}>{entry.note}</Text> : null}
                <Text style={S.historyTime}>
                  {fmtDate(entry.timestamp)} · {fmtTime(entry.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 100 },
  orderRow: { gap: 8, marginBottom: 14 },
  orderChip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  orderChipActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  orderChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  orderChipTextActive: { color: '#1B5E20' },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  statusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  orderRef: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  historyLeft: { alignItems: 'center', width: 16 },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
  },
  historyDotActive: { backgroundColor: '#2E7D32' },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
    minHeight: 36,
  },
  historyBody: { flex: 1, paddingBottom: 8 },
  historyStatus: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  historyLocation: { fontSize: 13, color: '#64748b', marginTop: 2 },
  historyNote: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
  historyTime: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
});
