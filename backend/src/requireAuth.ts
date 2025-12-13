// src/requireAuth.ts
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: mongoose.Types.ObjectId;
}

interface MyJwtPayload extends JwtPayload {
  uid: string;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  const [, token] = authHeader.split(" ");
  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return res
      .status(500)
      .json({ ok: false, error: "Server misconfigured (JWT secret)" });
  }

  try {
    const decoded = jwt.verify(token, secret) as MyJwtPayload;

    if (!decoded.uid) {
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    req.userId = new mongoose.Types.ObjectId(decoded.uid);
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}