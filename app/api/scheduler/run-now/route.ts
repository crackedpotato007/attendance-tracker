import { NextRequest, NextResponse } from "next/server";
import { executeDailyAttendanceIncrement } from "@/src/server/scheduler/pulseScheduler";
import { requireAuth } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { jsonOnly: true });
    const result = await executeDailyAttendanceIncrement(new Date(), true);
    return NextResponse.json({
      success: true,
      result,
      message: "Pulse daily attendance increment executed successfully via Next.js!",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
