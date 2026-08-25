import type { LoaderFunctionArgs } from "react-router";
import { pulse } from "../../server/scheduler/pulseScheduler.js";
import { requireAuth } from "../../server/auth.js";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireAuth(request, { jsonOnly: true });
    const jobs = await pulse.jobs({ name: "daily_5pm_attendance_increment" });

    return new Response(
      JSON.stringify({
        active: true,
        scheduler: "@pulsecron/pulse (SSR Unified)",
        configuredTime: "17:00 (5:00 PM) & 23:30 (11:30 PM) Daily",
        jobsCount: jobs.length,
        jobs: jobs.map((j: any) => ({
          name: j.attrs.name,
          lastRunAt: j.attrs.lastRunAt,
          nextRunAt: j.attrs.nextRunAt,
          lastFinishedAt: j.attrs.lastFinishedAt,
          failReason: j.attrs.failReason,
        })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
