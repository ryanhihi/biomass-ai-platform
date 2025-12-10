import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let bucket: GridFSBucket | null = null;

export async function connectMongo(uri: string) {
  if (!uri) throw new Error("MONGO_URI missing");

  await mongoose.connect(uri);

  const db = mongoose.connection.db!;
  bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "images" });

  // create indexes
  await db.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});
  await db.collection("predictions").createIndex({ userId: 1, ts: -1 }).catch(() => {});
}

export function getGridFS() {
  if (!bucket) throw new Error("GridFS not initialized");
  return bucket;
}
