import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type AuthRequest = Request & { admin?: { id: number; email: string } };

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ message: "Missing auth token" });
    return;
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret) as { id: number; email: string };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired auth token" });
  }
}

