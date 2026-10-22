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
    professor: s.faculty || "",
    room: s.room || "",
    color: s.color || "#6366f1",
    targetPercentage: s.targetPercentage && s.targetPercentage > 0 ? s.targetPercentage : 75,
    attended: Math.max(0, s.attended || 0),
    total: Math.max(0, s.total || 0),
    workingDays: Array.isArray(s.workingDays) ? s.workingDays : [1, 2, 3, 4, 5, 6],
    startDate: s.startDate || new Date().toISOString().split("T")[0],
    lastAutoIncrementDate: s.lastAutoIncrementDate || "",
    lectureTime: s.lectureTime || "",
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
    console.error("[GET /api/subjects] Error:", err);
    return NextResponse.json({ error: "Failed to fetch subjects." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json().catch(() => ({}));
    const {
      code,
      name,
      faculty,
      professor,
      room,
      color,
      targetPercentage,
      attended,
      total,
      workingDays,
      startDate,
      lectureTime,
    } = body ?? {};

    if (typeof code !== "string" || typeof name !== "string" || !code.trim() || !name.trim()) {
      return NextResponse.json({ error: "Course code and name are required." }, { status: 400 });
    }

    const rawAttended = attended !== undefined && attended !== null ? Number(attended) : 0;
    const rawTotal = total !== undefined && total !== null ? Number(total) : 0;
    const attendedVal = Number.isFinite(rawAttended) ? Math.max(0, Math.round(rawAttended)) : 0;
    const totalVal = Number.isFinite(rawTotal) ? Math.max(0, Math.round(rawTotal)) : 0;

    if (attendedVal > totalVal) {
      return NextResponse.json(
        { error: "Attended classes cannot exceed total classes." },
        { status: 400 }
      );
    }

    const rawTarget = targetPercentage !== undefined && targetPercentage !== null ? Number(targetPercentage) : 75;
    const targetVal = Number.isFinite(rawTarget) && rawTarget > 0
      ? Math.min(100, Math.max(1, Math.round(rawTarget)))
      : 75;

    const rawFaculty = typeof faculty === "string" ? faculty : typeof professor === "string" ? professor : "";
    const validWorkingDays = Array.isArray(workingDays)
      ? workingDays.map((d: any) => Number(d)).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
      : [1, 2, 3, 4, 5, 6];

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const startDateVal =
      typeof startDate === "string" && dateRegex.test(startDate.trim())
        ? startDate.trim()
        : new Date().toISOString().split("T")[0]!;

    const cleanLectureTime = typeof lectureTime === "string" ? lectureTime.trim().slice(0, 10) : "";

    const sub = new SubjectModel({
      userId: user._id,
      code: code.trim().slice(0, 30),
      name: name.trim().slice(0, 120),
      faculty: rawFaculty.trim().slice(0, 100),
      room: typeof room === "string" ? room.trim().slice(0, 50) : "",
      color: typeof color === "string" && color.trim() ? color.trim().slice(0, 20) : "#6366f1",
      targetPercentage: targetVal,
      attended: attendedVal,
      total: totalVal,
      workingDays: validWorkingDays.length > 0 ? validWorkingDays : [1, 2, 3, 4, 5, 6],
      startDate: startDateVal,
      lastAutoIncrementDate: "",
      lectureTime: cleanLectureTime,
    });

    await sub.save();
    return NextResponse.json(formatSubject(sub), { status: 201 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[POST /api/subjects] Error:", err);
    return NextResponse.json({ error: "Failed to create subject." }, { status: 500 });
  }
}
