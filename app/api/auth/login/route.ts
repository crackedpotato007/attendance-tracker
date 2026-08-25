import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { UserModel } from "@/src/server/models/User";
import { comparePassword, createAuthCookie } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToMongo();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const cookieHeader = createAuthCookie(user._id.toString());
    const userData = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      targetAttendance: user.targetAttendance,
    };

    const res = NextResponse.json({
      message: "Login successful!",
      user: userData,
    });
    res.headers.set("Set-Cookie", cookieHeader);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
