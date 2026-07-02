const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  amount: { type: Number, required: [true, "Amount is required"] },
  method: {
    type: String,
    enum: ["card", "cash", "online"],
    default: "online",
  },
  transactionReference: {
    type: String,
    trim: true,
  },
  stripePaymentIntentId: {
    type: String,
    trim: true,
  },
  paymentNote: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Successful", "Failed", "Refunded"],
    default: "Pending",
  },
  inventoryDeducted: { type: Boolean, default: false },
  refundRequested: { type: Boolean, default: false },
  refundReason: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
