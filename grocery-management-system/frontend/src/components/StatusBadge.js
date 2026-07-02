import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { statusColors } from '../theme/colors';

const labels = {
  open: 'Open',
  failed: 'Failed',
  pending: 'Pending',
  successful: 'Successful',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  resolved: 'Resolved',
  inprogress: 'In Progress',
  outfordelivery: 'Out for Delivery',
  delivered: 'Delivered',
  placed: 'Placed',
  'pending confirmation': 'Pending Confirmation',
  'order placed': 'Order Placed',
  outfordelivery: 'Out for Delivery',
  'out for delivery': 'Out for Delivery',
};

const normalize = (status = '') => String(status).trim().toLowerCase();
const colorKey = (status) => {
  const key = normalize(status).replace(/\s+/g, '');
  if (key === 'inprogress') return 'inProgress';
  if (key === 'outfordelivery') return 'outForDelivery';
  if (key === 'pendingconfirmation') return 'pending';
  if (key === 'orderplaced' || key === 'placed') return 'successful';
  return key;
};

export default function StatusBadge({ status }) {
  const normalized = normalize(status);
  const key = colorKey(status);
  const palette = statusColors[key] || statusColors.pending;
  const label = labels[normalized] || String(status || 'Pending');

  return (
    <Text style={[styles.badge, { backgroundColor: palette.background, color: palette.text }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    overflow: 'hidden',
  },
});
