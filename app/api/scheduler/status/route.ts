import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/server/auth";
import { connectToMongo } from "@/src/server/mongo";
import { SubjectModel } from "@/src/server/models/Subject";
import { AttendanceLogModel } from "@/src/server/models/AttendanceLog";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const todayStr = new Date().toISOString().split("T")[0]!;
    const dayOfWeek = new Date().getDay();

    const [userSubjects, todayLogs] = await Promise.all([
      SubjectModel.find({ userId: user._id as any }),
      AttendanceLogModel.find({ userId: user._id as any, date: todayStr }),
    ]);

    const scheduledToday = userSubjects.filter((s) =>
      (s.workingDays || [1, 2, 3, 4, 5, 6]).includes(dayOfWeek)
    );
    const loggedSubjectIds = new Set(todayLogs.map((l) => l.subjectId));

    return NextResponse.json({
      active: true,
      scheduler: "@pulsecron/pulse (Next.js)",
      configuredTime: "17:00 (5:00 PM) & 23:30 (11:30 PM) Daily",
      userSyncSummary: {
        totalCourses: userSubjects.length,
        scheduledToday: scheduledToday.length,
        loggedToday: todayLogs.length,
        unloggedToday: scheduledToday.filter(
          (s) => !loggedSubjectIds.has(s._id.toString())
        ).length,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
