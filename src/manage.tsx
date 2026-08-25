"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./navbar";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Slash,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertCircle,
  Trash2,
  Loader2,
  BookOpen,
  Plus,
} from "lucide-react";
import {
  calculateSubjectStats,
  triggerConfettiBurst,
  defaultWorkingDaysConfig,
  type Subject,
  type AttendanceRecord,
  type WorkingDaysConfig,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./manage.css";

function Manage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<WorkingDaysConfig>(defaultWorkingDaysConfig);
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-24");
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [subsData, logsData, schedData] = await Promise.all([
        api.subjects.list().catch(() => []),
        api.attendance.list().catch(() => []),
        api.schedule.get().catch(() => defaultWorkingDaysConfig),
      ]);
      setSubjects(subsData || []);
      setLogs(logsData || []);
      setConfig(schedData || defaultWorkingDaysConfig);
    } catch {
      // Ignore
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        loadData();
      }
    }
  }, [authLoading, isAuthenticated, loadData, router]);

  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener("authChange", handleUpdate);
    return () => window.removeEventListener("authChange", handleUpdate);
  }, [loadData]);

  // Determine if selected date is a configured working day
  const dateObj = new Date(selectedDate);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const isWorkingDay = (config.activeDays || [1, 2, 3, 4, 5, 6]).includes(dayOfWeek);
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Shift selected date by delta days
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleDateShift = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]!);
  };

  // Log single subject status via API (1-per-day enforcement)
  const handleLogSubject = async (
    subjectId: string,
    status: "present" | "absent" | "cancelled"
  ) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;

    // Check if already logged with the SAME status on this date
    const existingLog = logs.find(
      (l) => l.subjectId === subjectId && l.date === selectedDate
    );

    if (existingLog && existingLog.status === status) {
      showToast(`Already logged as ${status} for ${selectedDate}.`);
      return;
    }

    setSubmittingId(subjectId);

    try {
      const res = await api.attendance.create({
        subjectId: sub.id,
        subjectName: sub.name,
        date: selectedDate,
        status,
        note:
          status === "present"
            ? "Attended lecture"
            : status === "absent"
            ? "Missed / Bunked"
            : "Class cancelled by faculty",
      });

      if (res && res.log) {
        if (status === "present") {
          triggerConfettiBurst();
          showToast(`Marked Present in ${sub.name}! 🎉`);
        } else if (status === "absent") {
          showToast(`Marked Absent in ${sub.name}.`);
        } else {
          showToast(`Marked ${sub.name} as Cancelled.`);
        }

        setLogs((prev) => {
          const filtered = prev.filter(
            (l) => !(l.subjectId === sub.id && l.date === selectedDate)
          );
          return [res.log, ...filtered];
        });

        if (res.subject) {
          setSubjects((prev) =>
            prev.map((s) => (s.id === subjectId ? res.subject : s))
          );
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to log attendance.");
      loadData();
    } finally {
      setSubmittingId(null);
    }
  };

  // Bulk action: Mark all enrolled subjects present via API
  const handleMarkAllPresent = async () => {
    if (subjects.length === 0) {
      showToast("No enrolled courses to mark.");
      return;
    }

    setSubmittingId("batch");

    try {
      const res = await api.attendance.batch(selectedDate);
      triggerConfettiBurst();
      showToast("Awesome! All subjects marked Present for today! 🚀");

      if (res && res.subjects) {
        setSubjects(res.subjects);
        if (res.logs) {
          setLogs((prev) => {
            const dateLogSubjectIds = new Set(res.logs.map((l: any) => l.subjectId));
            const filtered = prev.filter(
              (l) => !(l.date === selectedDate && dateLogSubjectIds.has(l.subjectId))
            );
            return [...res.logs, ...filtered];
          });
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to batch mark present.");
      loadData();
    } finally {
      setSubmittingId(null);
    }
  };

  // Delete a log entry and rollback counts via API
  const handleDeleteLog = async (logItem: AttendanceRecord) => {
    setLogs((prev) => prev.filter((l) => l.id !== logItem.id));
    showToast("Attendance entry reverted.");

    try {
      await api.attendance.delete(logItem.id);
      loadData();
    } catch {
      loadData();
    }
  };

  // Filter logs for currently selected date
  const logsForSelectedDate = logs.filter((l) => l.date === selectedDate);

  return (
    <div className="manage-logger-page">
      <Navbar />

      <main className="logger-container">
        {/* Header Hero */}
        <section className="logger-hero-card glass-card">
          <div className="logger-hero-left">
            <div className="badge badge-emerald">
              <Sparkles size={13} />
              <span>Daily Class Attendance Logger • MongoDB Synced</span>
            </div>
            <h1 className="logger-title">Log Presence & Bunks</h1>
            <p className="logger-subtitle">
              Mark individual lectures, log absences, or flag cancelled classes with real-time recalculations.
            </p>
          </div>

          {/* Date Picker & Working Day Badge */}
          <div className="date-picker-box">
            <div className="date-nav-controls">
              <button
                className="date-arrow-btn"
                onClick={() => handleDateShift(-1)}
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="date-input-wrap">
                <Calendar size={15} className="text-cyan" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="date-picker-native"
                />
              </div>

              <button
                className="date-arrow-btn"
                onClick={() => handleDateShift(1)}
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="date-meta-pill">
              <span className="day-name font-bold">{dayNames[dayOfWeek]}</span>
              <span
                className={`working-tag ${
                  isWorkingDay ? "tag-working" : "tag-off"
                }`}
              >
                {isWorkingDay ? "• Working Day" : "• Off / Sunday"}
              </span>
            </div>
          </div>
        </section>

        {/* Loading indicator */}
        {loadingData && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Loading courses from database...</span>
          </div>
        )}

        {/* 1-Tap Batch Action Bar */}
        <section className="batch-action-bar glass-card">
          <div className="batch-text-group">
            <h3>Quick Daily Logging</h3>
            <p>
              Attended all lectures scheduled for {selectedDate}? One tap marks them all!
            </p>
          </div>

          <button
            className="btn-primary bulk-present-btn"
            onClick={handleMarkAllPresent}
          >
            <CheckCircle2 size={18} />
            <span>Mark All Present for Today</span>
          </button>
        </section>

        {/* Subject-Wise Logger Grid */}
        <section className="subject-logger-section">
          <div className="section-head-bar">
            <div>
              <h3>Enrolled Course Logger</h3>
              <p>Select Present, Absent, or Cancelled for each class</p>
            </div>
            <span className="badge badge-indigo">
              {subjects.length} Courses
            </span>
          </div>

          {subjects.length === 0 && !loadingData ? (
            <div
              className="empty-manage-box glass-card"
              style={{
                padding: "3.5rem 2rem",
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
                <h4 style={{ color: "#ffffff", fontSize: "1.2rem", fontWeight: 700 }}>
                  No Courses Enrolled
                </h4>
                <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: "0.3rem", maxWidth: "420px" }}>
                  You need to enroll in your courses before you can log daily attendance.
                </p>
              </div>
              <button className="btn-primary" onClick={() => router.push("/subjects")}>
                <Plus size={16} />
                <span>Go to Course Manager</span>
              </button>
            </div>
          ) : (
            <div className="subject-logger-grid">
              {subjects.map((sub) => {
                const stats = calculateSubjectStats(
                  sub.attended,
                  sub.total,
                  sub.targetPercentage || config.globalTarget
                );
                const isSafe = stats.percentage >= (sub.targetPercentage || config.globalTarget);

                return (
                  <div key={sub.id} className="logger-subject-card glass-card">
                  <div className="log-card-top">
                    <div className="sub-title-stack">
                      <div className="sub-code-line">
                        <span className="sub-code-tag">{sub.code}</span>
                        {sub.workingDays && sub.workingDays.includes(dayOfWeek) ? (
                          <span className="badge badge-emerald schedule-pill">
                            Class Today
                          </span>
                        ) : (
                          <span className="badge badge-indigo schedule-pill">
                            No Class Today
                          </span>
                        )}
                      </div>
                      <h4 className="sub-name-text">{sub.name}</h4>
                      <span className="sub-prof-text">
                        {sub.professor || "Faculty"} • {sub.room || "Lab"}
                      </span>
                    </div>

                    <div className="sub-current-pct">
                      <span className={`pct-val ${isSafe ? "text-emerald" : "text-rose"}`}>
                        {stats.percentage}%
                      </span>
                      <span className="pct-ratio">
                        {sub.attended}/{sub.total} classes
                      </span>
                    </div>
                  </div>

                  {/* Bunk Forecast */}
                  <div
                    className={`bunk-forecast-pill ${
                      isSafe ? "safe-pill" : "danger-pill"
                    }`}
                  >
                    {isSafe ? (
                      <span>
                        <Flame size={13} className="inline-icon" /> Safe to bunk{" "}
                        <strong>{stats.safeBunks}</strong> more
                      </span>
                    ) : (
                      <span>
                        <AlertCircle size={13} className="inline-icon" /> Need{" "}
                        <strong>{stats.neededClasses}</strong> more to recover
                      </span>
                    )}
                  </div>

                  {/* Current Log Status Tag for this Date */}
                  {(() => {
                    const currentDayLog = logsForSelectedDate.find(
                      (l) => l.subjectId === sub.id
                    );
                    if (!currentDayLog) return null;
                    return (
                      <div
                        style={{
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          marginBottom: "0.6rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          background:
                            currentDayLog.status === "present"
                              ? "rgba(16, 185, 129, 0.12)"
                              : currentDayLog.status === "absent"
                              ? "rgba(244, 63, 94, 0.12)"
                              : "rgba(148, 163, 184, 0.12)",
                          color:
                            currentDayLog.status === "present"
                              ? "#10b981"
                              : currentDayLog.status === "absent"
                              ? "#f43f5e"
                              : "#94a3b8",
                          border: `1px solid ${
                            currentDayLog.status === "present"
                              ? "rgba(16, 185, 129, 0.3)"
                              : currentDayLog.status === "absent"
                              ? "rgba(244, 63, 94, 0.3)"
                              : "rgba(148, 163, 184, 0.3)"
                          }`,
                        }}
                      >
                        <span>
                          {currentDayLog.status === "present"
                            ? "✓ Marked Present for " + selectedDate
                            : currentDayLog.status === "absent"
                            ? "✕ Marked Absent for " + selectedDate
                            : "⊘ Marked Cancelled for " + selectedDate}
                        </span>
                      </div>
                    );
                  })()}

                  {/* 3 Action Buttons per Subject */}
                  <div className="log-action-buttons">
                    {(() => {
                      const currentDayLog = logsForSelectedDate.find(
                        (l) => l.subjectId === sub.id
                      );
                      const isPresent = currentDayLog?.status === "present";
                      const isAbsent = currentDayLog?.status === "absent";
                      const isCancelled = currentDayLog?.status === "cancelled";
                      const isDisabled = submittingId === sub.id;

                      return (
                        <>
                          <button
                            className={`log-btn log-present ${
                              isPresent ? "active-logged" : ""
                            }`}
                            style={
                              isPresent
                                ? {
                                    boxShadow: "0 0 12px rgba(16, 185, 129, 0.4)",
                                    border: "1px solid #10b981",
                                    opacity: 1,
                                  }
                                : {}
                            }
                            onClick={() => handleLogSubject(sub.id, "present")}
                            disabled={isDisabled}
                            title="Attended this class"
                          >
                            <CheckCircle2 size={16} />
                            <span>{isPresent ? "Present ✓" : "Present"}</span>
                          </button>

                          <button
                            className={`log-btn log-absent ${
                              isAbsent ? "active-logged" : ""
                            }`}
                            style={
                              isAbsent
                                ? {
                                    boxShadow: "0 0 12px rgba(244, 63, 94, 0.4)",
                                    border: "1px solid #f43f5e",
                                    opacity: 1,
                                  }
                                : {}
                            }
                            onClick={() => handleLogSubject(sub.id, "absent")}
                            disabled={isDisabled}
                            title="Missed or bunked this class"
                          >
                            <XCircle size={16} />
                            <span>{isAbsent ? "Absent ✕" : "Absent"}</span>
                          </button>

                          <button
                            className={`log-btn log-cancelled ${
                              isCancelled ? "active-logged" : ""
                            }`}
                            style={
                              isCancelled
                                ? {
                                    boxShadow: "0 0 12px rgba(148, 163, 184, 0.3)",
                                    border: "1px solid #94a3b8",
                                    opacity: 1,
                                  }
                                : {}
                            }
                            onClick={() => handleLogSubject(sub.id, "cancelled")}
                            disabled={isDisabled}
                            title="Class was cancelled / free period"
                          >
                            <Slash size={14} />
                            <span>{isCancelled ? "Cancelled ⊘" : "Cancelled"}</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

        {/* Log History for Selected Date */}
        <section className="date-logs-section glass-card">
          <div className="section-head-bar">
            <div>
              <h3>Entries Logged for {selectedDate}</h3>
              <p>Review or revert logged entries for this calendar day</p>
            </div>
            <span className="badge badge-cyan">
              {logsForSelectedDate.length} Logged
            </span>
          </div>

          {logsForSelectedDate.length === 0 ? (
            <div className="empty-logs-box">
              <Calendar size={32} className="text-muted" />
              <p>No class attendance recorded for this date yet.</p>
              <span>Use the buttons above to log presence or absences.</span>
            </div>
          ) : (
            <div className="date-logs-table-wrapper">
              <table className="date-logs-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logsForSelectedDate.map((log) => (
                    <tr key={log.id}>
                      <td className="font-bold">{log.subjectName}</td>
                      <td>
                        <span
                          className={`badge ${
                            log.status === "present"
                              ? "badge-emerald"
                              : log.status === "absent"
                              ? "badge-rose"
                              : "badge-indigo"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="text-muted">{log.note}</td>
                      <td>
                        <button
                          className="log-remove-btn"
                          onClick={() => handleDeleteLog(log)}
                          title="Delete entry & revert counts"
                        >
                          <Trash2 size={14} />
                          <span>Revert</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Global Toast */}
        {toastMessage && (
          <div className="toast-container">
            <div className="toast-item">
              <CheckCircle2 size={18} color="#10b981" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Manage;
