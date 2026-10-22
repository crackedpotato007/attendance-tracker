import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { UserModel } from "@/src/server/models/User";
import { UserScheduleModel } from "@/src/server/models/UserSchedule";
import { hashPassword, generateToken, isRequestHttps, COOKIE_NAME } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToMongo();
    const body = await request.json().catch(() => ({}));
    const { email, password, name, targetAttendance } = body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof name !== "string" ||
      !email.trim() ||
      !password ||
      !name.trim()
    ) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 72) {
      return NextResponse.json(
        { error: "Password must be between 6 and 72 characters." },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const target =
      typeof targetAttendance === "number" && Number.isFinite(targetAttendance)
        ? Math.min(100, Math.max(1, Math.round(targetAttendance)))
        : 75;

    const newUser = new UserModel({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      targetAttendance: target,
    });
    await newUser.save();

    const newSchedule = new UserScheduleModel({
      userId: newUser._id,
      activeDays: [1, 2, 3, 4, 5, 6],
      globalTarget: target,
      customHolidays: [],
    });
    await newSchedule.save();

    const token = generateToken(newUser._id.toString());
    const isHttps = isRequestHttps(request);

    const userData = {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      targetAttendance: newUser.targetAttendance,
    };

    const res = NextResponse.json(
      { message: "Account created successfully!", user: userData, token },
      { status: 201 }
    );

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    console.error("[POST /api/auth/signup] Error:", err);
    return NextResponse.json({ error: "Internal server error during signup." }, { status: 500 });
  }
}
