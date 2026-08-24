import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import Navbar from "./navbar";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Flame,
  AlertTriangle,
  X,
  Save,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  calculateSubjectStats,
  triggerConfettiBurst,
  defaultWorkingDaysConfig,
  type Subject,
  type WorkingDaysConfig,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./subjectsManager.css";

function SubjectsManager() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [config, setConfig] = useState<WorkingDaysConfig>(defaultWorkingDaysConfig);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState<string>("");
  const [formCode, setFormCode] = useState<string>("");
  const [formAttended, setFormAttended] = useState<number>(0);
  const [formTotal, setFormTotal] = useState<number>(0);
  const [formTarget, setFormTarget] = useState<number>(75);
  const [formProf, setFormProf] = useState<string>("");
  const [formRoom, setFormRoom] = useState<string>("");
  const [formColor, setFormColor] = useState<string>("#6366f1");
  const [formWorkingDays, setFormWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [formStartDate, setFormStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [subsData, schedData] = await Promise.all([
        api.subjects.list().catch(() => []),
        api.schedule.get().catch(() => defaultWorkingDaysConfig),
      ]);
      setSubjects(subsData || []);
      setConfig(schedData || defaultWorkingDaysConfig);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate("/login");
      } else {
        loadData();
      }
    }
  }, [authLoading, isAuthenticated, loadData, navigate]);

  const weekDayOptions = [
    { index: 1, short: "Mon", full: "Monday" },
    { index: 2, short: "Tue", full: "Tuesday" },
    { index: 3, short: "Wed", full: "Wednesday" },
    { index: 4, short: "Thu", full: "Thursday" },
    { index: 5, short: "Fri", full: "Friday" },
    { index: 6, short: "Sat", full: "Saturday" },
    { index: 0, short: "Sun", full: "Sunday" },
  ];

  const toggleWorkingDay = (dayIdx: number) => {
    if (formWorkingDays.includes(dayIdx)) {
      if (formWorkingDays.length === 1) {
        showToast("Please select at least 1 scheduled lecture day!");
        return;
      }
      setFormWorkingDays(formWorkingDays.filter((d) => d !== dayIdx));
    } else {
      setFormWorkingDays([...formWorkingDays, dayIdx].sort());
    }
  };

  const applyDayPreset = (preset: "6day" | "5day" | "mwf" | "tts") => {
    if (preset === "6day") setFormWorkingDays([1, 2, 3, 4, 5, 6]);
    else if (preset === "5day") setFormWorkingDays([1, 2, 3, 4, 5]);
    else if (preset === "mwf") setFormWorkingDays([1, 3, 5]);
    else if (preset === "tts") setFormWorkingDays([2, 4, 6]);
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setFormName("");
    setFormCode("");
    setFormAttended(0);
    setFormTotal(0);
    setFormTarget(config.globalTarget || 75);
    setFormProf("");
    setFormRoom("");
    setFormColor("#6366f1");
    setFormWorkingDays(config.activeDays || [1, 2, 3, 4, 5, 6]);
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setShowAddModal(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCode(sub.code);
    setFormAttended(sub.attended);
    setFormTotal(sub.total);
    setFormTarget(sub.targetPercentage || config.globalTarget || 75);
    setFormProf(sub.professor || "");
    setFormRoom(sub.room || "");
    setFormColor(sub.color || "#6366f1");
    setFormWorkingDays(sub.workingDays || [1, 2, 3, 4, 5, 6]);
    setFormStartDate(sub.startDate || new Date().toISOString().split("T")[0]);
    setShowAddModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showToast("Please enter subject name and course code.");
      return;
    }

    if (formAttended > formTotal) {
      showToast("Attended classes cannot exceed total classes conducted!");
      return;
    }

    if (formWorkingDays.length === 0) {
      showToast("Please select at least 1 working day for this course.");
      return;
    }

    const payload = {
      name: formName,
      code: formCode,
      attended: formAttended,
      total: formTotal,
      targetPercentage: formTarget,
      professor: formProf,
      room: formRoom,
      color: formColor,
      credits: 3,
      workingDays: formWorkingDays,
      startDate: formStartDate,
    };

    try {
      if (editingSubject) {
        const updated = await api.subjects.update(editingSubject.id, payload);
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingSubject.id ? updated : s))
        );
        showToast(`Course ${formCode} updated in database! 📚`);
      } else {
        const created = await api.subjects.create(payload);
        setSubjects((prev) => [...prev, created]);
        triggerConfettiBurst();
        showToast(`Enrolled in new course ${formName}! 🎉`);
      }
    } catch {
      showToast("Failed to save course. Please check backend connection.");
      loadData();
    }

    setShowAddModal(false);
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      showToast(`Subject ${name} removed from enrollment.`);
      try {
        await api.subjects.delete(id);
      } catch {
        loadData();
      }
    }
  };

  const formatWorkingDays = (days?: number[]) => {
    if (!days || days.length === 0) return "Mon–Sat";
    if (days.length === 7) return "All 7 Days";
    if (days.length === 6 && !days.includes(0)) return "Mon–Sat";
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Mon–Fri";
    
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((d) => dayNames[d]).join(", ");
  };

  const colorPalette = [
    "#6366f1", // Indigo
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#a855f7", // Purple
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#3b82f6", // Blue
  ];

  return (
    <div className="subjects-manager-page">
      <Navbar />

      <main className="sub-mgr-container">
        {/* Hero Header Card */}
        <section className="sub-hero-card glass-card">
          <div className="sub-hero-left">
            <div className="badge badge-cyan">
              <Sparkles size={13} />
              <span>Semester Curriculum Management • MongoDB Synced</span>
            </div>
            <h1 className="sub-title">Enrolled Courses & Criteria</h1>
            <p className="sub-subtitle">
              Add courses, set lecture working days, and configure custom attendance targets.
            </p>
          </div>

          <button className="btn-primary add-course-btn" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add New Course</span>
          </button>
        </section>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Loading courses from database...</span>
          </div>
        )}

        {/* Subjects Grid */}
        {subjects.length === 0 && !loading ? (
          <section
            className="empty-courses-box glass-card"
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.25rem",
              borderRadius: "16px",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={32} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ color: "#ffffff", fontSize: "1.3rem", fontWeight: 700 }}>
                No Enrolled Courses Found
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "460px" }}>
                You haven't enrolled in any courses yet. Add your semester subjects to start tracking lectures, working days, and target criteria.
              </p>
            </div>
            <button className="btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              <span>Enroll Your First Course</span>
            </button>
          </section>
        ) : (
          <section className="courses-grid">
            {subjects.map((sub) => {
              const stats = calculateSubjectStats(
                sub.attended,
                sub.total,
                sub.targetPercentage || config.globalTarget
              );
              const isSafe =
                stats.percentage >= (sub.targetPercentage || config.globalTarget);

              return (
                <div key={sub.id} className="course-card glass-card">
                <div className="course-card-top">
                  <div className="course-code-wrap">
                    <span
                      className="course-color-dot"
                      style={{ background: sub.color }}
                    ></span>
                    <span className="course-code font-mono">{sub.code}</span>
                  </div>

                  <div className="course-card-actions">
                    <button
                      className="card-act-btn"
                      onClick={() => openEditModal(sub)}
                      title="Edit Subject & Working Days"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="card-act-btn del"
                      onClick={() => handleDeleteSubject(sub.id, sub.name)}
                      title="Delete Subject"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="course-name-block">
                  <h3 className="course-name">{sub.name}</h3>
                  <p className="course-prof">
                    {sub.professor || "Faculty"} • {sub.room || "Lab"}
                  </p>
                </div>

                {/* Working Days Pill */}
                <div className="course-schedule-tag">
                  <Calendar size={12} className="text-cyan" />
                  <span>Days: <strong>{formatWorkingDays(sub.workingDays)}</strong></span>
                </div>

                {/* Progress Bar & Ratio */}
                <div className="course-progress-block">
                  <div className="course-bar-header">
                    <span className="course-pct-label font-mono font-bold">
                      {stats.percentage}%
                    </span>
                    <span className="course-target-tag">
                      Target: {sub.targetPercentage || config.globalTarget}%
                    </span>
                  </div>

                  <div className="course-progress-track">
                    <div
                      className={`course-progress-fill ${
                        isSafe ? "fill-emerald" : "fill-rose"
                      }`}
                      style={{ width: `${Math.min(100, stats.percentage)}%` }}
                    ></div>
                  </div>

                  <div className="course-ratio-sub">
                    <span>
                      {sub.attended} Attended / {sub.total} Total Conducted
                    </span>
                  </div>
                </div>

                {/* Bunk Forecast Status */}
                <div
                  className={`course-bunk-pill ${
                    isSafe ? "safe-pill" : "danger-pill"
                  }`}
                >
                  {isSafe ? (
                    <div className="bunk-pill-inner">
                      <Flame size={14} color="#10b981" />
                      <span>
                        Can safely bunk <strong>{stats.safeBunks}</strong> more{" "}
                        {stats.safeBunks === 1 ? "lecture" : "lectures"}!
                      </span>
                    </div>
                  ) : (
                    <div className="bunk-pill-inner">
                      <AlertTriangle size={14} color="#f43f5e" />
                      <span>
                        Attend next <strong>{stats.neededClasses}</strong>{" "}
                        {stats.neededClasses === 1 ? "lecture" : "lectures"} to recover!
                      </span>
                    </div>
                  )}
                </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Add / Edit Subject Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-content glass-card sub-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-title-wrap">
                  <BookOpen size={18} color="#6366f1" />
                  <h4>
                    {editingSubject
                      ? `Edit Course • ${editingSubject.code}`
                      : "Enroll New Course"}
                  </h4>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSubject} className="sub-form">
                {/* Course Name & Code */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Course Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cloud Computing"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CS-306"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Working Days Selector for this Course */}
                <div className="form-group">
                  <div className="schedule-head-row">
                    <label className="form-label">Scheduled Lecture Working Days</label>
                    <span className="days-count-badge">
                      {formWorkingDays.length} {formWorkingDays.length === 1 ? "Day" : "Days"}/Wk
                    </span>
                  </div>

                  {/* 7-Day Toggle Row */}
                  <div className="modal-days-toggle-row">
                    {weekDayOptions.map((day) => {
                      const isActive = formWorkingDays.includes(day.index);
                      return (
                        <button
                          key={day.index}
                          type="button"
                          className={`modal-day-btn ${isActive ? "active" : ""}`}
                          onClick={() => toggleWorkingDay(day.index)}
                          title={`Toggle ${day.full}`}
                        >
                          <span className="m-day-short">{day.short}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="modal-presets-bar">
                    <span className="preset-text">Presets:</span>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyDayPreset("6day")}
                    >
                      Mon–Sat (6d)
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyDayPreset("5day")}
                    >
                      Mon–Fri (5d)
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyDayPreset("mwf")}
                    >
                      MWF
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => applyDayPreset("tts")}
                    >
                      TTS
                    </button>
                  </div>
                  {/* Auto-increment explanation note */}
                  <div
                    style={{
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      fontSize: "0.76rem",
                      color: "#c7d2fe",
                      marginTop: "0.5rem",
                    }}
                  >
                    ⚡ <strong>Automatic Timetable Tracking:</strong> On every selected day of the week, the app automatically tracks that day's scheduled lecture.
                  </div>
                </div>

                {/* Tracking Start Date */}
                <div className="form-group">
                  <label className="form-label">Course Tracking Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                  />
                </div>

                {/* Attendance Stats & Target */}
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Initial Attended (Prior)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={formAttended}
                      onChange={(e) => setFormAttended(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Total (Prior)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={formTotal}
                      onChange={(e) => setFormTotal(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target % Goal</label>
                    <input
                      type="number"
                      min={50}
                      max={95}
                      className="form-input"
                      value={formTarget}
                      onChange={(e) => setFormTarget(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {/* Faculty & Room */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Professor Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dr. A. Sharma"
                      value={formProf}
                      onChange={(e) => setFormProf(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Room / Lab Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Lab 304"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                    />
                  </div>
                </div>

                {/* Color Chooser */}
                <div className="form-group">
                  <label className="form-label">Course Accent Color</label>
                  <div className="color-palette-row">
                    {colorPalette.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-swatch-btn ${
                          formColor === c ? "selected" : ""
                        }`}
                        style={{ background: c }}
                        onClick={() => setFormColor(c)}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <Save size={15} />
                    <span>{editingSubject ? "Save Changes" : "Enroll Course"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

export default SubjectsManager;
