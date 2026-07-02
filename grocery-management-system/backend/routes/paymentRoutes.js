const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  createStripePaymentIntent,
  makePayment,
  getAllPayments,
  getMyPayments,
  updateStatus,
  requestRefund,
} = require("../controllers/paymentController");

router.post("/stripe/create-intent", protect, createStripePaymentIntent);
router.post("/", protect, makePayment);
router.get("/", protect, admin, getAllPayments);
router.get("/my", protect, getMyPayments);                    // must be before /:id
router.put("/:id/status", protect, admin, updateStatus);
router.put("/:id/refund", protect, requestRefund);

module.exports = router;
