import type { ActionFunctionArgs } from "react-router";
import { executeDailyAttendanceIncrement } from "../../server/scheduler/pulseScheduler.js";
import { requireAuth } from "../../server/auth.js";

export async function action({ request }: ActionFunctionArgs) {
  try {
    await requireAuth(request, { jsonOnly: true });
    const result = await executeDailyAttendanceIncrement(new Date(), true);
    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: "Pulse daily attendance increment executed successfully via SSR!",
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
