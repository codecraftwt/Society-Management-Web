import { useState, useRef } from "react";
import API from "../../services/api";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";

function eyeIcon(visible) {
  return visible ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
               a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1
               12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
               m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function lockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function shieldIcon(size) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}

function checkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0
           l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293
           a1 1 0 011.414 0z" clipRule="evenodd"/>
    </svg>
  );
}

function errIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0
           1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6
           a1 1 0 00-1-1z" clipRule="evenodd"/>
    </svg>
  );
}

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function ChangePasswordSettings() {
  const { t } = useLang();

  const STRENGTH_MAP = {
    1: { label: t("cpwStrWeak"),   cls: "weak",   color: "#ef4444" },
    2: { label: t("cpwStrFair"),   cls: "mid",    color: "#3B82F6" },
    3: { label: t("cpwStrGood"),   cls: "mid",    color: "#5B8DEF" },
    4: { label: t("cpwStrStrong"), cls: "strong", color: "#22c55e" },
  };

  const [cur,     setCur]     = useState("");
  const [np,      setNp]      = useState("");
  const [cp,      setCp]      = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNp,  setShowNp]  = useState(false);
  const [showCp,  setShowCp]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const bannerTimer = useRef(null);

  const sc   = np ? getStrength(np) : 0;
  const info = STRENGTH_MAP[sc] || null;

  const tips = [
    { id: "t1", label: t("cpwTip1"), ok: np.length >= 8 },
    { id: "t2", label: t("cpwTip2"), ok: /[A-Z]/.test(np) && /[a-z]/.test(np) },
    { id: "t3", label: t("cpwTip3"), ok: /\d/.test(np) },
    { id: "t4", label: t("cpwTip4"), ok: /[^A-Za-z0-9]/.test(np) },
  ];

  const npOk   = sc >= 2 && np.length >= 8;
  const cpOk   = np === cp && cp.length > 0;
  const canSave = cur.length > 0 && npOk && cpOk && !loading;

  function clearField(f) {
    setErrors(e => { const n = { ...e }; delete n[f]; return n; });
  }

  function reset() {
    setCur(""); setNp(""); setCp("");
    setErrors({});
    setShowCur(false); setShowNp(false); setShowCp(false);
    clearTimeout(bannerTimer.current);
  }

  async function handleSave() {
    const errs = {};
    if (!cur)  errs.cur = t("cpwErrCurrentRequired");
    if (!npOk) errs.np  = np.length < 8 ? t("cpwErrTooShort") : t("cpwErrTooWeak");
    if (!cpOk) errs.cp  = t("cpwErrMismatch");
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await API.put("/users/me", {
        currentPassword: cur,
        password: np,
      });
      toast.success(t("cpwSuccessMsg"));
      reset();
    } catch (err) {
      const msg = err?.response?.data?.message || "";
      if (msg.toLowerCase().includes("current")) {
        setErrors({ cur: t("cpwErrCurrentWrong") });
      } else {
        toast.error(msg || t("failedSave"));
      }
    } finally {
      setLoading(false);
    }
  }

  function segCls(idx) {
    if (!np || sc < idx) return "as-seg";
    return `as-seg ${info?.cls || ""}`;
  }

  return (
    <div className="as-root animate-fadeIn">

      {/* ── Page header ── */}
      <div className="as-header">
        <div className="as-header-left">
          <div className="as-header-icon">{shieldIcon(20)}</div>
          <div className="as-header-titles">
            <h1 className="as-header-title">{t("settings")}</h1>
            <p className="as-header-sub">{t("asSubtitle")}</p>
          </div>
        </div>
        <div className="as-badge">
          {lockIcon()}
          <span>{t("asBadge")}</span>
        </div>
      </div>

      {/* ── Two column layout ── */}
      <div className="as-grid">

        {/* Side panel */}
        <aside className="as-side">
          <div className="as-hero animate-scaleIn">
            <div className="as-hero-glow" />
            <div className="as-hero-head">
              <div className="as-hero-icon">{shieldIcon(20)}</div>
              <div className="as-hero-titles">
                <h2 className="as-hero-title">{t("asSecurityTitle")}</h2>
                <p className="as-hero-sub">{t("asSecuritySub")}</p>
              </div>
            </div>

            <div className="as-hero-status">
              <span className="as-status-dot" />
              <span>{t("asProtected")}</span>
            </div>

            {/* Live strength meter */}
            <div className="as-meter">
              <p className="as-meter-label">{t("asHealthLabel")}</p>
              <div className="cpw-strength-wrap" style={{ opacity: np ? 1 : 0.35 }}>
                <div className={segCls(1)} />
                <div className={segCls(2)} />
                <div className={segCls(3)} />
                <div className={segCls(4)} />
                <span className="cpw-str-label" style={{ color: info?.color }}>
                  {info?.label || ""}
                </span>
              </div>
            </div>

            {/* Requirement checklist */}
            <div className="as-criteria">
              <p className="as-criteria-title">{t("asChecklistTitle")}</p>
              <div className="cpw-tips">
                {tips.map(t => (
                  <div key={t.id} className="cpw-tip-row">
                    <div className={`cpw-tip-dot${t.ok ? " cpw-tip-ok" : ""}`} />
                    <span>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="as-help animate-fadeIn">
            <div className="as-help-icon">{lockIcon()}</div>
            <div className="as-help-text">
              <p className="as-help-title">{t("asHelpTitle")}</p>
              <p className="as-help-note">{t("asHelpNote")}</p>
            </div>
          </div>
        </aside>

        {/* Change password form */}
        <div className="as-main">
          <div className="cpw-card animate-scaleIn">
            {/* Header */}
            <div className="cpw-card-header">
              <div className="cpw-header-icon">{lockIcon()}</div>
              <div>
                <p className="cpw-header-title">{t("cpwChangePassword")}</p>
                <p className="cpw-header-sub">{t("cpwChangePasswordSub")}</p>
              </div>
            </div>

            {/* Body */}
            <div className="cpw-body">

              {/* Current password */}
              <div className="cpw-field">
                <label className="cpw-label" htmlFor="cpw-cur">
                  {t("cpwCurrentPassword")}<span className="cpw-req">*</span>
                </label>
                <div className="cpw-input-wrap">
                  <span className="cpw-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                    </svg>
                  </span>
                  <input
                    id="cpw-cur"
                    className={`cpw-input${errors.cur ? " cpw-error" : cur ? " cpw-ok" : ""}`}
                    type={showCur ? "text" : "password"}
                    placeholder={t("cpwCurrentPasswordPh")}
                    autoComplete="current-password"
                    value={cur}
                    onChange={e => { setCur(e.target.value); clearField("cur"); }}
                  />
                  <button className="cpw-eye-btn" type="button"
                    onClick={() => setShowCur(v => !v)} aria-label="Toggle visibility">
                    {eyeIcon(showCur)}
                  </button>
                </div>
                {errors.cur && (
                  <span className="cpw-field-err" style={{ display: "flex" }}>
                    {errIcon()}<span>{errors.cur}</span>
                  </span>
                )}
              </div>

              <div className="cpw-divider" />

              {/* New password */}
              <div className="cpw-field">
                <label className="cpw-label" htmlFor="cpw-np">
                  {t("cpwNewPassword")}<span className="cpw-req">*</span>
                </label>
                <div className="cpw-input-wrap">
                  <span className="cpw-input-icon">{lockIcon()}</span>
                  <input
                    id="cpw-np"
                    className={`cpw-input${errors.np ? " cpw-error" : npOk ? " cpw-ok" : ""}`}
                    type={showNp ? "text" : "password"}
                    placeholder={t("cpwNewPasswordPh")}
                    autoComplete="new-password"
                    value={np}
                    onChange={e => { setNp(e.target.value); clearField("np"); }}
                  />
                  {npOk && (
                    <span className="cpw-check-icon" style={{ display: "block", right: 36 }}>
                      {checkIcon()}
                    </span>
                  )}
                  <button className="cpw-eye-btn" type="button"
                    onClick={() => setShowNp(v => !v)} aria-label="Toggle visibility">
                    {eyeIcon(showNp)}
                  </button>
                </div>
                {errors.np && (
                  <span className="cpw-field-err" style={{ display: "flex" }}>
                    {errIcon()}<span>{errors.np}</span>
                  </span>
                )}
              </div>

              {/* Confirm password */}
              <div className="cpw-field">
                <label className="cpw-label" htmlFor="cpw-cp">
                  {t("cpwConfirmPassword")}<span className="cpw-req">*</span>
                </label>
                <div className="cpw-input-wrap">
                  <span className="cpw-input-icon">{lockIcon()}</span>
                  <input
                    id="cpw-cp"
                    className={`cpw-input${errors.cp ? " cpw-error" : cpOk ? " cpw-ok" : ""}`}
                    type={showCp ? "text" : "password"}
                    placeholder={t("cpwConfirmPasswordPh")}
                    autoComplete="new-password"
                    value={cp}
                    onChange={e => { setCp(e.target.value); clearField("cp"); }}
                  />
                  {cpOk && (
                    <span className="cpw-check-icon" style={{ display: "block", right: 36 }}>
                      {checkIcon()}
                    </span>
                  )}
                  <button className="cpw-eye-btn" type="button"
                    onClick={() => setShowCp(v => !v)} aria-label="Toggle visibility">
                    {eyeIcon(showCp)}
                  </button>
                </div>
                {errors.cp && (
                  <span className="cpw-field-err" style={{ display: "flex" }}>
                    {errIcon()}<span>{errors.cp}</span>
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="cpw-footer">
                <button className="cpw-btn-cancel" type="button" onClick={reset}>
                  {t("cpwCancelBtn")}
                </button>
                <button
                  className="cpw-btn-save"
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  {loading ? (
                    <>
                      <div className="cpw-spinner" style={{ display: "block" }} />
                      <span>{t("cpwUpdating")}</span>
                    </>
                  ) : (
                    <>
                      {lockIcon()}
                      <span>{t("cpwUpdateBtn")}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}