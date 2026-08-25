import mongoose from "mongoose";
import { initPulseScheduler } from "./scheduler/pulseScheduler";

const mongoURI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:drskm1974@cluster0.m90cb.mongodb.net/attendance-tracker?appName=Cluster0";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

let cached = globalThis.__mongooseCache;

if (!cached) {
  cached = globalThis.__mongooseCache = { conn: null, promise: null };
}

/**
 * Global MongoDB Connection Singleton with Connection Pooling (Max 10 Sockets).
 * Guarantees that only ONE connection pool is ever created across the entire application lifecycle.
 */
export async function connectToMongo(): Promise<typeof mongoose> {
  // 1. If already connected, return existing singleton immediately in 0ms
  if (cached!.conn && mongoose.connection.readyState === 1) {
    return cached!.conn;
  }

  // 2. If a connection is currently in-flight, reuse that exact same promise (prevents race conditions)
  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      dbName: "attendance-tracker",
      maxPoolSize: 10, // Maintain a pool of 10 reusable connections
      minPoolSize: 2,  // Keep 2 warm connections open
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    console.log("[MongoDB SSR] Opening persistent connection pool to MongoDB Atlas...");
    cached!.promise = mongoose.connect(mongoURI, opts).then((m) => {
      console.log("[MongoDB SSR] Persistent connection pool established.");
      
      // Initialize Pulse background scheduler on the shared database
      initPulseScheduler().catch((err) =>
        console.warn("[MongoDB SSR] Pulse Scheduler notice:", err)
      );

      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null; // Reset so subsequent requests can retry cleanly
    throw e;
  }

  return cached!.conn;
}

// Automatically warm the connection pool once when the server boots up
if (typeof window === "undefined") {
  connectToMongo().catch((err) =>
    console.error("[MongoDB SSR] Boot connection warning:", err)
  );
}
