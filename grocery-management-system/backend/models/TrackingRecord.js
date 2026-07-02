const mongoose = require("mongoose");

const TRACKING_STEPS = [
  "Order Placed",
  "Processing",
  "Out for Delivery",
  "Delivered",
];

const trackingHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    location: { type: String },
    note: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const trackingRecordSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  currentStatus: { type: String, required: true },
  currentLocation: { type: String },
  trackingHistory: [trackingHistorySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

trackingRecordSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("TrackingRecord", trackingRecordSchema);
module.exports.TRACKING_STEPS = TRACKING_STEPS;
