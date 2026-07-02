const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const seedDemoUsers = require("./utils/seedDemoUsers");

dotenv.config();

connectDB()
  .then(seedDemoUsers)
  .catch((error) => {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });

const app = express();

const useOptionalRoute = (mountPath, routePath) => {
  try {
    app.use(mountPath, require(routePath));
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") {
      throw error;
    }

    console.warn(`Skipping missing route module: ${routePath}`);
  }
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

useOptionalRoute("/api/auth", "./routes/authRoutes");
app.use("/api/products", require("./routes/productRoutes"));

app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/stores", require("./routes/storeRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
useOptionalRoute("/api/support", "./routes/supportRoutes");
useOptionalRoute("/api/tracking", "./routes/trackingRoutes");

app.get("/", (req, res) => {
  res.json({ message: "Grocery Management API is running" });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
