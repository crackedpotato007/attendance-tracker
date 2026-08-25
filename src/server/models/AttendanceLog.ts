import mongoose, { Schema, type Document } from "mongoose";

export interface IAttendanceLog extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "cancelled";
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceLogSchema = new Schema<IAttendanceLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subjectId: {
      type: String,
      required: true,
      index: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "cancelled"],
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Only 1 attendance entry per course per calendar day per student
AttendanceLogSchema.index({ userId: 1, subjectId: 1, date: 1 }, { unique: true });

export const AttendanceLogModel =
  mongoose.models.AttendanceLog ||
  mongoose.model<IAttendanceLog>("AttendanceLog", AttendanceLogSchema);
