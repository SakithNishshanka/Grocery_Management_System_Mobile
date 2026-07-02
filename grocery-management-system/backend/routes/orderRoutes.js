const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrder,
  editOrder,
  updateDeliverySchedule,
  cancelOrder,
  confirmOrder,
  removeCancelledOrder,
} = require("../controllers/orderController");

router.post("/", protect, createOrder);
router.get("/", protect, admin, getAllOrders);
router.get("/my", protect, getMyOrders);       // must be before /:id
router.get("/:id", protect, getOrder);
router.put("/:id/confirm", protect, confirmOrder);
router.put("/:id/delivery", protect, admin, updateDeliverySchedule);
router.put("/:id", protect, editOrder);
router.delete("/:id/remove", protect, removeCancelledOrder);
router.delete("/:id", protect, cancelOrder);

module.exports = router;
