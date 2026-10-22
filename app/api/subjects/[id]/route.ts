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
    lectureTime: s.lectureTime || "",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function PUT(
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
    const sub = await SubjectModel.findOne({ _id: id as any, userId: user._id as any });
    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    if (typeof body.code === "string" && body.code.trim()) {
      sub.code = body.code.trim().slice(0, 30);
    }
    if (typeof body.name === "string" && body.name.trim()) {
      sub.name = body.name.trim().slice(0, 120);
    }
    if (typeof body.faculty === "string") {
      sub.faculty = body.faculty.trim().slice(0, 100);
    } else if (typeof body.professor === "string") {
      sub.faculty = body.professor.trim().slice(0, 100);
    }
    if (typeof body.room === "string") {
      sub.room = body.room.trim().slice(0, 50);
    }
    if (typeof body.color === "string" && body.color.trim()) {
      sub.color = body.color.trim().slice(0, 20);
    }
    if (body.targetPercentage !== undefined && body.targetPercentage !== null) {
      const parsedTarget = Number(body.targetPercentage);
      if (Number.isFinite(parsedTarget) && parsedTarget > 0) {
        sub.targetPercentage = Math.min(100, Math.max(1, Math.round(parsedTarget)));
      }
    }
    if (body.attended !== undefined && body.attended !== null) {
      const parsedAttended = Number(body.attended);
      if (Number.isFinite(parsedAttended)) {
        sub.attended = Math.max(0, Math.round(parsedAttended));
      }
    }
    if (body.total !== undefined && body.total !== null) {
      const parsedTotal = Number(body.total);
      if (Number.isFinite(parsedTotal)) {
        sub.total = Math.max(0, Math.round(parsedTotal));
      }
    }
    if (sub.attended > sub.total) {
      return NextResponse.json(
        { error: "Attended classes cannot exceed total classes." },
        { status: 400 }
      );
    }
    if (Array.isArray(body.workingDays)) {
      sub.workingDays = body.workingDays
        .map((d: any) => Number(d))
        .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6);
    }
    if (typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate.trim())) {
      sub.startDate = body.startDate.trim();
    }
    if (typeof body.lastAutoIncrementDate === "string") {
      sub.lastAutoIncrementDate = body.lastAutoIncrementDate.trim();
    }
    if (body.lectureTime !== undefined && body.lectureTime !== null) {
      sub.lectureTime = typeof body.lectureTime === "string" ? body.lectureTime.trim().slice(0, 10) : "";
    }

    sub.updatedAt = new Date();
    await sub.save();

    return NextResponse.json(formatSubject(sub));
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[PUT /api/subjects/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update subject." }, { status: 500 });
  }
}

export async function DELETE(
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

    const sub = await SubjectModel.findOneAndDelete({ _id: id as any, userId: user._id as any });
    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    // Remove all logs for this subject
    await AttendanceLogModel.deleteMany({ subjectId: id, userId: user._id as any });

    return NextResponse.json({ message: "Course removed successfully." });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[DELETE /api/subjects/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to delete subject." }, { status: 500 });
  }
}
