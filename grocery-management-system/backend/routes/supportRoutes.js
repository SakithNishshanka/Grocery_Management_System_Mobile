const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicket,
} = require("../controllers/supportController");

router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);
router.get("/", protect, admin, getAllTickets);
router.put("/:id", protect, admin, updateTicket);

module.exports = router;
