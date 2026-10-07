import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  MdSettings,
  MdPerson,
  MdLock,
  MdSecurity,
  MdNotifications,
  MdLanguage,
  MdTranslate,
  MdCameraAlt,
  MdEdit,
  MdClose,
  MdCheck,
  MdCheckCircle,
  MdArrowBack,
  MdChevronRight,
  MdEmail,
  MdPhone,
  MdApartment,
  MdBadge,
  MdDeleteOutline,
  MdCloudUpload,
  MdVpnKey,
  MdWarning,
  MdWarningAmber,
  MdInfoOutline,
} from "react-icons/md";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { useAuthContext } from "../../context/AuthContext";
import ProfilePictureUploader from "./ProfilePictureUploader";
import UserAvatar from "./UserAvatar";
import GlobalModal from "./GlobalModal";
import GlobalConfirmDialog from "./GlobalConfirmDialog";
import "../../pages/Admin/AdminSetting.css";
import "./SettingsSections.css";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const PHONE_RE = /^[+\d][\d\s()-]{5,19}$/;
const MAX_BYTES = 5 * 1024 * 1024;
const SECTIONS = ["profile", "password", "notifications", "language"];
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

/** "RESIDENT" -> "Resident" */
const titleCaseRole = (r) =>
  String(r || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

/** 0-4 score. Mirrors the admin implementation exactly. */
function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return s;
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LockIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0 l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293 a1 1 0 011.414 0z"
        clipRule="evenodd" />
    </svg>
  );
}

function ErrorIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd" />
    </svg>
  );
}

/* Accessible switch for the notification rows. The label is associated with
   `labelledBy`, so no untranslated ON/OFF text is needed. */
function Switch({ id, labelledBy, checked, onChange }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      className={`mset-switch${checked ? " mset-switch--on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="mset-switch__knob" aria-hidden="true" />
    </button>
  );
}

/**
 * Shared account-settings surface used by the resident and guard panels.
 *
 * Every panel gets the same hub + detail architecture and the same four
 * sections (Profile, Password, Notifications, Language). A panel wrapper
 * supplies only what is genuinely role-specific, via props:
 *
 *   accountCells  ({ me, user, t, email, roleLabel, allRolesLabel,
 *                   societyLabel, statusTone, approvalLabel }) => cell[]
 *                  Read-only Account Information grid. Omit for the default.
 *   headerSubtitle / hubIntro / notifsHint
 *                  Translation keys, so panel copy can differ.
 *
 * A panel can also mount it as a standalone single-section screen instead of
 * the full hub:
 *
 *   initialView   Open straight into a section instead of the hub.
 *   onExit        When given, the back button leaves the screen via this
 *                 callback rather than returning to the hub.
 *   backLabel     Translation key for the back button when onExit is used.
 *   headerTitle   Translation key for the page title.
 *   headerIcon    Icon component for the page title.
 *
 * Society admins also get Role Permissions, but that section is not part of
 * this component because it depends on society-level permission tables.
 */
export default function SettingsPanel({
  accountCells,
  headerSubtitle = "asSubtitle",
  hubIntro = "asHubIntro",
  notifsHint = "asNotifsHint",
  initialView = "hub",
  onExit = null,
  backLabel = "asBack",
  headerTitle = "settings",
  headerIcon: HeaderIcon = MdSettings,
} = {}) {
  const { t, lang, changeLang, LANGUAGES } = useLang();
  const { user, updateUser } = useAuthContext();

  /* ?section=profile deep-links straight to one section (e.g. the sidebar
     profile card) instead of dropping the user on the hub first. */
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get("section");
  const startView =
    deepLink && SECTIONS.includes(deepLink) ? deepLink : initialView;

  /* ── Navigation: hub by default, then one section at a time ── */
  const [view, setView] = useState(startView);
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get("/users/me");
        if (!cancelled) {
          const fresh = res?.data?.user || res?.data;
          setMe(fresh);
          if (fresh && typeof fresh === "object") {
            updateUser({
              ...(fresh.profile_picture !== undefined ? { profile_picture: fresh.profile_picture } : {}),
              ...(fresh.name ? { name: fresh.name } : {}),
              ...(fresh.phone ? { phone: fresh.phone } : {}),
            });
          }
        }
      } catch {
        // Fall back to the auth session; the page still renders.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  /* ── Notification preferences ── */
  const [notifs, setNotifs] = useState({
    emergencyAlerts: true,
    visitorEntry: true,
    complaintUpdates: true,
    noticeUpdates: true,
  });
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsSaving, setNotifsSaving] = useState(false);
  const [notifsSaved, setNotifsSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await API.get("/settings");
      const d = res.data || {};
      setNotifs({
        emergencyAlerts: d.emergency_alerts,
        visitorEntry: d.visitor_entry,
        complaintUpdates: d.complaint_updates,
        noticeUpdates: d.notice_updates,
      });
    } catch {
      toast.error(t("failedSettings", "Could not load your notification preferences."));
    } finally {
      setNotifsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Inlined rather than calling loadSettings() so the effect body itself
    // never sets state synchronously; the first update lands after the request.
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get("/settings");
        const d = res.data || {};
        if (cancelled) return;
        setNotifs({
          emergencyAlerts: d.emergency_alerts,
          visitorEntry: d.visitor_entry,
          complaintUpdates: d.complaint_updates,
          noticeUpdates: d.notice_updates,
        });
      } catch {
        if (!cancelled) {
          toast.error(t("failedSettings", "Could not load your notification preferences."));
        }
      } finally {
        if (!cancelled) setNotifsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const activeCount = useMemo(
    () => Object.values(notifs).filter(Boolean).length,
    [notifs]
  );

  const saveSettings = async () => {
    try {
      setNotifsSaving(true);
      await API.put("/settings", {
        emergency_alerts: notifs.emergencyAlerts,
        visitor_entry: notifs.visitorEntry,
        complaint_updates: notifs.complaintUpdates,
        notice_updates: notifs.noticeUpdates,
      });
      await loadSettings();
      setNotifsSaved(true);
      setTimeout(() => setNotifsSaved(false), 3000);
    } catch {
      toast.error(t("failedSettings", "Could not save your notification preferences."));
    } finally {
      setNotifsSaving(false);
    }
  };

  /* ── Derived profile values ── */
  const name = me?.name || user?.name || "";
  const email = me?.email || user?.email || "";
  const photo = me?.profile_picture || user?.profile_picture || null;
  const roleLabel = titleCaseRole(me?.activeRole || user?.activeRole || user?.role);
  const societyLabel = me?.Society?.name || "";

  const allRolesLabel = useMemo(() => {
    const list = Array.isArray(me?.roles) ? me.roles : [];
    const mapped = (list.length ? list : [me?.role]).filter(Boolean).map(titleCaseRole);
    return mapped.join(", ") || t("asNA", "Not provided");
  }, [me, t]);

  const approvalLabel = me?.approval_status
    ? titleCaseRole(me.approval_status)
    : titleCaseRole(user?.status) || t("active", "Active");
  const statusTone =
    (me?.approval_status || user?.status) === "APPROVED" ||
    (me?.approval_status || user?.status) === "ACTIVE" ||
    (!me?.approval_status && !user?.status)
      ? "ok"
      : "warn";

  const residentTypeLabel = me?.resident_type
    ? me.resident_type === "OWNER"
      ? t("asOwner", "Owner")
      : me.resident_type === "TENANT"
        ? t("asTenant", "Tenant")
        : titleCaseRole(me.resident_type)
    : t("asNotApplicable", "Not applicable");

  /* Read-only Account Information grid. Panels override this so each role
     sees the fields that actually apply to it (no "Resident Type" for a
     guard, for example). */
  const cells = accountCells
    ? accountCells({
        me,
        user,
        t,
        email,
        roleLabel,
        allRolesLabel,
        societyLabel,
        statusTone,
        approvalLabel,
        residentTypeLabel,
      })
    : [
        {
          key: "email",
          label: t("asEmailLabel", "Email"),
          value: email || t("asNA", "Not provided"),
        },
        {
          key: "roles",
          label: t("asAllRolesLabel", "All Roles"),
          value: allRolesLabel,
        },
        {
          key: "residentType",
          label: t("asResidentTypeLabel", "Resident Type"),
          value: residentTypeLabel,
        },
        {
          key: "society",
          label: t("asSocietyLabel", "Society"),
          value: societyLabel || t("asNotApplicable", "Not applicable"),
        },
        {
          key: "status",
          label: t("asAccountStatusLabel", "Account Status"),
          status: { tone: statusTone, text: approvalLabel },
        },
        {
          key: "id",
          label: t("asUserIdLabel", "User ID"),
          value: `#${me?.id ?? user?.id ?? "—"}`,
          mono: true,
        },
      ];

  /* ── Photo flow state ── */
  const uploaderRef = useRef(null);
  const fileInputRef = useRef(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const applyPhoto = useCallback(
    (url) => {
      setMe((prev) => (prev ? { ...prev, profile_picture: url } : prev));
      // Mirror into the auth session so the header/sidebar avatar updates too.
      updateUser({ profile_picture: url });
    },
    [updateUser]
  );

  /** Avatar click: with no photo go straight to upload, otherwise offer the menu. */
  const openAvatarEditor = () => {
    setPhotoError("");
    if (photo) setPhotoMenuOpen(true);
    else openUpload();
  };

  const openUpload = () => {
    setPhotoMenuOpen(false);
    setPhotoError("");
    setPendingFile(null);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    setPendingFile(null);
    setPhotoError("");
    setUploadOpen(false);
  };

  const acceptFile = (file) => {
    if (!file) return;
    setUploadOpen(false);
    setPendingFile(null);
    setPhotoError("");
    uploaderRef.current?.openCropModal(file);
  };

  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const submitUpload = async () => {
    if (!pendingFile) return;
    setPhotoBusy(true);
    try {
      // ProfilePictureUploader owns validation, the upload request and the
      // toasts. It fires onChange(url) on success, which is applyPhoto.
      const result = await uploaderRef.current?.uploadFile(pendingFile);
      if (result) {
        setUploadOpen(false);
        setPendingFile(null);
        setPhotoError("");
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const confirmRemove = async () => {
    setPhotoBusy(true);
    try {
      // Returns true on success and fires onChange(null) => applyPhoto(null).
      const ok = await uploaderRef.current?.remove();
      if (ok) {
        setRemoveOpen(false);
        setPhotoMenuOpen(false);
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  /* ── Profile edit state ── */
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const startEdit = useCallback(() => {
    setForm({ name: me?.name || user?.name || "", phone: me?.phone || user?.phone || "" });
    setEditing(true);
  }, [me, user]);

  const cancelEdit = useCallback(() => {
    setForm({ name: me?.name || user?.name || "", phone: me?.phone || user?.phone || "" });
    setEditing(false);
  }, [me, user]);

  const nameError = editing && !form.name.trim() ? t("asNameRequired", "Name is required.") : "";
  const phoneError =
    editing && form.phone.trim() && !PHONE_RE.test(form.phone.trim())
      ? t("asPhoneInvalid", "Enter a valid phone number.")
      : "";
  const canSaveProfile =
    !saving && !nameError && !phoneError && form.name.trim().length > 0;

  const saveProfile = async () => {
    if (!canSaveProfile) return;
    setSaving(true);
    try {
      const res = await API.put("/users/me", {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      });
      const updated = res?.data?.user;
      if (updated) {
        setMe((prev) => (prev ? { ...prev, ...updated } : prev));
        updateUser({ name: updated.name, phone: updated.phone });
      } else {
        const fresh = await API.get("/users/me");
        setMe(fresh.data);
        updateUser({ name: fresh.data?.name, phone: fresh.data?.phone });
      }
      toast.success(t("asProfileSaved", "Profile updated successfully."));
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("asProfileSaveFailed", "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  /* ── Password state ── */
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [cp, setCp] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNp, setShowNp] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [errors, setErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  const score = np ? getStrength(np) : 0;
  const strength = {
    1: { label: t("cpwStrWeak", "Weak"), cls: "weak", color: "#ef4444" },
    2: { label: t("cpwStrFair", "Fair"), cls: "fair", color: "#3b82f6" },
    3: { label: t("cpwStrGood", "Good"), cls: "good", color: "#60a5fa" },
    4: { label: t("cpwStrStrong", "Strong"), cls: "strong", color: "#22c55e" },
  }[score] || null;

  const requirements = useMemo(
    () => [
      { id: "t1", label: t("cpwTip1", "At least 8 characters"), ok: np.length >= 8 },
      { id: "t2", label: t("cpwTip2", "Uppercase and lowercase letters"), ok: /[A-Z]/.test(np) && /[a-z]/.test(np) },
      { id: "t3", label: t("cpwTip3", "Contains a number"), ok: /\d/.test(np) },
      { id: "t4", label: t("cpwTip4", "Contains a special character"), ok: /[^A-Za-z0-9]/.test(np) },
    ],
    [np, t]
  );

  const npOk = score >= 2 && np.length >= 8;
  const cpOk = np === cp && cp.length > 0;
  const canSavePw = cur.length > 0 && npOk && cpOk && !pwLoading;

  const clearPwField = (f) =>
    setErrors((e) => {
      const next = { ...e };
      delete next[f];
      return next;
    });

  const resetPw = () => {
    setCur("");
    setNp("");
    setCp("");
    setErrors({});
    setShowCur(false);
    setShowNp(false);
    setShowCp(false);
  };

  const submitPassword = async () => {
    const errs = {};
    if (!cur) errs.cur = t("cpwErrCurrentRequired", "Please enter your current password");
    if (!npOk) {
      errs.np = np.length < 8
        ? t("cpwErrTooShort", "Minimum 8 characters required")
        : t("cpwErrTooWeak", "Password is too weak");
    }
    if (!cpOk) errs.cp = t("cpwErrMismatch", "Passwords do not match");
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setPwLoading(true);
    try {
      await API.put("/users/me", { currentPassword: cur, password: np });
      toast.success(t("cpwSuccessMsg", "Password updated successfully!"));
      resetPw();
    } catch (err) {
      const msg = err?.response?.data?.message || "";
      if (msg.toLowerCase().includes("current")) {
        setErrors({ cur: t("cpwErrCurrentWrong", "Current password is incorrect") });
      } else {
        toast.error(msg || t("failedSave", "Failed to update password"));
      }
    } finally {
      setPwLoading(false);
    }
  };

  /* ── Language change feedback ── */
  const [langChanged, setLangChanged] = useState(false);
  const handleLangChange = (code) => {
    changeLang(code);
    setLangChanged(true);
    setTimeout(() => setLangChanged(false), 3000);
  };

  /* Leave a section cleanly so no half-typed state survives the round trip. */
  const goHub = () => {
    if (editing) cancelEdit();
    if (view === "password") resetPw();
    setView("hub");
  };

  const openSection = (next) => {
    if (editing) cancelEdit();
    setView(next);
  };

  /* Standalone screens leave via onExit; panel screens fall back to the hub. */
  const goBack = () => {
    if (editing) cancelEdit();
    if (onExit) {
      onExit();
      return;
    }
    goHub();
  };

  /* ══ Hub ══════════════════════════════════════════════════════════════ */

  const renderHub = () => (
    <div className="set-hub set-hub--four">
      {/* My Profile */}
      <button type="button" className="set-card set-card--profile" onClick={() => openSection("profile")}>
        <span className="set-card__top">
          <span className="set-card__avatar">
            <UserAvatar name={name} src={photo} size={44} radius={44} alt={name} />
            <span className="set-card__avatar-cam" aria-hidden="true">
              <MdCameraAlt size={11} />
            </span>
          </span>
          <span className="set-card__icon" aria-hidden="true">
            <MdPerson size={21} />
          </span>
        </span>

        <span className="set-card__meta">
          <span className="set-card__meta-dot" aria-hidden="true" />
          {t("asCardProfileMeta", "Personal information")}
        </span>
        <span className="set-card__title">{t("asProfileTitle", "My Profile")}</span>
        <span className="set-card__desc">
          {t("asCardProfileDesc", "Manage your profile information, profile picture and personal details.")}
        </span>

        <span className="set-card__spacer" />
        <span className="set-card__foot">
          <span className="set-card__cta">
            {t("asCardProfileCta", "View Profile")}
            <MdChevronRight size={15} aria-hidden="true" />
          </span>
          <span className="set-card__arrow" aria-hidden="true">
            <MdChevronRight size={18} />
          </span>
        </span>
      </button>

      {/* Change Password */}
      <button type="button" className="set-card set-card--password" onClick={() => openSection("password")}>
        <span className="set-card__top">
          <span className="set-card__icon" aria-hidden="true">
            <MdLock size={21} />
          </span>
        </span>

        <span className="set-card__meta">
          <span className="set-card__meta-dot" aria-hidden="true" />
          {t("asCardPasswordMeta", "Account Security")}
        </span>
        <span className="set-card__title">{t("cpwChangePassword", "Change Password")}</span>
        <span className="set-card__desc">
          {t("asCardPasswordDesc", "Update your account password and keep your account secure.")}
        </span>

        <span className="set-card__spacer" />
        <span className="set-card__foot">
          <span className="set-card__cta">
            {t("asCardPasswordCta", "Change Password")}
            <MdChevronRight size={15} aria-hidden="true" />
          </span>
          <span className="set-card__status">
            <span className="set-card__status-dot" aria-hidden="true" />
            {t("asProtected", "Password Protected")}
          </span>
        </span>
      </button>

      {/* Notifications */}
      <button type="button" className="set-card set-card--notifs" onClick={() => openSection("notifications")}>
        <span className="set-card__top">
          <span className="set-card__icon" aria-hidden="true">
            <MdNotifications size={21} />
          </span>
        </span>

        <span className="set-card__meta">
          <span className="set-card__meta-dot" aria-hidden="true" />
          {t("notificationPrefs", "Notification Preferences")}
        </span>
        <span className="set-card__title">{t("asNotifsTitle", "Notifications")}</span>
        <span className="set-card__desc">
          {t("asCardNotifsDesc", "Choose which alerts and updates you want to receive from your society.")}
        </span>

        <span className="set-card__spacer" />
        <span className="set-card__foot">
          <span className="set-card__cta">
            {t("asCardNotifsCta", "Manage Alerts")}
            <MdChevronRight size={15} aria-hidden="true" />
          </span>
          {!notifsLoading && (
            <span className="set-card__status set-card__status--violet">
              <span className="set-card__status-dot" aria-hidden="true" />
              {t("asNotifsCount", { n: activeCount })}
            </span>
          )}
        </span>
      </button>

      {/* Language */}
      <button type="button" className="set-card set-card--lang" onClick={() => openSection("language")}>
        <span className="set-card__top">
          <span className="set-card__icon" aria-hidden="true">
            <MdLanguage size={21} />
          </span>
        </span>

        <span className="set-card__meta">
          <span className="set-card__meta-dot" aria-hidden="true" />
          {t("language", "Language")}
        </span>
        <span className="set-card__title">{t("asLangTitle", "Language")}</span>
        <span className="set-card__desc">
          {t("asCardLangDesc", "Change the display language used across the application.")}
        </span>

        <span className="set-card__spacer" />
        <span className="set-card__foot">
          <span className="set-card__cta">
            {t("asCardLangCta", "Change Language")}
            <MdChevronRight size={15} aria-hidden="true" />
          </span>
          <span className="set-card__status set-card__status--violet">
            <span className="set-card__status-dot" aria-hidden="true" />
            {LANGUAGES.find((l) => l.code === lang)?.nativeLabel || "—"}
          </span>
        </span>
      </button>
    </div>
  );

  /* ══ My Profile ═══════════════════════════════════════════════════════ */

  const renderProfile = () => (
    <div className="set-pf">
      {/* One workspace. Hero, then logical groups divided by hairlines. */}
      <div className="set-ws">
        {/* Identity — the avatar itself is the photo control. */}
        <div className="set-hero">
          <div className="set-avatar">
            <button
              type="button"
              className="set-avatar__btn"
              onClick={openAvatarEditor}
              aria-label={photo
                ? t("asAvatarManage", "Change or remove profile photo")
                : t("asAvatarChange", "Change profile photo")}
            >
              <UserAvatar
                name={name}
                src={photo}
                size="100%"
                radius="50%"
                alt={name || t("asProfileTitle", "My Profile")}
              />
              <span className="set-avatar__overlay" aria-hidden="true">
                <span className="set-avatar__cam">
                  <MdCameraAlt size={18} />
                </span>
                <span className="set-avatar__hint">
                  {photo ? t("asAvatarChange", "Change") : t("asAvatarUpload", "Upload")}
                </span>
              </span>
            </button>
            <span className="set-avatar__dot" aria-hidden="true" />
          </div>

          <div className="set-hero__id">
            <h3 className="set-hero__name">{name || "—"}</h3>
            <p className="set-hero__mail">
              <MdEmail size={14} />
              <span>{email || "—"}</span>
            </p>
            <div className="set-hero__chips">
              {roleLabel && (
                <span className="set-chip set-chip--role">
                  <MdBadge size={11} />
                  {roleLabel}
                </span>
              )}
              <span className={`set-chip set-chip--${statusTone}`}>
                <span className="set-chip__dot" aria-hidden="true" />
                {approvalLabel}
              </span>
              {societyLabel && (
                <span className="set-chip set-chip--society">
                  <MdApartment size={11} />
                  {societyLabel}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={`set-btn ${editing ? "set-btn--ghost" : "set-btn--primary"}`}
            onClick={() => (editing ? cancelEdit() : startEdit())}
          >
            {editing ? <MdClose size={15} /> : <MdEdit size={15} />}
            {editing ? t("cancel", "Cancel") : t("asEditProfile", "Edit Profile")}
          </button>
        </div>

        {/* ── Personal Information: the only editable surface ── */}
        <div className="set-group">
          <div className="set-group__head">
            <h4 className="set-group__title">{t("asPersonalInfo", "Personal Information")}</h4>
            {editing && <span className="set-group__tag">{t("asEditingTag", "Editing")}</span>}
          </div>

          <div className="set-grid set-grid--2">
            <div className="set-f">
              <label className="set-f__label" htmlFor="mset-name">
                {t("asFullName", "Full Name")}
              </label>
              {editing ? (
                <div className="set-field">
                  <span className="set-field__icon" aria-hidden="true"><MdPerson size={16} /></span>
                  <input
                    id="mset-name"
                    className={`set-field__input${nameError ? " set-field__input--err" : ""}`}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    aria-invalid={nameError ? "true" : undefined}
                    placeholder={t("asFullNamePh", "Enter your full name")}
                    autoFocus
                  />
                </div>
              ) : (
                <p className="set-f__value">{me?.name || t("asNA", "Not provided")}</p>
              )}
              {editing && nameError && (
                <span className="set-f__err">
                  <ErrorIcon />
                  {nameError}
                </span>
              )}
            </div>

            <div className="set-f">
              <label className="set-f__label" htmlFor="mset-phone">
                {t("asPhoneLabel", "Phone Number")}
              </label>
              {editing ? (
                <div className="set-field">
                  <span className="set-field__icon" aria-hidden="true"><MdPhone size={16} /></span>
                  <input
                    id="mset-phone"
                    className={`set-field__input${phoneError ? " set-field__input--err" : ""}`}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    aria-invalid={phoneError ? "true" : undefined}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              ) : (
                <p className="set-f__value">{me?.phone || t("asNA", "Not provided")}</p>
              )}
              {editing && phoneError && (
                <span className="set-f__err">
                  <ErrorIcon />
                  {phoneError}
                </span>
              )}
            </div>
          </div>

          {editing && (
            <div className="set-group__foot">
              <span className="set-group__hint">
                <MdInfoOutline size={15} />
                {t("asEmailReadOnly", "Email, role and status are managed by your society admin.")}
              </span>
              <span className="set-group__actions">
                <button type="button" className="set-btn set-btn--ghost" onClick={cancelEdit}>
                  {t("cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  className="set-btn set-btn--primary"
                  onClick={saveProfile}
                  disabled={saving || !canSaveProfile}
                >
                  {saving ? <span className="set-spinner" /> : <MdCheck size={16} />}
                  {saving ? t("saving", "Saving…") : t("saveChanges", "Save Changes")}
                </button>
              </span>
            </div>
          )}
        </div>

        {/* ── Account Information: read-only ── */}
        <div className="set-group">
          <div className="set-group__head">
            <h4 className="set-group__title">{t("asAccountInfo", "Account Information")}</h4>
          </div>

          <div className="set-grid set-grid--3">
            {cells.map((c) => (
              <div className="set-cell" key={c.key}>
                <span className="set-cell__label">{c.label}</span>
                {c.status ? (
                  <span className={`set-status set-status--${c.status.tone}`}>
                    <span className="set-status__dot" aria-hidden="true" />
                    {c.status.text}
                  </span>
                ) : (
                  <span
                    className={`set-cell__value${c.mono ? " set-cell__value--mono" : ""}`}
                    title={typeof c.value === "string" ? c.value : undefined}
                  >
                    {c.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ══ Change Password ══════════════════════════════════════════════════ */

  const renderPassword = () => {
    const segClass = (idx) =>
      !np || score < idx ? "set-meter__seg" : `set-meter__seg set-meter__seg--${strength.cls}`;

    const pwField = ({ id, label, value, onChange, type, icon, action, error, autoComplete, placeholder }) => (
      <div className="set-f">
        <label className="set-f__label" htmlFor={id}>
          {label}
          <span className="set-f__req">*</span>
        </label>
        <div className="set-field">
          <span className="set-field__icon" aria-hidden="true">{icon}</span>
          <input
            id={id}
            className={`set-field__input${action ? " has-action" : ""}${
              error ? " set-field__input--err" : ""
            }`}
            type={type}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
          />
          {action}
        </div>
        {error && (
          <span className="set-f__err" id={`${id}-err`} role="alert">
            <ErrorIcon />
            {error}
          </span>
        )}
      </div>
    );

    const eyeBtn = (label, open, onClick) => (
      <button
        type="button"
        className="set-field__action"
        onClick={onClick}
        aria-label={`${label} — ${open ? t("cpwHidePw", "Hide password") : t("cpwShowPw", "Show password")}`}
        aria-pressed={open}
      >
        <EyeIcon open={open} />
      </button>
    );

    return (
      <div className="set-pw">
        {/* One workspace, two aligned columns on desktop. */}
        <div className="set-ws set-ws--split">
          {/* Left: security status + compact notice */}
          <aside className="set-pw__aside">
            <span className="set-pw__badge" aria-hidden="true">
              <MdSecurity size={20} />
            </span>
            <h3 className="set-pw__title">{t("asSecurityTitle", "Security")}</h3>
            <p className="set-pw__text">
              {t(
                "asSecurityBody",
                "Your password helps protect your account and personal information."
              )}
            </p>

            <div className="set-pw__status">
              <span className="set-pw__status-dot" aria-hidden="true" />
              <span>{t("asProtected", "Password protected")}</span>
            </div>

            <div className="set-alert">
              <MdWarningAmber size={17} className="set-alert__icon" />
              <div>
                <p className="set-alert__title">{t("asHelpTitle", "Using a shared device?")}</p>
                <p className="set-alert__text">
                  {t("asHelpNote", "Always log out after your session and never save credentials in shared browsers.")}
                </p>
              </div>
            </div>
          </aside>

          {/* Right: the form */}
          <div className="set-pw__main">
            {pwField({
              id: "mset-cur",
              label: t("cpwCurrentPassword", "Current Password"),
              value: cur,
              onChange: (e) => { setCur(e.target.value); clearPwField("cur"); },
              type: showCur ? "text" : "password",
              icon: <MdVpnKey size={16} />,
              placeholder: t("cpwCurrentPasswordPh", "Enter current password"),
              autoComplete: "current-password",
              error: errors.cur,
              action: eyeBtn(t("cpwCurrentPassword", "Current Password"), showCur, () => setShowCur((v) => !v)),
            })}

            {pwField({
              id: "mset-np",
              label: t("cpwNewPassword", "New Password"),
              value: np,
              onChange: (e) => { setNp(e.target.value); clearPwField("np"); },
              type: showNp ? "text" : "password",
              icon: <LockIcon size={16} />,
              placeholder: t("cpwNewPasswordPh", "Enter new password"),
              autoComplete: "new-password",
              error: errors.np,
              action: eyeBtn(t("cpwNewPassword", "New Password"), showNp, () => setShowNp((v) => !v)),
            })}

            {/* Strength + requirements */}
            <div className="set-meter">
              <div className="set-meter__head">
                <span className="set-meter__label" id="mset-strength-label">
                  {t("asHealthLabel", "Password Strength")}
                </span>
                {np && strength && (
                  <span className="set-meter__value" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                )}
              </div>

              <div
                className="set-meter__track"
                data-filled={np ? "true" : "false"}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={score}
                aria-valuetext={strength?.label || ""}
                aria-labelledby="mset-strength-label"
              >
                <span className={segClass(1)} />
                <span className={segClass(2)} />
                <span className={segClass(3)} />
                <span className={segClass(4)} />
              </div>

              <span className="set-meter__sublabel">{t("cpwChecklistTitle", "Requirements")}</span>
              <ul className="set-reqs">
                {requirements.map((r) => (
                  <li key={r.id} className={`set-reqs__item${r.ok ? " set-reqs__item--ok" : ""}`}>
                    <span className="set-reqs__dot" aria-hidden="true"><CheckIcon size={10} /></span>
                    <span>{r.label}</span>
                    <span className="set-sr-only">
                      {r.ok ? t("asReqMet", "met") : t("asReqUnmet", "not met")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {pwField({
              id: "mset-cp",
              label: t("cpwConfirmPassword", "Confirm Password"),
              value: cp,
              onChange: (e) => { setCp(e.target.value); clearPwField("cp"); },
              type: showCp ? "text" : "password",
              icon: <LockIcon size={16} />,
              placeholder: t("cpwConfirmPasswordPh", "Re-enter new password"),
              autoComplete: "new-password",
              error: errors.cp,
              action: eyeBtn(t("cpwConfirmPassword", "Confirm Password"), showCp, () => setShowCp((v) => !v)),
            })}

            <div className="set-formfoot">
              <button type="button" className="set-btn set-btn--ghost" onClick={resetPw}>
                {t("cpwCancelBtn", "Cancel")}
              </button>
              <button
                type="button"
                className="set-btn set-btn--primary"
                onClick={submitPassword}
                disabled={!canSavePw}
              >
                {pwLoading ? <span className="set-spinner" /> : <LockIcon size={15} />}
                {pwLoading ? t("cpwUpdating", "Updating…") : t("cpwUpdateBtn", "Update Password")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ══ Notifications ═══════════════════════════════════════════════════ */

  const NOTIF_ROWS = [
    {
      key: "emergencyAlerts",
      Icon: MdWarning,
      accent: "red",
      label: t("emergencyAlerts", "Emergency Alerts"),
      desc: t("emergencyAlertsSub", "Instant alerts for SOS and emergencies"),
    },
    {
      key: "visitorEntry",
      Icon: MdPerson,
      accent: "blue",
      label: t("visitorEntry", "Visitor Entry"),
      desc: t("visitorEntrySub", "Notify when a visitor checks in or out"),
    },
    {
      key: "complaintUpdates",
      Icon: MdInfoOutline,
      accent: "amber",
      label: t("complaintUpdates", "Complaint Updates"),
      desc: t("complaintUpdatesSub", "When complaints are assigned or resolved"),
    },
    {
      key: "noticeUpdates",
      Icon: MdNotifications,
      accent: "violet",
      label: t("noticeUpdates", "Notice Updates"),
      desc: t("noticeUpdatesSub", "Society notices and announcements"),
    },
  ];

  const renderNotifications = () => (
    <div className="mset">
      <div className="set-ws">
        {/* Summary */}
        <div className="mset-sum">
          <span className="mset-sum__ic" aria-hidden="true"><MdNotifications size={19} /></span>
          <div className="mset-sum__text">
            <h3 className="mset-sum__title">{t("notificationPrefs", "Notification Preferences")}</h3>
            <p className="mset-sum__sub">
              {t("notificationPrefsSub", "Choose what you want to be notified about")}
            </p>
          </div>
          <span className="mset-sum__count">
            <b>{activeCount}</b> / {NOTIF_ROWS.length}
          </span>
        </div>

        {/* Rows */}
        <div className="set-group">
          <div className="set-group__head">
            <h4 className="set-group__title">{t("asNotifsActiveTitle", "Active Alerts")}</h4>
          </div>

          {notifsLoading ? (
            <div className="mset-loading">
              <span className="set-spinner" />
              <p>{t("loadingProfile", "Loading…")}</p>
            </div>
          ) : (
            <ul className="mset-list">
              {NOTIF_ROWS.map((row) => {
                const labelId = `mset-nf-${row.key}`;
                return (
                  <li key={row.key} className="mset-row">
                    <span className={`mset-row__ic mset-row__ic--${row.accent}`} aria-hidden="true">
                      <row.Icon size={16} />
                    </span>
                    <div className="mset-row__text">
                      <p className="mset-row__label" id={labelId}>{row.label}</p>
                      <p className="mset-row__desc">{row.desc}</p>
                    </div>
                    <Switch
                      id={`mset-nf-switch-${row.key}`}
                      labelledBy={labelId}
                      checked={!!notifs[row.key]}
                      onChange={(v) => setNotifs((prev) => ({ ...prev, [row.key]: v }))}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          <div className="set-group__foot">
            <span className="set-group__hint">
              <MdInfoOutline size={15} />
              {t(notifsHint, "Emergency alerts are recommended for every resident.")}
            </span>
            <span className="set-group__actions">
              {notifsSaved && (
                <span className="mset-saved">
                  <MdCheckCircle size={15} />
                  {t("notificationSaved", "Preferences saved")}
                </span>
              )}
              <button
                type="button"
                className="set-btn set-btn--primary"
                onClick={saveSettings}
                disabled={notifsSaving || notifsLoading}
              >
                {notifsSaving ? <span className="set-spinner" /> : <MdCheck size={16} />}
                {notifsSaving ? t("saving", "Saving…") : t("savePreferences", "Save Preferences")}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══ Language ═════════════════════════════════════════════════════════ */

  const renderLanguage = () => (
    <div className="mset">
      <div className="set-ws">
        <div className="mset-sum">
          <span className="mset-sum__ic" aria-hidden="true"><MdTranslate size={19} /></span>
          <div className="mset-sum__text">
            <h3 className="mset-sum__title">{t("language", "Language")}</h3>
            <p className="mset-sum__sub">{t("languageSub", "Choose your preferred display language")}</p>
          </div>
        </div>

        <div className="set-group">
          <div className="set-group__head">
            <h4 className="set-group__title">{t("asLangPickTitle", "Select a language")}</h4>
          </div>

          {langChanged && (
            <div className="mset-ok">
              <MdCheckCircle size={16} />
              <span>{t("languageChanged", "Language updated successfully!")}</span>
            </div>
          )}

          <div className="mset-lang-grid" role="radiogroup" aria-label={t("language", "Language")}>
            {LANGUAGES.map((l) => {
              const isActive = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`mset-lang${isActive ? " mset-lang--on" : ""}`}
                  onClick={() => handleLangChange(l.code)}
                >
                  <span className="mset-lang__ic" aria-hidden="true">{l.flag}</span>
                  <span className="mset-lang__text">
                    <span className="mset-lang__native">{l.nativeLabel}</span>
                    <span className="mset-lang__en">{l.label}</span>
                  </span>
                  <span className="mset-lang__check" aria-hidden="true">
                    <CheckIcon size={12} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="set-group__foot">
            <span className="set-group__hint">
              <MdInfoOutline size={15} />
              {t("languageDesc", "All text will change to the selected language")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══ Render ════════════════════════════════════════════════════════════ */

  const inSection = view !== "hub";

  const sectionHead = {
    profile: {
      Icon: MdPerson,
      title: t("asProfileTitle", "My Profile"),
      desc: t("asSectionProfileDesc", "Manage your personal information and profile picture."),
    },
    password: {
      Icon: MdLock,
      title: t("cpwChangePassword", "Change Password"),
      desc: t("asSectionPasswordDesc", "Keep your account secure with a strong password."),
    },
    notifications: {
      Icon: MdNotifications,
      title: t("asNotifsTitle", "Notifications"),
      desc: t("asSectionNotifsDesc", "Decide which alerts and updates you receive."),
    },
    language: {
      Icon: MdLanguage,
      title: t("asLangTitle", "Language"),
      desc: t("asSectionLangDesc", "Change the display language of the application."),
    },
  }[view];

  const HeadIcon = sectionHead?.Icon;

  return (
    <div className="set-page animate-fadeIn">
      {/* Drives the modal flows only; renders a hidden input. */}
      <ProfilePictureUploader
        ref={uploaderRef}
        bare
        name={name}
        currentUrl={photo}
        onChange={applyPhoto}
      />

      {!inSection && (
        <>
          <header className="set-head">
            <div className="set-head__lead">
              <span className="set-head__icon" aria-hidden="true">
                <HeaderIcon size={22} />
              </span>
              <div>
                <h1 className="set-head__title">{t(headerTitle, "Settings")}</h1>
                <p className="set-head__sub">
                  {t(headerSubtitle, "Manage your account, security and access preferences")}
                </p>
              </div>
            </div>
            <span className="set-head__badge">
              <span className="set-head__dot" aria-hidden="true" />
              {t("asProtected", "Account Protected")}
            </span>
          </header>
          <p className="set-head__intro">
            {t(hubIntro, "Choose what you want to manage.")}
          </p>
        </>
      )}

      {loading ? (
        inSection ? (
          <div className="set-section">
            <div className="set-skeleton set-skeleton--line" style={{ width: "38%" }} />
            <div className="set-skeleton set-skeleton--block" />
            <div className="set-skeleton set-skeleton--block" />
          </div>
        ) : (
          <div className="set-hub">
            <div className="set-skeleton set-skeleton--card" />
            <div className="set-skeleton set-skeleton--card" />
            <div className="set-skeleton set-skeleton--card" />
          </div>
        )
      ) : inSection ? (
        <div className="set-section set-section__enter">
          <button type="button" className="set-back" onClick={goBack}>
            <MdArrowBack size={16} />
            {onExit ? t(backLabel, "Back") : t("asBack", "Back to Settings")}
          </button>

          <div className={`set-section__head set-section--${view}`}>
            {HeadIcon && (
              <span className="set-section__icon" aria-hidden="true">
                <HeadIcon size={21} />
              </span>
            )}
            <div>
              <h2 className="set-section__title">{sectionHead.title}</h2>
              <p className="set-section__desc">{sectionHead.desc}</p>
            </div>
          </div>

          {view === "profile" && renderProfile()}
          {view === "password" && renderPassword()}
          {view === "notifications" && renderNotifications()}
          {view === "language" && renderLanguage()}
        </div>
      ) : (
        renderHub()
      )}

      {/* ── Photo action modal (when avatar is clicked) ── */}
      <GlobalModal
        isOpen={photoMenuOpen}
        onClose={() => !photoBusy && setPhotoMenuOpen(false)}
        title={t("ppTitle", "Profile Picture")}
        subtitle={t("asPhotoMenuSub", "Update or remove your current profile photo.")}
        icon={<MdCameraAlt size={20} />}
        size="sm"
        footer={
          <button
            type="button"
            className="set-btn set-btn--ghost set-btn--block"
            onClick={() => setPhotoMenuOpen(false)}
            disabled={photoBusy}
          >
            {t("cancel", "Cancel")}
          </button>
        }
      >
        <div className="set-photomenu">
          {/* Showcase Hero Card */}
          <div className="set-photomenu__hero">
            <div className="set-photomenu__ring">
              <div className="set-photomenu__avatar-wrapper">
                <UserAvatar name={name} src={photo} size={88} radius={44} alt={name} />
              </div>
              <div className="set-photomenu__badge" aria-hidden="true">
                <MdCameraAlt size={14} />
              </div>
            </div>

            <div className="set-photomenu__meta">
              <h4 className="set-photomenu__name">{name || "—"}</h4>
              <span className={`set-photomenu__status ${photo ? "set-photomenu__status--active" : ""}`}>
                <span className="set-photomenu__dot" />
                {photo
                  ? t("asPhotoCurrent", "Current profile photo")
                  : t("asPhotoNone", "No photo uploaded")}
              </span>
            </div>
          </div>

          {/* Action Options */}
          <div className="set-photomenu__options">
            <button
              type="button"
              className="set-photomenu__tile set-photomenu__tile--primary"
              onClick={openUpload}
              disabled={photoBusy}
            >
              <div className="set-photomenu__tile-icon">
                {photoBusy ? <span className="set-spinner" /> : <MdCloudUpload size={20} />}
              </div>
              <div className="set-photomenu__tile-text">
                <span className="set-photomenu__tile-title">
                  {photo ? t("ppChange", "Change Photo") : t("ppUpload", "Upload Photo")}
                </span>
                <span className="set-photomenu__tile-sub">
                  {t("ppHint", "JPEG, PNG, WEBP, GIF or HEIC up to 5MB")}
                </span>
              </div>
              <MdChevronRight size={18} className="set-photomenu__tile-arrow" />
            </button>

            {photo && (
              <button
                type="button"
                className="set-photomenu__tile set-photomenu__tile--danger"
                onClick={() => setRemoveOpen(true)}
                disabled={photoBusy}
              >
                <div className="set-photomenu__tile-icon">
                  {photoBusy ? <span className="set-spinner" /> : <MdDeleteOutline size={20} />}
                </div>
                <div className="set-photomenu__tile-text">
                  <span className="set-photomenu__tile-title">{t("ppRemove", "Remove Photo")}</span>
                  <span className="set-photomenu__tile-sub">
                    {t("ppRemoveHint", "Revert to default initials avatar")}
                  </span>
                </div>
                <MdChevronRight size={18} className="set-photomenu__tile-arrow" />
              </button>
            )}
          </div>
        </div>
      </GlobalModal>

      {/* ── Upload modal ── */}
      <GlobalModal
        isOpen={uploadOpen}
        onClose={() => !photoBusy && closeUpload()}
        title={t("asUploadTitle", "Upload Profile Photo")}
        subtitle={t("asUploadSub", "Choose a photo to use across the application.")}
        icon={<MdCloudUpload size={19} />}
        size="sm"
        disableUnsavedWarning
        footer={
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button
              type="button"
              className="set-btn set-btn--ghost"
              style={{ flex: 1 }}
              onClick={closeUpload}
              disabled={photoBusy}
            >
              {t("cancel", "Cancel")}
            </button>
            <button
              type="button"
              className="set-btn set-btn--primary"
              style={{ flex: 1 }}
              onClick={submitUpload}
              disabled={!pendingFile || photoBusy}
            >
              {photoBusy ? <span className="set-spinner" /> : <MdCloudUpload size={16} />}
              {photoBusy
                ? t("asUploading", "Uploading…")
                : t("asUploadBtn", "Upload Photo")}
            </button>
          </div>
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="set-sr-only"
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div
          className={`set-drop${dropActive ? " set-drop--active" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropActive(false);
            acceptFile(e.dataTransfer?.files?.[0]);
          }}
        >
          {previewUrl ? (
            <img className="set-drop__preview" src={previewUrl} alt="" />
          ) : (
            <span className="set-drop__icon" aria-hidden="true"><MdCloudUpload size={22} /></span>
          )}

          <p className="set-drop__title">
            {previewUrl
              ? (pendingFile?.name || t("asUploadChosen", "Photo selected"))
              : t("asUploadChoose", "Drag & drop or choose a photo")}
          </p>
          <p className="set-drop__sub">
            {t("asUploadSub2", "Your photo appears on your profile and in admin lists.")}
          </p>
          <p className="set-drop__formats">{t("ppHint", "JPEG, PNG, WEBP, GIF or HEIC. Max 5MB.")}</p>
        </div>

        {photoError && (
          <span className="set-drop__err" role="alert">
            <ErrorIcon />
            {photoError}
          </span>
        )}
      </GlobalModal>

      {/* ── Remove confirmation ── */}
      <GlobalConfirmDialog
        isOpen={removeOpen}
        onClose={() => !photoBusy && setRemoveOpen(false)}
        onConfirm={confirmRemove}
        title={t("asRemoveTitle", "Remove Profile Photo?")}
        message={t(
          "asRemoveMsg",
          "Your current profile photo will be removed and your default avatar will be restored."
        )}
        confirmLabel={t("ppRemove", "Remove Photo")}
        cancelLabel={t("cancel", "Cancel")}
        loading={photoBusy}
        icon={MdDeleteOutline}
      />
    </div>
  );
}
