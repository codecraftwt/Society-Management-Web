import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { APP_NAME } from "../constants/app";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import {
  HiShieldCheck,
  HiMail,
  HiX,
  HiRefresh,
  HiCheckCircle,
  HiLockClosed,
} from "react-icons/hi";
import {
  HiOutlineBuildingOffice2,
  HiOutlineArrowLeft
} from "react-icons/hi2";

import ThemeToggle from "../components/common/ThemeToggle";
import homeBannerImg from "../assets/Photos/Home/Home.png";
import "./Login.css";

/* ═══════════════════════════════════════════════════════════
   OTP MODAL (THEMED FOR UIVERSE CARD)
   ═══════════════════════════════════════════════════════════ */
function OtpModal({ email, tempToken, onVerified, onCancel }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // 2-minute session countdown
  const [sessionSecs, setSessionSecs] = useState(120);
  // 30-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState(30);
  const [shaking, setShaking] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (sessionSecs <= 0) return;
    const t = setTimeout(() => setSessionSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sessionSecs]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sessionExpired = sessionSecs <= 0;
  const filled = otp.filter(Boolean).length;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "";

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (otp[i]) {
        const next = [...otp]; next[i] = ""; setOtp(next);
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
        const next = [...otp]; next[i - 1] = ""; setOtp(next);
      }
    } else if (e.key === "ArrowLeft" && i > 0) inputRefs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) inputRefs.current[i + 1]?.focus();
    else if (e.key === "Enter") handleVerify();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleVerify = async () => {
    if (sessionExpired) { toast.error("Session expired. Please login again."); onCancel(); return; }
    const code = otp.join("");
    if (code.length !== 6) { shake(); toast.error("Enter the complete 6-digit OTP"); return; }

    setVerifyLoading(true);
    try {
      const res = await API.post("/auth/verify-otp", { otp: code, tempToken });
      toast.success("Login successful!");
      onVerified(res.data.user, res.data.token);
    } catch (err) {
      shake();
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await API.post("/auth/resend-otp", { tempToken });
      setOtp(["", "", "", "", "", ""]);
      setSessionSecs(120);
      setResendCooldown(30);
      inputRefs.current[0]?.focus();
      toast.success("New OTP sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = sessionSecs / 120;
  const dashOffset = circumference * (1 - progress);
  const timerColor = sessionSecs > 60 ? "#38bdf8" : sessionSecs > 30 ? "#3B82F6" : "#ef4444";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        background: "rgba(11, 19, 41, 0.88)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="modal-box animate-scaleIn"
        style={{
          width: "100%", maxWidth: 430,
          background: "#171717",
          borderRadius: 25, overflow: "hidden", position: "relative",
          boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ height: 4, background: "linear-gradient(90deg,#38bdf8,#2563eb)" }} />

        <div style={{ padding: "clamp(1.25rem, 5vw, 2rem)" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", margin: "0 auto 0.9rem",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1.5px solid rgba(56, 189, 248, 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(56, 189, 248, 0.15)",
            }}>
              <HiShieldCheck style={{ fontSize: 28, color: "#38bdf8" }} />
            </div>

            <h2 style={{
              fontSize: "1.3rem", fontWeight: 800, color: "#ffffff",
              margin: "0 0 0.35rem", letterSpacing: "-0.02em",
            }}>
              Two-Step Verification
            </h2>

            <p style={{ fontSize: "0.85rem", color: "#a3a3a3", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
              A 6-digit verification code was sent to
            </p>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 999,
              background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)",
            }}>
              <HiMail style={{ fontSize: 13, color: "#38bdf8" }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8" }}>{maskedEmail}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <div style={{ position: "relative", width: 54, height: 54 }}>
              <svg width="54" height="54" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="27" cy="27" r={radius} fill="none" stroke="#262626" strokeWidth="3" />
                <circle cx="27" cy="27" r={radius} fill="none" stroke={timerColor} strokeWidth="3"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: "0.75rem", fontWeight: 700,
                  color: sessionExpired ? "#ef4444" : timerColor,
                  fontFamily: "monospace", lineHeight: 1,
                }}>
                  {sessionExpired ? "00:00" : formatTime(sessionSecs)}
                </span>
              </div>
            </div>
          </div>

          {sessionExpired && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 12, marginBottom: "1rem",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            }}>
              <HiLockClosed style={{ fontSize: 15, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: "0.78rem", color: "#ef4444", fontWeight: 600 }}>
                Session expired. Please go back and login again.
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex", gap: "clamp(0.3rem,2vw,0.55rem)",
              justifyContent: "center", marginBottom: "1rem",
              animation: shaking ? "otpShake 0.5s ease" : undefined,
            }}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={sessionExpired}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                style={{
                  width: "100%", maxWidth: 52, height: 54,
                  textAlign: "center",
                  fontSize: "1.3rem", fontWeight: 800,
                  borderRadius: 13,
                  border: digit ? "2px solid #38bdf8" : "1.5px solid #262626",
                  background: sessionExpired ? "#262626" : digit ? "rgba(56,189,248,0.1)" : "#171717",
                  color: sessionExpired ? "#737373" : "#ffffff",
                  outline: "none",
                  transition: "all 0.18s ease",
                  boxShadow: "inset 2px 5px 10px rgb(5, 5, 5)",
                  caretColor: "#38bdf8",
                  cursor: sessionExpired ? "not-allowed" : "text",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: "1.25rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                width: i < filled ? 22 : 6, height: 4, borderRadius: 999,
                background: i < filled ? "#38bdf8" : "#262626",
                transition: "all 0.2s ease",
              }} />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifyLoading || filled !== 6 || sessionExpired}
            className="button1"
            style={{
              width: "100%",
              opacity: (filled !== 6 || sessionExpired) ? 0.5 : 1,
              cursor: (filled !== 6 || sessionExpired) ? "not-allowed" : "pointer",
              marginBottom: "0.75rem",
            }}
          >
            {verifyLoading ? (
              <>
                <div style={{
                  width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
                Verifying…
              </>
            ) : (
              <>
                <HiCheckCircle style={{ fontSize: 18 }} />
                Verify &amp; Login
              </>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", padding: 0,
                cursor: resendCooldown > 0 || resendLoading ? "not-allowed" : "pointer",
                color: resendCooldown > 0 || resendLoading ? "#737373" : "#38bdf8",
                fontSize: "0.82rem", fontWeight: 700,
              }}
            >
              <HiRefresh style={{ fontSize: 14 }} />
              {resendLoading ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </button>

            <button
              onClick={onCancel}
              style={{
                background: "#252525", border: "none",
                padding: "6px 14px", borderRadius: 8, fontSize: "0.81rem",
                fontWeight: 700, color: "#ffffff", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4
              }}
            >
              <HiX style={{ fontSize: 13 }} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE REACT COMPONENT (UIVERSE.IO Praashoo7 DESIGN)
   ═══════════════════════════════════════════════════════════ */
function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [step, setStep] = useState("credentials");
  const [tempToken, setTempToken] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const res = await API.post("/auth/login", { email, password });

      if (res.data.tempToken) {
        setTempToken(res.data.tempToken);
        setStep("otp");
        toast.success("OTP sent to your registered email");
      } else {
        const { token, user } = res.data;
        handleVerified(user, token);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerified = (user, token) => {
    login(user, token);

    const routeMap = {
      SUPER_ADMIN: "/superadmin",
      SOCIETY_ADMIN: "/admin",
      COMMITTEE_MEMBER: "/committee",
      RESIDENT: "/resident",
      FAMILY_MEMBER: "/family",
      GUARD: "/guard",
      ACCOUNTANT: "/accountant",
    };

    const targetRoute = routeMap[user.activeRole] || "/";
    navigate(targetRoute, { replace: true });
  };

  const handleCancelOtp = () => {
    setStep("credentials");
    setTempToken(null);
  };

  return (
    <div className="login-page-container">
      {/* Background Ambient Glow Orbs */}
      <div className="login-glow-orb orb-1"></div>
      <div className="login-glow-orb orb-2"></div>

      {/* Full-bleed background photo of residential community */}
      <img
        src={homeBannerImg}
        alt="Residential Community Background"
        className="login-bg-photo"
      />

      {/* Top Header Bar */}
      <header className="login-top-bar">
        <Link to="/" className="login-brand-logo">
          <div className="login-brand-icon">
            <HiOutlineBuildingOffice2 />
          </div>
          <div>
            <div className="login-brand-title">Society Management</div>
          </div>
        </Link>

        <div className="login-top-actions">
          <ThemeToggle />
          <Link to="/" className="login-back-home">
            <HiOutlineArrowLeft /> Back to Home
          </Link>
        </div>
      </header>

      {/* OTP Modal */}
      {step === "otp" && (
        <OtpModal
          email={email}
          tempToken={tempToken}
          onVerified={handleVerified}
          onCancel={handleCancelOtp}
        />
      )}

      {/* From Uiverse.io by Praashoo7 Form Card */}
      <form className="form" onSubmit={handleLogin}>
        <p id="heading">Login</p>

        {/* Email Field with SVG icon */}
        <div className="field">
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"></path>
          </svg>
          <input
            autoComplete="off"
            placeholder="Username / Email"
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password Field with SVG icon + Eye toggle */}
        <div className="field">
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
          </svg>
          <input
            placeholder="Password"
            className="input-field"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="eye-toggle-btn"
            aria-label={showPassword ? "Hide Password" : "Show Password"}
          >
            {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
          </button>
        </div>

        {/* 2FA Notice */}
        <div className="uiverse-notice">
          <HiShieldCheck className="uiverse-notice-icon" />
          <span className="uiverse-notice-text">
            A 6-digit verification code will be sent to your email.
          </span>
        </div>

        {/* Buttons Row */}
        <div className="btn">
          <button type="submit" disabled={loginLoading} className="button1">
            {loginLoading ? "Sending OTP…" : "Login"}
          </button>
          <button type="button" onClick={() => navigate("/register")} className="button2">
            Sign Up
          </button>
        </div>

        {/* Forgot Password Button */}
        <button type="button" onClick={() => navigate("/forgot-password")} className="button3">
          Forgot Password
        </button>
      </form>
    </div>
  );
}

export default Login;