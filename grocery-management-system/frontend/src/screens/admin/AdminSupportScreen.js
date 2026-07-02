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
import GreenButton from '../../components/GreenButton';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_META = {
  open: { color: '#ef4444', border: '#ef4444', badgeBg: '#fee2e2', badgeText: '#991b1b' },
  inProgress: { color: '#f59e0b', border: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e' },
  resolved: { color: '#2E7D32', border: '#2E7D32', badgeBg: '#E8F5E9', badgeText: '#1B5E20' },
};

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

export default function AdminSupportScreen() {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('inProgress');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('inProgress');
  const [saving, setSaving] = useState(false);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/support');
      setTickets(data);
    } catch {
      Alert.alert('Error', 'Failed to load support tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTickets(); }, []));

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'inProgress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const visible = tickets.filter(t => t.status === tab);

  const openEdit = (ticket) => {
    setEditing(ticket);
    setResponse(ticket.adminResponse || '');
    setStatus(ticket.status);
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!response.trim()) {
      Alert.alert('Required', 'Please enter a response for the customer.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/support/${editing._id}`, {
        adminResponse: response.trim(),
        status,
      });
      setEditModal(false);
      fetchTickets();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const getCustomerName = (ticket) =>
    ticket.customerName || ticket.customerId?.name || 'Customer';

  const getInitial = (name) => (name?.charAt(0) || 'C').toUpperCase();

  const renderTicket = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.open;
    const name = getCustomerName(item);

    return (
      <View style={[S.ticketCard, shadows.small, { borderLeftColor: meta.border }]}>
        <View style={S.ticketTop}>
          <View style={S.ticketLeft}>
            <View style={S.avatar}>
              <Text style={S.avatarText}>{getInitial(name)}</Text>
            </View>
            <View>
              <Text style={S.customerName}>{name}</Text>
              <Text style={S.ticketDate}>{fmt(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[S.statusBadge, { backgroundColor: meta.badgeBg }]}>
            <Text style={[S.statusText, { color: meta.badgeText }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={S.ticketTitle}>{item.title}</Text>
        <Text style={S.ticketDesc} numberOfLines={3}>{item.description}</Text>

        <View style={S.ticketFooter}>
          <Text style={S.categoryText}>{item.category}</Text>
        </View>

        <GreenButton
          title="Edit Response"
          onPress={() => openEdit(item)}
          fullWidth
          isAdmin
          style={S.editBtn}
        />
      </View>
    );
  };

  return (
    <View style={S.container}>
      <AppHeader
        isAdmin
        title="Customer Support"
        subtitle="Manage support tickets"
      />

      <View style={S.statsRow}>
        <SummaryCard title="Open" value={openCount} icon="alert-circle-outline" color="#ef4444" />
        <SummaryCard title="In Progress" value={inProgressCount} icon="time-outline" color="#f59e0b" />
        <SummaryCard title="Resolved" value={resolvedCount} icon="checkmark-circle-outline" color="#2E7D32" />
      </View>

      <View style={S.tabBar}>
        {TABS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={S.tab}
            onPress={() => setTab(item.key)}
            activeOpacity={0.7}
          >
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
          icon="headset-outline"
          title={`No ${TABS.find(t => t.key === tab)?.label} Tickets`}
          subtitle="Support tickets will appear here when customers raise them."
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} colors={['#1B5E20']} />
          }
          renderItem={renderTicket}
        />
      )}

      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={S.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[S.modalCard, shadows.large]}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Edit Response</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {editing ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={S.modalLabel}>Customer Issue</Text>
                <Text style={S.modalIssue}>{editing.description}</Text>

                <Text style={S.modalLabel}>Status</Text>
                <View style={S.statusRow}>
                  {TABS.map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[S.statusChip, status === item.key && S.statusChipActive]}
                      onPress={() => setStatus(item.key)}
                    >
                      <Text style={[S.statusChipText, status === item.key && S.statusChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={S.modalLabel}>Admin Response</Text>
                <TextInput
                  style={S.responseInput}
                  value={response}
                  onChangeText={setResponse}
                  placeholder="Write your response to the customer..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                />

                <GreenButton
                  title="Save Response"
                  onPress={handleSave}
                  loading={saving}
                  fullWidth
                  isAdmin
                  style={S.saveBtn}
                />
              </ScrollView>
            ) : null}
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
    paddingBottom: 4,
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
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  summaryBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#1B5E20',
    fontWeight: '800',
  },
  tabUnderline: {
    marginTop: 6,
    width: '70%',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1B5E20',
  },
  list: { padding: 16, paddingBottom: 100 },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ticketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  customerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  ticketDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  ticketDesc: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  ticketFooter: { marginTop: 10, marginBottom: 12 },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'right' },
  editBtn: { marginTop: 0 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
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
  modalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 8,
  },
  modalIssue: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusChip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#E8F5E9',
  },
  statusChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statusChipTextActive: { color: '#1B5E20' },
  responseInput: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  saveBtn: { marginTop: 16, marginBottom: 8 },
});
