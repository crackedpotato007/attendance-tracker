import express from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectToMongo } from "./mongo.js";
import { User } from "./models/User.js";
import { SubjectModel } from "./models/Subject.js";
import { AttendanceLogModel } from "./models/AttendanceLog.js";
import { UserScheduleModel } from "./models/UserSchedule.js";
import { requireAuth, JWT_SECRET, type AuthenticatedRequest } from "./middleware/auth.js";
import {
  initPulseScheduler,
  executeDailyAttendanceIncrement,
  executeDailyAutoAbsentFallback,
  pulse,
} from "./scheduler/pulseScheduler.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed Origins for CORS with credentials
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Cookie helper
const setAuthCookie = (res: Response, userId: string, email: string) => {
  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
};

// ==========================================
// 1. AUTHENTICATION & COOKIE ENDPOINTS
// ==========================================

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "online", db: "MongoDB Connected", timestamp: new Date().toISOString() });
});

// Sign Up
app.post("/api/auth/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password, college } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
      college: college || "School of Engineering",
      targetPercentage: 75,
    });

    await newUser.save();

    // Default Mon-Sat schedule with empty custom holidays
    const newSchedule = new UserScheduleModel({
      userId: newUser._id,
      activeDays: [1, 2, 3, 4, 5, 6],
      globalTarget: 75,
      customHolidays: [],
    });
    await newSchedule.save();

    // Do NOT seed dummy subjects for new real users - keep it completely clean and empty

    // Set Cookie
    setAuthCookie(res, newUser._id.toString(), newUser.email);

    res.status(201).json({
      user: newUser.toJSON(),
      message: "Student account created successfully!",
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message || "Failed to create account." });
  }
});

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "No account found with this email." });
    }

    const isValid =
      user.passwordHash.startsWith("$2")
        ? await bcrypt.compare(password, user.passwordHash)
        : user.passwordHash === password;

    if (!isValid) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    setAuthCookie(res, user._id.toString(), user.email);

    res.json({
      user: user.toJSON(),
      message: "Welcome back!",
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message || "Login failed." });
  }
});

// Get Current Logged-in User
app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await User.findById(authReq.userId);
    if (!user) {
      return res.status(404).json({ error: "User session not found." });
    }
    res.json({ user: user.toJSON() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("token", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Signed out successfully." });
});

// ==========================================
// 2. SUBJECTS CRUD (MongoDB Backed)
// ==========================================

// Get All Subjects for Current User
app.get("/api/subjects", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const subjects = await SubjectModel.find({ userId: authReq.userId as any }).sort({ name: 1 });
    res.json(subjects.map((s) => s.toJSON()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create New Subject
app.post("/api/subjects", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, code, attended, total, targetPercentage, color, professor, room, credits, workingDays, startDate } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Course name and code are required." });
    }

    const newSub = new SubjectModel({
      userId: authReq.userId as any,
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      attended: Number(attended) || 0,
      total: Number(total) || 0,
      targetPercentage: Number(targetPercentage) || 75,
      color: color || "#6366f1",
      professor: professor || "",
      room: room || "",
      credits: Number(credits) || 3,
      workingDays: Array.isArray(workingDays) ? workingDays : [1, 2, 3, 4, 5, 6],
      startDate: startDate || new Date().toISOString().split("T")[0],
    });

    await newSub.save();
    res.status(201).json(newSub.toJSON());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Subject
app.put("/api/subjects/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const updated = await SubjectModel.findOneAndUpdate(
      { _id: id as any, userId: authReq.userId as any },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Course not found." });
    }

    res.json(updated.toJSON());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Subject
app.delete("/api/subjects/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = String(req.params.id);
    const deleted = await SubjectModel.findOneAndDelete({ _id: id as any, userId: authReq.userId as any });
    if (!deleted) {
      return res.status(404).json({ error: "Course not found." });
    }
    // Delete associated logs
    await AttendanceLogModel.deleteMany({ subjectId: id, userId: authReq.userId as any });

    res.json({ message: "Course removed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quick 1-Tap Attendance Modifier on Subject Card (Spam-Proof: 1 per day)
app.post("/api/subjects/:id/quick", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { action } = req.body; // "present" | "absent"

    if (action !== "present" && action !== "absent") {
      return res.status(400).json({ error: "Invalid action." });
    }

    const sub = await SubjectModel.findOne({ _id: id as any, userId: authReq.userId as any });
    if (!sub) return res.status(404).json({ error: "Course not found." });

    const todayStr = new Date().toISOString().split("T")[0]!;

    // Check if attendance already recorded for today
    let existingLog = await AttendanceLogModel.findOne({
      userId: authReq.userId as any,
      subjectId: sub._id.toString(),
      date: todayStr,
    });

    if (existingLog) {
      if (existingLog.status === action) {
        // User spam-clicked the same action: do NOT double-increment!
        return res.json({
          subject: sub.toJSON(),
          log: existingLog.toJSON(),
          alreadyLogged: true,
          message: `Already marked as ${action} for today!`,
        });
      }

      // User changed status for today (e.g. absent -> present)
      const oldStatus = existingLog.status;
      if (oldStatus === "present") {
        sub.attended = Math.max(0, sub.attended - 1);
        sub.total = Math.max(0, sub.total - 1);
      } else if (oldStatus === "absent") {
        sub.total = Math.max(0, sub.total - 1);
      }

      if (action === "present") {
        sub.attended += 1;
        sub.total += 1;
      } else if (action === "absent") {
        sub.total += 1;
      }
      sub.updatedAt = new Date();
      await sub.save();

      existingLog.status = action;
      existingLog.note = `Changed from ${oldStatus} to ${action}`;
      await existingLog.save();

      return res.json({
        subject: sub.toJSON(),
        log: existingLog.toJSON(),
        message: `Updated today's status to ${action}.`,
      });
    }

    // First time logging for today
    if (action === "present") {
      sub.attended += 1;
      sub.total += 1;
    } else {
      sub.total += 1;
    }
    sub.updatedAt = new Date();
    await sub.save();

    const log = new AttendanceLogModel({
      userId: authReq.userId as any,
      subjectId: sub._id.toString(),
      subjectName: sub.name,
      date: todayStr,
      status: action,
      note: action === "present" ? "1-tap quick present" : "1-tap quick absent",
    });
    await log.save();

    res.json({ subject: sub.toJSON(), log: log.toJSON() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ATTENDANCE LOGS (MongoDB Backed - 1 Per Day Enforced)
// ==========================================

// Get Attendance Logs
app.get("/api/attendance", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { date } = req.query;
    const filter: any = { userId: authReq.userId };
    if (date) filter.date = String(date);

    const logs = await AttendanceLogModel.find(filter).sort({ createdAt: -1 });
    res.json(logs.map((l) => l.toJSON()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add or Update Attendance Log for a Subject on a specific Date
app.post("/api/attendance", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { subjectId, subjectName, date, status, note } = req.body;
    if (!subjectId || !date || !status) {
      return res.status(400).json({ error: "Subject, date, and status are required." });
    }

    const sub = await SubjectModel.findOne({ _id: subjectId as any, userId: authReq.userId as any });
    if (!sub) return res.status(404).json({ error: "Course not found." });

    // Check if an entry already exists for this subject on this date
    let existingLog = await AttendanceLogModel.findOne({
      userId: authReq.userId as any,
      subjectId: String(subjectId),
      date: String(date),
    });

    if (existingLog) {
      if (existingLog.status === status) {
        // Spam protection: exactly the same status, no change to count
        return res.json({
          log: existingLog.toJSON(),
          subject: sub.toJSON(),
          alreadyLogged: true,
          message: `Attendance is already recorded as ${status} for ${date}.`,
        });
      }

      // Revert previous status
      const oldStatus = existingLog.status;
      if (oldStatus === "present") {
        sub.attended = Math.max(0, sub.attended - 1);
        sub.total = Math.max(0, sub.total - 1);
      } else if (oldStatus === "absent") {
        sub.total = Math.max(0, sub.total - 1);
      }

      // Apply new status
      if (status === "present") {
        sub.attended += 1;
        sub.total += 1;
      } else if (status === "absent") {
        sub.total += 1;
      } // If "cancelled", no increment added to attended or total

      sub.updatedAt = new Date();
      await sub.save();

      existingLog.status = status;
      existingLog.note = note || `Changed from ${oldStatus} to ${status}`;
      await existingLog.save();

      return res.json({
        log: existingLog.toJSON(),
        subject: sub.toJSON(),
        message: `Updated status from ${oldStatus} to ${status} for ${date}.`,
      });
    }

    // New log for this date
    if (status === "present") {
      sub.attended += 1;
      sub.total += 1;
    } else if (status === "absent") {
      sub.total += 1;
    }
    sub.updatedAt = new Date();
    await sub.save();

    const log = new AttendanceLogModel({
      userId: authReq.userId as any,
      subjectId: String(subjectId),
      subjectName: subjectName || sub.name,
      date: String(date),
      status,
      note: note || "",
    });
    await log.save();

    res.status(201).json({
      log: log.toJSON(),
      subject: sub.toJSON(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Mark All Present for a Given Date (Spam-Proof)
app.post("/api/attendance/batch", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "Date is required." });

    const subjects = await SubjectModel.find({ userId: authReq.userId as any });
    if (subjects.length === 0) {
      return res.status(400).json({ error: "No enrolled courses to mark." });
    }

    const updatedLogs = [];
    for (const sub of subjects) {
      const existingLog = await AttendanceLogModel.findOne({
        userId: authReq.userId as any,
        subjectId: sub._id.toString(),
        date: String(date),
      });

      if (existingLog) {
        if (existingLog.status === "present") {
          // Already present for this date, keep as is
          updatedLogs.push(existingLog.toJSON());
          continue;
        }

        // Was absent or cancelled, transition to present
        const oldStatus = existingLog.status;
        if (oldStatus === "absent") {
          sub.total = Math.max(0, sub.total - 1);
        }
        sub.attended += 1;
        sub.total += 1;
        sub.updatedAt = new Date();
        await sub.save();

        existingLog.status = "present";
        existingLog.note = "Batch marked present";
        await existingLog.save();
        updatedLogs.push(existingLog.toJSON());
      } else {
        // New present log
        sub.attended += 1;
        sub.total += 1;
        sub.updatedAt = new Date();
        await sub.save();

        const log = new AttendanceLogModel({
          userId: authReq.userId as any,
          subjectId: sub._id.toString(),
          subjectName: sub.name,
          date: String(date),
          status: "present",
          note: "Batch 100% attendance logged",
        });
        await log.save();
        updatedLogs.push(log.toJSON());
      }
    }

    const updatedSubjects = await SubjectModel.find({ userId: authReq.userId as any }).sort({ name: 1 });
    res.json({
      message: "All courses marked present for " + date + "!",
      logs: updatedLogs,
      subjects: updatedSubjects.map((s) => s.toJSON()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Attendance Log & Rollback Counts
app.delete("/api/attendance/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = String(req.params.id);
    const log = await AttendanceLogModel.findOneAndDelete({ _id: id as any, userId: authReq.userId as any });
    if (!log) {
      return res.status(404).json({ error: "Log entry not found." });
    }

    // Rollback subject counter
    if (log.status === "present" || log.status === "absent") {
      const sub = await SubjectModel.findOne({ _id: log.subjectId as any, userId: authReq.userId as any });
      if (sub) {
        if (log.status === "present") {
          sub.attended = Math.max(0, sub.attended - 1);
          sub.total = Math.max(0, sub.total - 1);
        } else if (log.status === "absent") {
          sub.total = Math.max(0, sub.total - 1);
        }
        sub.updatedAt = new Date();
        await sub.save();
      }
    }

    res.json({ message: "Attendance log reverted." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. USER SCHEDULE & WORKING DAYS
// ==========================================

// Get Schedule Config
app.get("/api/schedule", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    let schedule = await UserScheduleModel.findOne({ userId: authReq.userId as any });
    if (!schedule) {
      schedule = new UserScheduleModel({
        userId: authReq.userId as any,
        activeDays: [1, 2, 3, 4, 5, 6],
        globalTarget: 75,
        customHolidays: [],
      });
      await schedule.save();
    }
    res.json(schedule.toJSON());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Schedule Config
app.put("/api/schedule", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { activeDays, globalTarget, customHolidays } = req.body;
    let schedule = await UserScheduleModel.findOne({ userId: authReq.userId as any });
    if (!schedule) {
      schedule = new UserScheduleModel({ userId: authReq.userId as any });
    }

    if (Array.isArray(activeDays)) schedule.activeDays = activeDays;
    if (typeof globalTarget === "number") schedule.globalTarget = globalTarget;
    if (Array.isArray(customHolidays)) schedule.customHolidays = customHolidays;
    schedule.updatedAt = new Date();

    await schedule.save();
    res.json(schedule.toJSON());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. PULSE SCHEDULER ENDPOINTS (@pulsecron/pulse)
// ==========================================

// Get Pulse Scheduler Status
app.get("/api/scheduler/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const jobs = await pulse.jobs({ name: "daily_5pm_attendance_increment" });
    res.json({
      active: true,
      scheduler: "@pulsecron/pulse",
      configuredTime: "17:00 (5:00 PM) Daily",
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
    res.status(500).json({ error: err.message });
  }
});

// Manually Trigger Daily Attendance Increment
app.post("/api/scheduler/run-now", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await executeDailyAttendanceIncrement(new Date(), true);
    res.json({
      success: true,
      result,
      message: "Pulse daily attendance increment executed successfully!",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manually Trigger 11:30 PM Auto-Absent Fallback
app.post("/api/scheduler/run-auto-absent", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await executeDailyAutoAbsentFallback(new Date());
    res.json({
      success: true,
      result,
      message: "Pulse 11:30 PM auto-absent fallback executed successfully!",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`BunkPulse Server is running on http://localhost:${PORT}`);
});

server.once("listening", async () => {
  console.log("Connecting to MongoDB Atlas...");
  await connectToMongo();
  await initPulseScheduler();
});
