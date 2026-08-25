import type { ActionFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
import { AttendanceLogModel } from "../../server/models/AttendanceLog.js";
import { SubjectModel } from "../../server/models/Subject.js";
import { requireAuth } from "../../server/auth.js";

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();
    const id = params.id;

    if (request.method === "DELETE") {
      const log = await AttendanceLogModel.findOneAndDelete({
        _id: id as any,
        userId: user._id as any,
      });

      if (!log) {
        return new Response(JSON.stringify({ error: "Log entry not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Rollback subject counter
      if (log.status === "present" || log.status === "absent") {
        const sub = await SubjectModel.findOne({
          _id: log.subjectId as any,
          userId: user._id as any,
        });
        if (sub) {
          if (log.status === "present") {
            sub.attended = Math.max(0, sub.attended - 1);
            sub.total = Math.max(0, sub.total - 1);
          } else if (log.status === "absent") {
            sub.total = Math.max(0, sub.total - 1);
          }
          sub.updatedAt = new Date();
          await sub.save();
        }
      }

      return new Response(JSON.stringify({ message: "Attendance log reverted." }), {
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
