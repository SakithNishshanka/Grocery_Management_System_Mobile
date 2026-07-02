const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  getMyTracking,
  getAllTracking,
  getTrackingByOrder,
  updateTracking,
  removeDeliveredTracking,
} = require("../controllers/trackingController");

router.get("/my", protect, getMyTracking);
router.get("/order/:orderId", protect, getTrackingByOrder);
router.get("/", protect, admin, getAllTracking);
router.put("/:id", protect, admin, updateTracking);
router.delete("/:id", protect, removeDeliveredTracking);

module.exports = router;
