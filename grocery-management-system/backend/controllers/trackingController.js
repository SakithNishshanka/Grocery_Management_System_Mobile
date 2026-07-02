const TrackingRecord = require("../models/TrackingRecord");
const { TRACKING_STEPS } = require("../models/TrackingRecord");

const DEFAULT_LOCATIONS = {
  "Order Placed": "Warehouse",
  Processing: "Warehouse",
  "Out for Delivery": "On the way",
  Delivered: "Customer Address",
};

const normalizeStatus = (status = "") => {
  const match = TRACKING_STEPS.find(
    step => step.toLowerCase() === String(status).trim().toLowerCase()
  );
  return match || null;
};

const getMyTracking = async (req, res) => {
  try {
    const records = await TrackingRecord.find({ customerId: req.user.id })
      .populate("orderId", "totalAmount orderStatus placedAt")
      .sort({ updatedAt: -1 });
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllTracking = async (req, res) => {
  try {
    const records = await TrackingRecord.find()
      .populate("customerId", "name email")
      .populate("orderId", "totalAmount orderStatus placedAt")
      .sort({ updatedAt: -1 });
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getTrackingByOrder = async (req, res) => {
  try {
    const record = await TrackingRecord.findOne({ orderId: req.params.orderId })
      .populate("customerId", "name email")
      .populate("orderId", "totalAmount orderStatus placedAt deliveryAddress");

    if (!record) {
      return res.status(404).json({ message: "Tracking record not found" });
    }

    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && String(record.customerId._id || record.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to view this tracking record" });
    }

    return res.json(record);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateTracking = async (req, res) => {
  try {
    const record = await TrackingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Tracking record not found" });
    }

    const { status, location, note } = req.body;
    const nextStatus = normalizeStatus(status);
    if (!nextStatus) {
      return res.status(400).json({ message: "Invalid tracking status" });
    }

    record.currentStatus = nextStatus;
    record.currentLocation = location?.trim() || DEFAULT_LOCATIONS[nextStatus] || record.currentLocation;
    record.trackingHistory.push({
      status: nextStatus,
      location: record.currentLocation,
      note: note?.trim() || `Status updated to ${nextStatus}`,
      updatedBy: req.user.id,
      timestamp: new Date(),
    });

    await record.save();

    const populated = await TrackingRecord.findById(record._id)
      .populate("customerId", "name email")
      .populate("orderId", "totalAmount orderStatus placedAt");

    return res.json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const removeDeliveredTracking = async (req, res) => {
  try {
    const record = await TrackingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Tracking record not found" });
    }

    if (String(record.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to remove this tracking record" });
    }

    if (record.currentStatus !== "Delivered") {
      return res.status(400).json({ message: "Only delivered orders can be removed from tracking" });
    }

    const Order = require("../models/Order");
    const Payment = require("../models/Payment");
    const orderId = record.orderId;

    await TrackingRecord.findByIdAndDelete(record._id);
    if (orderId) {
      await Payment.deleteMany({ orderId });
      await Order.findByIdAndDelete(orderId);
    }

    return res.json({ message: "Tracking record and order removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getMyTracking,
  getAllTracking,
  getTrackingByOrder,
  updateTracking,
  removeDeliveredTracking,
  TRACKING_STEPS,
};
