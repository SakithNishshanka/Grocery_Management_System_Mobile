const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");

const CATEGORIES = ["Order Issue", "Payment Issue", "Delivery Issue", "Other"];
const STATUSES = ["open", "inProgress", "resolved"];

const createTicket = async (req, res) => {
  try {
    const { title, category, description, imageUrl } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const user = await User.findById(req.user.id).select("name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ticket = await SupportTicket.create({
      customerId: req.user.id,
      customerName: user.name,
      title: title.trim(),
      category: category || "Other",
      description: description.trim(),
      imageUrl: imageUrl || undefined,
    });

    return res.status(201).json(ticket);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });
    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const { status, adminResponse } = req.body;

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      ticket.status = status;
    }

    if (adminResponse !== undefined) {
      ticket.adminResponse = adminResponse.trim();
      if (ticket.status === "open") {
        ticket.status = "inProgress";
      }
    }

    await ticket.save();
    return res.json(ticket);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicket,
};
