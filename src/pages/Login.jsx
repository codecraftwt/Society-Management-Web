import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "../constants/app";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

import { MdEmail } from "react-icons/md";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import {
  HiShieldCheck,
  HiMail,
  HiX,
  HiRefresh,
  HiCheckCircle,
  HiLockClosed,
} from "react-icons/hi";

/* ═══════════════════════════════════════════════════════════
   OTP MODAL
   ═══════════════════════════════════════════════════════════ */
function OtpModal({ email, tempToken, onVerified, onCancel }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // 2-minute session countdown (matches backend expiry)
  const [sessionSecs, setSessionSecs] = useState(120);
  // 30-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState(30);
  const [shaking, setShaking] = useState(false);

  const inputRefs = useRef([]);

  // Auto-focus first box on mount
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  // ── 2-minute session countdown ──
  useEffect(() => {
    if (sessionSecs <= 0) return;
    const t = setTimeout(() => setSessionSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sessionSecs]);

  // ── 30-second resend cooldown ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sessionExpired = sessionSecs <= 0;
  const filled = otp.filter(Boolean).length;

  // Format mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Mask email: ab*****@gmail.com
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "";

  /* ── Input handlers ── */
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

  /* ── Verify ── */
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

  /* ── Resend ── */
  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await API.post("/auth/resend-otp", { tempToken });
      setOtp(["", "", "", "", "", ""]);
      setSessionSecs(120); // reset 2-min timer
      setResendCooldown(30);
      inputRefs.current[0]?.focus();
      toast.success("New OTP sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  /* ── Ring progress for session timer ── */
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = sessionSecs / 120; // 0 → 1
  const dashOffset = circumference * (1 - progress);
  const timerColor = sessionSecs > 60 ? "#22c55e" : sessionSecs > 30 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        background: "var(--overlay-strong, rgba(0,0,0,0.65))",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="modal-box animate-scaleIn"
        style={{
          width: "100%", maxWidth: 430,
          borderRadius: 24, overflow: "hidden", position: "relative",
        }}
      >
        {/* Top gradient bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg,#3b82f6,#6366f1,#8b5cf6)" }} />

        <div style={{ padding: "clamp(1.25rem, 5vw, 2rem)" }}>

          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            {/* Shield icon */}
            <div style={{
              width: 60, height: 60, borderRadius: "50%", margin: "0 auto 0.9rem",
              background: "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(99,102,241,0.15))",
              border: "1.5px solid rgba(59,130,246,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(59,130,246,0.15)",
            }}>
              <HiShieldCheck style={{ fontSize: 28, color: "#3b82f6" }} />
            </div>

            <h2 className="text-text-primary" style={{
              fontSize: "clamp(1.1rem,4vw,1.3rem)", fontWeight: 700,
              margin: "0 0 0.35rem", letterSpacing: "-0.02em",
            }}>
              Two-Step Verification
            </h2>

            <p className="text-text-secondary" style={{ fontSize: "0.8rem", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
              A 6-digit code was sent to
            </p>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 999,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
            }}>
              <HiMail style={{ fontSize: 12, color: "#3b82f6" }} />
              <span style={{ fontSize: "0.77rem", fontWeight: 600, color: "#3b82f6" }}>{maskedEmail}</span>
            </div>
          </div>

          {/* ── Session timer ── */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <div style={{ position: "relative", width: 54, height: 54 }}>
              <svg width="54" height="54" style={{ transform: "rotate(-90deg)" }}>
                {/* Track */}
                <circle cx="27" cy="27" r={radius}
                  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                {/* Progress */}
                <circle cx="27" cy="27" r={radius}
                  fill="none" stroke={timerColor} strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: "0.72rem", fontWeight: 700,
                  color: sessionExpired ? "#ef4444" : timerColor,
                  fontFamily: "'Courier New', monospace", lineHeight: 1,
                }}>
                  {sessionExpired ? "00:00" : formatTime(sessionSecs)}
                </span>
              </div>
            </div>
          </div>

          {/* Session expired banner */}
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

          {/* ── OTP boxes ── */}
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
                  fontSize: "clamp(1.1rem,4vw,1.4rem)", fontWeight: 700,
                  borderRadius: 13,
                  border: digit
                    ? "2px solid #3b82f6"
                    : "1.5px solid var(--input-border, rgba(255,255,255,0.08))",
                  background: sessionExpired
                    ? "rgba(255,255,255,0.03)"
                    : digit
                      ? "rgba(59,130,246,0.08)"
                      : "var(--input-bg, rgba(255,255,255,0.05))",
                  color: sessionExpired
                    ? "var(--text-muted, rgba(255,255,255,0.3))"
                    : "var(--text-primary, #f8fafc)",
                  outline: "none",
                  transition: "all 0.18s ease",
                  boxShadow: digit ? "0 0 0 1px rgba(59,130,246,0.25)" : "none",
                  caretColor: "#3b82f6",
                  cursor: sessionExpired ? "not-allowed" : "text",
                }}
                onFocus={(e) => {
                  if (sessionExpired) return;
                  e.target.style.border = "2px solid #3b82f6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(e) => {
                  if (!digit) {
                    e.target.style.border = "1.5px solid var(--input-border, rgba(255,255,255,0.08))";
                    e.target.style.boxShadow = "none";
                  }
                }}
              />
            ))}
          </div>

          {/* Fill progress bar */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: "1.25rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                width: i < filled ? 22 : 6, height: 4, borderRadius: 999,
                background: i < filled
                  ? "linear-gradient(90deg,#3b82f6,#6366f1)"
                  : "rgba(255,255,255,0.08)",
                transition: "all 0.2s ease",
              }} />
            ))}
          </div>

          {/* ── Verify button ── */}
          <button
            onClick={handleVerify}
            disabled={verifyLoading || filled !== 6 || sessionExpired}
            className="btn-primary"
            style={{
              width: "100%", height: 46,
              justifyContent: "center", borderRadius: 13,
              fontSize: "0.92rem",
              opacity: (filled !== 6 || sessionExpired) ? 0.45 : 1,
              cursor: (filled !== 6 || sessionExpired) ? "not-allowed" : "pointer",
              marginBottom: "0.75rem",
              gap: 8,
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

          {/* ── Resend + Cancel row ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", padding: 0,
                cursor: resendCooldown > 0 || resendLoading ? "not-allowed" : "pointer",
                color: resendCooldown > 0 || resendLoading
                  ? "var(--text-muted, rgba(255,255,255,0.35))"
                  : "#3b82f6",
                fontSize: "0.81rem", fontWeight: 600,
                transition: "color 0.18s",
              }}
            >
              <HiRefresh style={{
                fontSize: 14,
                animation: resendLoading ? "spin 0.9s linear infinite" : undefined,
              }} />
              {resendLoading
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP"}
            </button>

            <button
              onClick={onCancel}
              className="btn-muted"
              style={{ padding: "6px 14px", borderRadius: 9, fontSize: "0.81rem", gap: 5 }}
            >
              <HiX style={{ fontSize: 13 }} />
              Cancel
            </button>
          </div>

          {/* hint */}
          <p className="text-text-muted" style={{
            fontSize: "0.7rem", textAlign: "center",
            marginTop: "1rem", lineHeight: 1.6,
          }}>
            Check your spam folder if you don't see the email.
          </p>
        </div>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes otpShake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-8px)}
          30%{transform:translateX(8px)}
          45%{transform:translateX(-6px)}
          60%{transform:translateX(6px)}
          75%{transform:translateX(-3px)}
          90%{transform:translateX(3px)}
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════ */
function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // OTP step
  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [tempToken, setTempToken] = useState(null);

  /* ── Step 1: credentials → request OTP ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const res = await API.post("/auth/login", { email, password });
      
      // Check if OTP is required
      if (res.data.tempToken) {
        setTempToken(res.data.tempToken);
        setStep("otp");
        toast.success("OTP sent to your registered email");
      } else {
        // Direct login without OTP (fallback)
        const { token, user } = res.data;
        handleVerified(user, token);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  /* ── Step 2: OTP verified → navigate ── */
  const handleVerified = (user, token) => {
    login(user, token);
    
    // Route based on active role
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

  /* ── Cancel OTP → back to credentials ── */
  const handleCancelOtp = () => {
    setStep("credentials");
    setTempToken(null);
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4">

      {/* OTP Modal */}
      {step === "otp" && (
        <OtpModal
          email={email}
          tempToken={tempToken}
          onVerified={handleVerified}
          onCancel={handleCancelOtp}
        />
      )}

      {/* ── Login Card ── */}
      <div className="w-full max-w-md bg-card rounded-2xl shadow-card p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-text-primary">Welcome Back</h1>
          <p className="text-text-secondary mt-2">Sign in to {APP_NAME}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <div className="relative">
              <MdEmail className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-lg" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input h-12 w-full pr-10"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input h-12 w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-lg"
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-text-secondary hover:underline"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>

          {/* 2FA notice badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 12,
            background: "rgba(59,130,246,0.07)",
            border: "1px solid rgba(59,130,246,0.18)",
          }}>
            <HiShieldCheck style={{ fontSize: 16, color: "#3b82f6", flexShrink: 0 }} />
            <span className="text-text-secondary" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
              A one-time password will be emailed to you for verification.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loginLoading}
            className="btn-primary w-full h-12 flex justify-center rounded-xl text-base"
            style={{ opacity: loginLoading ? 0.7 : 1, cursor: loginLoading ? "not-allowed" : "pointer", gap: 8 }}
          >
            {loginLoading ? (
              <>
                <div style={{
                  width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
                Sending OTP…
              </>
            ) : "Login"}
          </button>
        </form>

        {/* Register link */}
        <div className="text-center mt-6">
          <p className="text-sm text-text-secondary">New Resident?</p>
          <button
            onClick={() => navigate("/register")}
            className="mt-2 text-pastel-blue font-medium hover:underline transition transform hover:scale-105 duration-200"
          >
            Create New Account
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-sm text-text-muted">
          © {new Date().getFullYear()} {APP_NAME}
        </div>
      </div>
    </div>
  );
}

export default Login;