const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  stockQuantity: {
    type: Number,
    required: [true, "Stock quantity is required"],
  },
  imageUrl: {
    type: String,
  },
  category: {
    type: String,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: [true, "Store is required"],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
