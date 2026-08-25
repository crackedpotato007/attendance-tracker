import type { ActionFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
import { SubjectModel } from "../../server/models/Subject.js";
import { AttendanceLogModel } from "../../server/models/AttendanceLog.js";
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

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();
    const id = params.id;

    const body = await request.json();
    const { action: logAction } = body; // "present" | "absent"

    const sub = await SubjectModel.findOne({ _id: id as any, userId: user._id as any });
    if (!sub) {
      return new Response(JSON.stringify({ error: "Subject not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0]!;

    // Check if an attendance log already exists for this subject on today's date
    const existingLog = await AttendanceLogModel.findOne({
      userId: user._id as any,
      subjectId: id,
      date: todayStr,
    });

    if (existingLog) {
      if (existingLog.status === logAction) {
        return new Response(
          JSON.stringify({
            alreadyLogged: true,
            subject: formatSubject(sub),
            log: existingLog.toJSON(),
            message: `Already marked as ${logAction} for today!`,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Transition from absent -> present
      if (existingLog.status === "absent" && logAction === "present") {
        sub.attended += 1;
      } else if (existingLog.status === "present" && logAction === "absent") {
        sub.attended = Math.max(0, sub.attended - 1);
      } else if (existingLog.status === "cancelled") {
        if (logAction === "present") {
          sub.attended += 1;
          sub.total += 1;
        } else if (logAction === "absent") {
          sub.total += 1;
        }
      }

      sub.updatedAt = new Date();
      await sub.save();

      existingLog.status = logAction;
      existingLog.note = `Changed to ${logAction} via Quick Log`;
      await existingLog.save();

      return new Response(
        JSON.stringify({
          subject: formatSubject(sub),
          log: existingLog.toJSON(),
          message: `Updated to ${logAction} for today!`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // New log for today
    if (logAction === "present") {
      sub.attended += 1;
      sub.total += 1;
    } else if (logAction === "absent") {
      sub.total += 1;
    }

    sub.updatedAt = new Date();
    await sub.save();

    const newLog = new AttendanceLogModel({
      userId: user._id,
      subjectId: id,
      subjectName: sub.name,
      date: todayStr,
      status: logAction,
      note: logAction === "present" ? "Quick logged: Attended" : "Quick logged: Missed",
    });
    await newLog.save();

    return new Response(
      JSON.stringify({
        subject: formatSubject(sub),
        log: newLog.toJSON(),
        message: `Marked as ${logAction} for today!`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
