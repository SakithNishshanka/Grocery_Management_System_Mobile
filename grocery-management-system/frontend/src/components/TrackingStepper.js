import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TRACKING_STEPS = [
  'Order Placed',
  'Processing',
  'Out for Delivery',
  'Delivered',
];

const normalizeStep = (status = '') => {
  const key = String(status).trim().toLowerCase().replace(/\s+/g, '');
  const found = TRACKING_STEPS.find(step => step.toLowerCase().replace(/\s+/g, '') === key);
  return found || 'Order Placed';
};

export function getStepIndex(status) {
  return TRACKING_STEPS.indexOf(normalizeStep(status));
}

export default function TrackingStepper({ currentStatus, compact = false }) {
  const activeIndex = Math.max(0, getStepIndex(currentStatus));

  return (
    <View style={[S.wrap, compact && S.wrapCompact]}>
      {TRACKING_STEPS.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        const upcoming = index > activeIndex;

        return (
          <View key={step} style={S.stepCol}>
            <View style={S.stepRow}>
              {index > 0 ? (
                <View style={[S.line, (done || active) && S.lineDone]} />
              ) : (
                <View style={S.lineSpacer} />
              )}

              <View
                style={[
                  S.circle,
                  done && S.circleDone,
                  active && S.circleActive,
                  upcoming && S.circleUpcoming,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                ) : active ? (
                  <View style={S.innerDot} />
                ) : (
                  <Text style={S.stepNum}>{index + 1}</Text>
                )}
              </View>

              {index < TRACKING_STEPS.length - 1 ? (
                <View style={[S.line, done && S.lineDone]} />
              ) : (
                <View style={S.lineSpacer} />
              )}
            </View>

            <Text
              style={[S.label, active && S.labelActive, done && S.labelDone]}
              numberOfLines={2}
            >
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
  },
  wrapCompact: { marginTop: 8 },
  stepCol: { flex: 1, alignItems: 'center' },
  stepRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 2,
  },
  lineDone: { backgroundColor: '#2E7D32' },
  lineSpacer: { flex: 1 },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  circleDone: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  circleActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  circleUpcoming: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  label: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  labelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  labelDone: {
    color: '#2E7D32',
  },
});
