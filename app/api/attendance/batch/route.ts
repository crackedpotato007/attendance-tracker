import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { AttendanceLogModel } from "@/src/server/models/AttendanceLog";
import { SubjectModel } from "@/src/server/models/Subject";
import { requireAuth } from "@/src/server/auth";

function formatSubject(s: any) {
  return {
    id: s._id.toString(),
    code: s.code,
    name: s.name,
    faculty: s.faculty || "",
    professor: s.faculty || "",
    room: s.room || "",
    color: s.color || "#6366f1",
    targetPercentage: s.targetPercentage && s.targetPercentage > 0 ? s.targetPercentage : 75,
    attended: Math.max(0, s.attended || 0),
    total: Math.max(0, s.total || 0),
    workingDays: Array.isArray(s.workingDays) ? s.workingDays : [1, 2, 3, 4, 5, 6],
    startDate: s.startDate || new Date().toISOString().split("T")[0],
    lastAutoIncrementDate: s.lastAutoIncrementDate || "",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function formatLog(l: any) {
  return {
    id: l._id.toString(),
    subjectId: l.subjectId,
    subjectName: l.subjectName,
    date: l.date,
    status: l.status,
    note: l.note || "",
    createdAt: l.createdAt,
  };
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json().catch(() => ({}));
    const todayStr = new Date().toISOString().split("T")[0]!;
    const rawDate = typeof body?.date === "string" && body.date.trim() ? body.date.trim() : todayStr;

    if (!DATE_REGEX.test(rawDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const date = rawDate;
    const isToday = date === todayStr;

    const allSubjects = await SubjectModel.find({ userId: user._id as any });
    // Filter out subjects whose startDate is after the target date
    const activeSubjects = allSubjects.filter((s) => !s.startDate || s.startDate <= date);
    const subjectsToMark = activeSubjects.length > 0 ? activeSubjects : allSubjects;

    const updatedLogs = [];

    for (const sub of subjectsToMark) {
      const existingLog = await AttendanceLogModel.findOne({
        userId: user._id as any,
        subjectId: sub._id.toString(),
        date,
      });

      if (existingLog) {
        if (existingLog.status === "present") {
          updatedLogs.push(formatLog(existingLog));
          continue;
        }

        const oldStatus = existingLog.status;
        if (oldStatus === "absent") {
          sub.total = Math.max(0, sub.total - 1);
        }
        sub.attended += 1;
        sub.total += 1;
        sub.attended = Math.min(sub.attended, sub.total);
        sub.updatedAt = new Date();
        await sub.save();

        existingLog.status = "present";
        existingLog.note = "Batch marked present";
        await existingLog.save();
        updatedLogs.push(formatLog(existingLog));
      } else {
        const alreadyIncrementedByCron = isToday && sub.lastAutoIncrementDate === todayStr;
        sub.attended += 1;
        if (!alreadyIncrementedByCron) {
          sub.total += 1;
          if (isToday) {
            sub.lastAutoIncrementDate = todayStr;
          }
        }
        sub.attended = Math.min(sub.attended, sub.total);
        sub.updatedAt = new Date();
        await sub.save();

        const log = new AttendanceLogModel({
          userId: user._id,
          subjectId: sub._id.toString(),
          subjectName: sub.name,
          date,
          status: "present",
          note: "Batch 100% attendance logged",
        });
        await log.save();
        updatedLogs.push(formatLog(log));
      }
    }

    const updatedSubjects = await SubjectModel.find({ userId: user._id as any }).sort({ name: 1 });
    return NextResponse.json({
      message: `All courses marked present for ${date}!`,
      logs: updatedLogs,
      subjects: updatedSubjects.map(formatSubject),
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[POST /api/attendance/batch] Error:", err);
    return NextResponse.json({ error: "Failed to batch-mark attendance." }, { status: 500 });
  }
}
