// MongoDB connection helper used by app.js.
const mongoose = require("mongoose");

async function connectDatabase() {
  try {
    const mongoUri = (process.env.MONGODB_URI || "").trim().replace(/^['"]|['"]$/g, "");

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in environment variables.");
    }

    if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
      throw new Error('MONGODB_URI must start with "mongodb://" or "mongodb+srv://".');
    }

    await mongoose.connect(mongoUri);
    // eslint-disable-next-line no-console
    console.log("MongoDB connected successfully.");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
}

module.exports = connectDatabase;
