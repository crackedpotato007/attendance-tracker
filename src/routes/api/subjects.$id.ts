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

    if (request.method === "PUT") {
      const body = await request.json();
      const sub = await SubjectModel.findOne({ _id: id as any, userId: user._id as any });
      if (!sub) {
        return new Response(JSON.stringify({ error: "Subject not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (body.code !== undefined) sub.code = body.code.trim();
      if (body.name !== undefined) sub.name = body.name.trim();
      if (body.faculty !== undefined) sub.faculty = body.faculty.trim();
      if (body.room !== undefined) sub.room = body.room.trim();
      if (body.color !== undefined) sub.color = body.color;
      if (body.targetPercentage !== undefined) sub.targetPercentage = Number(body.targetPercentage);
      if (body.attended !== undefined) sub.attended = Math.max(0, Number(body.attended));
      if (body.total !== undefined) sub.total = Math.max(0, Number(body.total));
      if (body.workingDays !== undefined) sub.workingDays = body.workingDays;
      if (body.startDate !== undefined) sub.startDate = body.startDate;
      if (body.lastAutoIncrementDate !== undefined) sub.lastAutoIncrementDate = body.lastAutoIncrementDate;

      sub.updatedAt = new Date();
      await sub.save();

      return new Response(JSON.stringify(formatSubject(sub)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE") {
      const sub = await SubjectModel.findOneAndDelete({ _id: id as any, userId: user._id as any });
      if (!sub) {
        return new Response(JSON.stringify({ error: "Subject not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Remove all logs for this subject
      await AttendanceLogModel.deleteMany({ subjectId: id, userId: user._id as any });

      return new Response(JSON.stringify({ message: "Course removed successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
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
