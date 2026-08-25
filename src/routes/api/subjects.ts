import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
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

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const subjects = await SubjectModel.find({ userId: user._id as any }).sort({ name: 1 });
    return new Response(JSON.stringify(subjects.map(formatSubject)), {
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
    const { code, name, faculty, room, color, targetPercentage, attended, total, workingDays, startDate } = body;

    if (!code || !name) {
      return new Response(JSON.stringify({ error: "Code and Name are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sub = new SubjectModel({
      userId: user._id,
      code: code.trim(),
      name: name.trim(),
      faculty: faculty?.trim() || "",
      room: room?.trim() || "",
      color: color || "#6366f1",
      targetPercentage: targetPercentage ? Number(targetPercentage) : 75,
      attended: attended ? Number(attended) : 0,
      total: total ? Number(total) : 0,
      workingDays: Array.isArray(workingDays) && workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5, 6],
      startDate: startDate || new Date().toISOString().split("T")[0],
      lastAutoIncrementDate: "",
    });

    await sub.save();
    return new Response(JSON.stringify(formatSubject(sub)), {
      status: 201,
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
