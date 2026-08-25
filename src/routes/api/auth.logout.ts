import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { clearAuthCookie } from "../../server/auth.js";

export async function action({ request }: ActionFunctionArgs) {
  const cookieHeader = clearAuthCookie();
  return new Response(JSON.stringify({ message: "Logged out successfully" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader,
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = clearAuthCookie();
  return new Response(JSON.stringify({ message: "Logged out successfully" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader,
    },
  });
}
