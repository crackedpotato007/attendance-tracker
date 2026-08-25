import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
import { AttendanceLogModel } from "../../server/models/AttendanceLog.js";
import { SubjectModel } from "../../server/models/Subject.js";
import { requireAuth } from "../../server/auth.js";

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

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");

    const query: any = { userId: user._id as any };
    if (dateParam) {
      query.date = String(dateParam);
    }

    const logs = await AttendanceLogModel.find(query).sort({ date: -1, createdAt: -1 });
    return new Response(JSON.stringify(logs.map(formatLog)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json();
    const { subjectId, subjectName, date, status, note } = body;

    if (!subjectId || !date || !status) {
      return new Response(
        JSON.stringify({ error: "subjectId, date, and status are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sub = await SubjectModel.findOne({
      _id: subjectId as any,
      userId: user._id as any,
    });

    if (!sub) {
      return new Response(JSON.stringify({ error: "Subject not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
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
        return new Response(
          JSON.stringify({
            log: formatLog(existingLog),
            subject: formatSubject(sub),
            alreadyLogged: true,
            message: `Already marked as ${status} for ${date}.`,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
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

      return new Response(
        JSON.stringify({
          log: formatLog(existingLog),
          subject: formatSubject(sub),
          message: `Updated status from ${oldStatus} to ${status} for ${date}.`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
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

    return new Response(
      JSON.stringify({
        log: formatLog(newLog),
        subject: formatSubject(sub),
        message: `Marked ${status} for ${date}.`,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
