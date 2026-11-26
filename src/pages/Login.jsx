import { useState, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";
import { DASHBOARD_ROUTES } from "../constants/app";

import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import {
  HiShieldCheck,
  HiMail,
  HiX,
  HiLockClosed,
} from "react-icons/hi";
import {
  HiOutlineBuildingOffice2,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlinePhone,
  HiOutlineUsers,
  HiOutlineCreditCard,
  HiOutlineEnvelope,
  HiOutlineShieldExclamation,
  HiOutlineInformationCircle,
  HiOutlineLockClosed as Hi2LockClosed,
  HiOutlineShieldCheck as Hi2ShieldCheck,
  HiArrowRightOnRectangle,
  HiOutlineGlobeAlt,
  HiOutlineChevronDown,
} from "react-icons/hi2";
import compLogoImg from "../assets/Photos/Home/mazi_icon.png";
import maziHorizontalLogo from "../assets/Photos/Home/mazi_logo.png";
import "../home/Home.css";
import {
  MdHome,
  MdGroups,
  MdAccountBalance,
  MdAdminPanelSettings,
  MdSupervisorAccount,
} from "react-icons/md";

import { useLang } from "../context/LanguageContext";
import loginHeroImg from "../assets/Photos/Home/login_right_side_img.png";
import "./Login.css";

/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE REACT COMPONENT (UIVERSE.IO Praashoo7 DESIGN)
   ═══════════════════════════════════════════════════════════ */
function RejectionModal({ details, onClose, t }) {
  const reason = details?.rejection_reason;
  const societyName = details?.society_name;
  const contact = details?.admin_contact;
  const hasContact = Boolean(contact && (contact.email || contact.phone));

  return (
    <div className="rejection-card-container animate-scaleIn" role="dialog" aria-modal="true" aria-labelledby="rejection-title">
      {/* Top gradient status accent */}
      <div className="rejection-card-topbar" />

      {/* Close Icon Button (Top-Right) */}
      <button
        type="button"
        onClick={onClose}
        className="rejection-card-close-btn"
        aria-label={t("close", "Close")}
      >
        <HiX />
      </button>

      {/* Card Header: Hero row + Title + Subtitle */}
      <div className="rejection-card-header">
        <div className="rejection-hero-row">
          <div className="rejection-shield-badge">
            <HiOutlineShieldExclamation />
          </div>
          <div className="rejection-hero-meta">
            <div className="rejection-status-pill">
              <span className="rejection-status-dot" />
              <span>{t("rejectionStatusTag", "Application Rejected")}</span>
            </div>
            <h2 id="rejection-title" className="rejection-card-title">
              {t("rejectionTitle", "Registration Rejected")}
            </h2>
          </div>
        </div>

        <p className="rejection-card-subtitle">
          {societyName ? (
            <>
              {t("rejectionSubtitlePrefix", "Your registration for")}{" "}
              <span className="rejection-society-badge">{societyName}</span>{" "}
              {t("rejectionSubtitleSuffix", "could not be approved by the society admin.")}
            </>
          ) : (
            t("rejectionSubtitle", "Your registration could not be approved by the society admin.")
          )}
        </p>
      </div>

      {/* Card Content Body */}
      <div className="rejection-card-body">
        {/* Admin's Reason Box */}
        <div className="rejection-reason-box">
          <div className="rejection-reason-header">
            <HiOutlineInformationCircle className="rejection-header-icon" />
            <span>{t("rejectionReasonLabel", "Reason given by the admin")}</span>
          </div>
          <p className="rejection-reason-text">
            {reason || t("rejectionNoReason", "The admin did not record a specific reason. Please contact the admin for details.")}
          </p>
        </div>

        {/* 3-Step Action Guide */}
        <div className="rejection-steps-box">
          <div className="rejection-steps-header">
            {t("rejectionNextSteps", "What you can do")}
          </div>
          <div className="rejection-step-rows">
            <div className="rejection-step-row">
              <span className="rejection-step-num">1</span>
              <span className="rejection-step-label">{t("rejectionStep1", "Contact your society admin to understand the reason.")}</span>
            </div>
            <div className="rejection-step-row">
              <span className="rejection-step-num">2</span>
              <span className="rejection-step-label">{t("rejectionStep2", "Correct your documents or details as discussed.")}</span>
            </div>
            <div className="rejection-step-row">
              <span className="rejection-step-num">3</span>
              <span className="rejection-step-label">{t("rejectionStep3", "Register again once the issue is resolved.")}</span>
            </div>
          </div>
        </div>

        {/* Contact Admin Row */}
        {hasContact && (
          <div className="rejection-contact-strip">
            <span className="rejection-contact-lbl">{t("rejectionContactAdmin", "Contact the admin")}:</span>
            {contact.name && <span className="rejection-admin-name">{contact.name}</span>}
            <div className="rejection-contact-btns">
              {contact.email && (
                <a className="rejection-action-pill" href={`mailto:${contact.email}`} title={contact.email}>
                  <HiOutlineEnvelope />
                  <span>Email</span>
                </a>
              )}
              {contact.phone && (
                <a className="rejection-action-pill" href={`tel:${contact.phone}`} title={contact.phone}>
                  <HiOutlinePhone />
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="rejection-card-footer">
        <button type="button" onClick={onClose} className="rejection-return-button">
          <HiOutlineArrowLeft />
          <span>{t("rejectionClose", "Back to login")}</span>
        </button>
      </div>
    </div>
  );
}

function ApprovalPendingModal({ onClose, t = (k, fb) => fb || k }) {
  return (
    <div className="approval-pending-overlay" role="status" aria-live="polite">
      <div className="approval-pending-card animate-scaleIn">
        <div className="approval-pending-accent" />
        <div className="login-center-logo-box">
          <img src={maziHorizontalLogo} alt="Mazi Society" className="login-center-logo-img" />
        </div>
        <div className="approval-pending-icon">⏳</div>
        <span className="approval-pending-badge">{t("authAccountReview") || "ACCOUNT REVIEW"}</span>
        <h2>{t("authRegPendingTitle") || "Registration Pending"}</h2>
        <p>{t("authRegPendingDesc") || "Your registration is waiting for confirmation from the society admin. You will be able to log in after approval."}</p>
        <div className="approval-pending-status"><span /> {t("authAwaitingAdminConfirm") || "Awaiting admin confirmation"}</div>
        <button type="button" className="button1" onClick={onClose}>{t("authBackToLogin") || "Back to Login"}</button>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const { login, switchRole } = useContext(AuthContext);
  const { t, lang, changeLang, LANGUAGES } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [panelPrompt, setPanelPrompt] = useState(null);
  const [multiSocietyPrompt, setMultiSocietyPrompt] = useState(null);
  const [rejection, setRejection] = useState(null);
  const [approvalPending, setApprovalPending] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem("auth_logout_reason");
    } catch (_) {}
  }, []);

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
    promptUser?.can_switch_to_resident === true ||
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

      const { token, user } = res.data;
      handleVerified(user, token);
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
      user.can_switch_to_resident === true ||
      (!hasSocietyAdmin && !hasSuperAdmin && panels.includes("RESIDENT"));

    const hasResident = panels.includes("RESIDENT") && isResidentOfSociety;

    // Management users who also have a second panel pick one from a popup first
    // (same as mobile). A single-panel user — e.g. an accountant appointed from
    // outside the society, or a non-resident society admin — has nothing to choose,
    // so skip the popup entirely.
    // Login is deferred so PublicRoute does not redirect away before the popup
    // is shown.
    const choiceCount = [
      hasSuperAdmin,
      hasSocietyAdmin,
      hasCommittee,
      hasAccountant,
      hasResident,
    ].filter(Boolean).length;

    if (choiceCount > 1) {
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

    const targetRoute = DASHBOARD_ROUTES[user.activeRole] || ROUTE_MAP[user.activeRole] || "/admin";
    window.location.href = targetRoute;
  };

  const handleSelectSociety = (soc) => {
    const socRoles = Array.isArray(soc.roles) && soc.roles.length ? soc.roles : ["RESIDENT"];
    const hasAdmin = socRoles.includes("SOCIETY_ADMIN");
    const hasComm = !hasAdmin && (socRoles.includes("COMMITTEE_MEMBER") || socRoles.includes("COMMITTEE"));
    const hasAcc = socRoles.includes("ACCOUNTANT");
    const isSocRes = (soc.is_society_resident !== false && soc.can_switch_to_resident !== false) &&
      (soc.flats?.length > 0 || soc.is_society_resident === true || (!hasAdmin && !hasComm));
    const hasRes = socRoles.includes("RESIDENT") && isSocRes;
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

      const targetRoute = DASHBOARD_ROUTES[targetRole] || ROUTE_MAP[targetRole] || "/admin";
      window.location.href = targetRoute;
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
    const targetRoute = DASHBOARD_ROUTES[user.activeRole] || ROUTE_MAP[user.activeRole] || "/admin";
    window.location.href = targetRoute;
  };

  const enterPanel = async (panelRole) => {
    if (!panelPrompt) return;
    const { user, token } = panelPrompt;

    const panels = Array.isArray(user.availablePanels) && user.availablePanels.length
      ? user.availablePanels
      : [];

    const allowed =
      panels.length === 0 ||
      panels.includes(panelRole) ||
      (panelRole === "SOCIETY_ADMIN" && (user.role === "SOCIETY_ADMIN" || (Array.isArray(user.roles) && user.roles.includes("SOCIETY_ADMIN")))) ||
      (panelRole === "RESIDENT" && (user.is_society_resident || user.can_switch_to_resident));

    if (!allowed) {
      toast.error("You do not have access to that panel.");
      return;
    }

    const targetRoute = DASHBOARD_ROUTES[panelRole] || ROUTE_MAP[panelRole] || "/admin";

    setPanelPrompt(null);

    if (panelRole === "SUPER_ADMIN") {
      localStorage.setItem("superadmin_society_filter", "ALL");
    }

    login(user, token);

    if (panelRole !== user.activeRole) {
      try {
        await switchRole(panelRole);
      } catch (err) {
        console.warn("switchRole warning:", err?.response?.data?.message || err.message);
      }
    }

    window.location.href = targetRoute;
  };

  const dismissPanelPrompt = () => {
    if (!panelPrompt) return;
    const { user, token } = panelPrompt;
    setPanelPrompt(null);
    login(user, token);
    const targetRoute = DASHBOARD_ROUTES[user.activeRole] || ROUTE_MAP[user.activeRole] || "/admin";
    window.location.href = targetRoute;
  };

  return (
    <div className="login-page-container">
      <main className="login-auth-card">
      <section className="login-hero-panel">
        <img src={loginHeroImg} alt="" className="login-hero-image" />
        <div className="login-hero-shade" aria-hidden="true" />
        <div className="login-hero-brand">
          <Link to="/" className="login-hero-brand-link" aria-label={t("homeBrandHomeLabel") || "Home"}>
            <img src={compLogoImg} alt={t("homeCompanyLogoAlt") || "Logo"} className="login-hero-logo-clean" />
            <div className="login-hero-brand-divider" aria-hidden="true" />
            <span className="login-hero-brand-copy">
              <strong>{t("homeBrandTitle") || "Mazi Society"}</strong>
              <small>{t("homeBrandSubtitle") || "Your Society, Smarter Living."}</small>
            </span>
          </Link>
        </div>
        <div className="login-hero-copy">
          <div className="login-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(255,255,255,0.08)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 12 }}>
            <HiOutlineBuildingOffice2 size={14} />
            <span>{t("authCommunityLiving") || "RESIDENTIAL COMMUNITY"}</span>
          </div>
          <h1>
            {t("authWelcomeTo") || "Welcome to"}<br />
            <span>{t("authYourCommunity") || "Your Community"}</span>
          </h1>
          <p className="login-hero-description">
            {t("homeHeroSubtitle") || "A complete digital platform for managing residents, maintenance, visitors, security, communication and everyday society operations."}
          </p>
        </div>
        {/* 3 Highlight Cards matching reference */}
        <div className="login-feature-cards">
          <div className="login-feature-card">
            <div className="login-feature-card-icon">
              <HiOutlineUsers />
            </div>
            <div className="login-feature-card-text">
              <span className="login-feature-card-title">{t("authFeatManageResidents") || "Manage Residents"}</span>
              <span className="login-feature-card-sub">{t("authFeatManageResidentsSub") || "Resident & Household"}</span>
            </div>
          </div>

          <div className="login-feature-card">
            <div className="login-feature-card-icon">
              <Hi2ShieldCheck />
            </div>
            <div className="login-feature-card-text">
              <span className="login-feature-card-title">{t("authFeatEnhanceSecurity") || "Enhance Security"}</span>
              <span className="login-feature-card-sub">{t("authFeatEnhanceSecuritySub") || "Gate & Visitor Pass"}</span>
            </div>
          </div>

          <div className="login-feature-card">
            <div className="login-feature-card-icon">
              <HiOutlineCreditCard />
            </div>
            <div className="login-feature-card-text">
              <span className="login-feature-card-title">{t("authFeatTrackPayments") || "Track Payments"}</span>
              <span className="login-feature-card-sub">{t("authFeatTrackPaymentsSub") || "Maintenance & Dues"}</span>
            </div>
          </div>
        </div>

        <div className="login-hero-footer-tag">
          <Hi2ShieldCheck size={16} />
          <span>{t("authHeroFooter") || "Making Society Living Simpler."}</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-panel-top">
          <button
            type="button"
            className="login-back-button"
            onClick={() => navigate("/")}
            aria-label={t("authBack") || "Back"}
          >
            <HiOutlineArrowLeft size={16} />
            <span>{t("authBack") || "Back"}</span>
          </button>

          <div className="auth-lang-dropdown-wrap" ref={langRef}>
            <button
              type="button"
              className="auth-lang-pill"
              onClick={() => setLangOpen((p) => !p)}
              aria-label="Select language"
            >
              <HiOutlineGlobeAlt size={16} />
              <span>{LANGUAGES?.find((l) => l.code === lang)?.label || "English"}</span>
              <HiOutlineChevronDown size={13} />
            </button>
            {langOpen && (
              <div className="auth-lang-menu">
                {(LANGUAGES || [{ code: "en", label: "English" }]).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`auth-lang-option ${lang === l.code ? "active" : ""}`}
                    onClick={() => {
                      changeLang(l.code);
                      setLangOpen(false);
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="login-content">

      {/* Registration Rejected Modal */}
      {rejection && (
        <RejectionModal details={rejection} t={t} onClose={() => setRejection(null)} />
      )}
      {approvalPending && (
        <ApprovalPendingModal t={t} onClose={() => setApprovalPending(false)} />
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

      {!approvalPending && !rejection && (
        <form className="form" onSubmit={handleLogin}>
          <div className="login-center-logo-box">
            <img src={maziHorizontalLogo} alt="Mazi Society" className="login-center-logo-img" />
          </div>
          <div className="login-heading-block" style={{ marginBottom: 22 }}>
            <h1 id="heading" className="login-form-title">{t("authWelcomeTitle") || "Welcome Back"}</h1>
          </div>

        {/* Email Field with HiOutlineEnvelope icon */}
        <div className="login-field-group">
          <label className="login-field-label" htmlFor="login-email">
            <HiOutlineEnvelope className="login-label-icon" />
            <span>{t("authEmailLabel") || "Email Address"}</span>
          </label>
          <div className="field">
            <HiOutlineEnvelope className="input-icon input-icon--slate" />
            <input
              id="login-email"
              placeholder={t("authEmailPlaceholder") || "Enter your email address"}
              className="input-field"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password Field with Hi2LockClosed icon + Eye toggle */}
        <div className="login-field-group">
          <label className="login-field-label" htmlFor="login-password">
            <Hi2LockClosed className="login-label-icon" />
            <span>{t("authPasswordLabel") || "Password"}</span>
          </label>
          <div className="field">
            <Hi2LockClosed className="input-icon input-icon--slate" />
            <input
              id="login-password"
              placeholder={t("authPasswordPlaceholder") || "Enter your password"}
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
              {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
            </button>
          </div>
        </div>

        <div className="login-options-row">
          <label className="remember-me">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <span>{t("authRememberMe") || "Remember Me"}</span>
          </label>
          <button type="button" onClick={() => navigate("/forgot-password")} className="button3">
            {t("authForgotPassword") || "Forgot Password?"}
          </button>
        </div>

        {/* Buttons Row */}
        <div className="btn">
          <button type="submit" disabled={loginLoading} className="button1 login-submit-btn">
            {loginLoading ? (
              <>
                <span className="login-loading-spinner" aria-hidden="true" />
                {t("authSendingCode") || "Signing in..."}
              </>
            ) : (
              <>
                <HiArrowRightOnRectangle size={18} />
                <span>{t("authSignIn") || "Sign In"}</span>
                <HiOutlineArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <div className="login-form-links">
          <span>{t("authNoAccount") || "New to the community?"}</span>
          <Link to="/register">{t("authCreateAccount") || "Create an account"}</Link>
        </div>

          {/* Security Encryption Footer */}
          <div className="login-security-footer">
            <Hi2LockClosed size={14} aria-hidden="true" />
            <span>{t("authProtectedEncrypted") || "Protected by encrypted society authentication"}</span>
          </div>
        </form>
      )}
        </div>
      </section>
      </main>
    </div>
  );
}

export default Login;
