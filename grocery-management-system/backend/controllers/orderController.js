const Order = require("../models/Order");
const TrackingRecord = require("../models/TrackingRecord");
const Product = require("../models/Product");

const DELIVERY_TIME_SLOTS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM",
];
const DELIVERY_FEE = 200;

const getDefaultDeliveryDate = (fromDate) => {
  const deliveryDate = new Date(fromDate);
  deliveryDate.setDate(deliveryDate.getDate() + 1);
  deliveryDate.setHours(0, 0, 0, 0);
  return deliveryDate;
};

const parseDeliveryDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const applyDeliverySchedule = (order, deliveryDate, deliveryTimeSlot) => {
  const parsedDeliveryDate = parseDeliveryDate(deliveryDate);
  if (!parsedDeliveryDate) return "Invalid delivery date";
  if (!DELIVERY_TIME_SLOTS.includes(deliveryTimeSlot)) return "Invalid delivery time slot";
  order.deliveryDate = parsedDeliveryDate;
  order.deliveryTimeSlot = deliveryTimeSlot;
  return null;
};

const getTrackingStatusForOrder = async (orderId) => {
  const trackingRecord = await TrackingRecord.findOne({ orderId }).select("currentStatus");
  return trackingRecord?.currentStatus || null;
};

const isCustomerOrderEditable = (order, trackingStatus) => {
  if (!order?.editDeadline) return false;

  const editDeadline = new Date(order.editDeadline).getTime();
  if (Number.isNaN(editDeadline) || Date.now() > editDeadline) return false;

  const normalizedStatus = String(trackingStatus || "").trim().toLowerCase();
  return !["processing", "out for delivery", "delivered"].includes(normalizedStatus);
};

const assertOrderStockAvailable = async (items) => {
  const requiredByProduct = new Map();

  for (const item of items || []) {
    if (!item.productId) return "Every order item must include a productId";
    const quantity = Number(item.quantity || 0);
    if (!Number.isInteger(quantity) || quantity < 1) return "Every order item must have a quantity of at least 1";
    const productId = String(item.productId);
    requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + quantity);
  }

  for (const [productId, requiredQuantity] of requiredByProduct.entries()) {
    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) return "A product in your cart is no longer available";
    if (Number(product.stockQuantity) < requiredQuantity) {
      return `Only ${product.stockQuantity} ${product.name} left in stock`;
    }
  }

  return null;
};

const deductStockForItems = async (items) => {
  for (const item of items || []) {
    const product = await Product.findById(item.productId);
    if (!product) continue;
    product.stockQuantity = Math.max(0, Number(product.stockQuantity) - Number(item.quantity));
    if (product.stockQuantity <= 0) product.isAvailable = false;
    await product.save();
  }
};

const restoreStockForItems = async (items) => {
  for (const item of items || []) {
    const product = await Product.findById(item.productId);
    if (!product) continue;
    product.stockQuantity = Number(product.stockQuantity) + Number(item.quantity);
    if (product.stockQuantity > 0) product.isAvailable = true;
    await product.save();
  }
};

// ─── Create order ─────────────────────────────────────────────
const createOrder = async (req, res) => {
  const { items, deliveryAddress, store, storeId, deliveryDate, deliveryTimeSlot } = req.body;

  if (!items || !items.length || !deliveryAddress) {
    return res.status(400).json({ message: "Items and deliveryAddress are required" });
  }

  try {
    const stockError = await assertOrderStockAvailable(items);
    if (stockError) return res.status(400).json({ message: stockError });

    await deductStockForItems(items);

    const subtotal = items.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);
    const totalAmount = subtotal + DELIVERY_FEE;
    const now = new Date();

    let order;
    try {
      order = await Order.create({
        customerId: req.user.id,
        store: store || storeId,
        items,
        totalAmount,
        deliveryAddress,
        deliveryDate: parseDeliveryDate(deliveryDate) || getDefaultDeliveryDate(now),
        deliveryTimeSlot: DELIVERY_TIME_SLOTS.includes(deliveryTimeSlot)
          ? deliveryTimeSlot
          : DELIVERY_TIME_SLOTS[0],
        placedAt: now,
        editDeadline: new Date(now.getTime() + 3600000),
      });
    } catch (error) {
      await restoreStockForItems(items);
      throw error;
    }

    try {
      await TrackingRecord.create({
      orderId: order._id,
      customerId: order.customerId,
      currentStatus: "Order Placed",
      currentLocation: "Warehouse",
      trackingHistory: [{
        status: "Order Placed",
        location: "Warehouse",
        note: "Order received and confirmed",
        updatedBy: req.user.id,
        timestamp: new Date(),
      }],
      });
    } catch (error) {
      await Order.findByIdAndDelete(order._id);
      await restoreStockForItems(items);
      throw error;
    }

    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Get all orders (admin) ───────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("customerId", "name email");
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Get my orders ────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Get single order — FIX #2: ownership check ──────────────
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("items.productId", "name price");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && String(order.customerId._id || order.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    const trackingStatus = await getTrackingStatusForOrder(order._id);
    const responseOrder = order.toObject();
    responseOrder.trackingStatus = trackingStatus || "Order Placed";
    responseOrder.canEdit = isCustomerOrderEditable(order, trackingStatus);

    return res.json(responseOrder);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Edit order — FIX #4 stock check, FIX #6 cancelled guard ─
const editOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isAdmin = req.user?.role === "admin";
    const trackingStatus = await getTrackingStatusForOrder(order._id);

    // FIX #6: cancelled orders cannot be edited
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Cancelled orders cannot be edited" });
    }

    if (!isAdmin && !isCustomerOrderEditable(order, trackingStatus)) {
      return res.status(403).json({ message: "Order can no longer be modified" });
    }

    const { items, deliveryAddress, deliveryDate, deliveryTimeSlot } = req.body;

    if (items && items.length) {
      const originalItems = order.items.map(item => ({ ...item.toObject?.() || item }));
      await restoreStockForItems(originalItems);

      const stockError = await assertOrderStockAvailable(items);
      if (stockError) {
        await deductStockForItems(originalItems);
        return res.status(400).json({ message: stockError });
      }

      order.items = items;
      const subtotal = items.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);
      order.totalAmount = subtotal + DELIVERY_FEE;
      await deductStockForItems(items);
    }

    if (deliveryAddress) order.deliveryAddress = deliveryAddress;

    if (deliveryDate || deliveryTimeSlot) {
      if (!isAdmin) return res.status(403).json({ message: "Only admins can update delivery schedule" });
      const error = applyDeliverySchedule(order, deliveryDate, deliveryTimeSlot);
      if (error) return res.status(400).json({ message: error });
    }

    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateDeliverySchedule = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { deliveryAddress, deliveryDate, deliveryTimeSlot } = req.body;
    const error = applyDeliverySchedule(order, deliveryDate, deliveryTimeSlot);
    if (error) return res.status(400).json({ message: error });

    if (deliveryAddress) order.deliveryAddress = deliveryAddress;

    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Cancel order — FIX #1 ownership, #5 admin bypass, #13 already-cancelled ─
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isAdmin = req.user?.role === "admin";
    const trackingStatus = await getTrackingStatusForOrder(order._id);

    // FIX #1: only the order owner or an admin can cancel
    if (!isAdmin && String(order.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    // FIX #13: already cancelled
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    // FIX #5: admins can cancel any time; customers are bound by the 1-hour window and tracking status
    if (!isAdmin && !isCustomerOrderEditable(order, trackingStatus)) {
      return res.status(403).json({ message: "Order can no longer be modified" });
    }

    order.orderStatus = "Cancelled";
    await restoreStockForItems(order.items);
    await order.save();

    return res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const confirmOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to confirm this order" });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Cancelled orders cannot be confirmed" });
    }

    order.orderStatus = "Placed";
    order.confirmedAt = new Date();
    await order.save();

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const removeCancelledOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to remove this order" });
    }

    if (order.orderStatus !== "Cancelled") {
      return res.status(400).json({ message: "Only cancelled orders can be removed" });
    }

    const Payment = require("../models/Payment");
    await Payment.deleteMany({ orderId: order._id });
    await TrackingRecord.deleteMany({ orderId: order._id });
    await Order.findByIdAndDelete(order._id);

    return res.json({ message: "Order removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrder,
  editOrder,
  updateDeliverySchedule,
  cancelOrder,
  confirmOrder,
  removeCancelledOrder,
};
