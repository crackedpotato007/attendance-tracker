import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const subjects = await SubjectModel.find({ userId: user._id as any }).sort({ name: 1 });
    return NextResponse.json(subjects.map(formatSubject));
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
    const { code, name, faculty, room, color, targetPercentage, attended, total, workingDays, startDate } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and Name are required." }, { status: 400 });
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
    return NextResponse.json(formatSubject(sub), { status: 201 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
