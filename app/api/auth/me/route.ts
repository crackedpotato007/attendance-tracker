import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, requireAuth } from "@/src/server/auth";

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

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    const body = await request.json().catch(() => ({}));

    if (body.name !== undefined && body.name !== null && typeof body.name === "string" && body.name.trim()) {
      user.name = body.name.trim().slice(0, 100);
    }
    if (body.targetAttendance !== undefined && body.targetAttendance !== null) {
      const target = Number(body.targetAttendance);
      if (Number.isFinite(target)) {
        user.targetAttendance = Math.min(100, Math.max(1, Math.round(target)));
      }
    }

    user.updatedAt = new Date();
    await user.save();

    return NextResponse.json({
      message: "Profile updated successfully!",
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        targetAttendance: user.targetAttendance,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[PUT /api/auth/me] Error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
