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
    room: s.room || "",
    color: s.color || "#6366f1",
    targetPercentage: s.targetPercentage || 75,
    attended: s.attended || 0,
    total: s.total || 0,
    workingDays: s.workingDays || [1, 2, 3, 4, 5, 6],
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const query: any = { userId: user._id as any };
    if (dateParam) {
      query.date = String(dateParam);
    }

    const logs = await AttendanceLogModel.find(query).sort({ date: -1, createdAt: -1 });
    return NextResponse.json(logs.map(formatLog));
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json();
    const { subjectId, subjectName, date, status, note } = body;

    if (!subjectId || !date || !status) {
      return NextResponse.json(
        { error: "subjectId, date, and status are required." },
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

    // Check if an entry already exists for this subject on this date
    const existingLog = await AttendanceLogModel.findOne({
      userId: user._id as any,
      subjectId: String(subjectId),
      date: String(date),
    });

    if (existingLog) {
      const oldStatus = existingLog.status;
      if (oldStatus === status) {
        return NextResponse.json({
          log: formatLog(existingLog),
          subject: formatSubject(sub),
          alreadyLogged: true,
          message: `Already marked as ${status} for ${date}.`,
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

      sub.updatedAt = new Date();
      await sub.save();

      existingLog.status = status;
      existingLog.note = note || `Changed from ${oldStatus} to ${status}`;
      await existingLog.save();

      return NextResponse.json({
        log: formatLog(existingLog),
        subject: formatSubject(sub),
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

    const newLog = new AttendanceLogModel({
      userId: user._id,
      subjectId: String(subjectId),
      subjectName: subjectName || sub.name,
      date: String(date),
      status,
      note: note || (status === "present" ? "Attended lecture" : "Missed lecture"),
    });

    await newLog.save();

    return NextResponse.json(
      {
        log: formatLog(newLog),
        subject: formatSubject(sub),
        message: `Marked ${status} for ${date}.`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
