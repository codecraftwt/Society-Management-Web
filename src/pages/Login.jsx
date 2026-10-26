import { useState, useContext, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
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
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlinePhone,
  HiBars3,
  HiOutlineXMark,
} from "react-icons/hi2";
import compLogoImg from "../assets/Photos/Home/comp_logo.png";
import LanguageSelector from "../components/common/LanguageSelector";
import "../home/Home.css";
import {
  MdHome,
  MdGroups,
  MdAccountBalance,
  MdAdminPanelSettings,
  MdSupervisorAccount,
} from "react-icons/md";

import ThemeToggle from "../components/common/ThemeToggle";
import { useLang } from "../context/LanguageContext";
import loginHeroImg from "../assets/Photos/Home/login_right_side_img.png";
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

  return createPortal(
    <div className="otp-overlay otp-overlay--login">
      <div className="otp-modal-box otp-modal-box--login animate-scaleIn">
        <div className="otp-modal-topbar" />

        <div className="otp-modal-inner">
          <div className="otp-modal-header">
            <div className="otp-shield-icon">
              <HiShieldCheck />
            </div>

            <h2 className="otp-title">
              Two-Step Verification
            </h2>

            <p className="otp-subtitle">
              A 6-digit verification code was sent to
            </p>

            <div className="otp-email-badge">
              <HiMail />
              <span>{maskedEmail}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <div style={{ position: "relative", width: 54, height: 54 }}>
              <svg className="otp-timer-track" width="54" height="54" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="27" cy="27" r={radius} fill="none" strokeWidth="3" />
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
                <span className="otp-timer-value" style={{ color: sessionExpired ? "#ef4444" : timerColor }}>
                  {sessionExpired ? "00:00" : formatTime(sessionSecs)}
                </span>
              </div>
            </div>
          </div>

          {sessionExpired && (
            <div className="otp-session-expired">
              <HiLockClosed />
              <span>
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
                className={`otp-input${digit ? " filled" : ""}${sessionExpired ? " disabled" : ""}`}
                style={{ cursor: sessionExpired ? "not-allowed" : "text" }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: "1.25rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`otp-progress-dot${i < filled ? " filled" : ""}`} />
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
              className="otp-resend-btn"
              style={{
                color: resendCooldown > 0 || resendLoading ? "#737373" : undefined,
                cursor: resendCooldown > 0 || resendLoading ? "not-allowed" : "pointer",
              }}
            >
              <HiRefresh style={{ fontSize: 14 }} />
              {resendLoading ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </button>

            <button onClick={onCancel} className="otp-cancel-btn">
              <HiX style={{ fontSize: 13 }} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE REACT COMPONENT (UIVERSE.IO Praashoo7 DESIGN)
   ═══════════════════════════════════════════════════════════ */
function RejectionModal({ details, onClose, t }) {
  const reason = details?.rejection_reason;
  const societyName = details?.society_name;
  const contact = details?.admin_contact;
  const hasContact = Boolean(contact && (contact.email || contact.phone));

  return (
    <div className="otp-overlay">
      <div className="otp-modal-box animate-scaleIn">
        <div className="rejection-modal-topbar" />

        <div className="otp-modal-inner">
          <div className="otp-modal-header">
            <div className="rejection-shield-icon">
              <HiX />
            </div>

            <h2 className="otp-title">
              {t("rejectionTitle", "Registration Rejected")}
            </h2>

            <p className="otp-subtitle">
              {societyName
                ? t("rejectionSubtitleWithSociety", { society: societyName })
                : t("rejectionSubtitle", "Your registration could not be approved by the society admin.")}
            </p>
          </div>

          {reason ? (
            <div className="rejection-reason-box">
              <p className="rejection-reason-label">
                {t("rejectionReasonLabel", "Reason given by the admin")}
              </p>
              <p className="rejection-reason-text">{reason}</p>
            </div>
          ) : (
            <div className="rejection-reason-box">
              <p className="rejection-reason-label">
                {t("rejectionReasonLabel", "Reason given by the admin")}
              </p>
              <p className="rejection-reason-text" style={{ opacity: 0.8, fontWeight: 500 }}>
                {t("rejectionNoReason", "The admin did not record a specific reason. Please contact the admin for details.")}
              </p>
            </div>
          )}

          <div className="rejection-help-box">
            <p className="rejection-help-label">{t("rejectionNextSteps", "What you can do")}</p>
            <ul className="rejection-help-list">
              <li>{t("rejectionStep1", "Contact your society admin to understand the reason.")}</li>
              <li>{t("rejectionStep2", "Correct your documents or details as discussed.")}</li>
              <li>{t("rejectionStep3", "Register again once the issue is resolved.")}</li>
            </ul>
          </div>

          {hasContact && (
            <div className="rejection-contact-box">
              <p className="rejection-contact-label">{t("rejectionContactAdmin", "Contact the admin")}</p>
              {contact.name && <p className="rejection-contact-name">{contact.name}</p>}
              {contact.email && (
                <a className="rejection-contact-link" href={`mailto:${contact.email}`}>
                  <HiMail />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a className="rejection-contact-link" href={`tel:${contact.phone}`}>
                  <HiOutlinePhone />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          )}

          <button type="button" onClick={onClose} className="rejection-close-btn">
            {t("rejectionClose", "Back to login")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApprovalPendingModal({ onClose }) {
  return (
    <div className="approval-pending-overlay" role="status" aria-live="polite">
      <div className="approval-pending-card animate-scaleIn">
        <div className="approval-pending-accent" />
        <div className="approval-pending-icon">⏳</div>
        <span className="approval-pending-badge">ACCOUNT REVIEW</span>
        <h2>Registration Pending</h2>
        <p>Your registration is waiting for confirmation from the society admin. Login OTP will be available after approval.</p>
        <div className="approval-pending-status"><span /> Awaiting admin confirmation</div>
        <button type="button" className="button1" onClick={onClose}>Back to Login</button>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const { login, switchRole, user } = useContext(AuthContext);
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [step, setStep] = useState("credentials");
  const [tempToken, setTempToken] = useState(null);
  const [panelPrompt, setPanelPrompt] = useState(null);
  const [multiSocietyPrompt, setMultiSocietyPrompt] = useState(null);
  const [rejection, setRejection] = useState(null);
  const [approvalPending, setApprovalPending] = useState(false);

  // Panel chooser helpers — society admins, committee members & accountants who live in the
  // society also get the Resident panel (mirrors the mobile app).
  //
  // The API sends `availablePanels`, which already accounts for whether an
  // accountant lives in the society (AccountantAssignment.is_society_resident).
  // The roles array cannot answer this question on its own: it always contains
  // RESIDENT for an accountant, including one appointed from outside.
  const promptUser = panelPrompt?.user;
  const promptRoles = Array.isArray(promptUser?.roles) && promptUser.roles.length
    ? promptUser.roles
    : [promptUser?.role].filter(Boolean);
  const promptPanels = Array.isArray(promptUser?.availablePanels) && promptUser.availablePanels.length
    ? promptUser.availablePanels
    : promptRoles;
  const promptHasSuperAdmin = promptPanels.includes("SUPER_ADMIN");
  const promptHasSocietyAdmin = promptPanels.includes("SOCIETY_ADMIN");
  const promptHasCommittee = !promptHasSocietyAdmin && (promptPanels.includes("COMMITTEE_MEMBER") || promptPanels.includes("COMMITTEE"));
  const promptHasAccountant = promptPanels.includes("ACCOUNTANT");

  // Determine if the user is a resident of the society:
  // For society admin / management, verify genuine residency before offering resident panel
  const isPromptUserResident =
    promptUser?.is_society_resident === true ||
    (promptUser?.resident_type && ["OWNER", "TENANT"].includes(String(promptUser.resident_type).toUpperCase())) ||
    (!promptHasSocietyAdmin && !promptHasSuperAdmin && promptPanels.includes("RESIDENT"));

  const promptHasResident = promptPanels.includes("RESIDENT") && isPromptUserResident;
  // Only offer the chooser when there is genuinely a choice to make.
  const promptOptionCount = [
    promptHasSuperAdmin,
    promptHasSocietyAdmin,
    promptHasCommittee,
    promptHasAccountant,
    promptHasResident,
  ].filter(Boolean).length;

  const ROUTE_MAP = {
    SUPER_ADMIN: "/superadmin",
    SOCIETY_ADMIN: "/admin",
    COMMITTEE_MEMBER: "/admin",
    RESIDENT: "/resident",
    FAMILY_MEMBER: "/family",
    GUARD: "/guard",
    ACCOUNTANT: "/accountant",
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { toast.error("Please enter your email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address."); return;
    }
    if (!password) { toast.error("Please enter your password."); return; }
    setLoginLoading(true);

    try {
      const res = await API.post("/auth/login", { email: trimmedEmail, password });

      if (res.data.tempToken) {
        setTempToken(res.data.tempToken);
        setStep("otp");
        toast.success("OTP sent to your registered email");
      } else {
        const { token, user } = res.data;
        handleVerified(user, token);
      }
    } catch (err) {
      const data = err.response?.data;
      // Branch on the machine-readable code, not the message text.
      if (data?.code === "APPROVAL_REJECTED") {
        setRejection({
          rejection_reason: data.rejection_reason || null,
          society_name: data.society_name || null,
          admin_contact: data.admin_contact || null,
        });
      } else if (data?.code === "APPROVAL_PENDING") {
        setApprovalPending(true);
      } else {
        toast.error(data?.message || "Login failed");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerified = (user, token) => {
    // If the user belongs to multiple societies, ask for society selection first!
    const availableSocieties = Array.isArray(user.availableSocieties) && user.availableSocieties.length > 0
      ? user.availableSocieties
      : [];

    if (availableSocieties.length > 1) {
      setStep("credentials");
      setTempToken(null);
      setMultiSocietyPrompt({
        user,
        token,
        societies: availableSocieties,
        selectedSociety: null,
      });
      return;
    }

    const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean);
    // `availablePanels` is the authoritative list — it reflects whether an
    // accountant or admin actually lives in the society, which `roles` cannot express.
    const panels = Array.isArray(user.availablePanels) && user.availablePanels.length
      ? user.availablePanels
      : roles;

    const hasSuperAdmin = panels.includes("SUPER_ADMIN");
    const hasSocietyAdmin = panels.includes("SOCIETY_ADMIN");
    const hasCommittee = !hasSocietyAdmin && (panels.includes("COMMITTEE_MEMBER") || panels.includes("COMMITTEE"));
    const hasAccountant = panels.includes("ACCOUNTANT");

    // Before offering the Resident panel, verify that the user is genuinely a resident of the society.
    // A Society Admin who is not a resident must not see the panel chooser popup!
    const isResidentOfSociety =
      user.is_society_resident === true ||
      (user.resident_type && ["OWNER", "TENANT"].includes(String(user.resident_type).toUpperCase())) ||
      (!hasSocietyAdmin && !hasSuperAdmin && panels.includes("RESIDENT"));

    const hasResident = panels.includes("RESIDENT") && isResidentOfSociety;

    // Management users who also have a second panel pick one from a popup first
    // (same as mobile). A single-panel user — e.g. an accountant appointed from
    // outside the society, or a non-resident society admin — has nothing to choose,
    // so skip the popup entirely.
    // Login is deferred so PublicRoute does not redirect away before the popup
    // is shown. Also close the OTP modal so it does not sit on top.
    const choiceCount = [
      hasSuperAdmin,
      hasSocietyAdmin,
      hasCommittee,
      hasAccountant,
      hasResident,
    ].filter(Boolean).length;

    if (choiceCount > 1) {
      setStep("credentials");
      setTempToken(null);
      setPanelPrompt({ user, token });
      return;
    }

    // If society admin, ensure activeRole defaults to SOCIETY_ADMIN unless another management role was set
    if (hasSocietyAdmin && (!user.activeRole || user.activeRole === "RESIDENT")) {
      user.activeRole = "SOCIETY_ADMIN";
    }

    login(user, token);

    if (user.activeRole === "SUPER_ADMIN") {
      localStorage.setItem("superadmin_society_filter", "ALL");
    }

    const targetRoute = ROUTE_MAP[user.activeRole] || "/";
    navigate(targetRoute, { replace: true });
  };

  const handleSelectSociety = (soc) => {
    const socRoles = Array.isArray(soc.roles) && soc.roles.length ? soc.roles : ["RESIDENT"];
    const hasAdmin = socRoles.includes("SOCIETY_ADMIN");
    const hasComm = !hasAdmin && (socRoles.includes("COMMITTEE_MEMBER") || socRoles.includes("COMMITTEE"));
    const hasAcc = socRoles.includes("ACCOUNTANT");
    const hasRes = socRoles.includes("RESIDENT");
    const choiceCount = [hasAdmin, hasComm, hasAcc, hasRes].filter(Boolean).length;

    if (choiceCount > 1) {
      // Multiple roles in this chosen society -> proceed to role selection for this society
      setMultiSocietyPrompt((prev) => ({
        ...prev,
        selectedSociety: soc,
      }));
    } else {
      // Exactly 1 role in this chosen society -> finalize login right away
      const targetRole = hasAdmin
        ? "SOCIETY_ADMIN"
        : hasComm
        ? "COMMITTEE_MEMBER"
        : hasAcc
        ? "ACCOUNTANT"
        : "RESIDENT";
      finalizeSocietyLogin(soc.id, targetRole);
    }
  };

  const finalizeSocietyLogin = async (targetSocietyId, targetRole) => {
    if (!multiSocietyPrompt) return;
    const { user, token } = multiSocietyPrompt;
    setLoginLoading(true);

    try {
      let finalUser = user;
      let finalToken = token;

      // Always sync active society & role via switch-society
      const switchRes = await API.post(
        "/auth/switch-society",
        { society_id: targetSocietyId, role: targetRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (switchRes.data?.token) {
        finalToken = switchRes.data.token;
        finalUser = switchRes.data.user || {
          ...user,
          society_id: targetSocietyId,
          activeRole: targetRole,
          role: targetRole,
        };
      }

      setMultiSocietyPrompt(null);
      login(finalUser, finalToken);

      if (targetRole === "SUPER_ADMIN") {
        localStorage.setItem("superadmin_society_filter", "ALL");
      }

      const targetRoute = ROUTE_MAP[targetRole] || "/";
      navigate(targetRoute, { replace: true });
    } catch (err) {
      console.error("Society login finalization failed:", err);
      toast.error(err.response?.data?.message || "Failed to enter panel");
    } finally {
      setLoginLoading(false);
    }
  };

  const dismissMultiSocietyPrompt = () => {
    if (!multiSocietyPrompt) return;
    const { user, token } = multiSocietyPrompt;
    setMultiSocietyPrompt(null);
    login(user, token);
    navigate(ROUTE_MAP[user.activeRole] || "/", { replace: true });
  };

  const enterPanel = async (panelRole) => {
    if (!panelPrompt) return;
    const { user, token } = panelPrompt;

    // Guard the entry point too, not just the buttons. An outsider accountant
    // is only offered ACCOUNTANT, and the API rejects RESIDENT for them.
    const panels = Array.isArray(user.availablePanels) && user.availablePanels.length
      ? user.availablePanels
      : [];
    if (panels.length && !panels.includes(panelRole)) {
      toast.error("You do not have access to that panel.");
      return;
    }

    login(user, token);

    if (panelRole === "SUPER_ADMIN") {
      localStorage.setItem("superadmin_society_filter", "ALL");
    }

    setPanelPrompt(null);
    if (panelRole !== user.activeRole) {
      try {
        await switchRole(panelRole);
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to switch panel");
        return;
      }
    }
    navigate(ROUTE_MAP[panelRole] || "/", { replace: true });
  };

  const dismissPanelPrompt = () => {
    if (!panelPrompt) return;
    const { user, token } = panelPrompt;
    login(user, token);
    setPanelPrompt(null);
    navigate(ROUTE_MAP[user.activeRole] || "/", { replace: true });
  };

  const handleCancelOtp = () => {
    setStep("credentials");
    setTempToken(null);
  };

  return (
    <div className="login-page-container">
      <nav className={`home-navbar home-navbar--scrolled ${menuOpen ? "home-navbar--menu-open" : ""}`}>
        <div className="home-container">
          <div className="home-navbar-inner">
            <Link to="/" className="home-brand-logo" aria-label={t("homeBrandHomeLabel")}>
              <img src={compLogoImg} alt={t("homeCompanyLogoAlt")} className="home-brand-comp-logo" />
              <div className="home-brand-divider" aria-hidden="true" />
              <div className="home-brand-text">
                <div className="home-brand-title">{t("homeBrandTitle")}</div>
                <div className="home-brand-subtitle">{t("homeBrandSubtitle")}</div>
              </div>
            </Link>
            <ul className="home-nav-links">
              <li className="home-nav-item"><Link to="/#features" className="home-nav-link">{t("homeNavFeatures")}</Link></li>
              <li className="home-nav-item"><Link to="/#how-it-works" className="home-nav-link">{t("homeNavHowItWorks")}</Link></li>
              <li className="home-nav-item"><Link to="/#roles" className="home-nav-link">{t("homeNavUserRoles")}</Link></li>
            </ul>
            <div className="home-nav-actions">
              <LanguageSelector compact />
              <div className="home-nav-theme-toggle"><ThemeToggle /></div>
              <Link to="/" className="home-btn-nav-cta"><span>{t("homeNavHome")}</span><HiOutlineArrowRight className="home-nav-btn-arrow" /></Link>
            </div>
            <button className="home-mobile-burger" onClick={() => setMenuOpen((open) => !open)} aria-label={t("homeToggleMenu")} aria-expanded={menuOpen}>
              {menuOpen ? <HiOutlineXMark /> : <HiBars3 />}
            </button>
          </div>
        </div>
        <div className={`home-mobile-menu ${menuOpen ? "active" : ""}`}>
          <Link to="/#features" className="home-mobile-link" onClick={() => setMenuOpen(false)}>{t("homeNavFeatures")}</Link>
          <Link to="/#how-it-works" className="home-mobile-link" onClick={() => setMenuOpen(false)}>{t("homeNavHowItWorks")}</Link>
          <Link to="/#roles" className="home-mobile-link" onClick={() => setMenuOpen(false)}>{t("homeNavUserRoles")}</Link>
          <div className="home-mobile-divider" />
          <div className="home-mobile-prefs"><LanguageSelector compact /><div className="home-nav-theme-toggle"><ThemeToggle /></div></div>
          <div className="home-mobile-actions"><Link to="/" className="home-btn-nav-cta" onClick={() => setMenuOpen(false)}>{t("homeNavHome")}</Link></div>
        </div>
      </nav>
      <main className="login-auth-card">
      <section className="login-hero-panel">
        <img src={loginHeroImg} alt="" className="login-hero-image" />
        <div className="login-hero-shade" aria-hidden="true" />
        <div className="login-hero-brand">
          <Link to="/" className="login-hero-brand-link" aria-label={t("homeBrandHomeLabel")}>
            <img src={compLogoImg} alt={t("homeCompanyLogoAlt")} />
            <span className="login-hero-brand-copy">
              <strong>{t("homeBrandTitle")}</strong>
              <small>{t("homeBrandSubtitle")}</small>
            </span>
          </Link>
        </div>
        <div className="login-hero-copy">
          <h1>{t("authHeroTitle")}<br /><span>{t("authHeroAccent")}</span></h1>
          <p className="login-hero-description">{t("authHeroDescription")}</p>
        </div>
        <div className="login-benefit-strip">
          <div className="login-benefit">
            <span className="login-benefit-icon"><HiShieldCheck /></span>
            <span>{t("authBenefit1")}</span>
          </div>
          <div className="login-benefit-divider" />
          <div className="login-benefit">
            <span className="login-benefit-icon"><MdGroups /></span>
            <span>{t("authBenefit2")}</span>
          </div>
          <div className="login-benefit-divider" />
          <div className="login-benefit">
            <span className="login-benefit-icon"><HiLockClosed /></span>
            <span>{t("authBenefit3")}</span>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-panel-top">
          <button type="button" className="login-back-button" onClick={() => navigate("/")}>
            <HiOutlineArrowLeft /> {t("authBack")}
          </button>
        </div>

        <div className="login-content">

      {/* OTP Modal */}
      {step === "otp" && (
        <OtpModal
          email={email}
          tempToken={tempToken}
          onVerified={handleVerified}
          onCancel={handleCancelOtp}
        />
      )}

      {/* Registration Rejected Modal */}
      {rejection && (
        <RejectionModal details={rejection} t={t} onClose={() => setRejection(null)} />
      )}
      {approvalPending && (
        <ApprovalPendingModal onClose={() => setApprovalPending(false)} />
      )}

      {/* Panel Chooser Modal (Residents with Committee or Accountant role) */}
      {panelPrompt && promptOptionCount > 1 &&
        createPortal(
          <div
            className="animate-fadeIn"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => dismissPanelPrompt()}
          >
            <div
              className="animate-scaleIn"
              style={{
                background: "var(--card-bg)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: 22,
                maxWidth: 440,
                width: "100%",
                padding: "24px 24px",
                boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)",
                color: "var(--text-primary)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {promptHasSocietyAdmin ? (
                      <MdAdminPanelSettings size={24} />
                    ) : promptHasSuperAdmin ? (
                      <MdSupervisorAccount size={24} />
                    ) : (
                      <MdGroups size={24} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Select Panel</h3>
                    <p style={{ fontSize: 12, margin: "2px 0 0", color: "var(--text-secondary)" }}>
                      Choose your workspace to continue
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissPanelPrompt()}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    background: "var(--card-inner-bg)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Close and continue"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {promptHasSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => enterPanel("SUPER_ADMIN")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    className="login-panel-option"
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius: 12,
                        background: "rgba(245,158,11,0.12)",
                        color: "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MdSupervisorAccount size={22} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Super Admin Panel</p>
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary)" }}>
                        Platform-wide control & multi-society management
                      </p>
                    </div>
                  </button>
                )}

                {promptHasSocietyAdmin && (
                  <button
                    type="button"
                    onClick={() => enterPanel("SOCIETY_ADMIN")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    className="login-panel-option"
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius: 12,
                        background: "rgba(59,130,246,0.12)",
                        color: "#3b82f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MdAdminPanelSettings size={22} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Society Admin Panel</p>
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary)" }}>
                        Full society management, flats, staff & settings
                      </p>
                    </div>
                  </button>
                )}

                {promptHasCommittee && (
                  <button
                    type="button"
                    onClick={() => enterPanel("COMMITTEE_MEMBER")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    className="login-panel-option"
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius: 12,
                        background: "rgba(139,92,246,0.12)",
                        color: "#8b5cf6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MdGroups size={22} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Committee Member Panel</p>
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary)" }}>
                        Manage notices, complaints & society operations
                      </p>
                    </div>
                  </button>
                )}

                {promptHasAccountant && (
                  <button
                    type="button"
                    onClick={() => enterPanel("ACCOUNTANT")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    className="login-panel-option"
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius: 12,
                        background: "rgba(16,185,129,0.12)",
                        color: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MdAccountBalance size={22} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Accountant Panel</p>
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary)" }}>
                        Manage bills, payments, expenses & society finance
                      </p>
                    </div>
                  </button>
                )}

                {promptHasResident && (
                  <button
                    type="button"
                    onClick={() => enterPanel("RESIDENT")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    className="login-panel-option"
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        minWidth: 42,
                        borderRadius: 12,
                        background: "rgba(37,99,235,0.12)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MdHome size={22} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Resident Panel</p>
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary)" }}>
                        Bills, complaints, visitors & daily services
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MULTI-SOCIETY & ROLE SELECTION MODAL */}
      {multiSocietyPrompt &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(6px)",
              padding: "16px",
            }}
            onClick={dismissMultiSocietyPrompt}
          >
            <div
              style={{
                background: "var(--card-bg, #181c2a)",
                borderRadius: 20,
                border: "1px solid var(--divider, rgba(255,255,255,0.1))",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                width: "100%",
                maxWidth: 480,
                maxHeight: "90vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "24px",
                color: "var(--text-primary, #ffffff)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, rgba(107,70,193,0.2) 0%, rgba(59,130,246,0.2) 100%)",
                      border: "1px solid rgba(107,70,193,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent, #a78bfa)",
                      flexShrink: 0,
                    }}
                  >
                    {multiSocietyPrompt.selectedSociety ? (
                      <MdGroups size={24} />
                    ) : (
                      <HiOutlineBuildingOffice2 size={24} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                      {multiSocietyPrompt.selectedSociety ? "Select Role Panel" : "Select Society"}
                    </h3>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary, rgba(255,255,255,0.65))" }}>
                      {multiSocietyPrompt.selectedSociety
                        ? `Choose role for ${multiSocietyPrompt.selectedSociety.name}:`
                        : "You belong to multiple societies. Select where to enter:"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissMultiSocietyPrompt}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary, rgba(255,255,255,0.7))",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Close and continue"
                >
                  ✕
                </button>
              </div>

              {/* Sub-state 1: Society Selection List */}
              {!multiSocietyPrompt.selectedSociety && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {multiSocietyPrompt.societies.map((soc) => {
                    const socRoles = Array.isArray(soc.roles) && soc.roles.length ? soc.roles : ["RESIDENT"];
                    return (
                      <button
                        key={soc.id}
                        type="button"
                        onClick={() => handleSelectSociety(soc)}
                        disabled={loginLoading}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                          width: "100%",
                          color: "inherit",
                        }}
                        className="login-panel-option"
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(59,130,246,0.12)",
                            border: "1px solid rgba(59,130,246,0.25)",
                            color: "#60a5fa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <HiOutlineBuildingOffice2 size={22} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary, #ffffff)" }}>
                              {soc.name}
                            </p>
                            <span style={{ fontSize: 14, color: "var(--accent, #a78bfa)", fontWeight: 700 }}>→</span>
                          </div>
                          {soc.address && (
                            <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary, rgba(255,255,255,0.6))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {soc.address}
                            </p>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {soc.resident_type && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(59,130,246,0.12)",
                                  color: "#60a5fa",
                                  border: "1px solid rgba(59,130,246,0.25)",
                                  textTransform: "uppercase",
                                }}
                              >
                                {soc.resident_type}
                              </span>
                            )}
                            {socRoles.includes("COMMITTEE_MEMBER") && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(234,179,8,0.16)",
                                  color: "#facc15",
                                  border: "1px solid rgba(234,179,8,0.35)",
                                  textTransform: "uppercase",
                                }}
                              >
                                ★ COMMITTEE MEMBER
                              </span>
                            )}
                            {socRoles.includes("SOCIETY_ADMIN") && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(168,85,247,0.14)",
                                  color: "#c084fc",
                                  border: "1px solid rgba(168,85,247,0.25)",
                                  textTransform: "uppercase",
                                }}
                              >
                                ADMIN
                              </span>
                            )}
                            {socRoles.includes("ACCOUNTANT") && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(16,185,129,0.14)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16,185,129,0.25)",
                                  textTransform: "uppercase",
                                }}
                              >
                                ACCOUNTANT
                              </span>
                            )}
                            {!socRoles.includes("COMMITTEE_MEMBER") && !socRoles.includes("SOCIETY_ADMIN") && !socRoles.includes("ACCOUNTANT") && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(255,255,255,0.06)",
                                  color: "var(--text-secondary, rgba(255,255,255,0.7))",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  textTransform: "uppercase",
                                }}
                              >
                                RESIDENT
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sub-state 2: Role Selection for selected society */}
              {multiSocietyPrompt.selectedSociety && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setMultiSocietyPrompt((p) => ({ ...p, selectedSociety: null }))}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: "none",
                      color: "var(--accent, #a78bfa)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ← Back to Society Selection
                  </button>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Society Admin Card */}
                    {(multiSocietyPrompt.selectedSociety.roles || []).includes("SOCIETY_ADMIN") && (
                      <button
                        type="button"
                        onClick={() => finalizeSocietyLogin(multiSocietyPrompt.selectedSociety.id, "SOCIETY_ADMIN")}
                        disabled={loginLoading}
                        className="login-panel-option"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(59,130,246,0.12)",
                            color: "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <MdAdminPanelSettings size={22} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary, #ffffff)" }}>Society Admin Panel</p>
                          <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary, rgba(255,255,255,0.65))" }}>
                            Full society management, flats, staff & settings
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Committee Member Card */}
                    {(multiSocietyPrompt.selectedSociety.roles || []).includes("COMMITTEE_MEMBER") && (
                      <button
                        type="button"
                        onClick={() => finalizeSocietyLogin(multiSocietyPrompt.selectedSociety.id, "COMMITTEE_MEMBER")}
                        disabled={loginLoading}
                        className="login-panel-option"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(234,179,8,0.16)",
                            color: "#facc15",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <MdGroups size={22} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary, #ffffff)" }}>Committee Member Panel</p>
                          <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary, rgba(255,255,255,0.65))" }}>
                            Manage notices, complaints & society operations
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Accountant Card */}
                    {(multiSocietyPrompt.selectedSociety.roles || []).includes("ACCOUNTANT") && (
                      <button
                        type="button"
                        onClick={() => finalizeSocietyLogin(multiSocietyPrompt.selectedSociety.id, "ACCOUNTANT")}
                        disabled={loginLoading}
                        className="login-panel-option"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(16,185,129,0.12)",
                            color: "#10b981",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <MdAccountBalance size={22} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary, #ffffff)" }}>Accountant Panel</p>
                          <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary, rgba(255,255,255,0.65))" }}>
                            Manage bills, payments, expenses & society finance
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Resident Card */}
                    {(multiSocietyPrompt.selectedSociety.roles || []).includes("RESIDENT") && (
                      <button
                        type="button"
                        onClick={() => finalizeSocietyLogin(multiSocietyPrompt.selectedSociety.id, "RESIDENT")}
                        disabled={loginLoading}
                        className="login-panel-option"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
                          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(37,99,235,0.12)",
                            color: "var(--accent, #60a5fa)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <MdHome size={22} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary, #ffffff)" }}>Resident Panel</p>
                          <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary, rgba(255,255,255,0.65))" }}>
                            Bills, complaints, visitors & daily services
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      <form className="form" onSubmit={handleLogin}>
        <div className="login-heading-block">
          <p className="login-eyebrow">{t("authWelcomeEyebrow")}</p>
          <h2 id="heading">{t("authWelcomeTitle")}</h2>
          <p className="login-heading-subtitle">{t("authWelcomeSubtitle")}</p>
        </div>

        {/* Email Field with SVG icon */}
        <label className="login-field-label" htmlFor="login-email">{t("authEmailLabel")}</label>
        <div className="field">
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"></path>
          </svg>
          <input
            id="login-email"
            placeholder={t("authEmailPlaceholder")}
            className="input-field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password Field with SVG icon + Eye toggle */}
        <label className="login-field-label" htmlFor="login-password">{t("authPasswordLabel")}</label>
        <div className="field">
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
          </svg>
          <input
            id="login-password"
            placeholder={t("authPasswordPlaceholder")}
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
            aria-label={showPassword ? t("authHidePassword") : t("authShowPassword")}
          >
            {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
          </button>
        </div>

        <div className="login-options-row">
          <span />
          <button type="button" onClick={() => navigate("/forgot-password")} className="button3">
            {t("authForgotPassword")}
          </button>
        </div>

        {/* Existing verification notice; the OTP flow is unchanged. */}
        <div className="uiverse-notice">
          <HiShieldCheck className="uiverse-notice-icon" />
          <span className="uiverse-notice-text">
            {t("authVerificationNotice")}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="btn">
          <button type="submit" disabled={loginLoading} className="button1">
            {loginLoading ? t("authSendingCode") : <>{t("authSignIn")} <HiOutlineArrowRight /></>}
          </button>
        </div>

        <div className="login-form-links">
          <span>{t("authNoAccount")}</span>
          <Link to="/register">{t("authCreateAccount")}</Link>
        </div>
      </form>
        </div>
      </section>
      </main>
    </div>
  );
}

export default Login;
