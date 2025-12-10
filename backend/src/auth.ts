import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const User = mongoose.model("User", new mongoose.Schema({
  email: { type: String, unique: true },
  hash: String,
}, { timestamps: true }));

export const auth = Router();

auth.post("/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const doc = await User.create({ email, hash });
    res.json({ ok: true, id: doc._id });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

auth.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const user = await User.findOne({ email });
  if (!user || !user.hash) {
    return res.status(401).json({ ok: false, error: "Invalid" });
  }

  const ok = await bcrypt.compare(password, user.hash as string);
  if (!ok) {
    return res.status(401).json({ ok: false, error: "Invalid" });
  }

  const token = jwt.sign(
    { uid: user._id, email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({ ok: true, token });
});
