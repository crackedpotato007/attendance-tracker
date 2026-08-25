import { NextRequest, NextResponse } from "next/server";
import { pulse } from "@/src/server/scheduler/pulseScheduler";
import { requireAuth } from "@/src/server/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { jsonOnly: true });
    const jobs = await pulse.jobs({ name: "daily_5pm_attendance_increment" });

    return NextResponse.json({
      active: true,
      scheduler: "@pulsecron/pulse (Next.js)",
      configuredTime: "17:00 (5:00 PM) & 23:30 (11:30 PM) Daily",
      jobsCount: jobs.length,
      jobs: jobs.map((j: any) => ({
        name: j.attrs.name,
        lastRunAt: j.attrs.lastRunAt,
        nextRunAt: j.attrs.nextRunAt,
        lastFinishedAt: j.attrs.lastFinishedAt,
        failReason: j.attrs.failReason,
      })),
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
