import mongoose, { Schema, type Document } from "mongoose";

export interface ISubject extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  faculty?: string;
  room?: string;
  color?: string;
  targetPercentage: number;
  attended: number;
  total: number;
  workingDays?: number[]; // [1, 2, 3, 4, 5, 6] (0 = Sun, 1 = Mon...)
  startDate?: string; // YYYY-MM-DD
  lastAutoIncrementDate?: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    faculty: {
      type: String,
      default: "",
    },
    room: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "#6366f1",
    },
    targetPercentage: {
      type: Number,
      default: 75,
    },
    attended: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6],
    },
    startDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    lastAutoIncrementDate: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const SubjectModel = mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);
