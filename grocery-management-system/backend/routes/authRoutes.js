const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || "dev_jwt_secret",
    { expiresIn: "7d" }
  );

const userResponse = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const createResetCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashResetCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const createMailer = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: normalizeEmail(email) });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const role = userType === "admin" ? "admin" : "customer";
    const user = await User.create({ name, email: normalizeEmail(email), password, role });
    const token = createToken(user);

    return res.status(201).json({
      token,
      user: userResponse(user),
      isAdmin: user.role === "admin",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: userResponse(user),
      isAdmin: user.role === "admin",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found for that email" });
    }

    const resetCode = createResetCode();
    user.passwordResetCodeHash = hashResetCode(resetCode);
    user.passwordResetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const mailer = createMailer();
    if (!mailer) {
      return res.status(500).json({ message: "Email service is not configured" });
    }

    await mailer.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "GroceryApp password reset code",
      text: `Your GroceryApp reset code is ${resetCode}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>Password Reset Code</h2>
          <p>Your reset code for GroceryApp is:</p>
          <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; margin: 16px 0;">${resetCode}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    return res.json({
      message: "Reset code sent to your email",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create reset code" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, reset code, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordResetCodeHash || !user.passwordResetCodeExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (user.passwordResetCodeExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (user.passwordResetCodeHash !== hashResetCode(code)) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.password = newPassword;
    user.passwordResetCodeHash = undefined;
    user.passwordResetCodeExpiresAt = undefined;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to reset password" });
  }
});

module.exports = router;
