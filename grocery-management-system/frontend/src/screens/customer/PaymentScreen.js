import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
  TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import AppHeader from '../../components/AppHeader';
import GreenButton from '../../components/GreenButton';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { shadows } from '../../theme/styles';
import useAppStripe from '../../hooks/useAppStripe';

const METHODS = [
  { id: 'online', label: 'Online', icon: 'globe-outline', subtitle: 'Bank or wallet transfer' },
  { id: 'card', label: 'Card', icon: 'card-outline', subtitle: 'Debit or credit card' },
  { id: 'cash', label: 'Cash', icon: 'cash-outline', subtitle: 'Pay on delivery' },
];

const ADMIN_ACCOUNT_DETAILS = [
  { label: 'Account Name', value: 'N.P.S.M Nishshanka' },
  { label: 'Account Number', value: '299200130072291' },
  { label: 'Bank Name', value: 'Peoples Bank' },
  { label: 'Branch Name', value: 'Kegalle Branch' },
];

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const hasStripePublishableKey =
  STRIPE_PUBLISHABLE_KEY &&
  (STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') || STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_'));

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getOrderId = (order) => order?._id;
const getPaymentOrderId = (payment) => payment?.orderId?._id || payment?.orderId;

const getPaymentForOrder = (orderId, payments) =>
  payments.find(p => String(getPaymentOrderId(p)) === String(orderId));

const getPaymentStatusLabel = (payment) => {
  if (!payment) return 'Unpaid';
  if (payment.status === 'Pending') return 'Payment Pending';
  if (payment.status === 'Successful') return 'Paid';
  if (payment.status === 'Refunded') return 'Refunded';
  if (payment.status === 'Failed') return 'Payment Failed';
  return payment.status;
};

const getPaymentBadgeStatus = (payment) => {
  if (!payment) return 'pending';
  if (payment.status === 'Successful') return 'successful';
  if (payment.status === 'Refunded') return 'refunded';
  if (payment.status === 'Failed') return 'failed';
  return 'pending';
};

const isOrderPayable = (order, payments) => {
  if (!order || order.orderStatus === 'Cancelled') return false;
  if (order.orderStatus !== 'Placed') return false;
  const payment = getPaymentForOrder(getOrderId(order), payments);
  return !payment || !['Pending', 'Successful'].includes(payment.status);
};

const isMissingPaymentIntentError = (message = '') =>
  /no such payment[_ ]intent/i.test(message);

function OrderDetailCard({ order, payment, selected, payable, onSelect }) {
  const shortId = `#${String(getOrderId(order)).slice(-6).toUpperCase()}`;
  const items = order.items || [];

  return (
    <TouchableOpacity
      style={[
        S.orderCard,
        shadows.small,
        selected && S.orderCardSelected,
        !payable && S.orderCardDisabled,
      ]}
      onPress={() => payable && onSelect(order)}
      activeOpacity={payable ? 0.85 : 1}
      disabled={!payable}
    >
      <View style={S.orderCardTop}>
        <View>
          <Text style={S.orderCardId}>{shortId}</Text>
          <Text style={S.orderCardDate}>{fmt(order.placedAt || order.createdAt)}</Text>
        </View>
        <View style={S.orderCardBadges}>
          <StatusBadge status={order.orderStatus} />
          <StatusBadge status={getPaymentBadgeStatus(payment)} />
        </View>
      </View>

      <Text style={S.paymentStatusText}>{getPaymentStatusLabel(payment)}</Text>

      <View style={S.detailRow}>
        <Ionicons name="location-outline" size={14} color="#64748b" />
        <Text style={S.detailText} numberOfLines={2}>{order.deliveryAddress}</Text>
      </View>

      {order.deliveryTimeSlot ? (
        <View style={S.detailRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={S.detailText}>{order.deliveryTimeSlot}</Text>
        </View>
      ) : null}

      <View style={S.itemsBox}>
        <Text style={S.itemsTitle}>Items ({items.length})</Text>
        {items.map((item, index) => (
          <View key={`${item.productId}-${index}`} style={S.itemRow}>
            <Text style={S.itemName} numberOfLines={1}>
              {item.productName || item.name || 'Product'} × {item.quantity}
            </Text>
            <Text style={S.itemPrice}>
              LKR {(Number(item.priceAtOrder || item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={S.orderCardFooter}>
        <Text style={S.orderTotal}>LKR {Number(order.totalAmount).toFixed(2)}</Text>
        {payable ? (
          <Text style={S.tapToPay}>{selected ? 'Selected for payment' : 'Tap to pay'}</Text>
        ) : (
          <Text style={S.paidLabel}>
            {payment?.status === 'Pending' ? 'Awaiting confirmation' : 'Already paid'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function PaymentScreen({ route, navigation }) {
  const { initPaymentSheet, presentPaymentSheet } = useAppStripe();
  const preselectedOrderId = route.params?.orderId;

  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [method, setMethod] = useState('online');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [onlineRef, setOnlineRef] = useState('');
  const [cashNote, setCashNote] = useState('');

  const payableOrders = orders.filter(o => isOrderPayable(o, payments));

  const resetPaymentForm = () => {
    setOnlineRef('');
    setCashNote('');
    setMethod('online');
  };

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setFetching(true);
    setFetchError('');
    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        api.get('/orders/my'),
        api.get('/payments/my'),
      ]);

      const allOrders = ordersRes.data.sort(
        (a, b) => new Date(b.placedAt || b.createdAt) - new Date(a.placedAt || a.createdAt)
      );
      const allPayments = paymentsRes.data;

      setOrders(allOrders);
      setPayments(allPayments);

      const payable = allOrders.filter(o => isOrderPayable(o, allPayments));
      const preferred = preselectedOrderId
        ? payable.find(o => String(getOrderId(o)) === String(preselectedOrderId))
        : null;

      setSelectedOrder(prev => {
        if (preferred) return preferred;
        if (prev && isOrderPayable(prev, allPayments)) {
          return allOrders.find(o => String(getOrderId(o)) === String(getOrderId(prev))) || null;
        }
        return payable[0] || null;
      });
    } catch (err) {
      setFetchError(!err.response
        ? 'Cannot connect to server. Check your connection.'
        : 'Failed to load orders. Please try again.');
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [preselectedOrderId]));

  const goToOrderAfterPayment = (orderId) => {
    Alert.alert('Payment Submitted', 'Your payment has been recorded successfully.', [
      {
        text: 'View Order',
        onPress: () => {
          navigation.getParent()?.navigate('OrdersTab', {
            screen: 'OrderDetail',
            params: { orderId },
          });
        },
      },
      { text: 'OK', style: 'cancel' },
    ]);
  };

  const handlePaymentSuccess = async (paidOrderId) => {
    resetPaymentForm();
    await fetchData(true);
    goToOrderAfterPayment(paidOrderId);
  };

  const confirmDemoCardPayment = async (paymentIntentId) => {
    const confirmed = await new Promise((resolve) => {
      Alert.alert(
        'Confirm Card Payment',
        `Pay LKR ${Number(selectedOrder.totalAmount).toFixed(2)} with test card?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Pay Now', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;

    await api.post('/payments', {
      orderId: getOrderId(selectedOrder),
      amount: selectedOrder.totalAmount,
      method: 'card',
      stripePaymentIntentId: paymentIntentId,
    });

    await handlePaymentSuccess(getOrderId(selectedOrder));
  };

  const handlePay = async () => {
    if (!selectedOrder) {
      Alert.alert('Required', 'Please select an unpaid order first');
      return;
    }

    if (!isOrderPayable(selectedOrder, payments)) {
      Alert.alert('Already Paid', 'This order already has a payment. Please select another order.');
      await fetchData(true);
      return;
    }

    if (method === 'card') {
      await handleStripePayment();
      return;
    }

    if (method === 'online' && !onlineRef.trim()) {
      Alert.alert('Required', 'Please enter your transaction reference');
      return;
    }

    setLoading(true);
    try {
      await api.post('/payments', {
        orderId: getOrderId(selectedOrder),
        amount: selectedOrder.totalAmount,
        method,
        transactionReference: method === 'online' ? onlineRef.trim() : undefined,
        paymentNote: method === 'cash' ? cashNote.trim() : undefined,
      });
      await handlePaymentSuccess(getOrderId(selectedOrder));
    } catch (err) {
      Alert.alert(
        'Payment Failed',
        !err.response
          ? 'Cannot connect to server. Check your connection.'
          : err.response?.data?.message || 'Payment could not be processed.'
      );
      await fetchData(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    if (!selectedOrder || !isOrderPayable(selectedOrder, payments)) {
      Alert.alert('Already Paid', 'This order already has a payment.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/payments/stripe/create-intent', {
        orderId: getOrderId(selectedOrder),
        useDemoMode: !hasStripePublishableKey,
      });

      if (data.demoMode || !hasStripePublishableKey) {
        await confirmDemoCardPayment(data.paymentIntentId);
        return;
      }

      const initResult = await initPaymentSheet({
        merchantDisplayName: 'Grocery Management System',
        paymentIntentClientSecret: data.clientSecret,
        allowsDelayedPaymentMethods: false,
      });

      if (initResult.error) {
        Alert.alert('Stripe Error', initResult.error.message);
        return;
      }

      const paymentResult = await presentPaymentSheet();

      if (paymentResult.error) {
        const message = paymentResult.error.message || '';
        Alert.alert(
          'Payment Cancelled',
          isMissingPaymentIntentError(message)
            ? 'Stripe could not find this payment intent. Check that frontend EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and backend STRIPE_SECRET_KEY are from the same Stripe account and both are test or both are live.'
            : message
        );
        return;
      }

      await api.post('/payments', {
        orderId: getOrderId(selectedOrder),
        amount: selectedOrder.totalAmount,
        method: 'card',
        stripePaymentIntentId: data.paymentIntentId,
      });

      await handlePaymentSuccess(getOrderId(selectedOrder));
    } catch (err) {
      Alert.alert(
        'Payment Failed',
        !err.response
          ? 'Cannot connect to server. Check your connection.'
          : err.response?.data?.message || err.response?.data?.error || 'Stripe payment could not be processed.'
      );
      await fetchData(true);
    } finally {
      setLoading(false);
    }
  };

  const renderMethodInterface = () => {
    if (!selectedOrder) return null;

    if (method === 'online') {
      return (
        <View style={[S.card, shadows.medium]}>
          <View style={S.interfaceHeader}>
            <View style={S.interfaceIcon}>
              <Ionicons name="globe-outline" size={22} color="#2E7D32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.interfaceTitle}>Online Payment</Text>
              <Text style={S.interfaceSubtitle}>Transfer the amount, then enter your reference number.</Text>
            </View>
          </View>

          <View style={S.bankDetailsBox}>
            {ADMIN_ACCOUNT_DETAILS.map(detail => (
              <View key={detail.label} style={S.bankDetailRow}>
                <Text style={S.bankDetailLabel}>{detail.label}</Text>
                <Text style={S.bankDetailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>

          <Text style={S.inputLabel}>Transaction Reference</Text>
          <TextInput
            style={S.textInput}
            value={onlineRef}
            onChangeText={setOnlineRef}
            placeholder="e.g. TXN-204578"
            placeholderTextColor="#94a3b8"
            editable={!loading}
          />
        </View>
      );
    }

    if (method === 'card') {
      return (
        <View style={[S.card, shadows.medium]}>
          <View style={S.stripePanel}>
            <View>
              <Text style={S.cardPreviewLabel}>Secure Card Payment</Text>
              <Text style={S.cardPreviewNumber}>Pay safely with Stripe</Text>
            </View>
            <Ionicons name="shield-checkmark" size={30} color="#ffffff" />
          </View>
          <View style={S.stripeInfoRow}>
            <Ionicons name="lock-closed-outline" size={16} color="#2E7D32" />
            <Text style={S.stripeInfoText}>Card details are handled securely by Stripe.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[S.card, shadows.medium]}>
        <View style={S.cashHero}>
          <View style={S.cashIcon}>
            <Ionicons name="cash-outline" size={30} color="#2E7D32" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.interfaceTitle}>Cash on Delivery</Text>
            <Text style={S.interfaceSubtitle}>Pay when your order arrives.</Text>
          </View>
        </View>
        <Text style={S.inputLabel}>Delivery Note (optional)</Text>
        <TextInput
          style={[S.textInput, S.noteInput]}
          value={cashNote}
          onChangeText={setCashNote}
          placeholder="Optional note for the delivery person"
          placeholderTextColor="#94a3b8"
          multiline
          editable={!loading}
        />
      </View>
    );
  };

  return (
    <View style={S.container}>
      <AppHeader
        title="Make Payment"
        subtitle="Pay for your orders"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {fetching ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={S.loadingText}>Loading your orders...</Text>
          </View>
        ) : fetchError ? (
          <EmptyState
            icon="wifi-outline"
            title="Connection Error"
            subtitle={fetchError}
            buttonTitle="Try Again"
            onButtonPress={() => fetchData()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No Orders Yet"
            subtitle="Place an order first, then pay here."
            buttonTitle="Browse Products"
            onButtonPress={() => navigation.getParent()?.navigate('ProductsTab')}
          />
        ) : (
          <ScrollView
            contentContainerStyle={S.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchData(true); }}
                colors={['#2E7D32']}
              />
            }
          >
            {payableOrders.length > 0 && selectedOrder && isOrderPayable(selectedOrder, payments) ? (
              <>
                <Text style={S.sectionTitle}>Payment for {`#${String(getOrderId(selectedOrder)).slice(-6).toUpperCase()}`}</Text>
                <Text style={S.sectionSub}>Select a payment method and complete your payment</Text>

                <View style={[S.card, shadows.medium]}>
                  <Text style={S.cardLabel}>Payment Method</Text>
                  <View style={S.methodList}>
                    {METHODS.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[S.methodCard, method === m.id && S.methodCardActive]}
                        onPress={() => setMethod(m.id)}
                        activeOpacity={0.8}
                        disabled={loading}
                      >
                        <View style={S.methodLeft}>
                          <View style={[S.methodIconWrap, method === m.id && S.methodIconWrapActive]}>
                            <Ionicons name={m.icon} size={21} color={method === m.id ? '#ffffff' : '#94a3b8'} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[S.methodLabel, method === m.id && S.methodLabelActive]}>{m.label}</Text>
                            <Text style={S.methodSubtitle}>{m.subtitle}</Text>
                          </View>
                        </View>
                        {method === m.id ? <Ionicons name="checkmark-circle" size={20} color="#2E7D32" /> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {renderMethodInterface()}

                <GreenButton
                  title={`Pay LKR ${Number(selectedOrder.totalAmount).toFixed(2)}`}
                  onPress={handlePay}
                  loading={loading}
                  fullWidth
                />
              </>
            ) : (
              <View style={[S.allPaidBox, shadows.small]}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#2E7D32" />
                <Text style={S.allPaidTitle}>All orders are paid or pending</Text>
                <Text style={S.allPaidSub}>Place a new order from Products to make another payment.</Text>
              </View>
            )}

            <Text style={[S.sectionTitle, S.sectionGap]}>All Orders</Text>
            <Text style={S.sectionSub}>
              {payableOrders.length} unpaid · {orders.length} total
            </Text>

            {orders.map(order => {
              const payment = getPaymentForOrder(getOrderId(order), payments);
              const payable = isOrderPayable(order, payments);
              const selected = selectedOrder && String(getOrderId(selectedOrder)) === String(getOrderId(order));

              return (
                <OrderDetailCard
                  key={getOrderId(order)}
                  order={order}
                  payment={payment}
                  selected={selected}
                  payable={payable}
                  onSelect={setSelectedOrder}
                />
              );
            })}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748b' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionSub: { fontSize: 13, color: '#64748b', marginBottom: 12, marginTop: 2 },
  sectionGap: { marginTop: 24, marginBottom: 12 },

  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  orderCardSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0fdf4',
  },
  orderCardDisabled: {
    opacity: 0.92,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  orderCardId: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  orderCardDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  orderCardBadges: { alignItems: 'flex-end', gap: 6 },
  paymentStatusText: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  detailText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  itemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  itemsTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  itemName: { flex: 1, fontSize: 13, color: '#334155' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
  tapToPay: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  paidLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  methodList: { gap: 10 },
  methodCard: {
    minHeight: 66,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodCardActive: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  methodIconWrapActive: { backgroundColor: '#2E7D32' },
  methodLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  methodLabelActive: { color: '#2E7D32' },
  methodSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  interfaceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  interfaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  interfaceTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  interfaceSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  bankDetailsBox: {
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bankDetailLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', flex: 1 },
  bankDetailValue: { fontSize: 13, color: '#0f172a', fontWeight: '800', flex: 1.5, textAlign: 'right' },
  inputLabel: { fontSize: 12, color: '#0f172a', fontWeight: '800', marginBottom: 7, marginTop: 4 },
  textInput: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  stripePanel: {
    minHeight: 118,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#635bff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardPreviewLabel: { color: '#d9f99d', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  cardPreviewNumber: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 34, letterSpacing: 1 },
  stripeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
  },
  stripeInfoText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17, fontWeight: '600' },
  cashHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    marginBottom: 14,
  },
  cashIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  noteInput: { minHeight: 76, textAlignVertical: 'top' },
  allPaidBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  allPaidTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  allPaidSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
