import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/src/server/auth";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out successfully" });
  res.cookies.delete(COOKIE_NAME);
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}

export async function GET() {
  const res = NextResponse.json({ message: "Logged out successfully" });
  res.cookies.delete(COOKIE_NAME);
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
