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

const User =
  mongoose.models.User || mongoose.model("User", UserSchema);

export const auth = Router();

// POST /auth/register
auth.post("/register", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "Email and password required" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    // Use any to avoid strict null typing on create()
    const doc: any = await User.create({ email, hash });
    return res.json({ ok: true, id: doc._id });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, error: e?.message || "Register failed" });
  }
});

// POST /auth/login
auth.post("/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "Email and password required" });
  }

  const doc: any = await User.findOne({ email } as any).exec();

  if (!doc) {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid email or password" });
  }

  // IMPORTANT: schema field is "hash", not "passwordHash"
  const isValid = await bcrypt.compare(password, doc.hash);
  if (!isValid) {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid email or password" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return res
      .status(500)
      .json({ ok: false, error: "Server misconfigured (JWT secret)" });
  }

  const token = jwt.sign({ uid: doc._id.toString() }, secret, {
    expiresIn: "7d",
  });

  return res.json({ ok: true, token });
});
