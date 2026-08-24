import mongoose from "mongoose";

const mongoURI =
  "mongodb+srv://admin:drskm1974@cluster0.m90cb.mongodb.net/attendance-tracker?appName=Cluster0";

export const connectToMongo = async () => {
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};
