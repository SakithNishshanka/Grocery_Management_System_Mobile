import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import TrackingStepper, { TRACKING_STEPS } from '../../components/TrackingStepper';
import GreenButton from '../../components/GreenButton';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'inTransit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

const fmt = (d) => new Date(d).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

function SummaryCard({ title, value, icon, color }) {
  return (
    <View style={[S.summaryCard, shadows.small]}>
      <View style={[S.summaryIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={S.summaryValue}>{value}</Text>
      <Text style={S.summaryTitle}>{title}</Text>
      <View style={[S.summaryBar, { backgroundColor: color }]} />
    </View>
  );
}

const matchesTab = (record, tab) => {
  const status = (record.currentStatus || '').toLowerCase();
  if (tab === 'delivered') return status === 'delivered';
  if (tab === 'inTransit') return status !== 'delivered';
  return true;
};

const getBorderColor = (status = '') => {
  const key = status.toLowerCase();
  if (key === 'delivered') return '#2E7D32';
  if (key.includes('delivery')) return '#f59e0b';
  if (key === 'processing') return '#3b82f6';
  return '#94a3b8';
};

export default function AdminTrackingScreen() {
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('Order Placed');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRecords = async () => {
    try {
      const { data } = await api.get('/tracking');
      setRecords(data);
    } catch {
      Alert.alert('Error', 'Failed to load tracking records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRecords(); }, []));

  const totalCount = records.length;
  const inTransitCount = records.filter(r => matchesTab(r, 'inTransit')).length;
  const deliveredCount = records.filter(r => matchesTab(r, 'delivered')).length;
  const visible = records.filter(r => matchesTab(r, tab));

  const openEdit = (record) => {
    setEditing(record);
    setStatus(record.currentStatus || 'Order Placed');
    setLocation(record.currentLocation || '');
    setNote('');
    setEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/tracking/${editing._id}`, {
        status,
        location: location.trim(),
        note: note.trim(),
      });
      setEditModal(false);
      fetchRecords();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update tracking');
    } finally {
      setSaving(false);
    }
  };

  const getCustomerName = (record) =>
    record.customerId?.name || 'Customer';

  const renderItem = ({ item }) => {
    const orderId = item.orderId?._id || item.orderId;
    const shortId = orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : '#------';
    const borderColor = getBorderColor(item.currentStatus);

    return (
      <View style={[S.card, shadows.small, { borderLeftColor: borderColor }]}>
        <View style={S.cardTop}>
          <View>
            <Text style={S.orderId}>{shortId}</Text>
            <Text style={S.customerName}>{getCustomerName(item)}</Text>
          </View>
          <StatusBadge status={item.currentStatus} />
        </View>

        <TrackingStepper currentStatus={item.currentStatus} compact />

        <View style={S.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={S.locationText}>{item.currentLocation || 'Warehouse'}</Text>
        </View>
        <Text style={S.updatedText}>Last updated: {fmt(item.updatedAt)}</Text>

        <GreenButton
          title="Update Status"
          onPress={() => openEdit(item)}
          fullWidth
          isAdmin
          style={S.updateBtn}
        />
      </View>
    );
  };

  return (
    <View style={S.container}>
      <AppHeader isAdmin title="Delivery Tracking" subtitle="Monitor all deliveries" />

      <View style={S.statsRow}>
        <SummaryCard title="Total" value={totalCount} icon="paper-plane-outline" color="#2E7D32" />
        <SummaryCard title="In Transit" value={inTransitCount} icon="bicycle-outline" color="#f59e0b" />
        <SummaryCard title="Delivered" value={deliveredCount} icon="checkmark-circle-outline" color="#2E7D32" />
      </View>

      <View style={S.tabBar}>
        {TABS.map(item => (
          <TouchableOpacity key={item.key} style={S.tab} onPress={() => setTab(item.key)} activeOpacity={0.7}>
            <Text style={[S.tabText, tab === item.key && S.tabTextActive]}>{item.label}</Text>
            {tab === item.key && <View style={S.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color="#1B5E20" />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="navigate-outline"
          title="No tracking records"
          subtitle="Tracking records are created when customers place orders."
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} colors={['#1B5E20']} />
          }
          renderItem={renderItem}
        />
      )}

      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={S.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[S.modalCard, shadows.large]}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Update Delivery Status</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={S.modalLabel}>Status</Text>
              <View style={S.statusWrap}>
                {TRACKING_STEPS.map(step => (
                  <TouchableOpacity
                    key={step}
                    style={[S.statusChip, status === step && S.statusChipActive]}
                    onPress={() => setStatus(step)}
                  >
                    <Text style={[S.statusChipText, status === step && S.statusChipTextActive]}>{step}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={S.modalLabel}>Location</Text>
              <TextInput
                style={S.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Warehouse, On the way"
                placeholderTextColor="#94a3b8"
              />

              <Text style={S.modalLabel}>Note</Text>
              <TextInput
                style={[S.input, S.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Optional update note for the customer"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />

              <GreenButton title="Save Update" onPress={handleSave} loading={saving} fullWidth isAdmin />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    minHeight: 96,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  summaryTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2 },
  summaryBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#1B5E20', fontWeight: '800' },
  tabUnderline: { marginTop: 6, width: '70%', height: 3, borderRadius: 2, backgroundColor: '#1B5E20' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  orderId: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  customerName: { fontSize: 12, color: '#64748b', marginTop: 2 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  locationText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  updatedText: { fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 12 },
  updateBtn: { marginTop: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 8, marginTop: 8 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusChip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipActive: { borderColor: '#1B5E20', backgroundColor: '#E8F5E9' },
  statusChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statusChipTextActive: { color: '#1B5E20' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  noteInput: { minHeight: 90, marginBottom: 16 },
});
