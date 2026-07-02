const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Product = require("../models/Product");

// Initialize Stripe with validation
const isStripeConfigured = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return false;
  if (key.includes("YOUR_STRIPE") || key.includes("_HERE")) return false;
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
};

const initializeStripe = () => {
  if (!isStripeConfigured()) {
    console.warn(
      "⚠️  STRIPE_SECRET_KEY is missing or still a placeholder. Card payments will use demo mode until a valid Stripe secret key is added to backend/.env"
    );
    return null;
  }
  return require("stripe")(process.env.STRIPE_SECRET_KEY.trim());
};

const stripe = initializeStripe();

const toStripeAmount = (amount) => Math.round(Number(amount) * 100);

const isStripeAuthConfigError = (error) =>
  error?.type === "StripeAuthenticationError" ||
  error?.code === "api_key_expired" ||
  error?.code === "invalid_api_key" ||
  /expired api key|invalid api key/i.test(error?.message || "");

const createDemoStripeIntentResponse = (order) => ({
  demoMode: true,
  clientSecret: null,
  paymentIntentId: `demo_pi_${String(order._id)}_${Date.now()}`,
  amount: order.totalAmount,
});

const populatePayment = (query) =>
  query.populate("customerId", "name email").populate("orderId");

const getOrderStockRequirements = async (orderId, customerId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }
  if (customerId && String(order.customerId) !== String(customerId)) {
    const error = new Error("Not authorized to pay for this order");
    error.statusCode = 403;
    throw error;
  }
  const requiredByProduct = new Map();
  for (const item of order.items || []) {
    if (!item.productId) continue;
    const productId = String(item.productId);
    requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + Number(item.quantity || 0));
  }
  return { order, requiredByProduct };
};

const assertStockAvailable = async (requiredByProduct) => {
  for (const [productId, requiredQuantity] of requiredByProduct.entries()) {
    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error("A product in this order no longer exists");
      error.statusCode = 400;
      throw error;
    }
    if (Number(product.stockQuantity) < requiredQuantity) {
      const error = new Error(`Only ${product.stockQuantity} ${product.name} left in stock`);
      error.statusCode = 400;
      throw error;
    }
  }
};

const adjustProductStock = async (productId, quantityChange) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error("A product in this order no longer exists");
    error.statusCode = 400;
    throw error;
  }
  const currentStock = Number(product.stockQuantity);
  if (!Number.isFinite(currentStock)) {
    const error = new Error(`${product.name} has an invalid stock quantity.`);
    error.statusCode = 400;
    throw error;
  }
  const nextStock = currentStock + quantityChange;
  if (nextStock < 0) {
    const error = new Error(`Only ${currentStock} ${product.name} left in stock`);
    error.statusCode = 400;
    throw error;
  }
  product.stockQuantity = nextStock;
  await product.save();
  return product;
};

const deductStockForPayment = async (payment) => {
  if (payment.status !== "Successful") return payment;
  if (payment.inventoryDeducted) {
    await payment.save();
    return payment;
  }
  const existingDeductedPayment = await Payment.findOne({
    orderId: payment.orderId,
    inventoryDeducted: true,
    _id: { $ne: payment._id },
  });
  if (existingDeductedPayment) {
    const error = new Error("Inventory has already been deducted for this order");
    error.statusCode = 400;
    throw error;
  }
  const { requiredByProduct } = await getOrderStockRequirements(payment.orderId);
  const deducted = [];
  for (const [productId, requiredQuantity] of requiredByProduct.entries()) {
    try {
      await adjustProductStock(productId, -requiredQuantity);
      deducted.push({ productId, quantity: requiredQuantity });
    } catch (error) {
      for (const item of deducted) {
        await adjustProductStock(item.productId, item.quantity);
      }
      throw error;
    }
  }
  payment.inventoryDeducted = true;
  await payment.save();
  return payment;
};

// FIX #15: restore stock when payment is refunded
const restoreStockForRefund = async (payment) => {
  if (!payment.inventoryDeducted) return;
  const { requiredByProduct } = await getOrderStockRequirements(payment.orderId);
  for (const [productId, quantity] of requiredByProduct.entries()) {
    await adjustProductStock(productId, quantity);
  }
  payment.inventoryDeducted = false;
};

const createStripePaymentIntent = async (req, res) => {
  const { orderId, useDemoMode } = req.body;
  if (!orderId) return res.status(400).json({ message: "orderId is required" });

  try {
    const { order, requiredByProduct } = await getOrderStockRequirements(orderId, req.user.id);
    if (order.orderStatus !== "Placed") {
      return res.status(400).json({ message: "Only placed orders can be paid" });
    }
    await assertStockAvailable(requiredByProduct);

    if (useDemoMode || !isStripeConfigured() || !stripe) {
      return res.json(createDemoStripeIntentResponse(order));
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(order.totalAmount),
        currency: process.env.STRIPE_CURRENCY || "lkr",
        payment_method_types: ["card"],
        metadata: { orderId: String(order._id), customerId: String(req.user.id) },
      });
    } catch (stripeError) {
      if (isStripeAuthConfigError(stripeError)) {
        console.warn(
          "Stripe key is expired or invalid. Card payments are using demo mode until backend/.env is updated."
        );
        return res.json(createDemoStripeIntentResponse(order));
      }
      throw stripeError;
    }

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.totalAmount,
      demoMode: false,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Stripe error",
      error: error.message,
    });
  }
};

// FIX #8: prevent duplicate payments for same order
const makePayment = async (req, res) => {
  const { orderId, amount, method, transactionReference, stripePaymentIntentId, paymentNote } = req.body;

  if (!orderId || amount === undefined) {
    return res.status(400).json({ message: "orderId and amount are required" });
  }
  if (method === "online" && !transactionReference?.trim()) {
    return res.status(400).json({ message: "Transaction reference is required for online payments" });
  }

  try {
    const { order, requiredByProduct } = await getOrderStockRequirements(orderId, req.user.id);
    if (order.orderStatus !== "Placed") {
      return res.status(400).json({ message: "Only placed orders can be paid" });
    }
    if (Number(amount) !== Number(order.totalAmount)) {
      return res.status(400).json({ message: "Payment amount does not match the order total" });
    }

    // FIX #8: block if a successful or pending payment already exists for this order
    const existingPayment = await Payment.findOne({
      orderId,
      status: { $in: ["Pending", "Successful"] },
    });
    if (existingPayment) {
      return res.status(400).json({ message: "A payment already exists for this order" });
    }

    if (method === "card" && stripePaymentIntentId) {
      await assertStockAvailable(requiredByProduct);
      const intentId = stripePaymentIntentId.trim();
      const isDemoIntent = intentId.startsWith("demo_pi_");
      if (!isDemoIntent && stripe) {
        try {
          const intent = await stripe.paymentIntents.retrieve(intentId);
          if (intent.status !== "succeeded" && intent.status !== "requires_capture") {
            return res.status(400).json({ message: "Card payment was not completed successfully" });
          }
        } catch (stripeError) {
          return res.status(400).json({
            message: "Could not verify card payment with Stripe",
            error: stripeError.message,
          });
        }
      }
    }

    const shouldMarkSuccessful = method === "card" && stripePaymentIntentId;
    let payment = await Payment.create({
      customerId: req.user.id,
      orderId,
      amount,
      method,
      transactionReference: transactionReference?.trim(),
      stripePaymentIntentId: stripePaymentIntentId?.trim(),
      paymentNote: paymentNote?.trim(),
      status: "Pending",
    });

    if (shouldMarkSuccessful) {
      payment.status = "Successful";
      payment = await deductStockForPayment(payment);
    }

    return res.status(201).json(payment);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Server error",
      error: error.message,
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("customerId", "name email")
      .populate("orderId");
    return res.json(payments);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.id }).populate("orderId");
    return res.json(payments);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// FIX #15: restore stock when admin marks as Refunded
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["Pending", "Successful", "Failed", "Refunded"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const previousStatus = payment.status;
    payment.status = status;

    if (status === "Successful") {
      await deductStockForPayment(payment);
    } else {
      // FIX #15: restore stock if moving away from Successful
      if (previousStatus === "Successful" && status === "Refunded") {
        await restoreStockForRefund(payment);
      }
      await payment.save();
    }

    const updatedPayment = await populatePayment(Payment.findById(payment._id));
    return res.json(updatedPayment);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Server error",
      error: error.message,
    });
  }
};

// FIX #3: ownership check on refund request
const requestRefund = async (req, res) => {
  const { refundReason } = req.body;

  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // FIX #3: only the payment owner can request a refund
    if (String(payment.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to request a refund for this payment" });
    }

    if (payment.status !== "Successful") {
      return res.status(400).json({ message: "Refund only allowed on successful payments" });
    }

    if (payment.refundRequested) {
      return res.status(400).json({ message: "A refund has already been requested for this payment" });
    }

    payment.refundRequested = true;
    payment.refundReason = refundReason;
    await payment.save();

    return res.json({ message: "Refund request submitted", payment });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createStripePaymentIntent,
  makePayment,
  getAllPayments,
  getMyPayments,
  updateStatus,
  requestRefund,
};
