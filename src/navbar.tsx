"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  CheckSquare,
  Calculator,
  BookOpen,
  CalendarCheck,
  Flame,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  LogIn,
} from "lucide-react";
import {
  calculateOverallStats,
  defaultWorkingDaysConfig,
  type Subject,
  type WorkingDaysConfig,
} from "./utility/studentState";
import { useAuth } from "./utility/authContext";
import { api } from "./utility/api";
import "./navbar.css";

function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, isAuthenticated } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [config, setConfig] = useState<WorkingDaysConfig>(defaultWorkingDaysConfig);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const loadNavData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [subsData, schedData] = await Promise.all([
        api.subjects.list().catch(() => []),
        api.schedule.get().catch(() => defaultWorkingDaysConfig),
      ]);
      setSubjects(subsData || []);
      setConfig(schedData || defaultWorkingDaysConfig);
    } catch {
      // Ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNavData();
    } else {
      setSubjects([]);
    }
  }, [loadNavData, isAuthenticated]);

  useEffect(() => {
    const handleUpdate = () => {
      if (isAuthenticated) loadNavData();
    };
    window.addEventListener("authChange", handleUpdate);
    return () => window.removeEventListener("authChange", handleUpdate);
  }, [loadNavData, isAuthenticated]);

  const overall = calculateOverallStats(subjects, config.globalTarget);

  const authenticatedLinks = [
    { name: "Overview", path: "/", icon: Sparkles },
    { name: "Dashboard", path: "/home", icon: LayoutDashboard },
    { name: "Daily Logger", path: "/manage", icon: CheckSquare },
    { name: "Bunk Simulator", path: "/calculator", icon: Calculator },
    { name: "Courses", path: "/subjects", icon: BookOpen },
    { name: "Schedule", path: "/schedule", icon: CalendarCheck },
  ];

  const publicLinks = [
    { name: "Overview", path: "/", icon: Sparkles },
  ];

  const navLinks = isAuthenticated ? authenticatedLinks : publicLinks;

  const handleLogout = async () => {
    await logout();
    setShowProfileDropdown(false);
    router.push("/login");
  };

  return (
    <header className="clean-navbar-wrapper">
      <div className="navbar-container">
        {/* Brand */}
        <Link href="/" className="navbar-brand">
          <div className="brand-logo-circle">
            <GraduationCap size={18} color="#6366f1" />
          </div>
          <span className="brand-title">
            Bunk<span className="brand-highlight">Pulse</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav-menu">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-menu-item ${isActive ? "active" : ""}`}
              >
                <Icon size={15} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="navbar-right-controls">
          {isAuthenticated && currentUser ? (
            <>
              {/* Real-time Safe Bunks Pill */}
              <div
                className="navbar-bunk-pill"
                onClick={() => router.push("/calculator")}
                title="Total safe bunks available across courses"
              >
                <Flame size={14} color="#f59e0b" />
                <span className="bunk-count-text">
                  <strong>{overall.totalSafeBunks}</strong> Bunks
                </span>
              </div>

              {/* Real-time Attendance Gauge */}
              <div
                className={`navbar-gauge-pill ${
                  overall.isAboveTarget ? "gauge-safe" : "gauge-danger"
                }`}
                onClick={() => router.push("/home")}
                title={`Semester Avg: ${overall.overallPercentage}% (Goal: ${config.globalTarget}%)`}
              >
                <span className="gauge-pct-text">
                  {overall.overallPercentage}%
                </span>
                <span className="gauge-target-label">
                  / {config.globalTarget}%
                </span>
              </div>

              {/* User Profile Avatar / Dropdown */}
              <div className="user-profile-menu-wrap">
                <button
                  className="user-profile-btn"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <div className="avatar-circle">
                    <User size={15} />
                  </div>
                  <span className="user-name-text">
                    {currentUser.name ? currentUser.name.split(" ")[0] : "Student"}
                  </span>
                  <ChevronDown size={13} className="chev-icon" />
                </button>

                {showProfileDropdown && (
                  <div className="profile-dropdown-card glass-card">
                    <div className="dropdown-user-header">
                      <span className="drop-user-name">{currentUser.name}</span>
                      <span className="drop-user-email">{currentUser.email}</span>
                    </div>

                    <div className="dropdown-divider"></div>

                    <div className="dropdown-links-list">
                      <button
                        className="dropdown-item-btn"
                        onClick={() => {
                          setShowProfileDropdown(false);
                          router.push("/home");
                        }}
                      >
                        <LayoutDashboard size={14} />
                        <span>Go to Dashboard</span>
                      </button>

                      <button
                        className="dropdown-item-btn danger-item"
                        onClick={handleLogout}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                className="btn-primary"
                style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem", gap: "0.4rem" }}
                onClick={() => router.push("/login")}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            className="mobile-drawer-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer glass-card">
          <div className="mobile-links-stack">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`mobile-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="mobile-drawer-divider"></div>
            {isAuthenticated && currentUser ? (
              <button
                className="mobile-nav-item danger"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut size={16} />
                <span>Sign Out ({currentUser.name})</span>
              </button>
            ) : (
              <button
                className="mobile-nav-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push("/login");
                }}
              >
                <LogIn size={16} />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
