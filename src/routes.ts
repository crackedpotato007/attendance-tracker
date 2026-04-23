import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("main.tsx"),
  route("home", "./home.tsx"),
] satisfies RouteConfig;
