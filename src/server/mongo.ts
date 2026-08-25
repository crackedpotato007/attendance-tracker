import mongoose from "mongoose";
import { initPulseScheduler } from "./scheduler/pulseScheduler.js";

const mongoURI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:drskm1974@cluster0.m90cb.mongodb.net/attendance-tracker?appName=Cluster0";

let isConnected = false;

export async function connectToMongo() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    console.log("[MongoDB SSR] Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoURI, {
      dbName: "attendance-tracker",
    });
    isConnected = true;
    console.log("[MongoDB SSR] Connected successfully to MongoDB Atlas.");

    // Initialize Pulse background scheduler
    initPulseScheduler().catch((err) =>
      console.error("[MongoDB SSR] Pulse Scheduler init error:", err)
    );
  } catch (error) {
    console.error("[MongoDB SSR] MongoDB connection error:", error);
  }
}
