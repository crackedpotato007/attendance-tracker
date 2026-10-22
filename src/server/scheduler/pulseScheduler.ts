import { Pulse } from "@pulsecron/pulse";
import mongoose from "mongoose";
import { mongoURI } from "../mongo";
import { SubjectModel } from "../models/Subject";
import { UserScheduleModel } from "../models/UserSchedule";
import { AttendanceLogModel } from "../models/AttendanceLog";

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
 * When targetUserId is supplied, runs ONLY for that specific student.
 * If targetUserId is omitted, runs globally for all users (server cron mode).
 */
export async function executeDailyAttendanceIncrement(
  targetDate: Date = new Date(),
  force: boolean = false,
  targetUserId?: string
): Promise<{ updatedCount: number; message: string; date: string }> {
  const parts = targetDate.toISOString().split("T");
  const dateStr: string = parts[0] || new Date().toISOString().slice(0, 10);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // 1. Fetch courses in MongoDB (scoped if targetUserId provided)
  const subjectQuery: any = targetUserId ? { userId: targetUserId } : {};
  const subjects = await SubjectModel.find(subjectQuery);

  // 2. Fetch user schedules for custom holiday and working days settings
  const scheduleQuery: any = targetUserId ? { userId: targetUserId } : {};
  const schedules = await UserScheduleModel.find(scheduleQuery);
  const scheduleMap = new Map<string, any>();
  schedules.forEach((s) => scheduleMap.set(s.userId.toString(), s));

  // 3. Fetch existing logs for today to avoid double-counting if student already logged
  const logQuery: any = { date: dateStr };
  if (targetUserId) logQuery.userId = targetUserId;
  const existingLogsToday = await AttendanceLogModel.find(logQuery);
  const loggedSet = new Set(
    existingLogsToday.map((l) => `${l.userId.toString()}__${l.subjectId}`)
  );

  let updatedCount = 0;

  for (const sub of subjects) {
    const key = `${sub.userId.toString()}__${sub._id.toString()}`;

    // If student already has a log recorded for today, mark autoIncrementDate and do not double count
    if (loggedSet.has(key)) {
      if (sub.lastAutoIncrementDate !== dateStr) {
        sub.lastAutoIncrementDate = dateStr;
        sub.updatedAt = new Date();
        await sub.save();
      }
      continue;
    }

    const userSched = scheduleMap.get(sub.userId.toString());

    // Determine whether this course is eligible to meet today
    const isFutureStart = Boolean(sub.startDate && sub.startDate > dateStr);
    const workingDays =
      sub.workingDays && sub.workingDays.length > 0
        ? sub.workingDays
        : [1, 2, 3, 4, 5, 6];
    const isCourseWorkingDay = workingDays.includes(dayOfWeek);
    const isGlobalWorkingDay =
      !userSched || !Array.isArray(userSched.activeDays) || userSched.activeDays.includes(dayOfWeek);
    const isHoliday =
      userSched &&
      Array.isArray(userSched.customHolidays) &&
      userSched.customHolidays.some((h: any) => {
        const s = h.startDate || h.date;
        const e = h.endDate || h.date || h.startDate;
        if (!s) return false;
        return dateStr >= s && dateStr <= (e || s);
      });

    const shouldMeetToday = !isFutureStart && isCourseWorkingDay && isGlobalWorkingDay && !isHoliday;

    // If it was already auto-incremented today, but the user subsequently added a holiday
    // or disabled today's working day, roll back the auto-increment!
    if (sub.lastAutoIncrementDate === dateStr) {
      if (!shouldMeetToday) {
        sub.total = Math.max(0, (sub.total || 0) - 1);
        sub.attended = Math.min(sub.attended || 0, sub.total);
        sub.lastAutoIncrementDate = "";
        sub.updatedAt = new Date();
        await sub.save();
      } else if (force) {
        sub.total = (sub.total || 0) + 1;
        sub.updatedAt = new Date();
        await sub.save();
        updatedCount++;
      }
      continue;
    }

    if (!shouldMeetToday) {
      continue;
    }

    // Increment total count by 1
    sub.total = (sub.total || 0) + 1;
    sub.lastAutoIncrementDate = dateStr;
    sub.updatedAt = new Date();
    
    await sub.save();
    updatedCount++;
  }

  console.log(
    `[@pulsecron/pulse] 🕒 5:00 PM Job completed: +1 appended to ${updatedCount} scheduled courses for ${dateStr}${targetUserId ? ` (user: ${targetUserId})` : ""}.`
  );

  return {
    updatedCount,
    message: `Successfully appended +1 to ${updatedCount} scheduled courses for ${dateStr}.`,
    date: dateStr,
  };
}

/**
 * 2. Daily 11:30 PM Auto-Absent Fallback Scan
 * When targetUserId is supplied, runs ONLY for that specific student.
 * If targetUserId is omitted, runs globally for all users (server cron mode).
 */
export async function executeDailyAutoAbsentFallback(
  targetDate: Date = new Date(),
  targetUserId?: string
): Promise<{ autoAbsentCount: number; message: string; date: string }> {
  const parts = targetDate.toISOString().split("T");
  const dateStr: string = parts[0] || new Date().toISOString().slice(0, 10);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // 1. Fetch courses in MongoDB
  const subjectQuery: any = targetUserId ? { userId: targetUserId } : {};
  const subjects = await SubjectModel.find(subjectQuery);

  // 2. Fetch user schedules
  const scheduleQuery: any = targetUserId ? { userId: targetUserId } : {};
  const schedules = await UserScheduleModel.find(scheduleQuery);
  const scheduleMap = new Map<string, any>();
  schedules.forEach((s) => scheduleMap.set(s.userId.toString(), s));

  // 3. Fetch all attendance logs already recorded for today
  const logQuery: any = { date: dateStr };
  if (targetUserId) logQuery.userId = targetUserId;
  const existingLogsToday = await AttendanceLogModel.find(logQuery);
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

    // Check custom university holidays / fests and global activeDays
    const userSched = scheduleMap.get(sub.userId.toString());
    if (userSched) {
      if (Array.isArray(userSched.activeDays) && !userSched.activeDays.includes(dayOfWeek)) {
        continue;
      }
      if (Array.isArray(userSched.customHolidays)) {
        const isHoliday = userSched.customHolidays.some((h: any) => {
          const s = h.startDate || h.date;
          const e = h.endDate || h.date || h.startDate;
          if (!s) return false;
          return dateStr >= s && dateStr <= (e || s);
        });
        if (isHoliday) {
          continue; // Holiday / fest, skip
        }
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
    `[@pulsecron/pulse] 🌙 11:30 PM Auto-Absent Job completed: ${autoAbsentCount} unmarked classes recorded as Absent for ${dateStr}${targetUserId ? ` (user: ${targetUserId})` : ""}.`
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
