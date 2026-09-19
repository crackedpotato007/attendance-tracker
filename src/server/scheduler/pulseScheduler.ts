import { Pulse } from "@pulsecron/pulse";
import mongoose from "mongoose";
import { SubjectModel } from "../models/Subject";
import { UserScheduleModel } from "../models/UserSchedule";
import { AttendanceLogModel } from "../models/AttendanceLog";

const mongoURI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:drskm1974@cluster0.m90cb.mongodb.net/attendance-tracker?appName=Cluster0";

// Instantiate Pulse without immediate raw connection
export const pulse = new Pulse({
  defaultConcurrency: 5,
  maxConcurrency: 10,
});

const DAILY_5PM_JOB = "daily_5pm_attendance_increment";
const DAILY_1130PM_JOB = "daily_1130pm_auto_absent_fallback";

let isSchedulerInitialized = false;

/**
 * 1. Daily 5:00 PM Attendance Auto-Increment Scan
 * Runs across all users and courses in MongoDB.
 * If today's day-of-week is in subject.workingDays AND today is not a holiday,
 * appends +1 to subject.total and records lastAutoIncrementDate.
 */
export async function executeDailyAttendanceIncrement(
  targetDate: Date = new Date(),
  force: boolean = false
): Promise<{ updatedCount: number; message: string; date: string }> {
  const parts = targetDate.toISOString().split("T");
  const dateStr: string = parts[0] || new Date().toISOString().slice(0, 10);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // 1. Fetch all courses in MongoDB
  const subjects = await SubjectModel.find({});

  // 2. Fetch all user schedules for custom holiday and working days settings
  const schedules = await UserScheduleModel.find({});
  const scheduleMap = new Map<string, any>();
  schedules.forEach((s) => scheduleMap.set(s.userId.toString(), s));

  let updatedCount = 0;

  for (const sub of subjects) {
    // If already processed for today, skip unless forced
    if (!force && sub.lastAutoIncrementDate === dateStr) {
      continue;
    }

    // Check if start date is in the future
    if (sub.startDate && sub.startDate > dateStr) {
      continue;
    }

    // Check if today is a scheduled lecture day for this course
    const workingDays =
      sub.workingDays && sub.workingDays.length > 0
        ? sub.workingDays
        : [1, 2, 3, 4, 5, 6];

    if (!workingDays.includes(dayOfWeek)) {
      continue; // Course does not meet on this day
    }

    // Check if today is marked as a custom holiday for this student
    const userSched = scheduleMap.get(sub.userId.toString());
    if (userSched && Array.isArray(userSched.customHolidays)) {
      const isHoliday = userSched.customHolidays.some(
        (h: any) => h.date === dateStr
      );
      if (isHoliday) {
        continue; // University holiday, skip
      }
    }

    // Increment total count by 1
    sub.total = (sub.total || 0) + 1;
    sub.lastAutoIncrementDate = dateStr;
    sub.updatedAt = new Date();
    
    await sub.save();
    updatedCount++;
  }

  console.log(
    `[@pulsecron/pulse] 🕒 5:00 PM Job completed: +1 appended to ${updatedCount} scheduled courses for ${dateStr}.`
  );

  return {
    updatedCount,
    message: `Successfully appended +1 to ${updatedCount} scheduled courses for ${dateStr}.`,
    date: dateStr,
  };
}

/**
 * 2. Daily 11:30 PM Auto-Absent Fallback Scan
 * If a student had a scheduled class today and did not log anything by 11:30 PM,
 * auto-assumes Absent and creates an AttendanceLog so the ledger is complete.
 */
export async function executeDailyAutoAbsentFallback(
  targetDate: Date = new Date()
): Promise<{ autoAbsentCount: number; message: string; date: string }> {
  const parts = targetDate.toISOString().split("T");
  const dateStr: string = parts[0] || new Date().toISOString().slice(0, 10);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // 1. Fetch all courses in MongoDB
  const subjects = await SubjectModel.find({});

  // 2. Fetch all user schedules
  const schedules = await UserScheduleModel.find({});
  const scheduleMap = new Map<string, any>();
  schedules.forEach((s) => scheduleMap.set(s.userId.toString(), s));

  // 3. Fetch all attendance logs already recorded for today
  const existingLogsToday = await AttendanceLogModel.find({ date: dateStr });
  const loggedSet = new Set(
    existingLogsToday.map((l) => `${l.userId.toString()}__${l.subjectId}`)
  );

  let autoAbsentCount = 0;

  for (const sub of subjects) {
    const key = `${sub.userId.toString()}__${sub._id.toString()}`;
    // If student already logged this class (present, absent, or cancelled), skip!
    if (loggedSet.has(key)) {
      continue;
    }

    // Check if start date is in the future
    if (sub.startDate && sub.startDate > dateStr) {
      continue;
    }

    // Check if today was a scheduled lecture day
    const workingDays =
      sub.workingDays && sub.workingDays.length > 0
        ? sub.workingDays
        : [1, 2, 3, 4, 5, 6];

    if (!workingDays.includes(dayOfWeek)) {
      continue; // No class was scheduled today
    }

    // Check custom university holidays
    const userSched = scheduleMap.get(sub.userId.toString());
    if (userSched && Array.isArray(userSched.customHolidays)) {
      const isHoliday = userSched.customHolidays.some(
        (h: any) => h.date === dateStr
      );
      if (isHoliday) {
        continue; // Holiday, skip
      }
    }

    // Auto-create Absent log
    const autoLog = new AttendanceLogModel({
      userId: sub.userId,
      subjectId: sub._id.toString(),
      subjectName: sub.name,
      date: dateStr,
      status: "absent",
      note: "Auto-assumed absent at 11:30 PM (unmarked lecture)",
    });
    await autoLog.save();

    // If 5:00 PM auto-increment did NOT run for this subject today, increment total +1
    if (sub.lastAutoIncrementDate !== dateStr) {
      sub.total = (sub.total || 0) + 1;
      sub.lastAutoIncrementDate = dateStr;
      sub.updatedAt = new Date();
      await sub.save();
    }

    autoAbsentCount++;
  }

  console.log(
    `[@pulsecron/pulse] 🌙 11:30 PM Auto-Absent Job completed: ${autoAbsentCount} unmarked classes recorded as Absent for ${dateStr}.`
  );

  return {
    autoAbsentCount,
    message: `Recorded ${autoAbsentCount} unmarked classes as Absent for ${dateStr}.`,
    date: dateStr,
  };
}

/**
 * Initialize Pulse MongoDB Job Scheduler
 */
export async function initPulseScheduler() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return;
  }
  if (isSchedulerInitialized) return;
  isSchedulerInitialized = true;

  try {
    console.log("[@pulsecron/pulse] Initializing Pulse MongoDB Scheduler in SSR Server...");

    // Share active Mongoose database connection directly
    if (mongoose.connection && mongoose.connection.db) {
      pulse.mongo(mongoose.connection.db as any, "pulseJobs");
    } else {
      pulse.database(mongoURI, "pulseJobs");
    }

    // 1. Define the 5:00 PM Attendance Auto-Increment Job
    pulse.define(DAILY_5PM_JOB, async (_job: any) => {
      console.log("[@pulsecron/pulse] Executing scheduled daily 5:00 PM attendance increment job...");
      try {
        await executeDailyAttendanceIncrement(new Date());
      } catch (err) {
        console.error("[@pulsecron/pulse] Error during 5:00 PM job execution:", err);
      }
    });

    // 2. Define the 11:30 PM Auto-Absent Fallback Job
    pulse.define(DAILY_1130PM_JOB, async (_job: any) => {
      console.log("[@pulsecron/pulse] Executing scheduled daily 11:30 PM auto-absent job...");
      try {
        await executeDailyAutoAbsentFallback(new Date());
      } catch (err) {
        console.error("[@pulsecron/pulse] Error during 11:30 PM job execution:", err);
      }
    });

    // Start the Pulse job queue processor
    await pulse.start();
    console.log("[@pulsecron/pulse] Pulse queue processor started in SSR Server.");

    // Schedule 5:00 PM Daily Job ("0 17 * * *")
    await pulse.every("0 17 * * *", DAILY_5PM_JOB);
    console.log("[@pulsecron/pulse] Scheduled 'daily_5pm_attendance_increment' at 17:00 (5:00 PM) daily.");

    // Schedule 11:30 PM Daily Auto-Absent Fallback ("30 23 * * *")
    await pulse.every("30 23 * * *", DAILY_1130PM_JOB);
    console.log("[@pulsecron/pulse] Scheduled 'daily_1130pm_auto_absent_fallback' at 23:30 (11:30 PM) daily.");

    // Run catch-up check if server booted after 5:00 PM today
    const now = new Date();
    if (now.getHours() >= 17) {
      console.log("[@pulsecron/pulse] Boot time is past 17:00 (5:00 PM). Running catch-up scan for today...");
      executeDailyAttendanceIncrement(now).catch((err) =>
        console.error("[@pulsecron/pulse] Catch-up error:", err)
      );
    }
  } catch (error) {
    console.warn("[@pulsecron/pulse] Pulse scheduler initialization notice:", error);
  }
}
