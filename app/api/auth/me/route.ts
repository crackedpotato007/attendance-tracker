import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/src/server/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      targetAttendance: user.targetAttendance,
    },
  });
}
