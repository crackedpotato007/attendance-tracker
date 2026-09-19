import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { parseCookie, stringifySetCookie } from "cookie";
import { connectToMongo } from "./mongo";
import { UserModel, type IUser } from "./models/User";

export const JWT_SECRET =
  process.env.JWT_SECRET || "bunkpulse_super_secret_jwt_key_2026_x99";

export const COOKIE_NAME = "auth_token";

/**
 * Check if the incoming request is HTTPS or behind an HTTPS proxy
 */
export function isRequestHttps(request?: Request): boolean {
  if (!request) return false;
  try {
    const proto = request.headers.get("x-forwarded-proto");
    if (proto) return proto.toLowerCase() === "https";
    return request.url.startsWith("https://");
  } catch {
    return false;
  }
}

/**
 * Generate signed JWT token
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Generate a Set-Cookie header value for JWT authentication
 */
export function createAuthCookie(userId: string, isHttps: boolean = false): string {
  const token = generateToken(userId);
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Generate a Set-Cookie header to clear the auth cookie
 */
export function clearAuthCookie(isHttps: boolean = false): string {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Extract authenticated user from Web standard Request or NextRequest cookie
 */
export async function getUserFromRequest(request: Request): Promise<IUser | null> {
  try {
    await connectToMongo();
    let token: string | undefined;

    // 1. If NextRequest with .cookies object
    if ("cookies" in request && typeof (request as any).cookies?.get === "function") {
      const cookieObj = (request as any).cookies.get(COOKIE_NAME);
      token = cookieObj ? cookieObj.value : undefined;
    }

    // 2. Fallback to header parsing (checks both 'cookie' and 'Cookie')
    if (!token) {
      const cookieHeader =
        request.headers.get("cookie") ||
        request.headers.get("Cookie") ||
        "";
      if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        token = cookies[COOKIE_NAME];
      }
    }

    // 3. Fallback to Authorization: Bearer <token>
    if (!token) {
      const authHeader =
        request.headers.get("authorization") ||
        request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

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
