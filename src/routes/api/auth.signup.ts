import type { ActionFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
import { UserModel } from "../../server/models/User.js";
import { UserScheduleModel } from "../../server/models/UserSchedule.js";
import { hashPassword, createAuthCookie } from "../../server/auth.js";

export async function action({ request }: ActionFunctionArgs) {
  try {
    await connectToMongo();
    const body = await request.json();
    const { email, password, name, targetAttendance } = body;

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Name, email, and password are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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

    // Create default schedule (Mon-Sat, 75% target)
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

    return new Response(
      JSON.stringify({
        message: "Account created successfully!",
        user: userData,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
