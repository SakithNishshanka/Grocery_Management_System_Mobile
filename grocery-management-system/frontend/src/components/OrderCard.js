import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { shadows } from '../theme/styles';

const getBorderColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'cancelled' || s === 'failed') return '#ef4444';
  if (['pending', 'refunded', 'in progress'].includes(s)) return '#94a3b8';
  return '#2E7D32';
};

const isEditable = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'pending' || s === 'order placed';
};

export default function OrderCard({ order, onPress, showEditStatus = false, onDelete, showDelete = false }) {
  const { _id, items, totalAmount, status, createdAt } = order || {};
  const borderColor = getBorderColor(status);
  const editable = isEditable(status);
  const canDelete = showDelete && (status || '').toLowerCase() === 'cancelled' && onDelete;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : '';

  const shortId = _id ? `#${String(_id).slice(-6).toUpperCase()}` : '#------';
  const itemCount = (items || []).length;

  return (
    <AnimatedPressable
      style={[styles.card, shadows.medium, { borderLeftColor: borderColor }]}
      onPress={onPress}
      scaleTo={0.97}
      haptic="light"
    >
      {/* Row 1: order ID + date */}
      <View style={styles.row}>
        <Text style={styles.orderId}>Order {shortId}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      {/* Row 2: item count + total */}
      <View style={[styles.row, styles.mt8]}>
        <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.amount}>LKR {Number(totalAmount || 0).toFixed(2)}</Text>
      </View>

      {/* Row 3: status badge + edit status */}
      <View style={[styles.row, styles.mt8]}>
        <StatusBadge status={status} />
        {canDelete ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        ) : showEditStatus ? (
          <View style={styles.editRow}>
            <Ionicons
              name={editable ? 'time-outline' : 'lock-closed-outline'}
              size={13}
              color={editable ? '#2E7D32' : '#94a3b8'}
            />
            <Text style={[styles.editText, { color: editable ? '#2E7D32' : '#94a3b8' }]}>
              {editable ? 'Editable' : 'Locked'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    paddingRight: 36,
    marginBottom: 12,
    borderLeftWidth: 4,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mt8: {
    marginTop: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
  },
  itemCount: {
    fontSize: 13,
    color: '#64748b',
  },
  amount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  chevron: {
    position: 'absolute',
    right: 12,
    bottom: 16,
  },
});
