import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { AttendanceLogModel } from "@/src/server/models/AttendanceLog";
import { SubjectModel } from "@/src/server/models/Subject";
import { requireAuth } from "@/src/server/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();
    const { id } = await params;

    const log = await AttendanceLogModel.findOneAndDelete({
      _id: id as any,
      userId: user._id as any,
    });

    if (!log) {
      return NextResponse.json({ error: "Log entry not found." }, { status: 404 });
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

    return NextResponse.json({ message: "Attendance log reverted." });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
