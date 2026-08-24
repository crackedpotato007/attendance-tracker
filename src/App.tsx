import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import Navbar from "./navbar";
import {
  GraduationCap,
  LayoutDashboard,
  CheckSquare,
  Calculator,
  BookOpen,
  CalendarCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Award,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  LogIn,
  Zap,
} from "lucide-react";
import {
  calculateSubjectStats,
  calculateOverallStats,
  triggerConfettiBurst,
  defaultWorkingDaysConfig,
  type Subject,
  type WorkingDaysConfig,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [config, setConfig] = useState<WorkingDaysConfig>(defaultWorkingDaysConfig);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive sample state for unauthenticated preview
  const [previewAttended, setPreviewAttended] = useState<number>(22);
  const [previewTotal, setPreviewTotal] = useState<number>(26);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [subsData, schedData] = await Promise.all([
        api.subjects.list().catch(() => []),
        api.schedule.get().catch(() => defaultWorkingDaysConfig),
      ]);
      const subList = subsData || [];
      setSubjects(subList);
      if (subList.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subList[0].id);
      }
      setConfig(schedData || defaultWorkingDaysConfig);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedSubjectId]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, loadData]);

  const overall = calculateOverallStats(subjects, config.globalTarget);
  const currentSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const currentStats = currentSubject
    ? calculateSubjectStats(
        currentSubject.attended,
        currentSubject.total,
        currentSubject.targetPercentage || config.globalTarget
      )
    : null;

  const [isHeroSubmitting, setIsHeroSubmitting] = useState<boolean>(false);

  const handleQuickAdd = async (type: "present" | "absent") => {
    if (!currentSubject) return;
    if (isHeroSubmitting) return;

    setIsHeroSubmitting(true);

    try {
      const res = await api.subjects.quickLog(currentSubject.id, type);
      if (res && res.alreadyLogged) {
        showToast(res.message || `Already marked as ${type} for today!`);
      } else if (res && res.subject) {
        if (type === "present") {
          triggerConfettiBurst();
          showToast(`Logged Present in ${currentSubject.name}! 🚀`);
        } else {
          showToast(`Logged Absent in ${currentSubject.name}.`);
        }
        setSubjects((prev) =>
          prev.map((s) => (s.id === currentSubject.id ? res.subject : s))
        );
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update attendance.");
      loadData();
    } finally {
      setIsHeroSubmitting(false);
    }
  };

  // Preview interactive sample modifier for logged out visitors
  const handlePreviewAdd = (type: "present" | "absent") => {
    if (type === "present") {
      setPreviewAttended((p) => p + 1);
      setPreviewTotal((t) => t + 1);
      triggerConfettiBurst();
      showToast("Interactive demo: +1 Present calculated!");
    } else {
      setPreviewTotal((t) => t + 1);
      showToast("Interactive demo: +1 Absent calculated.");
    }
  };

  const previewStats = calculateSubjectStats(previewAttended, previewTotal, 75);

  const featureCards = [
    {
      id: "calculator",
      title: "Safe Bunk & Recovery Calculator",
      badge: "Real-Time Math",
      badgeColor: "badge-indigo",
      icon: Calculator,
      desc: "Instantly know how many classes you can safely skip without falling below 75%, or how many consecutive classes you must attend to catch up.",
      stats: "Zero Academic Risk",
      path: isAuthenticated ? "/calculator" : "/login",
    },
    {
      id: "logger",
      title: "Daily Subject-Wise Attendance Log",
      badge: "1-Tap Quick Mark",
      badgeColor: "badge-emerald",
      icon: CheckSquare,
      desc: "Manually log your presence, absence, or class cancellations for any date. Features quick 'Mark All Present' with celebration confetti.",
      stats: "Sub-Second Logging",
      path: isAuthenticated ? "/manage" : "/login",
    },
    {
      id: "schedule",
      title: "Working Days & Holiday Config",
      badge: "Mon – Sat Default",
      badgeColor: "badge-amber",
      icon: CalendarCheck,
      desc: "All calendar days except Sunday are treated as working days by default. Fully customize your active college days or mark fests & breaks.",
      stats: "Custom Schedules",
      path: isAuthenticated ? "/schedule" : "/login",
    },
    {
      id: "subjects",
      title: "Subject & Timetable Management",
      badge: "Course Tracking",
      badgeColor: "badge-cyan",
      icon: BookOpen,
      desc: "Add courses, set individual attendance goals (e.g. 75%, 80%), track credits, professor details, and classroom locations.",
      stats: "Per-Course Radar",
      path: isAuthenticated ? "/subjects" : "/login",
    },
  ];

  return (
    <div className="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            {/* Ambient Badge */}
            <div className="hero-pill-badge">
              <Sparkles size={14} className="sparkle-icon" />
              <span>Smart Student Attendance & Bunk Intelligence</span>
              <div className="pill-dot"></div>
            </div>

            {/* Headline */}
            <h1 className="hero-headline">
              Never Drop Below 75%. <br />
              <span className="text-gradient">Bunk Smartly & Plan Ahead.</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-description">
              The ultimate attendance companion for university students. Track course attendance,
              calculate safe bunks, figure out catch-up classes to hit your target percentage,
              and customize working days with zero academic risk.
            </p>

            {/* Action Buttons */}
            <div className="hero-action-buttons">
              {isAuthenticated ? (
                <>
                  <button
                    className="btn-primary hero-btn-main"
                    onClick={() => navigate("/manage")}
                  >
                    <CheckSquare size={18} />
                    <span>Log Today's Classes</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    className="btn-secondary hero-btn-sub"
                    onClick={() => navigate("/calculator")}
                  >
                    <Calculator size={18} />
                    <span>Bunk Simulator</span>
                  </button>

                  <button
                    className="btn-secondary hero-btn-sub"
                    onClick={() => navigate("/home")}
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-primary hero-btn-main"
                    onClick={() => navigate("/login")}
                  >
                    <LogIn size={18} />
                    <span>Get Started Free</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    className="btn-secondary hero-btn-sub"
                    onClick={() => navigate("/login")}
                  >
                    <Zap size={16} color="#6366f1" />
                    <span>Sign In</span>
                  </button>
                </>
              )}
            </div>

            {/* Student Feature Highlights */}
            <div className="hero-trust-bar">
              <div className="trust-item">
                <ShieldCheck size={16} color="#10b981" />
                <span>Mon–Sat Working Days</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <Flame size={16} color="#f59e0b" />
                <span>Safe Bunk Predictor</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <Award size={16} color="#6366f1" />
                <span>75% Target Threshold</span>
              </div>
            </div>
          </div>

          {/* Interactive Hero Card */}
          <div className="hero-visual-card glass-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="widget-title-tag">
                <GraduationCap size={14} />{" "}
                {isAuthenticated ? "Live Subject Inspector" : "Interactive Bunk Radar Preview"}
              </div>
              <span className="badge badge-indigo">
                {isAuthenticated ? "Live Session" : "Interactive Demo"}
              </span>
            </div>

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.82rem", margin: "0.5rem 0" }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Loading live course status...</span>
              </div>
            )}

            {isAuthenticated ? (
              /* Authenticated User Hero Widget */
              subjects.length === 0 ? (
                <div style={{ padding: "2.5rem 1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem" }}>
                  <BookOpen size={30} color="#6366f1" />
                  <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "1rem" }}>No Courses Added Yet</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem", maxWidth: "260px" }}>
                    Enroll in your semester courses to inspect real-time safe bunks.
                  </span>
                  <button className="btn-primary" style={{ padding: "0.5rem 1.1rem", fontSize: "0.82rem", marginTop: "0.25rem" }} onClick={() => navigate("/subjects")}>
                    <Plus size={14} /> Add Course
                  </button>
                </div>
              ) : (
                <>
                  <div className="widget-sub-selector">
                    <label className="sub-select-label">Select Enrolled Course:</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="hero-subject-dropdown"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentSubject && currentStats && (
                    <div className="subject-hero-telemetry">
                      <div className="hero-pct-display">
                        <span className="pct-number text-gradient">
                          {currentStats.percentage}%
                        </span>
                        <div className="pct-meta-stack">
                          <span className="pct-label">Current Attendance</span>
                          <span className="pct-classes">
                            {currentSubject.attended} / {currentSubject.total} Classes Attended
                          </span>
                        </div>
                      </div>

                      <div
                        className={`bunk-intel-banner ${
                          currentStats.percentage >= (currentSubject.targetPercentage || 75)
                            ? "safe-intel"
                            : "warning-intel"
                        }`}
                      >
                        {currentStats.percentage >= (currentSubject.targetPercentage || 75) ? (
                          <div className="intel-content">
                            <div className="intel-icon green">
                              <Flame size={18} />
                            </div>
                            <div className="intel-text">
                              <strong>
                                You can safely bunk {currentStats.safeBunks}{" "}
                                {currentStats.safeBunks === 1 ? "class" : "classes"}!
                              </strong>
                              <span>
                                Attendance will stay above {currentSubject.targetPercentage || 75}%.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="intel-content">
                            <div className="intel-icon red">
                              <AlertTriangle size={18} />
                            </div>
                            <div className="intel-text">
                              <strong>
                                Need {currentStats.neededClasses} consecutive{" "}
                                {currentStats.neededClasses === 1 ? "class" : "classes"}!
                              </strong>
                              <span>
                                Attend upcoming lectures to reach{" "}
                                {currentSubject.targetPercentage || 75}%.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="hero-quick-actions">
                        <button
                          className="btn-primary hero-mark-btn present"
                          onClick={() => handleQuickAdd("present")}
                          disabled={isHeroSubmitting}
                        >
                          <Plus size={16} />
                          <span>+ Attended Class</span>
                        </button>
                        <button
                          className="btn-secondary hero-mark-btn absent"
                          onClick={() => handleQuickAdd("absent")}
                          disabled={isHeroSubmitting}
                        >
                          <Minus size={16} />
                          <span>+ Missed Class</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="widget-footer-stats">
                    <div className="w-stat">
                      <span className="w-stat-val">{overall.overallPercentage}%</span>
                      <span className="w-stat-lbl">Semester Avg</span>
                    </div>
                    <div className="w-stat-div"></div>
                    <div className="w-stat">
                      <span className="w-stat-val text-amber">
                        {overall.totalSafeBunks}
                      </span>
                      <span className="w-stat-lbl">Safe Bunks</span>
                    </div>
                    <div className="w-stat-div"></div>
                    <div className="w-stat">
                      <span className="w-stat-val">
                        {config.activeDays?.length || 6} Days/Wk
                      </span>
                      <span className="w-stat-lbl">Working Schedule</span>
                    </div>
                  </div>
                </>
              )
            ) : (
              /* Public Visitor Interactive Preview */
              <div className="subject-hero-telemetry">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
                    Sample Course: Data Structures (CS-301)
                  </span>
                  <span className="badge badge-emerald">Safe Zone</span>
                </div>

                <div className="hero-pct-display">
                  <span className="pct-number text-gradient">
                    {previewStats.percentage}%
                  </span>
                  <div className="pct-meta-stack">
                    <span className="pct-label">Sample Attendance</span>
                    <span className="pct-classes">
                      {previewAttended} / {previewTotal} Classes Attended
                    </span>
                  </div>
                </div>

                <div className="bunk-intel-banner safe-intel">
                  <div className="intel-content">
                    <div className="intel-icon green">
                      <Flame size={18} />
                    </div>
                    <div className="intel-text">
                      <strong>
                        Can safely bunk {previewStats.safeBunks}{" "}
                        {previewStats.safeBunks === 1 ? "class" : "classes"}!
                      </strong>
                      <span>
                        Mathematical safety calculated against 75% requirement.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive buttons */}
                <div className="hero-quick-actions">
                  <button
                    className="btn-primary hero-mark-btn present"
                    onClick={() => handlePreviewAdd("present")}
                    title="Test +1 present"
                  >
                    <Plus size={16} />
                    <span>Try + Present</span>
                  </button>
                  <button
                    className="btn-secondary hero-mark-btn absent"
                    onClick={() => handlePreviewAdd("absent")}
                    title="Test +1 missed"
                  >
                    <Minus size={16} />
                    <span>Try + Absent</span>
                  </button>
                </div>

                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                  <button
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center", padding: "0.65rem" }}
                    onClick={() => navigate("/login")}
                  >
                    <LogIn size={15} />
                    <span>Create Your Free Account to Track Your Courses</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4-Card Quick Metrics Strip */}
      <section className="kpi-strip-section">
        <div className="kpi-container">
          <div className="kpi-card glass-card">
            <div className="kpi-icon-wrap indigo">
              <Award size={24} />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-number">75%</span>
              <span className="kpi-label">Minimum Required Target</span>
            </div>
          </div>

          <div className="kpi-card glass-card">
            <div className="kpi-icon-wrap emerald">
              <CheckCircle2 size={24} />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-number">1-Tap</span>
              <span className="kpi-label">Sub-second Daily Logging</span>
            </div>
          </div>

          <div className="kpi-card glass-card">
            <div className="kpi-icon-wrap amber">
              <Flame size={24} />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-number">Real-Time</span>
              <span className="kpi-label">Safe Bunk Forecasting</span>
            </div>
          </div>

          <div className="kpi-card glass-card">
            <div className="kpi-icon-wrap cyan">
              <BookOpen size={24} />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-number">Mon–Sat</span>
              <span className="kpi-label">Working Days Config</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="features-grid-section">
        <div className="section-header">
          <span className="section-eyebrow">Complete Student Toolkit</span>
          <h2 className="section-title">
            Engineered to Keep You Safe, <br />
            <span className="text-gradient">Every Semester, Every Course.</span>
          </h2>
          <p className="section-subtitle">
            Never guess your attendance percentage again. Run what-if simulations, customize working days,
            and log classes in seconds.
          </p>
        </div>

        <div className="features-container">
          {featureCards.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="feature-interactive-card glass-card"
                onClick={() => navigate(feat.path)}
              >
                <div className="feat-top-row">
                  <div className="feat-icon-box">
                    <Icon size={24} />
                  </div>
                  <span className={`badge ${feat.badgeColor}`}>{feat.badge}</span>
                </div>

                <h3 className="feat-title">{feat.title}</h3>
                <p className="feat-desc">{feat.desc}</p>

                <div className="feat-bottom-row">
                  <span className="feat-stat-tag">{feat.stats}</span>
                  <div className="feat-explore-btn">
                    <span>{isAuthenticated ? "Open Tool" : "Sign In to Access"}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Launch CTA Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-card glass-card">
          <div className="cta-content">
            <h2 className="cta-headline">
              {isAuthenticated
                ? "Ready to log today's classes or simulate a bunk?"
                : "Join university students tracking attendance with BunkPulse"}
            </h2>
            <p className="cta-desc">
              Stay ahead of the 75% attendance threshold with mathematical certainty.
            </p>
            <div className="cta-actions">
              {isAuthenticated ? (
                <>
                  <button className="btn-primary" onClick={() => navigate("/manage")}>
                    <CheckSquare size={18} />
                    <span>Log Today's Attendance</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate("/calculator")}
                  >
                    <Calculator size={18} />
                    <span>Run Bunk Simulation</span>
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => navigate("/login")}>
                  <LogIn size={18} />
                  <span>Create Free Account / Sign In</span>
                </button>
              )}
            </div>
          </div>
          <div className="cta-decor-orb"></div>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast-item">
            <CheckCircle2 size={18} color="#10b981" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
