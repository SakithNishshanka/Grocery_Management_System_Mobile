import React, { createContext, useMemo, useState } from 'react';

export const CartContext = createContext({
  items: [],
  cartCount: 0,
  storeId: null,
  storeName: null,
  subtotal: 0,
  addToCart: () => {},
  replaceCartWithProduct: () => {},
  updateQuantity: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
});

const getStoreId = (product = {}) => product.storeId || product.store?._id || product.store || null;

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState(null);

  const addToCart = (product, quantity = 1) => {
    const stock = Number(product?.stock ?? product?.stockQuantity ?? 0);
    if (stock <= 0) return { success: false, reason: 'OUT_OF_STOCK' };

    const qty = Math.max(1, Math.min(Number(quantity) || 1, stock));
    const nextStoreId = getStoreId(product);
    if (storeId && nextStoreId && storeId !== nextStoreId) {
      return { success: false, reason: 'STORE_MISMATCH' };
    }

    setStoreId(nextStoreId || storeId);
    setStoreName(product.storeName || product.store?.name || storeName);
    setItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (!existing) return [...prev, { ...product, quantity: qty }];
      return prev.map(item =>
        item._id === product._id
          ? { ...item, quantity: Math.min((item.quantity || 1) + qty, stock) }
          : item
      );
    });
    return { success: true };
  };

  const replaceCartWithProduct = (product, quantity = 1) => {
    const stock = Number(product?.stock ?? product?.stockQuantity ?? 0);
    const qty = Math.max(1, Math.min(Number(quantity) || 1, stock));
    setStoreId(getStoreId(product));
    setStoreName(product.storeName || product.store?.name || null);
    setItems([{ ...product, quantity: qty }]);
    return { success: true };
  };

  const updateQuantity = (productId, quantity) => {
    setItems(prev => prev.map(item => {
      if (item._id !== productId) return item;
      const stock = Number(item.stock ?? item.stockQuantity ?? 0);
      const qty = Math.max(1, Math.min(Number(quantity) || 1, stock || 999));
      return { ...item, quantity: qty };
    }));
  };

  const removeFromCart = (productId) => {
    setItems(prev => {
      const next = prev.filter(item => item._id !== productId);
      if (next.length === 0) {
        setStoreId(null);
        setStoreName(null);
      }
      return next;
    });
  };

  const clearCart = () => {
    setItems([]);
    setStoreId(null);
    setStoreName(null);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1),
    0
  );

  const value = useMemo(() => ({
    items,
    cartCount: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
    storeId,
    storeName,
    subtotal,
    addToCart,
    replaceCartWithProduct,
    updateQuantity,
    removeFromCart,
    clearCart,
  }), [items, storeId, storeName, subtotal]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
