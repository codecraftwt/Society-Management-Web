import { useEffect, useState, useContext } from "react";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext"; // ← NEW
import LanguageSelector from "../../components/common/LanguageSelector"; // ← NEW
import {
  MdPerson,
  MdEmail,
  MdLock,
  MdEdit,
  MdCheckCircle,
  MdVisibility,
  MdVisibilityOff,
  MdShield,
  MdNotifications,
  MdAccessTime,
  MdInfo,
  MdPhone,
  MdWarning,
  MdSecurity,
  MdLanguage, // ← NEW
} from "react-icons/md";

/* ─────────────────────────────────────────────
  Spinner
───────────────────────────────────────────── */
function Spinner({ size = 4 }) {
  return (
    <svg
      className={`animate-spin h-${size} w-${size}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
  Avatar
───────────────────────────────────────────── */
function Avatar({ name }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return <div className="ms-avatar">{initials}</div>;
}

/* ─────────────────────────────────────────────
  Toggle Switch
───────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`ms-toggle ${value ? "ms-toggle--on" : "ms-toggle--off"}`}
    >
      <span
        className={`ms-toggle__knob ${value ? "ms-toggle__knob--on" : ""}`}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────
  Section Header
───────────────────────────────────────────── */
function Sectioner({ icon: Icon, title, subtitle }) {
  return (
    <div className="ms-section-er">
      <div className="ms-section-icon">
        <Icon size={15} className="ms-section-icon-color" />
      </div>
      <div>
        <h3 className="ms-section-title">{title}</h3>
        {subtitle && <p className="ms-section-sub">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
  Setting Row (toggle row)
───────────────────────────────────────────── */
function SettingRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  accent = "blue",
}) {
  return (
    <div className="ms-setting-row">
      <div className="ms-setting-left">
        <div className={`ms-setting-icon ms-setting-icon--${accent}`}>
          <Icon size={15} />
        </div>
        <div className="ms-setting-text">
          <p className="ms-setting-label">{label}</p>
          {description && <p className="ms-setting-desc">{description}</p>}
        </div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

/* ═══════════════════════════════════════════
  Main Component
═══════════════════════════════════════════ */
export default function MySetting() {
  const { updateUser } = useContext(AuthContext);
  const { t, lang, changeLang, LANGUAGES } = useLang(); // ← NEW

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifs, setNotifs] = useState({
    emergencyAlerts: true,
    visitorEntry: true,
    complaintUpdates: true,
    noticeUpdates: true,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── NEW: language change feedback ──
  const [langChanged, setLangChanged] = useState(false);

  const handleLangChange = (code) => {
    changeLang(code);
    setLangChanged(true);
    setTimeout(() => setLangChanged(false), 3000);
  };

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await API.get("/users/me");
      setProfile(res.data);
      setFormData((p) => ({
        ...p,
        name: res.data.name,
        phone: res.data.phone || "",
      }));
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await API.get("/settings");
      const d = res.data;
      setNotifs({
        emergencyAlerts: d.emergency_alerts,
        visitorEntry: d.visitor_entry,
        complaintUpdates: d.complaint_updates,
        noticeUpdates: d.notice_updates,
      });
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      await API.put("/settings", {
        emergency_alerts: notifs.emergencyAlerts,
        visitor_entry: notifs.visitorEntry,
        complaint_updates: notifs.complaintUpdates,
        notice_updates: notifs.noticeUpdates,
      });
      await loadSettings();
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setError(t("failedSettings"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setError("");

    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      setError(t("passwordMismatch"));
      return;
    }

    try {
      setSaving(true);

      const res = await API.put("/users/me", {
        name: formData.name,
        phone: formData.phone || "",
        password: formData.newPassword || undefined,
        currentPassword: formData.currentPassword || undefined,
      });

      const updatedUser = res.data?.user;

      if (updatedUser) {
        setProfile((prev) => ({
          ...prev,
          name: updatedUser.name,
          phone: updatedUser.phone,
        }));
        updateUser({
          name: updatedUser.name,
          phone: updatedUser.phone,
        });
      } else {
        await loadProfile();
      }

      setFormData((p) => ({
        ...p,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t("failedSave"));
    } finally {
      setSaving(false);
    }
  };

  /* 4 tabs — added Language */
  const tabs = [
    { key: "profile", label: t("tabProfile"), icon: MdPerson },
    { key: "security", label: t("tabSecurity"), icon: MdSecurity },
    { key: "notifications", label: t("tabAlerts"), icon: MdNotifications },
    { key: "language", label: t("language"), icon: MdLanguage }, // ← NEW
  ];

  /* strength helpers */
  const strengthLevel = (pw) => {
    if (!pw) return 0;
    if (pw.length >= 12) return 3;
    if (pw.length >= 6) return 2;
    return 1;
  };
  const strengthLabel = ["", t("weak"), t("medium"), t("strong")];
  const strengthClass = [
    "",
    "ms-strength--weak",
    "ms-strength--medium",
    "ms-strength--strong",
  ];
  const sl = strengthLevel(formData.newPassword);

  if (loading) {
    return (
      <div className="ms-loading-state animate-fadeIn">
        <Spinner size={6} />
        <p className="ms-loading-text">{t("loadingProfile")}</p>
      </div>
    );
  }

  return (
    <div className="ms-root animate-fadeIn">
      {/* ══════════════════════════════════════
          PROFILE HERO
      ══════════════════════════════════════ */}
      <div className="bg-card ms-hero animate-scaleIn">
        <div className="ms-hero-accent" />
        <div className="ms-hero-body">
          <Avatar name={profile?.name} />
          <div className="ms-hero-info">
            <h2 className="ms-hero-name">{profile?.name}</h2>
            <p className="ms-hero-email">{profile?.email}</p>
            <div className="ms-hero-badges">
              <span className="ms-badge ms-badge--blue">
                <MdShield size={11} /> {profile?.role || "Resident"}
              </span>
              <span className="ms-badge ms-badge--green">
                <MdCheckCircle size={11} /> {t("active")}
              </span>
              <span className="ms-badge ms-badge--muted">
                <MdAccessTime size={11} /> {t("since")}{" "}
                {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          TABS
      ══════════════════════════════════════ */}
      <div className="ms-tab-row">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`ms-tab ${activeTab === tab.key ? "ms-tab--active" : ""}`}
            >
              <Icon size={13} />
              <span className="ms-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Global Banners ── */}
      {saved && (
        <div className="ms-banner ms-banner--success animate-scaleIn">
          <MdCheckCircle size={17} /> {t("saved")}
        </div>
      )}
      {error && (
        <div className="ms-banner ms-banner--error animate-scaleIn">
          <MdWarning size={17} /> {error}
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: PROFILE
      ══════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="bg-card ms-card animate-fadeIn">
          <Sectioner
            icon={MdPerson}
            title={t("personalInfo")}
            subtitle={t("personalInfoSub")}
          />

          <form onSubmit={handleProfileSave} className="ms-form">
            {/* Name */}
            <div className="ms-field ms-field--full">
              <label className="ms-label">{t("fullName")}</label>
              <div className="ms-input-wrap">
                <MdPerson size={15} className="ms-input-icon" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input ms-input"
                  placeholder={t("fullNamePlaceholder")}
                  required
                />
              </div>
            </div>

            {/* Email — read-only */}
            <div className="ms-field">
              <label className="ms-label">
                {t("email")}{" "}
                <span className="ms-label-muted">{t("emailReadOnly")}</span>
              </label>
              <div className="ms-input-wrap">
                <MdEmail size={15} className="ms-input-icon" />
                <input
                  type="email"
                  value={profile?.email}
                  disabled
                  className="input ms-input ms-input--disabled"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="ms-field">
              <label className="ms-label">{t("phone")}</label>
              <div className="ms-input-wrap">
                <MdPhone size={15} className="ms-input-icon" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="input ms-input"
                  placeholder={t("phonePlaceholder")}
                />
              </div>
            </div>

            <div className="ms-form-footer">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary ms-save-btn"
              >
                {saving ? (
                  <>
                    <Spinner /> {t("saving")}
                  </>
                ) : (
                  <>
                    <MdEdit size={15} /> {t("save")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: SECURITY
      ══════════════════════════════════════ */}
      {activeTab === "security" && (
        <div className="bg-card ms-card animate-fadeIn">
          <Sectioner
            icon={MdLock}
            title={t("changePassword")}
            subtitle={t("changePasswordSub")}
          />

          <form onSubmit={handleProfileSave} className="ms-form">
            {/* Current Password */}
            <div className="ms-field ms-field--full">
              <label className="ms-label">{t("currentPassword")}</label>
              <div className="ms-input-wrap">
                <MdLock size={15} className="ms-input-icon" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={t("currentPasswordPlaceholder")}
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="input ms-input ms-input--padded-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="ms-eye-btn"
                >
                  {showPass ? (
                    <MdVisibilityOff size={16} />
                  ) : (
                    <MdVisibility size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="ms-field ms-field--full">
              <label className="ms-label">{t("newPassword")}</label>
              <div className="ms-input-wrap">
                <MdLock size={15} className="ms-input-icon" />
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder={t("newPasswordPlaceholder")}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  className="input ms-input ms-input--padded-right"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="ms-eye-btn"
                >
                  {showNewPass ? (
                    <MdVisibilityOff size={16} />
                  ) : (
                    <MdVisibility size={16} />
                  )}
                </button>
              </div>

              {formData.newPassword && (
                <div className="ms-strength-wrap animate-fadeIn">
                  {[1, 2, 3].map((l) => (
                    <div
                      key={l}
                      className={`ms-strength-seg ${sl >= l ? strengthClass[sl] : "ms-strength--empty"}`}
                    />
                  ))}
                  <span className={`ms-strength-label ${strengthClass[sl]}`}>
                    {strengthLabel[sl]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="ms-field ms-field--full">
              <label className="ms-label">{t("confirmPassword")}</label>
              <div className="ms-input-wrap">
                <MdLock size={15} className="ms-input-icon" />
                <input
                  type={showConfPass ? "text" : "password"}
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`input ms-input ms-input--padded-right ${
                    formData.confirmPassword &&
                    formData.confirmPassword !== formData.newPassword
                      ? "ms-input--error"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfPass(!showConfPass)}
                  className="ms-eye-btn"
                >
                  {showConfPass ? (
                    <MdVisibilityOff size={16} />
                  ) : (
                    <MdVisibility size={16} />
                  )}
                </button>
                {formData.confirmPassword &&
                  formData.confirmPassword === formData.newPassword && (
                    <MdCheckCircle size={16} className="ms-check-icon" />
                  )}
              </div>
              {formData.confirmPassword &&
                formData.confirmPassword !== formData.newPassword && (
                  <p className="ms-field-error">{t("passwordMismatch")}</p>
                )}
            </div>

            <div className="ms-form-footer">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary ms-save-btn"
              >
                {saving ? (
                  <>
                    <Spinner /> {t("updating")}
                  </>
                ) : (
                  <>
                    <MdLock size={15} /> {t("updatePassword")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: NOTIFICATIONS
      ══════════════════════════════════════ */}
      {activeTab === "notifications" && (
        <div className="bg-card ms-card animate-fadeIn">
          <Sectioner
            icon={MdNotifications}
            title={t("notificationPrefs")}
            subtitle={t("notificationPrefsSub")}
          />

          {settingsSaved && (
            <div className="ms-banner ms-banner--success animate-scaleIn">
              <MdCheckCircle size={17} /> {t("notificationSaved")}
            </div>
          )}

          <SettingRow
            icon={MdWarning}
            label={t("emergencyAlerts")}
            description={t("emergencyAlertsSub")}
            value={notifs.emergencyAlerts}
            onChange={(v) =>
              setNotifs((prev) => ({ ...prev, emergencyAlerts: v }))
            }
            accent="red"
          />
          <SettingRow
            icon={MdPerson}
            label={t("visitorEntry")}
            description={t("visitorEntrySub")}
            value={notifs.visitorEntry}
            onChange={(v) =>
              setNotifs((prev) => ({ ...prev, visitorEntry: v }))
            }
            accent="blue"
          />
          <SettingRow
            icon={MdInfo}
            label={t("complaintUpdates")}
            description={t("complaintUpdatesSub")}
            value={notifs.complaintUpdates}
            onChange={(v) =>
              setNotifs((prev) => ({ ...prev, complaintUpdates: v }))
            }
            accent="amber"
          />
          <SettingRow
            icon={MdShield}
            label={t("noticeUpdates")}
            description={t("noticeUpdatesSub")}
            value={notifs.noticeUpdates}
            onChange={(v) =>
              setNotifs((prev) => ({ ...prev, noticeUpdates: v }))
            }
            accent="muted"
          />

          <div className="ms-form-footer" style={{ marginTop: "1rem" }}>
            <button
              className="btn-primary ms-save-btn"
              onClick={saveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <>
                  <Spinner /> {t("saving")}
                </>
              ) : (
                <>
                  <MdCheckCircle size={15} /> {t("savePreferences")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: LANGUAGE  ← NEW
      ══════════════════════════════════════ */}
      {activeTab === "language" && (
        <div className="bg-card ms-card animate-fadeIn">
          <Sectioner
            icon={MdLanguage}
            title={t("language")}
            subtitle={t("languageSub")}
          />

          {/* Success banner */}
          {langChanged && (
            <div className="ms-banner ms-banner--success animate-scaleIn">
              <MdCheckCircle size={17} /> {t("languageChanged")}
            </div>
          )}

          {/* Language options — one row per language */}
          <div style={{ marginTop: "8px" }}>
            {LANGUAGES.map((l) => {
              const isActive = lang === l.code;
              return (
                <div
                  key={l.code}
                  className="ms-lang-row"
                  onClick={() => handleLangChange(l.code)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="ms-lang-left">
                    {/* Flag bubble */}
                    <div
                      className="ms-lang-icon"
                      style={
                        isActive
                          ? {
                              background: "var(--accent-soft, #eff6ff)",
                              color: "var(--accent, #3b82f6)",
                            }
                          : {
                              background: "var(--bg-hover, #f8fafc)",
                              color: "var(--text-muted, #94a3b8)",
                            }
                      }
                    >
                      <span style={{ fontSize: "16px" }}>{l.flag}</span>
                    </div>

                    {/* Labels */}
                    <div className="ms-lang-text">
                      <p
                        className="ms-setting-label"
                        style={
                          isActive ? { color: "var(--accent, #3b82f6)" } : {}
                        }
                      >
                        {l.nativeLabel}
                      </p>
                      <p className="ms-setting-desc">{l.label}</p>
                    </div>
                  </div>

                  {/* Radio-style indicator */}
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: isActive
                        ? "5px solid var(--accent, #3b82f6)"
                        : "2px solid var(--border, #e2e8f0)",
                      flexShrink: 0,
                      transition: "border 0.15s",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted, #94a3b8)",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <MdInfo size={13} /> {t("languageDesc")}
          </p>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="ms-footer">
        <span className="ms-footer-left">
          <MdInfo size={13} /> {t("appVersion")}
        </span>
        <span>
          © {new Date().getFullYear()} {t("allRightsReserved")}
        </span>
      </div>
    </div>
  );
}
