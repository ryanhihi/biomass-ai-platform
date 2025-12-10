import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: mongoose.Types.ObjectId;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = new mongoose.Types.ObjectId(decoded.uid);
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}
