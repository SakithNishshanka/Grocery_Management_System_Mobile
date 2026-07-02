require("dotenv").config();
const mongoose = require("mongoose");
const seedDemoUsers = require("./utils/seedDemoUsers");

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  await seedDemoUsers();

  console.log("Demo accounts are ready.");
  console.log("  Customer: customer@example.com / password123");
  console.log("  Admin:    admin@gmail.com / admin123");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seeder failed:", err.message);
  process.exit(1);
});
