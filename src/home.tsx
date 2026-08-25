"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./navbar";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  CheckSquare,
  Calculator,
  Flame,
  Award,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  X,
  CalendarCheck,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  calculateSubjectStats,
  calculateOverallStats,
  triggerConfettiBurst,
  defaultWorkingDaysConfig,
  type Subject,
  type WorkingDaysConfig,
  type AttendanceRecord,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./home.css";

// Register ChartJS modules
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

function Home() {
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [config, setConfig] = useState<WorkingDaysConfig>(defaultWorkingDaysConfig);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [chartView, setChartView] = useState<"doughnut" | "bar">("doughnut");
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load from MongoDB Backend API
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [subjectsData, logsData, scheduleData] = await Promise.all([
        api.subjects.list().catch(() => []),
        api.attendance.list().catch(() => []),
        api.schedule.get().catch(() => defaultWorkingDaysConfig),
      ]);
      setSubjects(subjectsData || []);
      setLogs(logsData || []);
      setConfig(scheduleData || defaultWorkingDaysConfig);
    } catch {
      // Backend error fallback
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

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const overall = calculateOverallStats(subjects, config.globalTarget);

  const [submittingSubId, setSubmittingSubId] = useState<string | null>(null);

  // Quick 1-Tap modifier for any subject card via API (Spam-Proof)
  const handleQuickModify = async (subjectId: string, action: "present" | "absent") => {
    const todayStr = new Date().toISOString().split("T")[0]!;
    const existingLog = logs.find(
      (l) => l.subjectId === subjectId && l.date === todayStr
    );

    if (existingLog && existingLog.status === action) {
      showToast(`Already marked as ${action} for today!`);
      return;
    }

    const sub = subjects.find((s) => s.id === subjectId);
    setSubmittingSubId(subjectId);

    try {
      const res = await api.subjects.quickLog(subjectId, action);
      if (res && res.alreadyLogged) {
        showToast(res.message || `Already marked as ${action} for today!`);
      } else if (res && res.subject) {
        if (action === "present") {
          triggerConfettiBurst();
          showToast(`Logged Present in ${sub?.name || "Course"}! 🎉`);
        } else {
          showToast(`Logged Absent in ${sub?.name || "Course"}.`);
        }

        setSubjects((prev) =>
          prev.map((s) => (s.id === subjectId ? res.subject : s))
        );
        if (res.log) {
          setLogs((prev) => {
            const filtered = prev.filter(
              (l) => !(l.subjectId === subjectId && l.date === todayStr)
            );
            return [res.log, ...filtered];
          });
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update attendance.");
      loadData();
    } finally {
      setSubmittingSubId(null);
    }
  };

  // Delete a recent log entry via API
  const handleDeleteLog = async (logId: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    showToast("Log entry removed.");
    try {
      await api.attendance.delete(logId);
      // Reload updated counters
      loadData();
    } catch {
      loadData();
    }
  };

  // Chart Data: Overall Attended vs Missed Doughnut
  const doughnutData = {
    labels: ["Classes Attended", "Classes Missed"],
    datasets: [
      {
        data: [overall.totalAttended, overall.totalMissed],
        backgroundColor: ["#10b981", "#f43f5e"],
        borderColor: "rgba(17, 24, 39, 0.95)",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#94a3b8",
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#94a3b8",
        borderColor: "rgba(99, 102, 241, 0.3)",
        borderWidth: 1,
        padding: 12,
      },
    },
    cutout: "70%",
  };

  // Chart Data: Subject Comparison Bar Chart
  const barData = {
    labels: subjects.map((s) => s.code),
    datasets: [
      {
        label: "Attendance %",
        data: subjects.map((s) => {
          const stats = calculateSubjectStats(s.attended, s.total, s.targetPercentage || 75);
          return stats.percentage;
        }),
        backgroundColor: subjects.map((s) => {
          const stats = calculateSubjectStats(s.attended, s.total, s.targetPercentage || 75);
          return stats.percentage >= 75 ? "rgba(16, 185, 129, 0.85)" : "rgba(244, 63, 94, 0.85)";
        }),
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#ffffff",
        bodyColor: "#94a3b8",
        borderColor: "rgba(99, 102, 241, 0.3)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => `Attendance: ${context.raw}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { family: "'Plus Jakarta Sans', sans-serif" } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: {
          color: "#94a3b8",
          callback: (value: any) => `${value}%`,
          font: { family: "'Plus Jakarta Sans', sans-serif" },
        },
      },
    },
  };

  // Find critical subjects that need catch up
  const criticalSubjects = subjects.filter((s) => {
    const stats = calculateSubjectStats(s.attended, s.total, s.targetPercentage || config.globalTarget);
    return stats.neededClasses > 0;
  });

  return (
    <div className="student-home-page">
      <Navbar />

      <main className="dashboard-main-container">
        {/* Hero Banner Cockpit */}
        <section className="dashboard-hero-card glass-card">
          <div className="dash-hero-content">
            <div className="dash-hero-badge">
              <Sparkles size={14} className="sparkle-icon" />
              <span>Student Attendance Dashboard • MongoDB Synced</span>
            </div>
            <h1 className="dash-hero-title">
              Hello, <span className="text-gradient">{currentUser?.name || "Student"}</span> 🎓
            </h1>
            <p className="dash-hero-subtitle">
              Your overall semester attendance is at{" "}
              <strong className={overall.isAboveTarget ? "text-emerald" : "text-rose"}>
                {overall.overallPercentage}%
              </strong>{" "}
              (Target: {config.globalTarget}%). Schedule: Mon–Sat Active.
            </p>
          </div>

          <div className="dash-hero-actions">
            <button className="btn-primary" onClick={() => router.push("/manage")}>
              <CheckSquare size={16} />
              <span>Log Today's Classes</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => router.push("/calculator")}
            >
              <Calculator size={16} />
              <span>Bunk Simulator</span>
            </button>
          </div>
        </section>

        {/* Loading Spinner Indicator */}
        {loadingData && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Fetching live course matrix from database...</span>
          </div>
        )}

        {/* Urgent Attention Alert Banner (if any subject < 75%) */}
        {criticalSubjects.length > 0 && (
          <section className="critical-warning-banner glass-card">
            <div className="banner-left-wrap">
              <div className="warning-icon-circle">
                <AlertTriangle size={20} color="#f43f5e" />
              </div>
              <div className="warning-text-block">
                <h3 className="warning-title">
                  Low Attendance Alert in {criticalSubjects.length}{" "}
                  {criticalSubjects.length === 1 ? "Subject" : "Subjects"}!
                </h3>
                <p className="warning-desc">
                  {criticalSubjects.map((s, idx) => {
                    const stats = calculateSubjectStats(
                      s.attended,
                      s.total,
                      s.targetPercentage || config.globalTarget
                    );
                    return (
                      <span key={s.id}>
                        <strong>{s.name}</strong> ({stats.percentage}%): Attend next{" "}
                        <strong className="text-amber">{stats.neededClasses} consecutive classes</strong>
                        {idx < criticalSubjects.length - 1 ? " • " : ""}
                      </span>
                    );
                  })}
                </p>
              </div>
            </div>

            <button
              className="btn-secondary mini-btn"
              onClick={() => router.push("/calculator")}
            >
              Plan Recovery ➜
            </button>
          </section>
        )}

        {/* 4-Column Quick Stats Row */}
        <section className="metrics-grid">
          {/* Card 1: Overall Semester Attendance */}
          <div className="metric-card glass-card">
            <div className="metric-header">
              <span className="metric-lbl">Overall Attendance</span>
              <div className={`metric-icon-wrap ${overall.isAboveTarget ? "emerald" : "rose"}`}>
                <Award size={16} />
              </div>
            </div>
            <div className="metric-body">
              <span className={`metric-val ${overall.isAboveTarget ? "text-emerald" : "text-rose"}`}>
                {overall.overallPercentage}%
              </span>
              <div className="metric-progress-bar">
                <div
                  className={`metric-progress-fill ${overall.isAboveTarget ? "fill-emerald" : "fill-rose"}`}
                  style={{ width: `${Math.min(100, overall.overallPercentage)}%` }}
                ></div>
              </div>
              <span className="metric-footer-text">
                {overall.totalAttended} / {overall.totalClasses} Total Lectures Attended
              </span>
            </div>
          </div>

          {/* Card 2: Total Safe Bunks Available */}
          <div className="metric-card glass-card">
            <div className="metric-header">
              <span className="metric-lbl">Safe Bunks Left</span>
              <div className="metric-icon-wrap amber">
                <Flame size={16} />
              </div>
            </div>
            <div className="metric-body">
              <div className="metric-streak-wrap">
                <span className="metric-val text-amber">{overall.totalSafeBunks} Bunks</span>
                <Flame size={18} className="flame-pulse" />
              </div>
              <span className="metric-footer-text">
                Can be safely skipped across safe subjects
              </span>
            </div>
          </div>

          {/* Card 3: Classes Needed (Make-up) */}
          <div className="metric-card glass-card">
            <div className="metric-header">
              <span className="metric-lbl">Catch-Up Classes</span>
              <div className="metric-icon-wrap indigo">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="metric-body">
              <span className="metric-val text-cyan">
                {overall.totalNeeded} Classes
              </span>
              <span className="metric-footer-text">
                Required to bring all courses above {config.globalTarget}%
              </span>
            </div>
          </div>

          {/* Card 4: Working Days & Schedule */}
          <div className="metric-card glass-card">
            <div className="metric-header">
              <span className="metric-lbl">Working Schedule</span>
              <div className="metric-icon-wrap purple">
                <CalendarCheck size={16} />
              </div>
            </div>
            <div className="metric-body">
              <span className="metric-val">
                {config.activeDays?.length || 6} Days / Wk
              </span>
              <span className="metric-footer-link" onClick={() => router.push("/schedule")}>
                Mon – Sat Active (Customize) ➜
              </span>
            </div>
          </div>
        </section>

        {/* Enrolled Subjects Grid */}
        <section className="subjects-section">
          <div className="section-head-row">
            <div>
              <h2 className="section-title">Enrolled Courses & Bunk Radar</h2>
              <p className="section-subtitle">
                Real-time subject attendance with one-tap modifiers and safe bunk prediction
              </p>
            </div>

            <button
              className="btn-secondary mini-btn"
              onClick={() => router.push("/subjects")}
            >
              <Plus size={14} /> Manage Subjects
            </button>
          </div>

          {subjects.length === 0 ? (
            <div
              className="empty-state-card glass-card"
              style={{
                padding: "3rem 2rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                borderRadius: "12px",
                border: "1px dashed rgba(255,255,255,0.15)",
                marginTop: "1rem",
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
                <h3 style={{ color: "#ffffff", fontSize: "1.2rem", fontWeight: 700 }}>
                  No Enrolled Courses Yet
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: "0.35rem", maxWidth: "450px" }}>
                  Get started by adding your courses, lecture working days, and target goals.
                </p>
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: "0.5rem" }}
                onClick={() => router.push("/subjects")}
              >
                <Plus size={16} />
                <span>Enroll Your First Course</span>
              </button>
            </div>
          ) : (
            <div className="subjects-grid">
            {subjects.map((sub) => {
              const stats = calculateSubjectStats(
                sub.attended,
                sub.total,
                sub.targetPercentage || config.globalTarget
              );
              const target = sub.targetPercentage || config.globalTarget;
              const isSafe = stats.percentage >= target;

              return (
                <div key={sub.id} className="student-subject-card glass-card">
                  {/* Card Header */}
                  <div className="card-sub-header">
                    <div className="sub-tag-group">
                      <span
                        className="sub-color-indicator"
                        style={{ background: sub.color }}
                      ></span>
                      <span className="sub-code-badge">{sub.code}</span>
                    </div>

                    <span
                      className={`badge ${
                        stats.status === "safe"
                          ? "badge-emerald"
                          : stats.status === "warning"
                          ? "badge-amber"
                          : "badge-rose"
                      }`}
                    >
                      {stats.percentage}%
                    </span>
                  </div>

                  {/* Subject Name & Meta */}
                  <div className="card-sub-info">
                    <h3 className="sub-name">{sub.name}</h3>
                    <p className="sub-prof">
                      {sub.professor || "Faculty"} • {sub.room || "Campus Hall"}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="sub-progress-block">
                    <div className="sub-progress-bar">
                      <div
                        className={`sub-progress-fill ${isSafe ? "fill-emerald" : "fill-rose"}`}
                        style={{ width: `${Math.min(100, stats.percentage)}%` }}
                      ></div>
                    </div>
                    <div className="sub-ratio-line">
                      <span>
                        <strong>{sub.attended}</strong> attended
                      </span>
                      <span>
                        <strong>{stats.missed}</strong> missed (of {sub.total})
                      </span>
                    </div>
                  </div>

                  {/* Bunk / Catch Up Telemetry Box */}
                  <div
                    className={`sub-bunk-box ${
                      isSafe ? "bunk-safe-bg" : "bunk-danger-bg"
                    }`}
                  >
                    {isSafe ? (
                      <div className="bunk-box-content">
                        <Flame size={15} color="#10b981" />
                        <span>
                          Can bunk <strong>{stats.safeBunks}</strong> more{" "}
                          {stats.safeBunks === 1 ? "class" : "classes"}!
                        </span>
                      </div>
                    ) : (
                      <div className="bunk-box-content">
                        <AlertTriangle size={15} color="#f43f5e" />
                        <span>
                          Attend next <strong>{stats.neededClasses}</strong>{" "}
                          {stats.neededClasses === 1 ? "class" : "classes"}!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Quick Action Buttons */}
                  <div className="sub-card-actions">
                    <button
                      className="quick-log-btn btn-present"
                      onClick={() => handleQuickModify(sub.id, "present")}
                      disabled={submittingSubId === sub.id}
                      title="Log 1 attended class"
                    >
                      <Plus size={13} /> Present
                    </button>
                    <button
                      className="quick-log-btn btn-absent"
                      onClick={() => handleQuickModify(sub.id, "absent")}
                      disabled={submittingSubId === sub.id}
                      title="Log 1 missed class"
                    >
                      <Minus size={13} /> Absent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

        {/* 2-Column Section: Chart Analytics & Recent Attendance Feed */}
        <section className="analytics-split-grid">
          {/* Left Column: Charts Suite */}
          <div className="analytics-card glass-card">
            <div className="card-top-bar">
              <div className="card-title-group">
                <h3>Semester Attendance Analytics</h3>
                <p>Visual representation of attendance distribution</p>
              </div>

              <div className="view-toggle-pills">
                <button
                  className={`toggle-pill ${chartView === "doughnut" ? "active" : ""}`}
                  onClick={() => setChartView("doughnut")}
                >
                  Overall Ratio
                </button>
                <button
                  className={`toggle-pill ${chartView === "bar" ? "active" : ""}`}
                  onClick={() => setChartView("bar")}
                >
                  Subject % Comparison
                </button>
              </div>
            </div>

            <div className="chart-canvas-container">
              {isMounted ? (
                chartView === "doughnut" ? (
                  <div className="doughnut-wrap">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                ) : (
                  <div className="bar-wrap">
                    <Bar data={barData} options={barOptions} />
                  </div>
                )
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
                  <span>Loading analytics...</span>
                </div>
              )}
            </div>

            <div className="chart-footer-legend">
              <div className="legend-stat">
                <span className="legend-dot dot-present"></span>
                <span>Attended: <strong>{overall.totalAttended}</strong></span>
              </div>
              <div className="legend-stat">
                <span className="legend-dot dot-absent"></span>
                <span>Missed: <strong>{overall.totalMissed}</strong></span>
              </div>
              <div className="legend-stat">
                <span className="legend-dot dot-target"></span>
                <span>Goal: <strong>{config.globalTarget}%</strong></span>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity Feed */}
          <div className="recent-logs-card glass-card">
            <div className="card-top-bar">
              <div className="card-title-group">
                <h3>Recent Attendance Activity</h3>
                <p>Audit trail of your recent class logs</p>
              </div>
              <button
                className="btn-secondary mini-btn"
                onClick={() => router.push("/manage")}
              >
                <CheckSquare size={13} /> Full Logger
              </button>
            </div>

            <div className="recent-logs-list">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="recent-log-row">
                  <div className="log-row-left">
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
                    <div className="log-info-stack">
                      <span className="log-sub-name">{log.subjectName}</span>
                      <span className="log-date font-mono">{log.date}</span>
                    </div>
                  </div>

                  <button
                    className="log-del-btn"
                    onClick={() => handleDeleteLog(log.id)}
                    title="Remove entry"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
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

export default Home;
