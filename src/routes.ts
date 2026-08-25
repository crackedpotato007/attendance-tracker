import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  // UI Page Routes
  index("main.tsx"),
  route("home", "./home.tsx"),
  route("manage", "./manage.tsx"),
  route("calculator", "./bunkCalculator.tsx"),
  route("subjects", "./subjectsManager.tsx"),
  route("schedule", "./schedule.tsx"),
  route("login", "./login.tsx"),

  // Dedicated API Resource Routes
  route("api/auth/signup", "./routes/api/auth.signup.ts"),
  route("api/auth/login", "./routes/api/auth.login.ts"),
  route("api/auth/logout", "./routes/api/auth.logout.ts"),
  route("api/auth/me", "./routes/api/auth.me.ts"),

  route("api/subjects", "./routes/api/subjects.ts"),
  route("api/subjects/:id", "./routes/api/subjects.$id.ts"),
  route("api/subjects/:id/quick", "./routes/api/subjects.$id.quick.ts"),

  route("api/attendance", "./routes/api/attendance.ts"),
  route("api/attendance/batch", "./routes/api/attendance.batch.ts"),
  route("api/attendance/:id", "./routes/api/attendance.$id.ts"),

  route("api/schedule", "./routes/api/schedule.ts"),

  route("api/scheduler/status", "./routes/api/scheduler.status.ts"),
  route("api/scheduler/run-now", "./routes/api/scheduler.run-now.ts"),
  route("api/scheduler/run-auto-absent", "./routes/api/scheduler.run-auto-absent.ts"),
] satisfies RouteConfig;
