const User = require("../models/user.model");
const mongoose = require("mongoose");
require("dotenv").config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const adminUser = {
      username: "admin",
      password: "WHO_THE_HELL_ARE_YOU!",
      email: "admin@example.com",
      role: "admin",
    };

    const existingAdmin = await User.findOne({ username: adminUser.username });

    if (!existingAdmin) {
      const user = new User(adminUser);
      await user.save();
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdminUser();
