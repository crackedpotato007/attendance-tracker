import type { ActionFunctionArgs } from "react-router";
import { executeDailyAutoAbsentFallback } from "../../server/scheduler/pulseScheduler.js";
import { requireAuth } from "../../server/auth.js";

export async function action({ request }: ActionFunctionArgs) {
  try {
    await requireAuth(request, { jsonOnly: true });
    const result = await executeDailyAutoAbsentFallback(new Date());
    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: "Pulse 11:30 PM auto-absent fallback executed successfully via SSR!",
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
