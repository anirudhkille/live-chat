import mongoose from "mongoose";
import { logger } from "./logger.js";

export const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Database connected successfully");
  } catch (err) {
    logger.error("Error connecting database", err.message);
  }
};
