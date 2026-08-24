import mongoose, { Schema, Document } from "mongoose";

export interface IUserSchedule extends Document {
  userId: mongoose.Types.ObjectId;
  activeDays: number[]; // 1 = Mon, ..., 6 = Sat, 0 = Sun
  globalTarget: number;
  customHolidays: { date: string; name: string }[];
  updatedAt: Date;
}

const UserScheduleSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    activeDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    globalTarget: { type: Number, default: 75 },
    customHolidays: [
      {
        date: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    updatedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const UserScheduleModel = mongoose.model<IUserSchedule>(
  "UserSchedule",
  UserScheduleSchema
);
