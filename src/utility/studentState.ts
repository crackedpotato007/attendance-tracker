import confetti from "canvas-confetti";

export interface Subject {
  id: string;
  name: string;
  code: string;
  attended: number;
  total: number;
  targetPercentage: number; // e.g. 75
  color: string;
  professor?: string;
  room?: string;
  credits?: number;
  workingDays?: number[]; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  startDate?: string; // YYYY-MM-DD (enrollment/tracking start date)
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  subjectName: string;
  status: "present" | "absent" | "cancelled";
  note?: string;
}

export interface WorkingDaysConfig {
  activeDays: number[]; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  globalTarget: number; // e.g. 75
  semesterStartDate?: string; // YYYY-MM-DD
  semesterEndDate?: string; // YYYY-MM-DD
  customHolidays: { date: string; name: string }[];
}

export interface SubjectStats {
  percentage: number;
  safeBunks: number;
  neededClasses: number;
  status: "safe" | "warning" | "critical";
  missed: number;
}

export const defaultWorkingDaysConfig: WorkingDaysConfig = {
  // Monday to Saturday are working days by default (1,2,3,4,5,6); Sunday (0) is off.
  activeDays: [1, 2, 3, 4, 5, 6],
  globalTarget: 75,
  semesterStartDate: "2026-07-15",
  semesterEndDate: "2026-12-15",
  customHolidays: [],
};

// No default dummy courses for new users
export const initialSubjects: Subject[] = [];

// No default dummy logs for new users
export const initialLogs: AttendanceRecord[] = [];

/**
 * Calculates scheduled lectures count from startDate up to a given date (default today)
 * based on selected working days and excluding custom holidays.
 */
export function calculateScheduledLecturesCount(
  startDateStr: string | undefined,
  workingDays: number[] | undefined,
  customHolidays: { date: string }[] = [],
  asOfDateStr?: string
): number {
  if (!startDateStr || !workingDays || workingDays.length === 0) return 0;

  const start = new Date(startDateStr);
  const end = asOfDateStr ? new Date(asOfDateStr) : new Date();

  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateFormatted = current.toISOString().split("T")[0];
    const isHoliday = customHolidays.some((h) => h.date === dateFormatted);

    if (workingDays.includes(dayOfWeek) && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Mathematical Calculation of Safe Bunks & Make-up classes
 */
export function calculateSubjectStats(
  attended: number,
  total: number,
  targetPercentage: number = 75
): SubjectStats {
  if (total <= 0) {
    return {
      percentage: 0,
      safeBunks: 0,
      neededClasses: 0,
      status: "safe",
      missed: 0,
    };
  }

  const percentage = (attended / total) * 100;
  const missed = Math.max(0, total - attended);
  const targetFraction = targetPercentage / 100;

  if (percentage >= targetPercentage) {
    const safeBunks = Math.floor((attended - targetFraction * total) / targetFraction);
    return {
      percentage: Number(percentage.toFixed(1)),
      safeBunks: Math.max(0, safeBunks),
      neededClasses: 0,
      status: percentage >= targetPercentage + 5 ? "safe" : "warning",
      missed,
    };
  } else {
    const needed = Math.ceil(
      (targetFraction * total - attended) / (1 - targetFraction)
    );
    return {
      percentage: Number(percentage.toFixed(1)),
      safeBunks: 0,
      neededClasses: Math.max(1, needed),
      status: percentage < 65 ? "critical" : "warning",
      missed,
    };
  }
}

/**
 * Overall Attendance Aggregates
 */
export function calculateOverallStats(
  subjects: Subject[],
  globalTarget: number = 75
) {
  if (!subjects || subjects.length === 0) {
    return {
      totalAttended: 0,
      totalClasses: 0,
      totalMissed: 0,
      overallPercentage: 0,
      dangerCount: 0,
      warningCount: 0,
      totalSafeBunks: 0,
      totalNeeded: 0,
      isAboveTarget: true,
    };
  }

  let totalAttended = 0;
  let totalClasses = 0;
  let dangerCount = 0;
  let warningCount = 0;
  let totalSafeBunks = 0;
  let totalNeeded = 0;

  subjects.forEach((sub) => {
    totalAttended += sub.attended;
    totalClasses += sub.total;
    const stats = calculateSubjectStats(
      sub.attended,
      sub.total,
      sub.targetPercentage || globalTarget
    );
    if (stats.status === "critical") dangerCount++;
    else if (stats.status === "warning") warningCount++;

    totalSafeBunks += stats.safeBunks;
    totalNeeded += stats.neededClasses;
  });

  const overallPercentage =
    totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

  return {
    totalAttended,
    totalClasses,
    totalMissed: Math.max(0, totalClasses - totalAttended),
    overallPercentage: Number(overallPercentage.toFixed(1)),
    dangerCount,
    warningCount,
    totalSafeBunks,
    totalNeeded,
    isAboveTarget: overallPercentage >= globalTarget,
  };
}

export function triggerConfettiBurst() {
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { y: 0.6 },
    colors: ["#4f46e5", "#059669", "#0284c7", "#f59e0b"],
  });
}
