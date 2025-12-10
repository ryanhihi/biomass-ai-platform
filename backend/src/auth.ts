import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export const auth = Router();

auth.post("/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const doc = await User.create({ email, hash });
    return res.json({ ok: true, id: doc._id });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

auth.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ ok: false, error: "Invalid" });

  const ok = await bcrypt.compare(password, user.hash);
  if (!ok) return res.status(401).json({ ok: false, error: "Invalid" });

  const token = jwt.sign(
    { uid: user._id.toString(), email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return res.json({ ok: true, token });
});
