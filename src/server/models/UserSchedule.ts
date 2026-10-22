import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomHoliday {
  _id?: any;
  id?: string;
  date?: string; // YYYY-MM-DD (legacy / start date fallback)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  name: string;
}

export interface IUserSchedule extends Document {
  userId: mongoose.Types.ObjectId;
  activeDays: number[]; // [1, 2, 3, 4, 5, 6] (0 = Sun, 1 = Mon...)
  globalTarget: number;
  customHolidays: ICustomHoliday[];
  campusName?: string;
  campusLat?: number;
  campusLng?: number;
  campusRadius?: number; // in meters (default 250)
  geoAttendanceEnabled?: boolean;
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
        date: { type: String },
        startDate: { type: String },
        endDate: { type: String },
        name: { type: String, required: true },
      },
    ],
    campusName: {
      type: String,
      default: "College Campus",
    },
    campusLat: {
      type: Number,
      default: 0.0,
    },
    campusLng: {
      type: Number,
      default: 0.0,
    },
    campusRadius: {
      type: Number,
      default: 250,
    },
    geoAttendanceEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const UserScheduleModel =
  mongoose.models.UserSchedule ||
  mongoose.model<IUserSchedule>("UserSchedule", UserScheduleSchema);
