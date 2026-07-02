import React, { useContext, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartContext } from '../../context/CartContext';
import api, { getImageUri } from '../../config/api';
import AppHeader from '../../components/AppHeader';
import GreenButton from '../../components/GreenButton';
import InputField from '../../components/InputField';
import EmptyState from '../../components/EmptyState';
import { shadows } from '../../theme/styles';

const DELIVERY_FEE = 200;

function CartItemRow({ item, onIncrease, onDecrease, onRemove }) {
  const [imgError, setImgError] = useState(false);
  const imageUri = item.image || getImageUri(item.imageUrl);
  const lineTotal = Number(item.price || 0) * (item.quantity || 1);

  return (
    <View style={[S.itemCard, shadows.small]}>
      {imageUri && !imgError ? (
        <Image source={{ uri: imageUri }} style={S.itemImage} onError={() => setImgError(true)} />
      ) : (
        <View style={[S.itemImage, S.itemImageFallback]}>
          <Ionicons name="bag-outline" size={24} color="#2E7D32" />
        </View>
      )}

      <View style={S.itemBody}>
        <View style={S.itemTop}>
          <Text style={S.itemName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
        <Text style={S.itemPrice}>LKR {Number(item.price).toFixed(2)} each</Text>

        <View style={S.itemBottom}>
          <View style={S.qtyControls}>
            <TouchableOpacity style={S.qtyBtn} onPress={onDecrease}>
              <Ionicons name="remove" size={16} color="#2E7D32" />
            </TouchableOpacity>
            <Text style={S.qtyText}>{item.quantity}</Text>
            <TouchableOpacity style={S.qtyBtn} onPress={onIncrease}>
              <Ionicons name="add" size={16} color="#2E7D32" />
            </TouchableOpacity>
          </View>
          <Text style={S.lineTotal}>LKR {lineTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    items, storeId, storeName, subtotal,
    updateQuantity, removeFromCart, clearCart,
  } = useContext(CartContext);

  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);

  const total = subtotal + (items.length ? DELIVERY_FEE : 0);

  const confirmRemove = (productId, name) => {
    Alert.alert('Remove Item', `Remove ${name} from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(productId) },
    ]);
  };

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter your delivery address.');
      return;
    }

    setPlacing(true);
    try {
      const orderItems = items.map(item => ({
        productId: item._id,
        productName: item.name,
        quantity: item.quantity,
        priceAtOrder: Number(item.price),
      }));

      const { data: order } = await api.post('/orders', {
        items: orderItems,
        deliveryAddress: address.trim(),
        storeId,
      });

      clearCart();
      Alert.alert('Order Placed', 'Your order has been created successfully.', [
        {
          text: 'View Order',
          onPress: () => {
            navigation.getParent()?.navigate('OrdersTab', {
              screen: 'OrderDetail',
              params: { orderId: order._id },
            });
          },
        },
      ]);
    } catch (err) {
      Alert.alert(
        'Checkout Failed',
        !err.response
          ? 'Cannot connect to server. Check your connection.'
          : err.response?.data?.message || 'Could not place your order.'
      );
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={S.container}>
        <AppHeader title="My Cart" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          subtitle="Add products from a store to start shopping."
          buttonTitle="Browse Stores"
          onButtonPress={() => navigation.getParent()?.navigate('StoresTab')}
        />
      </View>
    );
  }

  return (
    <View style={S.container}>
      <AppHeader
        title="My Cart"
        subtitle={storeName || 'Your items'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={S.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FlatList
            data={items}
            keyExtractor={item => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onIncrease={() => {
                  const stock = Number(item.stock ?? item.stockQuantity ?? 0);
                  if (item.quantity >= stock) {
                    Alert.alert('Stock Limit', `Only ${stock} available.`);
                    return;
                  }
                  updateQuantity(item._id, item.quantity + 1);
                }}
                onDecrease={() => {
                  if (item.quantity <= 1) {
                    confirmRemove(item._id, item.name);
                    return;
                  }
                  updateQuantity(item._id, item.quantity - 1);
                }}
                onRemove={() => confirmRemove(item._id, item.name)}
              />
            )}
          />

          <View style={[S.section, shadows.small]}>
            <Text style={S.sectionTitle}>Delivery Details</Text>
            <InputField
              label="Delivery Address"
              leftIcon="location-outline"
              placeholder="Enter your full delivery address"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View style={[S.summary, shadows.small]}>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Subtotal</Text>
              <Text style={S.summaryValue}>LKR {subtotal.toFixed(2)}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Delivery Fee</Text>
              <Text style={S.summaryValue}>LKR {DELIVERY_FEE.toFixed(2)}</Text>
            </View>
            <View style={[S.summaryRow, S.totalRow]}>
              <Text style={S.totalLabel}>Total</Text>
              <Text style={S.totalValue}>LKR {total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[S.bottomBar, { paddingBottom: insets.bottom + 12 }, shadows.large]}>
          <GreenButton
            title={`Place Order · LKR ${total.toFixed(2)}`}
            onPress={handlePlaceOrder}
            loading={placing}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  itemImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemPrice: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  qtyText: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  totalRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 0,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});
