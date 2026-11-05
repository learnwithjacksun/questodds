import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { mongooseCache?: Cache };
const cache: Cache = (globalForMongoose.mongooseCache ??= { conn: null, promise: null });

export async function connectDB() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    // Fail in seconds instead of the 30s default, so an unreachable database (for example Atlas
    // not allowing the host's IP) shows an error page quickly instead of hanging every request.
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
    socketTimeoutMS: 30_000,
    maxPoolSize: 10,
  });
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
