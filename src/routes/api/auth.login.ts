import type { ActionFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
import { UserModel } from "../../server/models/User.js";
import { comparePassword, createAuthCookie } from "../../server/auth.js";

export async function action({ request }: ActionFunctionArgs) {
  try {
    await connectToMongo();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const cookieHeader = createAuthCookie(user._id.toString());
    const userData = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      targetAttendance: user.targetAttendance,
    };

    return new Response(
      JSON.stringify({
        message: "Login successful!",
        user: userData,
      }),
      {
        status: 200,
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
