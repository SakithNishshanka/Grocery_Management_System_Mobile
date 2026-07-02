const User = require("../models/User");

const demoUsers = [
  {
    name: "Demo Customer",
    email: "customer@example.com",
    password: "password123",
    role: "customer",
  },
  {
    name: "Admin",
    email: "admin@gmail.com",
    password: "admin123",
    role: "admin",
  },
];

async function seedDemoUsers() {
  for (const userData of demoUsers) {
    const exists = await User.exists({ email: userData.email });
    if (!exists) {
      await User.create(userData);
      console.log(`Demo ${userData.role} created: ${userData.email}`);
    }
  }
}

module.exports = seedDemoUsers;
