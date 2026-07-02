const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  customerName: { type: String, trim: true },
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  category: {
    type: String,
    enum: ["Order Issue", "Payment Issue", "Delivery Issue", "Other"],
    default: "Other",
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  imageUrl: { type: String },
  status: {
    type: String,
    enum: ["open", "inProgress", "resolved"],
    default: "open",
  },
  adminResponse: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

supportTicketSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
