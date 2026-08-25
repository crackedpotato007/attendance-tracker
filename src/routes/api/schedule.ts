import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { connectToMongo } from "../../server/mongo.js";
import { UserScheduleModel } from "../../server/models/UserSchedule.js";
import { requireAuth } from "../../server/auth.js";

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

export async function loader({ request }: LoaderFunctionArgs) {
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

    return new Response(JSON.stringify(formatSchedule(schedule)), {
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

    return new Response(JSON.stringify(formatSchedule(schedule)), {
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
