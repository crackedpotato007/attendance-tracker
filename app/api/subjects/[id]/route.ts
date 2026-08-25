import { NextRequest, NextResponse } from "next/server";
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();
    const { id } = await params;

    const body = await request.json();
    const sub = await SubjectModel.findOne({ _id: id as any, userId: user._id as any });
    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
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

    return NextResponse.json(formatSubject(sub));
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    const sub = await SubjectModel.findOneAndDelete({ _id: id as any, userId: user._id as any });
    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    // Remove all logs for this subject
    await AttendanceLogModel.deleteMany({ subjectId: id, userId: user._id as any });

    return NextResponse.json({ message: "Course removed successfully." });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
