import { NextRequest, NextResponse } from "next/server";
import { executeDailyAutoAbsentFallback } from "@/src/server/scheduler/pulseScheduler";
import { requireAuth } from "@/src/server/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, { jsonOnly: true });
    const result = await executeDailyAutoAbsentFallback(new Date());
    return NextResponse.json({
      success: true,
      result,
      message: "Pulse 11:30 PM auto-absent fallback executed successfully via Next.js!",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
