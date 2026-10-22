import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "@/src/server/mongo";
import { UserScheduleModel } from "@/src/server/models/UserSchedule";
import { requireAuth } from "@/src/server/auth";

function formatSchedule(sched: any) {
  const rawTarget = Number(sched.globalTarget);
  return {
    activeDays: Array.isArray(sched.activeDays) ? sched.activeDays : [1, 2, 3, 4, 5, 6],
    globalTarget: Number.isFinite(rawTarget) && rawTarget > 0 ? Math.min(100, Math.round(rawTarget)) : 75,
    customHolidays: (sched.customHolidays || []).map((h: any) => {
      const start = h.startDate || h.date;
      const end = h.endDate || h.date || h.startDate;
      return {
        id: h._id ? h._id.toString() : (h.id || `${start}_${end}_${h.name}`),
        date: start,
        startDate: start,
        endDate: end,
        name: h.name,
      };
    }),
    campusName: sched.campusName || "College Campus",
    campusLat: typeof sched.campusLat === "number" ? sched.campusLat : 0.0,
    campusLng: typeof sched.campusLng === "number" ? sched.campusLng : 0.0,
    campusRadius: typeof sched.campusRadius === "number" && sched.campusRadius > 0 ? sched.campusRadius : 250,
    geoAttendanceEnabled: Boolean(sched.geoAttendanceEnabled),
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
        globalTarget: user.targetAttendance && user.targetAttendance > 0 ? user.targetAttendance : 75,
        customHolidays: [],
        campusName: "College Campus",
        campusLat: 0.0,
        campusLng: 0.0,
        campusRadius: 250,
        geoAttendanceEnabled: false,
      });
      await schedule.save();
    } else if (!schedule.globalTarget || schedule.globalTarget <= 0) {
      schedule.globalTarget = user.targetAttendance && user.targetAttendance > 0 ? user.targetAttendance : 75;
      await schedule.save();
    }

    return NextResponse.json(formatSchedule(schedule));
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[GET /api/schedule] Error:", err);
    return NextResponse.json({ error: "Failed to load schedule." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, { jsonOnly: true });
    await connectToMongo();

    const body = await request.json().catch(() => ({}));
    let schedule = await UserScheduleModel.findOne({ userId: user._id as any });
    if (!schedule) {
      schedule = new UserScheduleModel({
        userId: user._id,
        activeDays: [1, 2, 3, 4, 5, 6],
        globalTarget: user.targetAttendance && user.targetAttendance > 0 ? user.targetAttendance : 75,
        customHolidays: [],
        campusName: "College Campus",
        campusLat: 0.0,
        campusLng: 0.0,
        campusRadius: 250,
        geoAttendanceEnabled: false,
      });
    }

    if (body.activeDays !== undefined && body.activeDays !== null && Array.isArray(body.activeDays)) {
      schedule.activeDays = body.activeDays
        .map((d: any) => Number(d))
        .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6);
    }

    if (body.globalTarget !== undefined && body.globalTarget !== null) {
      const parsedTarget = Number(body.globalTarget);
      if (Number.isFinite(parsedTarget) && parsedTarget > 0) {
        schedule.globalTarget = Math.min(100, Math.max(1, Math.round(parsedTarget)));
      }
    }

    if (body.customHolidays !== undefined && body.customHolidays !== null && Array.isArray(body.customHolidays)) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      schedule.customHolidays = body.customHolidays
        .filter((h: any) => h && typeof h === "object")
        .map((h: any) => {
          const rawStart = String(h.startDate || h.date || "").trim();
          const rawEnd = String(h.endDate || h.date || h.startDate || "").trim();
          const start = dateRegex.test(rawStart) ? rawStart : new Date().toISOString().split("T")[0]!;
          const end = dateRegex.test(rawEnd) && rawEnd >= start ? rawEnd : start;
          const name = typeof h.name === "string" && h.name.trim() ? h.name.trim().slice(0, 100) : "Holiday";
          return {
            date: start,
            startDate: start,
            endDate: end,
            name,
          };
        });
    }

    if (typeof body.campusName === "string" && body.campusName.trim()) {
      schedule.campusName = body.campusName.trim().slice(0, 100);
    }
    if (body.campusLat !== undefined && body.campusLat !== null) {
      const parsedLat = Number(body.campusLat);
      if (Number.isFinite(parsedLat)) schedule.campusLat = parsedLat;
    }
    if (body.campusLng !== undefined && body.campusLng !== null) {
      const parsedLng = Number(body.campusLng);
      if (Number.isFinite(parsedLng)) schedule.campusLng = parsedLng;
    }
    if (body.campusRadius !== undefined && body.campusRadius !== null) {
      const parsedRadius = Number(body.campusRadius);
      if (Number.isFinite(parsedRadius) && parsedRadius > 0) {
        schedule.campusRadius = Math.min(5000, Math.max(25, Math.round(parsedRadius)));
      }
    }
    if (typeof body.geoAttendanceEnabled === "boolean") {
      schedule.geoAttendanceEnabled = body.geoAttendanceEnabled;
    }

    schedule.updatedAt = new Date();
    await schedule.save();

    return NextResponse.json(formatSchedule(schedule));
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[PUT /api/schedule] Error:", err);
    return NextResponse.json({ error: "Failed to update schedule." }, { status: 500 });
  }
}
