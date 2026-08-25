import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import { connectToMongo } from "./mongo.js";
import { UserModel, type IUser } from "./models/User.js";

export const JWT_SECRET =
  process.env.JWT_SECRET || "bunkpulse_super_secret_jwt_key_2026_x99";

const COOKIE_NAME = "auth_token";

/**
 * Generate a Set-Cookie header value for JWT authentication
 */
export function createAuthCookie(userId: string): string {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Generate a Set-Cookie header to clear the auth cookie
 */
export function clearAuthCookie(): string {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Extract authenticated user from Web standard Request cookie
 */
export async function getUserFromRequest(request: Request): Promise<IUser | null> {
  try {
    await connectToMongo();
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = cookie.parse(cookieHeader);
    const token = cookies[COOKIE_NAME];

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      return null;
    }

    const user = await UserModel.findById(decoded.userId);
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Require authenticated user. If not logged in, throws a Response to redirect to /login or returns 401.
 */
export async function requireAuth(
  request: Request,
  options?: { jsonOnly?: boolean }
): Promise<IUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    if (options?.jsonOnly) {
      throw new Response(JSON.stringify({ error: "Unauthorized. Please log in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Redirect browser to login page
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  return user;
}

/**
 * Hash plain text password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain text password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
