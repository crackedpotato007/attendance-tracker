"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./navbar";
import {
  AlertTriangle,
  Sparkles,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Info,
  Loader2,
  BookOpen,
  Plus,
} from "lucide-react";
import {
  calculateSubjectStats,
  type Subject,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./bunkCalculator.css";

function BunkCalculator() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Interactive Target Goal Slider (60% - 95%)
  const [targetGoal, setTargetGoal] = useState<number>(75);

  // Single Subject Simulator State
  const [simSubjectId, setSimSubjectId] = useState<string>("");
  const [simBunkClasses, setSimBunkClasses] = useState<number>(2);
  const [simAttendClasses, setSimAttendClasses] = useState<number>(0);

  // Multi-day Leave Planner State
  const [vacationWorkingDays, setVacationWorkingDays] = useState<number>(4);
  const [classesPerDay, setClassesPerDay] = useState<number>(1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [subsData, schedData] = await Promise.all([
        api.subjects.list().catch(() => []),
        api.schedule.get().catch(() => ({ globalTarget: 75 })),
      ]);

      const subList = subsData || [];
      setSubjects(subList);
      if (subList.length > 0 && !simSubjectId) {
        setSimSubjectId(subList[0].id);
      }
      if (schedData && schedData.globalTarget) {
        setTargetGoal(schedData.globalTarget);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [simSubjectId]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        loadData();
      }
    }
  }, [authLoading, isAuthenticated, loadData, router]);

  const selectedSubject = subjects.find((s) => s.id === simSubjectId) || subjects[0];

  // Mathematical Projection for Single Subject
  const projectedAttended = selectedSubject ? selectedSubject.attended + simAttendClasses : 0;
  const projectedTotal = selectedSubject ? selectedSubject.total + simBunkClasses + simAttendClasses : 1;
  const projectedPercentage = Number(
    ((projectedAttended / projectedTotal) * 100).toFixed(1)
  );

  const currentStats = selectedSubject
    ? calculateSubjectStats(selectedSubject.attended, selectedSubject.total, targetGoal)
    : null;

  const isProjectedSafe = projectedPercentage >= targetGoal;
  const pctDifference = currentStats
    ? Number((projectedPercentage - currentStats.percentage).toFixed(1))
    : 0;

  return (
    <div className="bunk-calculator-page">
      <Navbar />

      <main className="calc-container">
        {/* Header Hero */}
        <section className="calc-hero-card glass-card">
          <div className="calc-hero-left">
            <div className="badge badge-indigo">
              <Sparkles size={13} />
              <span>Predictive Bunk & Recovery Intelligence • MongoDB Synced</span>
            </div>
            <h1 className="calc-title">Interactive Bunk Simulator</h1>
            <p className="calc-subtitle">
              Simulate skipping lectures, test custom target goals, and plan multi-day breaks with zero academic risk.
            </p>
          </div>

          {/* Interactive Global Target Slider Widget */}
          <div className="target-slider-widget glass-card">
            <div className="target-widget-header">
              <div className="t-lbl-group">
                <Sliders size={15} color="#818cf8" />
                <span className="t-head">Minimum Attendance Threshold</span>
              </div>
              <span className="target-number font-mono">{targetGoal}%</span>
            </div>

            <input
              type="range"
              min={60}
              max={95}
              step={1}
              value={targetGoal}
              onChange={(e) => setTargetGoal(Number(e.target.value))}
              className="target-range-input"
            />

            <div className="slider-ticks">
              <span>60%</span>
              <span className="active-marker">75% (Standard)</span>
              <span>85%</span>
              <span>95%</span>
            </div>
          </div>
        </section>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Loading simulation data from database...</span>
          </div>
        )}

        {/* 2-Column Split: Single Subject Simulator & Multi-Day Leave Planner */}
        {subjects.length === 0 && !loading ? (
          <section
            className="empty-calc-box glass-card"
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.2rem",
              borderRadius: "16px",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={28} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ color: "#ffffff", fontSize: "1.25rem", fontWeight: 700 }}>
                No Courses Enrolled
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "440px" }}>
                To simulate safe bunks and leave impacts, please enroll in your courses first.
              </p>
            </div>
            <button className="btn-primary" onClick={() => router.push("/subjects")}>
              <Plus size={16} />
              <span>Enroll Courses in Course Manager</span>
            </button>
          </section>
        ) : (
          <div className="calc-split-grid">
          {/* Left Column: What-If Single Subject Simulator */}
          <section className="calc-simulator-card glass-card">
            <div className="card-top-bar">
              <div className="card-title-group">
                <h3>"What-If" Class Bunk Simulator</h3>
                <p>Test the exact percentage outcome of skipping future lectures</p>
              </div>
              <span className="badge badge-cyan">Single Course</span>
            </div>

            {/* Subject Selector */}
            <div className="calc-form-group">
              <label className="calc-label">Select Course:</label>
              <select
                value={simSubjectId}
                onChange={(e) => setSimSubjectId(e.target.value)}
                className="calc-select"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code}) • Current:{" "}
                    {((sub.attended / (sub.total || 1)) * 100).toFixed(1)}%
                  </option>
                ))}
              </select>
            </div>

            {/* Stepper Inputs for Bunk & Attend */}
            <div className="stepper-controls-row">
              <div className="stepper-box">
                <label className="stepper-lbl text-rose">
                  Classes to Bunk (Skip):
                </label>
                <div className="stepper-wrap">
                  <button
                    className="step-btn"
                    onClick={() =>
                      setSimBunkClasses((prev) => Math.max(0, prev - 1))
                    }
                  >
                    -
                  </button>
                  <span className="step-val font-mono">{simBunkClasses}</span>
                  <button
                    className="step-btn"
                    onClick={() => setSimBunkClasses((prev) => prev + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="stepper-box">
                <label className="stepper-lbl text-emerald">
                  Classes to Attend:
                </label>
                <div className="stepper-wrap">
                  <button
                    className="step-btn"
                    onClick={() =>
                      setSimAttendClasses((prev) => Math.max(0, prev - 1))
                    }
                  >
                    -
                  </button>
                  <span className="step-val font-mono">{simAttendClasses}</span>
                  <button
                    className="step-btn"
                    onClick={() => setSimAttendClasses((prev) => prev + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Result Telemetry Panel */}
            {selectedSubject && currentStats && (
              <div className="simulation-telemetry-panel">
                <div className="sim-stats-comparison">
                  <div className="sim-stat-box">
                    <span className="sim-lbl">Current Attendance</span>
                    <span className="sim-val">{currentStats.percentage}%</span>
                    <span className="sim-sub">
                      {selectedSubject.attended}/{selectedSubject.total} classes
                    </span>
                  </div>

                  <div className="sim-arrow">
                    <ArrowRight size={20} color="#6366f1" />
                  </div>

                  <div className="sim-stat-box highlight">
                    <span className="sim-lbl">Projected Outcome</span>
                    <span
                      className={`sim-val font-mono ${
                        isProjectedSafe ? "text-emerald" : "text-rose"
                      }`}
                    >
                      {projectedPercentage}%
                    </span>
                    <span
                      className={`sim-sub ${
                        pctDifference >= 0 ? "text-emerald" : "text-rose"
                      }`}
                    >
                      {pctDifference >= 0 ? `+${pctDifference}%` : `${pctDifference}%`}
                    </span>
                  </div>
                </div>

                {/* Verdict Box */}
                <div
                  className={`sim-verdict-card ${
                    isProjectedSafe ? "safe-verdict" : "danger-verdict"
                  }`}
                >
                  {isProjectedSafe ? (
                    <div className="verdict-content">
                      <CheckCircle2 size={22} color="#10b981" />
                      <div>
                        <strong>SAFE TO BUNK! 🎉</strong>
                        <p>
                          Even after skipping {simBunkClasses}{" "}
                          {simBunkClasses === 1 ? "class" : "classes"}, your attendance will stay
                          at <strong>{projectedPercentage}%</strong> (above {targetGoal}% target).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="verdict-content">
                      <AlertTriangle size={22} color="#f43f5e" />
                      <div>
                        <strong>ATTENDANCE AT RISK! ⚠️</strong>
                        <p>
                          Skipping {simBunkClasses}{" "}
                          {simBunkClasses === 1 ? "class" : "classes"} will drop you to{" "}
                          <strong>{projectedPercentage}%</strong> (below {targetGoal}% goal).
                          You would need to attend consecutive classes to recover!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Multi-Day Vacation / Leave Impact Planner */}
          <section className="calc-vacation-card glass-card">
            <div className="card-top-bar">
              <div className="card-title-group">
                <h3>Semester Vacation / Leave Impact</h3>
                <p>Plan taking off multiple working days (excludes Sundays)</p>
              </div>
              <span className="badge badge-amber">All Courses</span>
            </div>

            <div className="calc-form-group">
              <div className="vacation-input-row">
                <div className="v-input-col">
                  <label className="calc-label">Working Days Off:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={vacationWorkingDays}
                    onChange={(e) =>
                      setVacationWorkingDays(Math.max(1, Number(e.target.value)))
                    }
                    className="calc-input-num"
                  />
                  <span className="v-hint">Mon–Sat working days</span>
                </div>

                <div className="v-input-col">
                  <label className="calc-label">Lectures / Day:</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={classesPerDay}
                    onChange={(e) =>
                      setClassesPerDay(Math.max(1, Number(e.target.value)))
                    }
                    className="calc-input-num"
                  />
                  <span className="v-hint">Average classes per subject</span>
                </div>
              </div>
            </div>

            {/* Projected Impact Across All Subjects Table */}
            <div className="vacation-table-wrapper">
              <table className="vacation-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Current</th>
                    <th>After {vacationWorkingDays}d Off</th>
                    <th>Safe Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub) => {
                    const missedInVacation = vacationWorkingDays * classesPerDay;
                    const newTot = sub.total + missedInVacation;
                    const newPct = Number(
                      ((sub.attended / (newTot || 1)) * 100).toFixed(1)
                    );
                    const safe = newPct >= targetGoal;

                    return (
                      <tr key={sub.id}>
                        <td>
                          <div className="v-sub-cell">
                            <span
                              className="v-color-dot"
                              style={{ background: sub.color }}
                            ></span>
                            <span className="font-bold">{sub.code}</span>
                          </div>
                        </td>
                        <td className="font-mono">
                          {((sub.attended / (sub.total || 1)) * 100).toFixed(1)}%
                        </td>
                        <td className="font-mono font-bold">
                          <span className={safe ? "text-emerald" : "text-rose"}>
                            {newPct}%
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              safe ? "badge-emerald" : "badge-rose"
                            }`}
                          >
                            {safe ? "Safe" : "Drops Below"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="vacation-footer-note">
              <Info size={14} className="text-cyan" />
              <span>
                Sundays (and custom-marked holidays) are automatically skipped and will not count against your attendance.
              </span>
            </div>
          </section>
        </div>
        )}
      </main>
    </div>
  );
}

export default BunkCalculator;
