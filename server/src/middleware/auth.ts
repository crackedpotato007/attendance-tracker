import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "bunkpulse_super_secret_jwt_key_2026";

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Try HTTP Cookie
    let token = req.cookies?.token;

    // 2. Try Authorization Bearer Header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Authentication required. Please sign in." });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    (req as AuthenticatedRequest).userId = decoded.userId;
    (req as AuthenticatedRequest).userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }
};
