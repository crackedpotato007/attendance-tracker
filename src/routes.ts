import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("main.tsx"),
  route("home", "./home.tsx"),
  route("manage", "./manage.tsx"),
  route("calculator", "./bunkCalculator.tsx"),
  route("subjects", "./subjectsManager.tsx"),
  route("schedule", "./schedule.tsx"),
  route("login", "./login.tsx"),
] satisfies RouteConfig;
