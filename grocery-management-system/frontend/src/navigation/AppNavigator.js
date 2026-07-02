import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Customer Screens
import ProductListScreen from '../screens/customer/ProductListScreen';
import ProductDetailScreen from '../screens/customer/ProductDetailScreen';
import CartScreen from '../screens/customer/CartScreen';
import StoreListScreen from '../screens/customer/StoreListScreen';
import OrderListScreen from '../screens/customer/OrderListScreen';
import OrderDetailScreen from '../screens/customer/OrderDetailScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import SupportScreen from '../screens/customer/SupportScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';

// Admin Screens
import AdminProductScreen from '../screens/admin/AdminProductScreen';
import AdminOrderScreen from '../screens/admin/AdminOrderScreen';
import AdminPaymentScreen from '../screens/admin/AdminPaymentScreen';
import AdminStoreScreen from '../screens/admin/AdminStoreScreen';
import AdminSupportScreen from '../screens/admin/AdminSupportScreen';
import AdminTrackingScreen from '../screens/admin/AdminTrackingScreen';

// Context & Components
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const stackHeaderOptions = {
  headerShown: false,
};

// Customer Navigation Stack
const CustomerProductStack = () => (
  <Stack.Navigator screenOptions={stackHeaderOptions}>
    <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products' }} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />
  </Stack.Navigator>
);

const CustomerOrderStack = () => (
  <Stack.Navigator screenOptions={stackHeaderOptions}>
    <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'My Orders' }} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
    <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
  </Stack.Navigator>
);

const CustomerPaymentStack = () => (
  <Stack.Navigator screenOptions={stackHeaderOptions}>
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
    <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
  </Stack.Navigator>
);

const CustomerStoreStack = () => (
  <Stack.Navigator screenOptions={stackHeaderOptions}>
    <Stack.Screen name="StoreList" component={StoreListScreen} options={{ title: 'Stores' }} />
  </Stack.Navigator>
);

const CustomerTrackingStack = () => (
  <Stack.Navigator screenOptions={stackHeaderOptions}>
    <Stack.Screen name="TrackingHome" component={TrackingScreen} options={{ title: 'Track My Order' }} />
  </Stack.Navigator>
);

// Customer Tab Navigation
const CustomerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#999',
      tabBarStyle: { borderTopColor: '#e5e7eb' },
    }}
  >
    <Tab.Screen
      name="ProductsTab"
      component={CustomerProductStack}
      options={{
        title: 'Products',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="shopping-bag" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="StoresTab"
      component={CustomerStoreStack}
      options={{
        title: 'Stores',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="store" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="OrdersTab"
      component={CustomerOrderStack}
      options={{
        title: 'Orders',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="PaymentsTab"
      component={CustomerPaymentStack}
      options={{
        title: 'Payments',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="payment" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="TrackingTab"
      component={CustomerTrackingStack}
      options={{
        title: 'Track',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="near-me" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="SupportTab"
      component={SupportScreen}
      options={{
        title: 'Support',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="headset-mic" color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

// Admin Tab Navigation
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#999',
      tabBarStyle: { borderTopColor: '#e5e7eb' },
    }}
  >
    <Tab.Screen
      name="AdminProducts"
      component={AdminProductScreen}
      options={{
        title: 'Products',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="inventory" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AdminStores"
      component={AdminStoreScreen}
      options={{
        title: 'Stores',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="store" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AdminOrders"
      component={AdminOrderScreen}
      options={{
        title: 'Orders',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AdminPayments"
      component={AdminPaymentScreen}
      options={{
        title: 'Payments',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="payment" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AdminTracking"
      component={AdminTrackingScreen}
      options={{
        title: 'Tracking',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="near-me" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AdminSupport"
      component={AdminSupportScreen}
      options={{
        title: 'Support',
        tabBarIcon: ({ color, size }) => <MaterialIcons name="headset-mic" color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
      animationEnabled: true,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In', headerShown: false }} />
    <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create Account' }} />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {isAdmin ? (
            <Stack.Screen name="AdminApp" component={AdminTabs} />
          ) : (
            <Stack.Screen name="CustomerApp" component={CustomerTabs} />
          )}
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
