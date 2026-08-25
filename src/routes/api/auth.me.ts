import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "../../server/auth.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        targetAttendance: user.targetAttendance,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
