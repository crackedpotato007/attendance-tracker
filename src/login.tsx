import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./utility/authContext";
import "./login.css";

function Login() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [college, setCollege] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setErrorMsg("Please provide your full name.");
          setLoading(false);
          return;
        }
        const res = await signup(name, email, password, college || "School of Engineering");
        if (res.success) {
          navigate("/home");
        } else {
          setErrorMsg(res.error || "Failed to create account.");
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          navigate("/home");
        } else {
          setErrorMsg(res.error || "Invalid credentials.");
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card glass-card">
        {/* Brand Header */}
        <div className="auth-brand-head">
          <div className="auth-icon-circle" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <GraduationCap size={24} color="#6366f1" />
          </div>
          <h2 className="auth-brand-name">
            Bunk<span className="brand-accent">Pulse</span>
          </h2>
          <p className="auth-tagline">
            {isSignUp
              ? "Create your student account to isolate your subjects & attendance data"
              : "Sign in to access your course attendance matrix & bunk radar"}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`mode-tab ${!isSignUp ? "active" : ""}`}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`mode-tab ${isSignUp ? "active" : ""}`}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          {isSignUp && (
            <div className="auth-input-group">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">University Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div className="auth-input-group">
              <label className="auth-label">College / Department</label>
              <div className="auth-input-wrap">
                <Building size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Computer Science & Engineering"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={loading}
          >
            <span>
              {loading
                ? "Processing..."
                : isSignUp
                ? "Create Student Account"
                : "Sign In"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Back to Home Landing */}
        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "0.82rem",
              cursor: "pointer",
              transition: "color 0.2s ease",
            }}
          >
            ← Back to Overview
          </button>
        </div>

        {/* Privacy Note */}
        <div className="auth-footer-privacy">
          <ShieldCheck size={13} color="#10b981" />
          <span>MongoDB Cloud • Private & isolated per student account</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
