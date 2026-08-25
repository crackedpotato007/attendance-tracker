import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface IUserSchedule extends Document {
  userId: mongoose.Types.ObjectId;
  activeDays: number[]; // [1, 2, 3, 4, 5, 6] (0 = Sun, 1 = Mon...)
  globalTarget: number;
  customHolidays: ICustomHoliday[];
  createdAt: Date;
  updatedAt: Date;
}

const UserScheduleSchema = new Schema<IUserSchedule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    activeDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6], // Monday - Saturday
    },
    globalTarget: {
      type: Number,
      default: 75,
    },
    customHolidays: [
      {
        date: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const UserScheduleModel =
  mongoose.models.UserSchedule ||
  mongoose.model<IUserSchedule>("UserSchedule", UserScheduleSchema);
