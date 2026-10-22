import { NextRequest, NextResponse } from "next/server";
import { executeDailyAutoAbsentFallback } from "@/src/server/scheduler/pulseScheduler";
import { requireAuth } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    // Scoped strictly to authenticated user's enrolled courses
    const result = await executeDailyAutoAbsentFallback(new Date(), user._id.toString());
    return NextResponse.json({
      success: true,
      result,
      message: "Daily auto-absent check executed for your enrolled courses!",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
