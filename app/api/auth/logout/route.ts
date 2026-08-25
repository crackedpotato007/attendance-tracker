import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/src/server/auth";

export async function POST() {
  const cookieHeader = clearAuthCookie();
  const res = NextResponse.json({ message: "Logged out successfully" });
  res.headers.set("Set-Cookie", cookieHeader);
  return res;
}

export async function GET() {
  const cookieHeader = clearAuthCookie();
  const res = NextResponse.json({ message: "Logged out successfully" });
  res.headers.set("Set-Cookie", cookieHeader);
  return res;
}
