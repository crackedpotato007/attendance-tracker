import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { UserScheduleModel } from "@/src/server/models/UserSchedule";
import { requireAuth } from "@/src/server/auth";

function formatSchedule(sched: any) {
  return {
    activeDays: sched.activeDays || [1, 2, 3, 4, 5, 6],
    globalTarget: sched.globalTarget || 75,
    customHolidays: (sched.customHolidays || []).map((h: any) => ({
      date: h.date,
      name: h.name,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    let schedule = await UserScheduleModel.findOne({ userId: user._id as any });
    if (!schedule) {
      schedule = new UserScheduleModel({
        userId: user._id,
        activeDays: [1, 2, 3, 4, 5, 6],
        globalTarget: user.targetAttendance || 75,
        customHolidays: [],
      });
      await schedule.save();
    }

    return NextResponse.json(formatSchedule(schedule));
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json();
    let schedule = await UserScheduleModel.findOne({ userId: user._id as any });
    if (!schedule) {
      schedule = new UserScheduleModel({
        userId: user._id,
        activeDays: [1, 2, 3, 4, 5, 6],
        globalTarget: 75,
        customHolidays: [],
      });
    }

    if (body.activeDays !== undefined && Array.isArray(body.activeDays)) {
      schedule.activeDays = body.activeDays;
    }
    if (body.globalTarget !== undefined) {
      schedule.globalTarget = Number(body.globalTarget);
    }
    if (body.customHolidays !== undefined && Array.isArray(body.customHolidays)) {
      schedule.customHolidays = body.customHolidays;
    }

    schedule.updatedAt = new Date();
    await schedule.save();

    return NextResponse.json(formatSchedule(schedule));
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
