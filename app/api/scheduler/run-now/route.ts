import { NextRequest, NextResponse } from "next/server";
import { executeDailyAttendanceIncrement } from "@/src/server/scheduler/pulseScheduler";
import { requireAuth } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    // Scoped strictly to authenticated user's enrolled courses, idempotent (force = false)
    const result = await executeDailyAttendanceIncrement(new Date(), false, user._id.toString());
    return NextResponse.json({
      success: true,
      result,
      message: "Daily attendance check executed for your enrolled courses!",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
