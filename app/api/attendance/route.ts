import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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

const VALID_STATUSES = new Set(["present", "absent", "cancelled"]);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const query: any = { userId: user._id as any };
    if (dateParam) {
      if (!DATE_REGEX.test(dateParam)) {
        return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
      }
      query.date = dateParam;
    }

    const logs = await AttendanceLogModel.find(query).sort({ date: -1, createdAt: -1 });
    return NextResponse.json(logs.map(formatLog));
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[GET /api/attendance] Error:", err);
    return NextResponse.json({ error: "Failed to fetch attendance logs." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json().catch(() => ({}));
    const { subjectId, subjectName, date, status, note } = body ?? {};

    if (typeof subjectId !== "string" || typeof date !== "string" || typeof status !== "string") {
      return NextResponse.json(
        { error: "subjectId, date, and status are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ error: "Invalid subjectId." }, { status: 400 });
    }

    const cleanDate = date.trim();
    if (!DATE_REGEX.test(cleanDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'present', 'absent', or 'cancelled'." },
        { status: 400 }
      );
    }

    const sub = await SubjectModel.findOne({
      _id: subjectId as any,
      userId: user._id as any,
    });

    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split("T")[0]!;

    // Check if an entry already exists for this subject on this date
    const existingLog = await AttendanceLogModel.findOne({
      userId: user._id as any,
      subjectId: String(subjectId),
      date: cleanDate,
    });

    if (existingLog) {
      const oldStatus = existingLog.status;
      if (oldStatus === status) {
        return NextResponse.json({
          log: formatLog(existingLog),
          subject: formatSubject(sub),
          alreadyLogged: true,
          message: `Already marked as ${status} for ${cleanDate}.`,
        });
      }

      // Revert previous effect
      if (oldStatus === "present") {
        sub.attended = Math.max(0, sub.attended - 1);
        sub.total = Math.max(0, sub.total - 1);
      } else if (oldStatus === "absent") {
        sub.total = Math.max(0, sub.total - 1);
      }

      // Apply new effect
      if (status === "present") {
        sub.attended += 1;
        sub.total += 1;
      } else if (status === "absent") {
        sub.total += 1;
      }

      sub.attended = Math.min(sub.attended, sub.total);
      sub.updatedAt = new Date();
      await sub.save();

      existingLog.status = status as "present" | "absent" | "cancelled";
      existingLog.note =
        typeof note === "string" && note.trim()
          ? note.trim().slice(0, 200)
          : `Changed from ${oldStatus} to ${status}`;
      await existingLog.save();

      return NextResponse.json({
        log: formatLog(existingLog),
        subject: formatSubject(sub),
        message: `Updated status from ${oldStatus} to ${status} for ${cleanDate}.`,
      });
    }

    // New log for this date:
    // If logging for today and 5:00 PM auto-increment already ran today,
    // sub.total was already incremented!
    const isToday = cleanDate === todayStr;
    const alreadyIncrementedByCron = isToday && sub.lastAutoIncrementDate === todayStr;

    if (alreadyIncrementedByCron) {
      if (status === "present") {
        sub.attended += 1;
      } else if (status === "cancelled") {
        sub.total = Math.max(0, sub.total - 1);
      }
    } else {
      if (status === "present") {
        sub.attended += 1;
        sub.total += 1;
      } else if (status === "absent") {
        sub.total += 1;
      }
      if (isToday) {
        sub.lastAutoIncrementDate = todayStr;
      }
    }

    sub.attended = Math.min(sub.attended, sub.total);
    sub.updatedAt = new Date();
    await sub.save();

    const defaultNote =
      status === "present"
        ? "Attended lecture"
        : status === "absent"
        ? "Missed lecture"
        : "Class cancelled";

    const newLog = new AttendanceLogModel({
      userId: user._id,
      subjectId: String(subjectId),
      subjectName: typeof subjectName === "string" && subjectName.trim() ? subjectName.trim() : sub.name,
      date: cleanDate,
      status: status as "present" | "absent" | "cancelled",
      note: typeof note === "string" && note.trim() ? note.trim().slice(0, 200) : defaultNote,
    });

    await newLog.save();

    return NextResponse.json(
      {
        log: formatLog(newLog),
        subject: formatSubject(sub),
        message: `Marked ${status} for ${cleanDate}.`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[POST /api/attendance] Error:", err);
    return NextResponse.json({ error: "Failed to log attendance." }, { status: 500 });
  }
}
