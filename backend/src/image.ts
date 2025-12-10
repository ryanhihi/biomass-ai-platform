import { Router } from "express";
import mongoose from "mongoose";
import { getGridFS } from "./db.js";

export const images = Router();

/**
 * GET /images/:id
 * Streams a stored image from GridFS
 */
images.get("/images/:id", async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const bucket = getGridFS();

    // Try to read metadata to set content-type
    const files = await bucket.find({ _id: id }).toArray();
    const file = files[0];

    const contentType =
      (file?.metadata?.contentType as string) ||
      file?.contentType ||
      "application/octet-stream";

    res.setHeader("Content-Type", contentType);

    const stream = bucket.openDownloadStream(id);
    stream.on("error", () => res.status(404).end());
    stream.pipe(res);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid image id" });
  }
});
