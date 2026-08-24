import mongoose, { Schema, Document } from "mongoose";

export interface ISubject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  attended: number;
  total: number;
  targetPercentage: number;
  color: string;
  professor?: string;
  room?: string;
  credits?: number;
  workingDays?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startDate?: string; // YYYY-MM-DD
  lastAutoIncrementDate?: string; // YYYY-MM-DD to prevent double counting on same day
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    attended: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    targetPercentage: { type: Number, default: 75 },
    color: { type: String, default: "#6366f1" },
    professor: { type: String, default: "" },
    room: { type: String, default: "" },
    credits: { type: Number, default: 3 },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    startDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    lastAutoIncrementDate: { type: String, default: "" },
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

export const SubjectModel = mongoose.model<ISubject>("Subject", SubjectSchema);
