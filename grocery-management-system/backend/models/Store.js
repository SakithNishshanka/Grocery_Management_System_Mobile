const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Store name is required"] },
  location: { type: String, required: [true, "Location is required"] },
  contactNumber: String,
  openingHours: String,
  imageUrl: String,
  availabilityStatus: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Store", storeSchema);
