import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { UserModel } from "@/src/server/models/User";
import { UserScheduleModel } from "@/src/server/models/UserSchedule";
import { hashPassword, createAuthCookie } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToMongo();
    const body = await request.json();
    const { email, password, name, targetAttendance } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const target =
      typeof targetAttendance === "number" && !isNaN(targetAttendance)
        ? Math.min(100, Math.max(0, targetAttendance))
        : 75;

    const newUser = new UserModel({
      email: email.toLowerCase().trim(),
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

    const cookieHeader = createAuthCookie(newUser._id.toString());
    const userData = {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      targetAttendance: newUser.targetAttendance,
    };

    const res = NextResponse.json(
      { message: "Account created successfully!", user: userData },
      { status: 201 }
    );
    res.headers.set("Set-Cookie", cookieHeader);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
