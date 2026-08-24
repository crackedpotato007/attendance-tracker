import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceLog extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "cancelled";
  note?: string;
  createdAt: Date;
}

const AttendanceLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subjectId: { type: String, required: true },
    subjectName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["present", "absent", "cancelled"],
      default: "present",
    },
    note: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
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

// Compound index to guarantee exactly 1 entry per subject per day per user
AttendanceLogSchema.index({ userId: 1, subjectId: 1, date: 1 }, { unique: true });

export const AttendanceLogModel = mongoose.model<IAttendanceLog>(
  "AttendanceLog",
  AttendanceLogSchema
);
