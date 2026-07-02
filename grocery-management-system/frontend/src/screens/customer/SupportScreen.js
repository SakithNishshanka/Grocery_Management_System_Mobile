import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api, { getImageUri } from '../../config/api';
import AppHeader from '../../components/AppHeader';
import GreenButton from '../../components/GreenButton';
import StatusBadge from '../../components/StatusBadge';
import { shadows } from '../../theme/styles';

const QUICK_HELP = [
  { label: 'Order Issue', icon: 'document-text-outline', color: '#3b82f6', bg: '#eff6ff' },
  { label: 'Payment Issue', icon: 'card-outline', color: '#f97316', bg: '#fff7ed' },
  { label: 'Delivery Issue', icon: 'navigate-outline', color: '#2E7D32', bg: '#E8F5E9' },
  { label: 'Other', icon: 'help-circle-outline', color: '#8b5cf6', bg: '#f5f3ff' },
];

const CATEGORIES = ['Order Issue', 'Payment Issue', 'Delivery Issue', 'Other'];

const STATUS_BORDER = {
  open: '#ef4444',
  inProgress: '#f59e0b',
  resolved: '#2E7D32',
};

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function TicketCard({ ticket }) {
  const borderColor = STATUS_BORDER[ticket.status] || '#94a3b8';

  return (
    <View style={[S.ticketCard, shadows.small, { borderLeftColor: borderColor }]}>
      <View style={S.ticketTop}>
        <View style={S.ticketMeta}>
          <Text style={S.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
          <Text style={S.ticketDate}>{fmt(ticket.createdAt)}</Text>
        </View>
        <StatusBadge status={ticket.status} />
      </View>

      <Text style={S.ticketCategory}>{ticket.category}</Text>
      <Text style={S.ticketDesc} numberOfLines={3}>{ticket.description}</Text>

      {ticket.imageUrl ? (
        <Image source={{ uri: getImageUri(ticket.imageUrl) }} style={S.ticketImage} />
      ) : null}

      {ticket.adminResponse ? (
        <View style={S.responseBox}>
          <View style={S.responseHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#2E7D32" />
            <Text style={S.responseLabel}>Admin Response</Text>
          </View>
          <Text style={S.responseText}>{ticket.adminResponse}</Text>
        </View>
      ) : (
        <Text style={S.waitingText}>Waiting for admin response...</Text>
      )}
    </View>
  );
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Order Issue');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyTickets = async (isRefresh = false) => {
    if (!isRefresh) setLoadingTickets(true);
    try {
      const { data } = await api.get('/support/my');
      setTickets(data);
    } catch {
      if (!isRefresh) {
        Alert.alert('Error', 'Failed to load your tickets');
      }
    } finally {
      setLoadingTickets(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchMyTickets(); }, []));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleQuickHelp = (label) => {
    setCategory(label);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for your issue.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe your issue in detail.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
      };

      if (image?.base64) {
        const mime = image.mimeType || 'image/jpeg';
        payload.imageUrl = `data:${mime};base64,${image.base64}`;
      }

      await api.post('/support', payload);

      Alert.alert('Ticket Submitted', 'Your support ticket has been raised. We will get back to you soon.');
      setTitle('');
      setCategory('Order Issue');
      setDescription('');
      setImage(null);
      fetchMyTickets(true);
    } catch (err) {
      Alert.alert(
        'Submission Failed',
        err.response?.data?.message || 'Could not submit your ticket. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={S.container}>
      <AppHeader title="Help & Support" />

      <KeyboardAvoidingView
        style={S.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchMyTickets(true); }}
              colors={['#2E7D32']}
            />
          }
        >
          <Text style={S.sectionTitle}>My Tickets</Text>
          {loadingTickets ? (
            <View style={S.ticketsLoading}>
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text style={S.ticketsLoadingText}>Loading your tickets...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={[S.emptyTickets, shadows.small]}>
              <Ionicons name="ticket-outline" size={32} color="#94a3b8" />
              <Text style={S.emptyTicketsTitle}>No tickets yet</Text>
              <Text style={S.emptyTicketsSub}>Submit a ticket below and track its status here.</Text>
            </View>
          ) : (
            tickets.map(ticket => <TicketCard key={ticket._id} ticket={ticket} />)
          )}

          <Text style={[S.sectionTitle, S.sectionGap]}>Quick Help</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.quickRow}
          >
            {QUICK_HELP.map(item => (
              <TouchableOpacity
                key={item.label}
                style={[S.quickCard, shadows.small, category === item.label && S.quickCardActive]}
                onPress={() => handleQuickHelp(item.label)}
                activeOpacity={0.8}
              >
                <View style={[S.quickIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={S.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[S.formCard, shadows.medium]}>
            <View style={S.formHeader}>
              <View style={S.formHeaderIcon}>
                <Ionicons name="add" size={18} color="#ffffff" />
              </View>
              <Text style={S.formTitle}>Raise a Ticket</Text>
            </View>

            <Text style={S.label}>Title</Text>
            <View style={S.inputWrap}>
              <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={S.inputIcon} />
              <TextInput
                style={S.input}
                placeholder="Brief description of your issue"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <Text style={S.label}>Category</Text>
            <View style={S.chipRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[S.chip, category === cat && S.chipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[S.chipText, category === cat && S.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={S.label}>Description</Text>
            <View style={[S.inputWrap, S.textAreaWrap]}>
              <Ionicons name="chatbubble-outline" size={18} color="#94a3b8" style={S.inputIconTop} />
              <TextInput
                style={[S.input, S.textArea]}
                placeholder="Please describe your issue in detail..."
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Text style={S.label}>Issue Photo</Text>
            <TouchableOpacity style={S.photoBox} onPress={pickImage} activeOpacity={0.8}>
              {image?.uri ? (
                <Image source={{ uri: image.uri }} style={S.photoPreview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={28} color="#94a3b8" />
                  <Text style={S.photoTitle}>Add Photo</Text>
                  <Text style={S.photoSub}>Tap to select from gallery</Text>
                </>
              )}
            </TouchableOpacity>

            <GreenButton
              title="Submit Ticket"
              onPress={handleSubmit}
              loading={submitting}
              fullWidth
              style={S.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  scroll: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  quickRow: { gap: 10, paddingBottom: 18 },
  quickCard: {
    width: 108,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quickCardActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0fdf4',
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  formHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 14,
  },
  textAreaWrap: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputIcon: { marginRight: 8 },
  inputIconTop: { marginRight: 8, marginTop: 4 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#1B5E20',
  },
  photoBox: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  photoSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  submitBtn: { marginTop: 4 },
  sectionGap: { marginTop: 20 },
  ticketsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  ticketsLoadingText: { fontSize: 13, color: '#64748b' },
  emptyTickets: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTicketsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  emptyTicketsSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  ticketMeta: { flex: 1 },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  ticketDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  ticketCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  ticketDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  ticketImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#f1f5f9',
  },
  responseBox: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B5E20',
  },
  responseText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  waitingText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
