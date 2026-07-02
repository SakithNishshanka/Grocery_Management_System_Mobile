const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: String,
    quantity: Number,
    priceAtOrder: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
  },
  items: [orderItemSchema],
  totalAmount: Number,
  orderStatus: {
    type: String,
    enum: ["Pending Confirmation", "Placed", "Cancelled"],
    default: "Pending Confirmation",
  },
  confirmedAt: { type: Date },
  deliveryAddress: {
    type: String,
    required: [true, "Delivery address is required"],
  },
  deliveryDate: { type: Date },
  deliveryTimeSlot: {
    type: String,
    enum: [
      "8:00 AM - 10:00 AM",
      "10:00 AM - 12:00 PM",
      "12:00 PM - 2:00 PM",
      "2:00 PM - 4:00 PM",
      "4:00 PM - 6:00 PM",
      "6:00 PM - 8:00 PM",
    ],
  },
  placedAt: { type: Date, default: Date.now },
  editDeadline: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
