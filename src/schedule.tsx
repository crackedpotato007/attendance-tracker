import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import Navbar from "./navbar";
import {
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  X,
  Check,
  Slash,
  BookOpen,
  Edit3,
} from "lucide-react";
import {
  triggerConfettiBurst,
  defaultWorkingDaysConfig,
  type WorkingDaysConfig,
  type AttendanceRecord,
  type Subject,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./schedule.css";

interface CalendarDayItem {
  dayNumber: number;
  dateStr: string;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isWorking: boolean;
  holiday?: { date: string; name: string };
  dateLogs: AttendanceRecord[];
  status: "attended" | "partial" | "holiday" | "off" | "working-unlogged";
  isToday: boolean;
}

function Schedule() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<WorkingDaysConfig>(defaultWorkingDaysConfig);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Day for Interactive Attendance Modifier Modal
  const [activeDateModal, setActiveDateModal] = useState<string | null>(null);
  const [submittingSubId, setSubmittingSubId] = useState<string | null>(null);

  // New Holiday Input State
  const [holidayDate, setHolidayDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [holidayName, setHolidayName] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedData, logsData, subsData] = await Promise.all([
        api.schedule.get().catch(() => defaultWorkingDaysConfig),
        api.attendance.list().catch(() => []),
        api.subjects.list().catch(() => []),
      ]);
      setConfig(schedData || defaultWorkingDaysConfig);
      setLogs(logsData || []);
      setSubjects(subsData || []);
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

  const daysOfWeek = [
    { index: 1, name: "Monday", short: "Mon" },
    { index: 2, name: "Tuesday", short: "Tue" },
    { index: 3, name: "Wednesday", short: "Wed" },
    { index: 4, name: "Thursday", short: "Thu" },
    { index: 5, name: "Friday", short: "Fri" },
    { index: 6, name: "Saturday", short: "Sat" },
    { index: 0, name: "Sunday", short: "Sun" },
  ];

  // Toggle individual day in active working days via API
  const handleToggleDay = async (dayIndex: number) => {
    let nextActiveDays: number[];
    if ((config.activeDays || [1, 2, 3, 4, 5, 6]).includes(dayIndex)) {
      if (config.activeDays.length === 1) {
        showToast("You must have at least 1 working day in your schedule!");
        return;
      }
      nextActiveDays = config.activeDays.filter((d) => d !== dayIndex);
    } else {
      nextActiveDays = [...(config.activeDays || [1, 2, 3, 4, 5, 6]), dayIndex].sort();
    }

    const updated = { ...config, activeDays: nextActiveDays };
    setConfig(updated);
    showToast("Working days schedule updated! 📅");

    try {
      await api.schedule.update({ activeDays: nextActiveDays });
    } catch {
      loadData();
    }
  };

  const applyPreset = async (preset: "6day" | "5day" | "7day") => {
    let presetDays = [1, 2, 3, 4, 5, 6];
    if (preset === "5day") presetDays = [1, 2, 3, 4, 5];
    if (preset === "7day") presetDays = [0, 1, 2, 3, 4, 5, 6];

    const updated = { ...config, activeDays: presetDays };
    setConfig(updated);
    showToast(`Applied ${preset === "6day" ? "Mon–Sat 6-day" : preset === "5day" ? "Mon–Fri 5-day" : "7-day"} schedule!`);

    try {
      await api.schedule.update({ activeDays: presetDays });
    } catch {
      loadData();
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim()) {
      showToast("Please enter holiday or fest name.");
      return;
    }

    const currentHols = config.customHolidays || [];
    if (currentHols.some((h) => h.date === holidayDate)) {
      showToast("A holiday already exists for this date.");
      return;
    }

    const updatedHols = [...currentHols, { date: holidayDate, name: holidayName.trim() }];
    setConfig((prev) => ({ ...prev, customHolidays: updatedHols }));
    setHolidayName("");
    showToast(`Added holiday: ${holidayName.trim()} on ${holidayDate} 🎉`);

    try {
      await api.schedule.update({ customHolidays: updatedHols });
    } catch {
      loadData();
    }
  };

  const handleRemoveHoliday = async (date: string) => {
    const updatedHols = (config.customHolidays || []).filter((h) => h.date !== date);
    setConfig((prev) => ({ ...prev, customHolidays: updatedHols }));
    showToast(`Removed holiday for ${date}.`);

    try {
      await api.schedule.update({ customHolidays: updatedHols });
    } catch {
      loadData();
    }
  };

  // Modify attendance for a specific subject on activeDateModal
  const handleModifyDayAttendance = async (
    subjectId: string,
    status: "present" | "absent" | "cancelled"
  ) => {
    if (!activeDateModal) return;
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;

    setSubmittingSubId(subjectId);

    try {
      const res = await api.attendance.create({
        subjectId: sub.id,
        subjectName: sub.name,
        date: activeDateModal,
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
          showToast(`Marked Present in ${sub.name} for ${activeDateModal}! 🎉`);
        } else if (status === "absent") {
          showToast(`Marked Absent in ${sub.name} for ${activeDateModal}.`);
        } else {
          showToast(`Marked ${sub.name} as Cancelled for ${activeDateModal}.`);
        }

        setLogs((prev) => {
          const filtered = prev.filter(
            (l) => !(l.subjectId === sub.id && l.date === activeDateModal)
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
      showToast(err.message || "Failed to update attendance.");
      loadData();
    } finally {
      setSubmittingSubId(null);
    }
  };

  // Revert / clear attendance log for a specific subject on activeDateModal
  const handleClearDayLog = async (logId: string, subjectId: string) => {
    if (!activeDateModal) return;
    setSubmittingSubId(subjectId);

    try {
      await api.attendance.delete(logId);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      showToast(`Reverted attendance log for ${activeDateModal}.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to revert log.");
      loadData();
    } finally {
      setSubmittingSubId(null);
    }
  };

  // Month navigation
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Generate Calendar Matrix for Selected Month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();

  const calendarDays: CalendarDayItem[] = [];

  // Pad previous month days
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({
      dayNumber: 0,
      dateStr: "",
      dayOfWeek: i,
      isCurrentMonth: false,
      isWorking: false,
      dateLogs: [],
      status: "off",
      isToday: false,
    });
  }

  const todayStr = new Date().toISOString().split("T")[0]!;

  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;
    const dayDate = new Date(selectedYear, selectedMonth, d);
    const dayOfWeek = dayDate.getDay();

    const isToday = dateStr === todayStr;
    const isWorking = (config.activeDays || [1, 2, 3, 4, 5, 6]).includes(dayOfWeek);
    const holiday = (config.customHolidays || []).find((h) => h.date === dateStr);

    const dateLogs = logs.filter((l) => l.date === dateStr);

    let status: CalendarDayItem["status"] = "off";
    if (holiday) {
      status = "holiday";
    } else if (!isWorking) {
      status = "off";
    } else {
      if (dateLogs.length > 0) {
        const hasAbsent = dateLogs.some((l) => l.status === "absent");
        status = hasAbsent ? "partial" : "attended";
      } else {
        status = "working-unlogged";
      }
    }

    calendarDays.push({
      dayNumber: d,
      dateStr,
      dayOfWeek,
      isCurrentMonth: true,
      isWorking,
      holiday,
      dateLogs,
      status,
      isToday,
    });
  }

  // Active day details for modal
  const activeDayItem = activeDateModal
    ? calendarDays.find((d) => d.dateStr === activeDateModal) || {
        dayNumber: Number(activeDateModal.split("-")[2]),
        dateStr: activeDateModal,
        dayOfWeek: new Date(activeDateModal).getDay(),
        isCurrentMonth: true,
        isWorking: (config.activeDays || [1, 2, 3, 4, 5, 6]).includes(
          new Date(activeDateModal).getDay()
        ),
        holiday: (config.customHolidays || []).find((h) => h.date === activeDateModal),
        dateLogs: logs.filter((l) => l.date === activeDateModal),
        status: "working-unlogged" as const,
        isToday: activeDateModal === todayStr,
      }
    : null;

  return (
    <div className="schedule-page">
      <Navbar />

      <main className="schedule-container">
        {/* Header Hero */}
        <section className="schedule-hero-card glass-card">
          <div className="sched-hero-left">
            <div className="badge badge-indigo">
              <Sparkles size={13} />
              <span>Timetable & Working Days Architecture • MongoDB Synced</span>
            </div>
            <h1 className="sched-title">Working Days & Interactive Calendar</h1>
            <p className="sched-subtitle">
              Configure your college working days, mark breaks, and click on any calendar day to modify or backfill your class attendance.
            </p>
          </div>
        </section>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Loading schedule config from database...</span>
          </div>
        )}

        {/* 2-Column Split: Working Days Customizer & Holiday Manager */}
        <div className="sched-top-split">
          {/* Working Days Customizer */}
          <section className="working-days-card glass-card">
            <div className="card-top-bar">
              <div className="card-title-group">
                <h3>Custom Working Days Setup</h3>
                <p>Select which days of the week have scheduled classes</p>
              </div>
              <span className="badge badge-emerald">
                {config.activeDays?.length || 6} Active Days
              </span>
            </div>

            {/* 7-Day Toggle Grid */}
            <div className="days-toggle-grid">
              {daysOfWeek.map((day) => {
                const isActive = (config.activeDays || [1, 2, 3, 4, 5, 6]).includes(day.index);
                return (
                  <button
                    key={day.index}
                    className={`day-card-toggle ${isActive ? "active" : "inactive"}`}
                    onClick={() => handleToggleDay(day.index)}
                  >
                    <span className="day-card-name">{day.short}</span>
                    <span className="day-full-name">{day.name}</span>
                    <span className={`day-status-pill ${isActive ? "on" : "off"}`}>
                      {isActive ? "Working" : "Off Day"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preset Action Buttons */}
            <div className="preset-bar">
              <span className="preset-lbl">Quick Presets:</span>
              <div className="preset-buttons">
                <button
                  className="preset-btn"
                  onClick={() => applyPreset("6day")}
                >
                  Standard 6-Day (Mon–Sat)
                </button>
                <button
                  className="preset-btn"
                  onClick={() => applyPreset("5day")}
                >
                  5-Day Week (Mon–Fri)
                </button>
                <button
                  className="preset-btn"
                  onClick={() => applyPreset("7day")}
                >
                  All 7 Days
                </button>
              </div>
            </div>
          </section>

          {/* College Holidays & Fest Manager */}
          <section className="holiday-mgr-card glass-card">
            <div className="card-top-bar">
              <div className="card-title-group">
                <h3>College Holidays & Fests</h3>
                <p>Days when lectures are suspended (won't count as bunks)</p>
              </div>
            </div>

            {/* Add Holiday Form */}
            <form onSubmit={handleAddHoliday} className="add-holiday-form">
              <div className="hol-input-row">
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="hol-date-input"
                  required
                />
                <input
                  type="text"
                  placeholder="e.g. Annual Tech Fest"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="hol-name-input"
                  required
                />
                <button type="submit" className="btn-primary hol-add-btn">
                  <Plus size={15} /> Add
                </button>
              </div>
            </form>

            {/* Holiday List */}
            <div className="holiday-items-list">
              {(config.customHolidays || []).length === 0 ? (
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  No custom holidays added yet. Add university fests or exam breaks above.
                </span>
              ) : (
                (config.customHolidays || []).map((hol) => (
                  <div key={hol.date} className="hol-row-item">
                    <div className="hol-row-left">
                      <span className="hol-badge-date font-mono font-bold">
                        {hol.date}
                      </span>
                      <span className="hol-row-title">{hol.name}</span>
                    </div>
                    <button
                      className="hol-del-btn"
                      onClick={() => handleRemoveHoliday(hol.date)}
                      title="Remove Holiday"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Interactive Monthly Attendance Calendar */}
        <section className="calendar-full-section glass-card">
          <div className="card-top-bar">
            <div className="card-title-group">
              <h3>
                {monthNames[selectedMonth]} {selectedYear} Attendance Schedule & Modifier
              </h3>
              <p>
                <strong>Click on any day</strong> to view, modify, or backfill subject attendance records for that date.
              </p>
            </div>

            <div className="cal-nav-buttons">
              <button
                className="cal-nav-btn"
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#ffffff", padding: "0 0.5rem" }}>
                {monthNames[selectedMonth]} {selectedYear}
              </span>
              <button
                className="cal-nav-btn"
                onClick={handleNextMonth}
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="cal-grid-header">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="cal-head-cell">
                {day}
              </div>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="cal-matrix-grid">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return <div key={idx} className="cal-cell empty"></div>;
              }

              const presentCount = item.dateLogs.filter((l) => l.status === "present").length;
              const absentCount = item.dateLogs.filter((l) => l.status === "absent").length;
              const cancelledCount = item.dateLogs.filter((l) => l.status === "cancelled").length;

              return (
                <div
                  key={idx}
                  className={`cal-cell status-${item.status} ${
                    item.isToday ? "today-glow" : ""
                  }`}
                  onClick={() => setActiveDateModal(item.dateStr)}
                  title={`Click to inspect & modify attendance for ${item.dateStr}`}
                  style={{ cursor: "pointer", position: "relative" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="cal-cell-day">{item.dayNumber}</span>
                    <Edit3 size={11} className="cal-edit-icon" style={{ opacity: 0.4 }} />
                  </div>

                  {item.holiday && (
                    <span className="cal-hol-tag">{item.holiday.name}</span>
                  )}

                  {/* Badges for classes logged on this day */}
                  {item.dateLogs.length > 0 && (
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                      {presentCount > 0 && (
                        <span style={{ fontSize: "0.68rem", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                          ✓ {presentCount}
                        </span>
                      )}
                      {absentCount > 0 && (
                        <span style={{ fontSize: "0.68rem", background: "rgba(244, 63, 94, 0.2)", color: "#f43f5e", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                          ✕ {absentCount}
                        </span>
                      )}
                      {cancelledCount > 0 && (
                        <span style={{ fontSize: "0.68rem", background: "rgba(148, 163, 184, 0.2)", color: "#94a3b8", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                          ⊘ {cancelledCount}
                        </span>
                      )}
                    </div>
                  )}

                  {item.status === "working-unlogged" && (
                    <span className="cal-dot slate" title="Unlogged working day"></span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="cal-legend-row">
            <div className="cal-leg-item">
              <span className="cal-dot-circle green"></span>
              <span>Attended Classes</span>
            </div>
            <div className="cal-leg-item">
              <span className="cal-dot-circle red"></span>
              <span>Missed / Bunked / Auto-Absent</span>
            </div>
            <div className="cal-leg-item">
              <span className="cal-dot-circle purple"></span>
              <span>College Holiday / Fest</span>
            </div>
            <div className="cal-leg-item">
              <span className="cal-dot-circle slate"></span>
              <span>Configured Off Day</span>
            </div>
          </div>
        </section>

        {/* Interactive Day Attendance Modifier Modal */}
        {activeDateModal && activeDayItem && (
          <div
            className="modal-overlay"
            onClick={() => setActiveDateModal(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              className="modal-content glass-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "680px",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CalendarIcon size={20} color="#6366f1" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", margin: 0 }}>
                      Attendance Editor for {activeDateModal}
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>
                      {daysOfWeek.find((d) => d.index === activeDayItem.dayOfWeek)?.name || "Day"} •{" "}
                      {activeDayItem.holiday
                        ? `Holiday: ${activeDayItem.holiday.name}`
                        : activeDayItem.isWorking
                        ? "Active College Day"
                        : "Configured Off-Day"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveDateModal(null)}
                  style={{ background: "rgba(255, 255, 255, 0.05)", border: "none", color: "#94a3b8", padding: "0.4rem", borderRadius: "8px", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Course List on this Date */}
              {subjects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8" }}>
                  <BookOpen size={32} style={{ margin: "0 auto 0.5rem auto", opacity: 0.5 }} />
                  <p>No courses enrolled. Please add your subjects in Course Manager first.</p>
                  <button className="btn-primary" onClick={() => navigate("/subjects")} style={{ marginTop: "0.5rem" }}>
                    Enroll Courses
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Enrolled Courses ({subjects.length})
                  </span>

                  {subjects.map((sub) => {
                    const isScheduledToday =
                      sub.workingDays && sub.workingDays.includes(activeDayItem.dayOfWeek);
                    const log = logs.find(
                      (l) => l.subjectId === sub.id && l.date === activeDateModal
                    );
                    const status = log?.status; // "present" | "absent" | "cancelled" | undefined
                    const isBusy = submittingSubId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${
                            status === "present"
                              ? "rgba(16, 185, 129, 0.4)"
                              : status === "absent"
                              ? "rgba(244, 63, 94, 0.4)"
                              : status === "cancelled"
                              ? "rgba(148, 163, 184, 0.3)"
                              : "rgba(255, 255, 255, 0.08)"
                          }`,
                          borderRadius: "12px",
                          padding: "1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Course Info */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "160px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: sub.color || "#6366f1" }}>
                              {sub.code}
                            </span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
                              {sub.name}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.76rem" }}>
                            {isScheduledToday ? (
                              <span style={{ color: "#10b981", fontWeight: 600 }}>● Scheduled on Timetable</span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>○ Not Scheduled</span>
                            )}
                            <span style={{ color: "#64748b" }}>•</span>
                            <span style={{ color: "#94a3b8" }}>
                              Total: {sub.attended}/{sub.total} classes
                            </span>
                          </div>
                        </div>

                        {/* Status Pill & Action Buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          {/* Present Button */}
                          <button
                            onClick={() => handleModifyDayAttendance(sub.id, "present")}
                            disabled={isBusy}
                            style={{
                              padding: "0.45rem 0.8rem",
                              borderRadius: "8px",
                              border: status === "present" ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.1)",
                              background: status === "present" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.02)",
                              color: status === "present" ? "#10b981" : "#ffffff",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <Check size={14} />
                            <span>{status === "present" ? "Present ✓" : "Present"}</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            onClick={() => handleModifyDayAttendance(sub.id, "absent")}
                            disabled={isBusy}
                            style={{
                              padding: "0.45rem 0.8rem",
                              borderRadius: "8px",
                              border: status === "absent" ? "1px solid #f43f5e" : "1px solid rgba(255, 255, 255, 0.1)",
                              background: status === "absent" ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.02)",
                              color: status === "absent" ? "#f43f5e" : "#ffffff",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <X size={14} />
                            <span>{status === "absent" ? "Absent ✕" : "Absent"}</span>
                          </button>

                          {/* Cancelled Button */}
                          <button
                            onClick={() => handleModifyDayAttendance(sub.id, "cancelled")}
                            disabled={isBusy}
                            style={{
                              padding: "0.45rem 0.8rem",
                              borderRadius: "8px",
                              border: status === "cancelled" ? "1px solid #94a3b8" : "1px solid rgba(255, 255, 255, 0.1)",
                              background: status === "cancelled" ? "rgba(148, 163, 184, 0.2)" : "rgba(255, 255, 255, 0.02)",
                              color: status === "cancelled" ? "#94a3b8" : "#94a3b8",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <Slash size={13} />
                            <span>{status === "cancelled" ? "Cancelled ⊘" : "Cancelled"}</span>
                          </button>

                          {/* Clear Log Button */}
                          {log && (
                            <button
                              onClick={() => handleClearDayLog(log.id, sub.id)}
                              disabled={isBusy}
                              title="Delete log entry and revert counters"
                              style={{
                                padding: "0.45rem 0.6rem",
                                borderRadius: "8px",
                                border: "1px solid rgba(244, 63, 94, 0.2)",
                                background: "rgba(244, 63, 94, 0.08)",
                                color: "#f43f5e",
                                fontSize: "0.78rem",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Changes are saved to MongoDB in real-time.
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => setActiveDateModal(null)}
                  style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
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

export default Schedule;
