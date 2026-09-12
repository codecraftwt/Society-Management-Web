import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import {
  MdSettings,
  MdPerson,
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdCheckCircle,
  MdWarning,
  MdLanguage,
  MdInfo,
  MdShield,
} from "react-icons/md";

function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size }} className="animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function Avatar({ name }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return <div className="gs-avatar">{initials}</div>;
}

export default function GuardSetting() {
  const { t, lang, changeLang, LANGUAGES } = useLang();

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [langChanged, setLangChanged] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await API.get("/users/me");
      setProfile(res.data);
      setFormData({ name: res.data.name, password: "" });
    } catch (err) {
      console.error("Failed to load profile", err);
      setError(t("gsUpdateFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      setSaving(true);
      await API.put("/users/me", {
        name: formData.name,
        password: formData.password || undefined,
      });
      setFormData((prev) => ({ ...prev, password: "" }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadProfile();
    } catch (err) {
      console.error("Update failed", err);
      setError(t("gsUpdateFail"));
    } finally {
      setSaving(false);
    }
  };

  const handleLangChange = (code) => {
    changeLang(code);
    setLangChanged(true);
    setTimeout(() => setLangChanged(false), 3000);
  };

  const roleLabel = (profile?.role || t("gdGuard") || "Guard").replace(/_/g, " ");

  if (loading) {
    return (
      <div className="gs-root page-root animate-fadeIn">
        <div className="gs-loading">
          <Spinner size={22} />
          <p>{t("gsLoading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gs-root page-root animate-fadeIn">
      <div className="gs-er">
        <div className="gs-er-left">
          <div className="ad-page-icon">
            <MdSettings size={22} />
          </div>
          <div>
            <h1 className="gs-title">{t("gsTitle")}</h1>
            <p className="gs-sub">{profile?.email || t("personalInfoSub")}</p>
          </div>
        </div>
      </div>

      <div className="gs-hero">
        <Avatar name={profile?.name} />
        <div className="gs-hero-info">
          <h2 className="gs-hero-name">{profile?.name}</h2>
          <p className="gs-hero-email">{profile?.email}</p>
          <div className="gs-hero-badges">
            <span className="gs-badge gs-badge--role">
              <MdShield size={11} /> {roleLabel}
            </span>
            <span className="gs-badge gs-badge--active">
              <MdCheckCircle size={11} /> {t("active")}
            </span>
          </div>
        </div>
      </div>

      <SlidingTabs
        className="ge-filter-tabs"
        value={activeTab}
        onChange={setActiveTab}
        fullWidth
        items={[
          { id: "profile", label: t("personalInfo") },
          { id: "language", label: t("language") },
        ]}
      />

      {saved && (
        <div className="gs-banner gs-banner--success">
          <MdCheckCircle size={17} /> {t("gsUpdateSuccess")}
        </div>
      )}
      {error && (
        <div className="gs-banner gs-banner--error">
          <MdWarning size={17} /> {error}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="gs-card">
          <div className="gs-section-er">
            <div className="gs-section-icon">
              <MdPerson size={15} />
            </div>
            <div>
              <h3 className="gs-section-title">{t("personalInfo")}</h3>
              <p className="gs-section-sub">{t("personalInfoSub")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="gs-form">
            <div className="gs-field">
              <label className="gs-label">{t("gsName")}</label>
              <div className="gs-input-wrap">
                <MdPerson size={15} className="gs-input-icon" />
                <input
                  type="text"
                  value={formData.name}
                  required
                  className="input gs-input"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="gs-field">
              <label className="gs-label">
                {t("gsEmail")} <span className="gs-label-muted">{t("emailReadOnly")}</span>
              </label>
              <div className="gs-input-wrap">
                <MdEmail size={15} className="gs-input-icon" />
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="input gs-input gs-input--disabled"
                />
              </div>
            </div>

            <div className="gs-field">
              <label className="gs-label">{t("gsNewPassword")}</label>
              <div className="gs-input-wrap">
                <MdLock size={15} className="gs-input-icon" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={t("gsPasswordPlaceholder")}
                  value={formData.password}
                  className="input gs-input gs-input--padded-right"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="gs-eye-btn"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary gs-save-btn" disabled={saving}>
              {saving ? (
                <>
                  <Spinner size={15} /> {t("gsUpdating")}
                </>
              ) : (
                <>
                  <MdCheckCircle size={15} /> {t("gsUpdateBtn")}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === "language" && (
        <div className="gs-card">
          <div className="gs-section-er">
            <div className="gs-section-icon">
              <MdLanguage size={15} />
            </div>
            <div>
              <h3 className="gs-section-title">{t("language")}</h3>
              <p className="gs-section-sub">{t("languageSub")}</p>
            </div>
          </div>

          {langChanged && (
            <div className="gs-banner gs-banner--success" style={{ marginBottom: 12 }}>
              <MdCheckCircle size={17} /> {t("languageChanged")}
            </div>
          )}

          <div className="gs-lang-list">
            {LANGUAGES.map((item) => {
              const isActive = lang === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  className={`gs-lang-row ${isActive ? "is-active" : ""}`}
                  onClick={() => handleLangChange(item.code)}
                >
                  <div className="gs-lang-flag">{item.flag}</div>
                  <div className="gs-lang-text">
                    <p className="gs-lang-native">{item.nativeLabel}</p>
                    <p className="gs-lang-label">{item.label}</p>
                  </div>
                  <span className={`gs-lang-radio ${isActive ? "is-active" : ""}`} />
                </button>
              );
            })}
          </div>

          <p className="gs-lang-note">
            <MdInfo size={13} /> {t("languageDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
