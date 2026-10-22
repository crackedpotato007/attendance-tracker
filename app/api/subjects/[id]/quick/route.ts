import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToMongo } from "@/src/server/mongo";
import { SubjectModel } from "@/src/server/models/Subject";
import { AttendanceLogModel } from "@/src/server/models/AttendanceLog";
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

const VALID_STATUSES = new Set(["present", "absent", "cancelled"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid subject ID." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { action: logAction } = body ?? {};

    if (typeof logAction !== "string" || !VALID_STATUSES.has(logAction)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'present', 'absent', or 'cancelled'." },
        { status: 400 }
      );
    }

    const sub = await SubjectModel.findOne({ _id: id as any, userId: user._id as any });
    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split("T")[0]!;

    // Check if an attendance log already exists for this subject on today's date
    const existingLog = await AttendanceLogModel.findOne({
      userId: user._id as any,
      subjectId: id,
      date: todayStr,
    });

    if (existingLog) {
      const oldStatus = existingLog.status;
      if (oldStatus === logAction) {
        return NextResponse.json({
          alreadyLogged: true,
          subject: formatSubject(sub),
          log: formatLog(existingLog),
          message: `Already marked as ${logAction} for today!`,
        });
      }

      // Revert old status effect
      if (oldStatus === "present") {
        sub.attended = Math.max(0, sub.attended - 1);
        sub.total = Math.max(0, sub.total - 1);
      } else if (oldStatus === "absent") {
        sub.total = Math.max(0, sub.total - 1);
      }

      // Apply new status effect
      if (logAction === "present") {
        sub.attended += 1;
        sub.total += 1;
      } else if (logAction === "absent") {
        sub.total += 1;
      }

      sub.attended = Math.min(sub.attended, sub.total);
      sub.updatedAt = new Date();
      await sub.save();

      existingLog.status = logAction as "present" | "absent" | "cancelled";
      existingLog.note = `Changed to ${logAction} via Quick Log`;
      await existingLog.save();

      return NextResponse.json({
        subject: formatSubject(sub),
        log: formatLog(existingLog),
        message: `Updated to ${logAction} for today!`,
      });
    }

    // New log for today:
    // If 5:00 PM auto-increment already ran today (sub.lastAutoIncrementDate === todayStr),
    // sub.total was already incremented, so don't increment sub.total a second time!
    const alreadyIncrementedByCron = sub.lastAutoIncrementDate === todayStr;

    if (alreadyIncrementedByCron) {
      if (logAction === "present") {
        sub.attended += 1;
      } else if (logAction === "cancelled") {
        sub.total = Math.max(0, sub.total - 1);
      }
    } else {
      if (logAction === "present") {
        sub.attended += 1;
        sub.total += 1;
      } else if (logAction === "absent") {
        sub.total += 1;
      }
      sub.lastAutoIncrementDate = todayStr;
    }

    sub.attended = Math.min(sub.attended, sub.total);
    sub.updatedAt = new Date();
    await sub.save();

    const newLog = new AttendanceLogModel({
      userId: user._id,
      subjectId: id,
      subjectName: sub.name,
      date: todayStr,
      status: logAction as "present" | "absent" | "cancelled",
      note:
        logAction === "present"
          ? "Quick logged: Attended"
          : logAction === "absent"
          ? "Quick logged: Missed"
          : "Quick logged: Cancelled",
    });
    await newLog.save();

    return NextResponse.json({
      subject: formatSubject(sub),
      log: formatLog(newLog),
      message: `Marked as ${logAction} for today!`,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[POST /api/subjects/[id]/quick] Error:", err);
    return NextResponse.json({ error: "Failed to quick-log attendance." }, { status: 500 });
  }
}
