const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  getAllStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
} = require("../controllers/storeController");

router.get("/", getAllStores);
router.get("/:id", getStore);
router.post("/", protect, admin, createStore);
router.put("/:id", protect, admin, updateStore);
router.delete("/:id", protect, admin, deleteStore);

module.exports = router;
