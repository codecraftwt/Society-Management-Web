import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import {
  MdAdd, MdPerson, MdClose, MdDelete,
  MdShield, MdPhone, MdEmail, MdWork,
  MdFamilyRestroom, MdAdminPanelSettings, MdEdit, MdCheck,
  MdCalendarToday, MdChevronLeft, MdChevronRight, MdEventNote,
  MdSchedule, MdCalculate, MdRepeat, MdContentCopy, MdCheckCircle, MdAccessTime, MdApartment,
  MdDownload, MdPictureAsPdf, MdHistory, MdQrCode,
} from "react-icons/md";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import { getTitleError, getMobileError, getEmailError } from "../../utils/validators";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";

/* Daily Help classification — mirrors backend utils/dailyHelpUtils.js.
   A member is a helper when `work` is set, `relation` is a standard helper
   role (legacy rows), or the backend already flagged `isDailyHelp`. */
const DAILY_HELP_RELATIONS = new Set(["maid", "cook", "driver", "cleaner", "helper", "nanny", "daily help"]);

const isHelper = (m) =>
  (typeof m.isDailyHelp === "boolean" ? m.isDailyHelp : false) ||
  Boolean(m.work) ||
  DAILY_HELP_RELATIONS.has((m.relation || "").toLowerCase());

/* Quick-pick options — mirrors App's AddFamilyScreen (relations) and
   AddHelpsScreen (roles). "Other" reveals a custom text input. */
const RELATION_KEYS = ["spouse", "son", "daughter", "father", "mother", "other"];
const WORK_KEYS = ["maid", "cook", "driver", "nanny", "gardener", "other"];
const WORK_STORED = {
  maid: "Maid", cook: "Cook", driver: "Driver",
  nanny: "Nanny", gardener: "Gardener", other: "Other",
};
const tKey = (t, prefix, k) => t(`${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}`);

function PortalModal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function AdminToggle({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className={`hh-admin-toggle ${checked ? "hh-admin-toggle--on" : "hh-admin-toggle--off"}`}>
      <span className={`hh-admin-toggle__knob ${checked ? "hh-admin-toggle__knob--on" : ""}`} />
    </button>
  );
}

/* ConfirmModal */
function ConfirmModal({ message, subtext, onConfirm, onCancel, confirmLabel, danger, errorMsg, t }) {
  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} className="hh-overlay">
        <div className="bg-card animate-scaleIn hh-confirm-box">
          <div className={`hh-confirm-icon ${danger ? "hh-confirm-icon--danger" : "hh-confirm-icon--admin"}`}>
            {danger
              ? <MdDelete size={19} className="hh-icon-danger" />
              : <MdAdminPanelSettings size={19} className="hh-icon-admin" />}
          </div>
          <p className="hh-confirm-title">{message}</p>
          {subtext && <p className="hh-confirm-sub">{subtext}</p>}
          {errorMsg && (
            <div className="hh-error-box">
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
              {errorMsg}
            </div>
          )}
          <div className="hh-confirm-actions">
            <button type="button" onClick={onCancel} className="hh-btn-cancel">{t("cancel")}</button>
            <button type="button" onClick={onConfirm}
              className={danger ? "btn-danger hh-btn-confirm" : "btn-primary hh-btn-confirm"}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

/* EditModal */
function EditModal({ member, onClose, onSaved, t }) {
  const [email,  setEmail]  = useState(member.email || "");
  const [phone,  setPhone]  = useState(member.phone || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  /* unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(true);
  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const phoneErr = getMobileError(phone, "Phone number");
    if (phoneErr) { setError(phoneErr); return; }
    if (email) {
      const emailErr = getEmailError(email);
      if (emailErr) { setError(emailErr); return; }
    }
    setSaving(true); setError(null);
    try {
      const res = await API.put(`/household/${member.id}`, { email: email.trim(), phone: phone.trim() });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("hhEditFail"));
    } finally { setSaving(false); }
  };

  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }} className="hh-overlay">
        <div className="bg-card animate-scaleIn hh-edit-box">
          <div className="hh-edit-er">
            <div className="hh-edit-er-left">
              <div className="hh-edit-er-icon">
                <MdEdit size={15} className="hh-icon-admin" />
              </div>
              <div>
                <p className="hh-edit-title">{t("hhEditTitle")}</p>
                <p className="hh-edit-sub">{member.name}</p>
              </div>
            </div>
            <button type="button" onClick={requestClose} className="hh-close-btn">
              <MdClose size={14} />
            </button>
          </div>

          {error && (
            <div className="hh-error-box" style={{ marginBottom: "0.75rem" }}>
              <span style={{ flexShrink: 0 }}>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSave} className="hh-form">
            <FieldLabel icon={<MdPhone size={11} />} label={t("hhFieldMobile")} />
            <input className="input" placeholder="+91 98765 43210"
              value={phone} onChange={(e) => setPhone(e.target.value)} required />

            <FieldLabel icon={<MdEmail size={11} />} label={t("hhFieldEmail")} />
            <input className="input" type="email" placeholder="example@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />

            <button type="submit" disabled={saving} className="btn-primary hh-save-btn">
              {saving
                ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                : <MdCheck size={16} />
              }
              {saving ? t("hhSaving") : t("hhSaveChanges")}
            </button>
          </form>
        </div>
      </div>

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose(); }}
      />
    </PortalModal>
  );
}

/* AttendanceModal — shows the monthly gate-entry ledger for one helper.
   Data comes from GET /visitors/resident/attendance/:phone (VisitorLog entries). */
function AttendanceModal({ member, onClose, t }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salary, setSalary] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!member?.phone) return;
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(
          `/visitors/resident/attendance/${encodeURIComponent(member.phone)}?month=${month}&year=${year}`
        );
        if (res.data?.success) {
          if (alive) setData(res.data.data);
        } else {
          throw new Error(res.data?.message || "Failed to load attendance");
        }
      } catch (err) {
        if (alive) {
          setData(null);
          setError(err.response?.data?.message || err.message || t("hhAttErr", "Could not load attendance."));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [member, month, year, t]);

  const goMonth = (delta) => {
    let y = year; let m = month + delta;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long", year: "numeric",
  });

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const daysInMonth = data?.daysInMonth || new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const cells = [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const dateStr = (day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayStr = new Date().toISOString().split("T")[0];
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "0");

  const base = parseFloat(salary);
  const perDay = data && base > 0 ? base / data.daysInMonth : 0;
  const payout = data ? Math.round(perDay * data.presentDays) : 0;

  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="hh-overlay">
        <div className="bg-card animate-scaleIn hh-att-box">
          <div className="hh-edit-er">
            <div className="hh-edit-er-left">
              <div className="hh-edit-er-icon hh-att-head-icon">
                <MdCalendarToday size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="hh-edit-title">{t("hhAttTitle", "Attendance")}</p>
                <p className="hh-edit-sub" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                  <span>{member.name}</span>
                  {member.work && <span className="hh-att-role-chip">{member.work}</span>}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="hh-close-btn" aria-label="Close">
              <MdClose size={14} />
            </button>
          </div>

          <div className="hh-att-body">
            {error && (
              <div className="hh-error-box" style={{ marginBottom: "0.9rem" }}>
                <span style={{ flexShrink: 0 }}>⚠️</span> {error}
              </div>
            )}

            <div className="hh-att-nav">
              <button type="button" onClick={() => goMonth(-1)} className="hh-att-nav-btn" title={t("hhAttPrev", "Previous month")}>
                <MdChevronLeft size={16} />
              </button>
              <span className="hh-att-nav-label">{monthLabel}</span>
              <button type="button" onClick={() => goMonth(1)} className="hh-att-nav-btn" title={t("hhAttNext", "Next month")}>
                <MdChevronRight size={16} />
              </button>
            </div>

            {loading ? (
              <div className="hh-att-loading">
                <div className="hh-att-spinner" />
                <span>{t("hhAttLoading", "Loading attendance...")}</span>
              </div>
            ) : data ? (
              <div className="hh-att-split">
                {/* Left Column: Calendar & Navigation */}
                <div className="hh-att-col-cal">
                  <div className="hh-att-nav">
                    <button type="button" onClick={() => goMonth(-1)} className="hh-att-nav-btn" title={t("hhAttPrev", "Previous month")}>
                      <MdChevronLeft size={16} />
                    </button>
                    <span className="hh-att-nav-label">{monthLabel}</span>
                    <button type="button" onClick={() => goMonth(1)} className="hh-att-nav-btn" title={t("hhAttNext", "Next month")}>
                      <MdChevronRight size={16} />
                    </button>
                  </div>

                  <div className="hh-att-cal">
                    <div className="hh-att-week">
                      {weekDays.map((d, i) => <span key={i} className="hh-att-weekday">{d}</span>)}
                    </div>
                    <div className="hh-att-grid">
                      {cells.map((day, idx) => {
                        if (day == null) return <span key={`b-${idx}`} className="hh-att-cell" />;
                        const ds = dateStr(day);
                        const isPresent = data.attendance && data.attendance[ds];
                        const isFuture = day > data.passedDays;
                        const isToday = ds === todayStr;
                        let cls = "hh-att-cell";
                        if (isPresent) cls += " hh-att-cell--present";
                        else if (isFuture) cls += " hh-att-cell--future";
                        else cls += " hh-att-cell--absent";
                        if (isToday) cls += " hh-att-cell--today";
                        return (
                          <span key={ds} className={cls}>
                            <span className="hh-att-cell-num">{day}</span>
                            {isPresent && <MdCheck size={10} className="hh-att-cell-ic" />}
                            {!isPresent && !isFuture && <MdClose size={10} className="hh-att-cell-ic" />}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hh-att-legend">
                    <span className="hh-att-legend-item"><span className="hh-att-legend-dot hh-att-legend-dot--present" />{t("hhAttLegendPresent", "Present")}</span>
                    <span className="hh-att-legend-item"><span className="hh-att-legend-dot hh-att-legend-dot--absent" />{t("hhAttLegendAbsent", "Absent")}</span>
                    <span className="hh-att-legend-item"><span className="hh-att-legend-dot hh-att-legend-dot--future" />{t("hhAttLegendFuture", "Not arrived yet")}</span>
                  </div>
                </div>

                {/* Right Column: Stats & Salary Calculator */}
                <div className="hh-att-col-calc">
                  <div className="hh-att-stats">
                    <div className="hh-att-stat hh-att-stat--present">
                      <span className="hh-att-stat-ic"><MdCheck size={12} /></span>
                      <div>
                        <span className="hh-att-stat-val">{data.presentDays}</span>
                        <span className="hh-att-stat-label">{t("hhAttPresent", "Present")}</span>
                      </div>
                    </div>
                    <div className="hh-att-stat hh-att-stat--absent">
                      <span className="hh-att-stat-ic"><MdClose size={12} /></span>
                      <div>
                        <span className="hh-att-stat-val">{data.absentDays}</span>
                        <span className="hh-att-stat-label">{t("hhAttAbsent", "Absent")}</span>
                      </div>
                    </div>
                    <div className="hh-att-stat hh-att-stat--time">
                      <span className="hh-att-stat-ic"><MdSchedule size={12} /></span>
                      <div>
                        <span className="hh-att-stat-val">{data.totalHours}h</span>
                        <span className="hh-att-stat-label">{t("hhAttTime", "Total time")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Salary Calculator */}
                  <div className="hh-sal-box">
                    <div className="hh-sal-head">
                      <span className="hh-sal-head-ic"><MdCalculate size={14} /></span>
                      <div>
                        <p className="hh-sal-title">{t("hhSalTitle", "Salary Calculator")}</p>
                        <p className="hh-sal-sub">{t("hhSalSub", "Estimate pay based on attendance")}</p>
                      </div>
                    </div>

                    <label className="hh-field-label" style={{ marginTop: "0.4rem" }}>
                      <span className="hh-field-label-icon"><MdWork size={11} /></span>
                      {t("hhSalBase", "Base Monthly Salary")}
                    </label>
                    <div className="hh-sal-input-row">
                      <span className="hh-sal-rupee">₹</span>
                      <input
                        className="input hh-sal-input"
                        type="number"
                        min="0"
                        placeholder={t("hhSalPlaceholder", "Enter base monthly salary")}
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                      />
                    </div>

                    {base > 0 && data && (
                      <div className="hh-sal-result">
                        <div className="hh-sal-breakdown">
                          <span>₹{fmt(base)} ÷ {data.daysInMonth} {t("hhSalPerDay", "per day")}</span>
                          <span className="hh-sal-eq">=</span>
                          <span><b>₹{fmt(perDay)}</b>/day</span>
                          <span className="hh-sal-mul">×</span>
                          <span>{data.presentDays} {t("hhAttPresent", "present")}</span>
                        </div>
                        <div className="hh-sal-payout">
                          <div>
                            <span className="hh-sal-payout-label">{t("hhSalPayout", "Estimated Payout")}</span>
                            <span className="hh-sal-payout-sub">After {data.absentDays} day(s) deduction</span>
                          </div>
                          <div className="hh-sal-payout-amt">₹{fmt(payout)}</div>
                        </div>
                        <p className="hh-sal-note">
                          <MdEventNote size={11} /> {t("hhSalNote", "Payout is prorated — base salary ÷ days in month × days present.")}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="hh-att-note">
                    <MdEventNote size={12} /> {t("hhAttNote", "Attendance comes from gate entry/exit logs recorded for this mobile number.")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="hh-att-loading">
                <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                  {t("hhAttNoPhone", "No phone number on file for this member.")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

/* DailyPassModal — one-tap DAILY gate pass for a daily-help member.
   Shows QR Code, OTP, Download PNG/PDF, prevent duplicates, and view old passes. */
function DailyPassModal({ member, flats = [], defaultFlatId, onClose, t, societyName }) {
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const qrRef = useRef(null);

  // Find default valid flat (prefer matching member.flat_id, then non-rented flat, then defaultFlatId or first flat)
  const defaultEligible = flats.find((f) => String(f.flat_id) === String(member.flat_id))
    || flats.find((f) => String(f.flat_id) === String(defaultFlatId) && (f.role !== "OWNER" || f.occupancy_status !== "RENTED"))
    || flats.find((f) => f.role !== "OWNER" || f.occupancy_status !== "RENTED")
    || flats[0];

  const [selectedFlatId, setSelectedFlatId] = useState(
    defaultEligible ? String(defaultEligible.flat_id) : (defaultFlatId ? String(defaultFlatId) : "")
  );
  const [dwellChoice, setDwellChoice] = useState("60");
  const [dwellCustom, setDwellCustom] = useState("");
  const [validity,    setValidity]    = useState("1");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activePass,  setActivePass]  = useState(null);
  const [pastPasses,  setPastPasses]  = useState([]);
  const [viewMode,    setViewMode]    = useState("PASS"); // "PASS" | "CREATE" | "HISTORY"
  const [copied,      setCopied]      = useState(false);

  const addMonths = (iso, months) => {
    const d = new Date(`${iso}T00:00:00`);
    const y = d.getFullYear();
    const m = d.getMonth() + months;
    const day = Math.min(d.getDate(), new Date(y, m + 1, 0).getDate());
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const dwellMinutes =
    dwellChoice === "other"
      ? (parseInt(dwellCustom, 10) || 0)
      : parseInt(dwellChoice, 10);

  // Load existing passes for this helper
  const loadPasses = async () => {
    setLoading(true);
    try {
      const res = await API.get("/preapproval/my");
      const allPasses = Array.isArray(res.data) ? res.data : [];

      const helperPasses = allPasses.filter((p) => {
        const phoneMatch = member.phone && p.mobile && String(p.mobile).replace(/\D/g, "") === String(member.phone).replace(/\D/g, "");
        const nameMatch = member.name && p.visitor_name && p.visitor_name.trim().toLowerCase() === member.name.trim().toLowerCase();
        return phoneMatch || nameMatch;
      });

      const active = helperPasses.find((p) => {
        const isDaily = String(p.pass_type || "").toUpperCase() === "DAILY";
        const isValidDate = isDaily ? (p.valid_until ? p.valid_until >= todayIST : true) : (p.valid_date >= todayIST);
        return (p.status === "PENDING" || p.status === "APPROVED") && isValidDate;
      });

      const history = helperPasses.filter((p) => p.id !== active?.id);

      setActivePass(active || null);
      setPastPasses(history);
      setViewMode(active ? "PASS" : "CREATE");
    } catch (err) {
      console.error("Failed to load helper passes:", err);
      setViewMode("CREATE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, [member.phone, member.name]);

  const generate = async () => {
    setError(null);
    if (!selectedFlatId) {
      setError(t("hhPassSelectFlatErr", "Please select a flat for this gate pass."));
      return;
    }
    if (!Number.isInteger(dwellMinutes) || dwellMinutes < 1 || dwellMinutes > 1440) {
      setError(t("hhPassDwellErr", "Enter a valid allowed time (1–1440 minutes)."));
      return;
    }

    setSaving(true);
    try {
      const res = await API.post("/preapproval", {
        flat_id:       selectedFlatId,
        visitor_name:  member.name,
        mobile:        member.phone,
        purpose:       "SERVICE",
        valid_date:    todayIST,
        pass_type:     "DAILY",
        valid_until:   addMonths(todayIST, parseInt(validity, 10)),
        dwell_minutes: dwellMinutes,
      });

      const passObj = res.data.preApproval || {
        otp: res.data.GatePass || res.data.otp,
        visitor_name: member.name,
        mobile: member.phone,
        pass_type: "DAILY",
        valid_date: todayIST,
        valid_until: addMonths(todayIST, parseInt(validity, 10)),
        dwell_minutes: dwellMinutes,
        flat_id: selectedFlatId,
        Flat: flats.find((f) => String(f.flat_id) === String(selectedFlatId)),
      };

      setActivePass(passObj);
      setViewMode("PASS");
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.preApproval) {
        setActivePass(err.response.data.preApproval);
        setViewMode("PASS");
        setError(err.response.data.message || t("hhPassAlreadyExists", "An active pass already exists for this helper."));
      } else {
        setError(err.response?.data?.message || t("hhPassErr", "Could not generate the pass."));
      }
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async (otp) => {
    try { await navigator.clipboard.writeText(otp); } catch {
      const ta = document.createElement("textarea");
      ta.value = otp;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Download PNG ── */
  const downloadPNG = () => {
    if (!qrRef.current || !activePass) return;
    try {
      const canvas = qrRef.current;
      const out = document.createElement("canvas");
      const W = 900;
      const H = 1100;
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");

      // Background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      // Card background
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(40, 40, W - 80, H - 80, 24);
      else ctx.rect(40, 40, W - 80, H - 80);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Title
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      // Society name
      ctx.fillStyle = "#94a3b8";
      ctx.font = "17px sans-serif";
      ctx.fillText(societyName || "Society", W / 2, 82);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("DAILY GATE PASS", W / 2, 112);

      // Helper Name & Role
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(member.name, W / 2, 160);
      if (member.work) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "20px sans-serif";
        ctx.fillText(`Role: ${member.work}`, W / 2, 195);
      }

      // QR Code container white box
      const qrBoxSize = 340;
      const qrBoxX = (W - qrBoxSize) / 2;
      const qrBoxY = 230;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
      else ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.fill();

      // Draw QR Canvas
      ctx.drawImage(canvas, qrBoxX + 20, qrBoxY + 20, qrBoxSize - 40, qrBoxSize - 40);

      // Pass Code Label & OTP
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px sans-serif";
      ctx.fillText("PASS CODE / OTP", W / 2, 630);

      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 56px monospace";
      ctx.fillText(String(activePass.otp), W / 2, 695);

      // Validity & Details
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "22px sans-serif";
      const valText = `Validity: ${activePass.valid_date || todayIST} → ${activePass.valid_until || "–"}`;
      ctx.fillText(valText, W / 2, 770);

      const fObj = flats.find((f) => String(f.flat_id) === String(activePass.flat_id)) || activePass.Flat;
      const flatStr = fObj ? `Unit: ${[fObj.block_name, fObj.flat_number].filter(Boolean).join(" ")}` : "";
      if (flatStr) {
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "20px sans-serif";
        ctx.fillText(flatStr, W / 2, 810);
      }

      const dwellStr = activePass.dwell_minutes ? `Allowed Time: ${activePass.dwell_minutes} min per visit` : "";
      if (dwellStr) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "18px sans-serif";
        ctx.fillText(dwellStr, W / 2, 845);
      }

      // Footer note
      ctx.fillStyle = "#64748b";
      ctx.font = "16px sans-serif";
      ctx.fillText("Show this QR code at the society security gate on entry & exit.", W / 2, 940);
      ctx.fillText("Valid for 2 visits per day. Resets daily.", W / 2, 970);

      const link = document.createElement("a");
      link.href = out.toDataURL("image/png");
      link.download = `GatePass_${member.name.replace(/\s+/g, "_")}_${activePass.otp}.png`;
      link.click();
    } catch (e) {
      console.error("Download PNG error:", e);
    }
  };

  /* ── Download PDF ── */
  const downloadPDF = () => {
    if (!qrRef.current || !activePass) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 595, 842, "F");

      // Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(40, 40, 515, 762, 12, 12, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, 40, 515, 762, 12, 12, "S");

      // Society name
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(societyName || "Society", 297.5, 72, { align: "center" });

      // Title
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("DAILY GATE PASS", 297.5, 92, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(`${member.name} ${member.work ? `(${member.work})` : ""}`, 297.5, 117, { align: "center" });

      // QR Image
      const qrData = qrRef.current.toDataURL("image/png");
      doc.addImage(qrData, "PNG", 297.5 - 110, 140, 220, 220);

      // OTP
      doc.setFontSize(32);
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.text(String(activePass.otp), 297.5, 410, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("SECURITY ENTRY / EXIT OTP", 297.5, 430, { align: "center" });

      // Meta Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(80, 460, 435, 130, 8, 8, "F");

      const fObj = flats.find((f) => String(f.flat_id) === String(activePass.flat_id)) || activePass.Flat;
      const flatStr = fObj ? [fObj.block_name, fObj.flat_number].filter(Boolean).join(" ") : "–";

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("Validity Period:", 105, 490);
      doc.setFont("helvetica", "normal");
      doc.text(`${activePass.valid_date || todayIST} to ${activePass.valid_until || "–"}`, 230, 490);

      doc.setFont("helvetica", "bold");
      doc.text("Assigned Flat:", 105, 515);
      doc.setFont("helvetica", "normal");
      doc.text(`Flat ${flatStr}`, 230, 515);

      doc.setFont("helvetica", "bold");
      doc.text("Allowed Duration:", 105, 540);
      doc.setFont("helvetica", "normal");
      doc.text(`${activePass.dwell_minutes || 60} minutes per visit`, 230, 540);

      doc.setFont("helvetica", "bold");
      doc.text("Daily Limit:", 105, 565);
      doc.setFont("helvetica", "normal");
      doc.text("2 scans/day (Entry + Exit)", 230, 565);

      // Note
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("This pass is registered with the society security gate system.", 297.5, 640, { align: "center" });
      doc.text("Guard will verify the QR code upon arrival.", 297.5, 655, { align: "center" });

      doc.save(`GatePass_${member.name.replace(/\s+/g, "_")}_${activePass.otp}.pdf`);
    } catch (e) {
      console.error("Download PDF error:", e);
    }
  };

  const activeFlat = activePass
    ? flats.find((f) => String(f.flat_id) === String(activePass.flat_id)) || activePass.Flat
    : null;
  const activeFlatLabel = activeFlat
    ? [activeFlat.block_name, activeFlat.flat_number].filter(Boolean).join(" ")
    : null;

  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="hh-overlay">
        <div className="bg-card animate-scaleIn hh-att-box hh-pass-box" style={{ maxWidth: "460px" }}>
          {/* ── MODAL HEADER ── */}
          <div className="hh-edit-er">
            <div className="hh-edit-er-left">
              <div className="hh-edit-er-icon hh-att-head-icon">
                <MdRepeat size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="hh-edit-title">{t("hhPassTitle", "Daily Gate Pass")}</p>
                <p className="hh-edit-sub" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                  <span>{member.name}</span>
                  {member.work && <span className="hh-att-role-chip">{member.work}</span>}
                  {activePass && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-semibold border border-green-500/20">
                      Active Pass
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="hh-close-btn" aria-label="Close">
              <MdClose size={14} />
            </button>
          </div>

          {/* ── SUB NAVIGATION / TABS ── */}
          <div className="flex items-center gap-2 px-4 pt-2 border-b border-white/5 pb-2 text-xs">
            {activePass && (
              <button
                type="button"
                onClick={() => { setViewMode("PASS"); setError(null); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ${
                  viewMode === "PASS"
                    ? "bg-primary text-white font-semibold shadow-sm"
                    : "text-secondary hover:bg-white/5 hover:text-white"
                }`}
              >
                <MdQrCode size={13} /> {t("hhActivePass", "Current Pass")}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setViewMode("CREATE"); setError(null); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ${
                viewMode === "CREATE"
                  ? "bg-primary text-white font-semibold shadow-sm"
                  : "text-secondary hover:bg-white/5 hover:text-white"
              }`}
            >
              <MdAdd size={13} /> {activePass ? t("hhRenewPass", "Renew / New Pass") : t("hhGeneratePass", "Generate Pass")}
            </button>
            {pastPasses.length > 0 && (
              <button
                type="button"
                onClick={() => { setViewMode("HISTORY"); setError(null); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ml-auto ${
                  viewMode === "HISTORY"
                    ? "bg-primary text-white font-semibold shadow-sm"
                    : "text-secondary hover:bg-white/5 hover:text-white"
                }`}
              >
                <MdHistory size={13} /> {t("hhPastPasses", "History")} ({pastPasses.length})
              </button>
            )}
          </div>

          <div className="hh-att-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {error && (
              <div className="hh-error-box" style={{ marginBottom: "0.9rem" }}>
                <span style={{ flexShrink: 0 }}>⚠️</span> {error}
              </div>
            )}

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-secondary text-xs">
                <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                <span>{t("loading", "Checking gate pass status…")}</span>
              </div>
            ) : viewMode === "PASS" && activePass ? (
              /* ── ACTIVE PASS VIEW WITH QR CODE & DOWNLOAD ── */
              <div className="flex flex-col items-center gap-3 pt-2 w-full text-center">
                {/* Branded Pass Card */}
                <div className="hh-pass-card w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                  {/* Card header — gradient brand band */}
                  <div className="hh-pass-card-head px-4 pt-4 pb-6 relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 55%, #7c3aed 100%)" }}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
                    <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-black/20" aria-hidden="true" />
                    <div className="relative">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-indigo-200 font-semibold">
                        <MdApartment size={13} /> {societyName || t("hhSociety", "Society")}
                      </span>
                      <p className="mt-1.5 text-white text-sm font-bold tracking-[0.22em]">DAILY GATE PASS</p>
                      <p className="mt-0.5 text-indigo-200 text-xs truncate">{member.name}{member.work ? ` · ${member.work}` : ""}</p>
                    </div>
                  </div>

                  {/* Body — QR + OTP + meta */}
                  <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-2">
                    <div className="bg-white rounded-xl p-3 shadow-md border border-slate-200">
                      <QRCodeCanvas ref={qrRef} value={String(activePass.otp)} size={150} />
                    </div>

                    <p className="hh-pass-code-label" style={{ marginBottom: "2px", marginTop: "4px" }}>
                      {t("hhPassCode", "Gate Pass OTP Code")}
                    </p>
                    <p className="hh-pass-code" style={{ letterSpacing: "0.25em", color: "#22c55e" }}>
                      {activePass.otp}
                    </p>

                    {/* Validity & Flat Meta Badges */}
                    <div className="flex flex-wrap justify-center gap-1.5 w-full mt-1">
                      {activeFlatLabel && (
                        <span className="flex items-center gap-1 text-[11px] text-secondary px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                          <MdApartment size={12} className="text-primary" /> Flat {activeFlatLabel}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-secondary px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                        <MdSchedule size={12} className="text-green-400" />
                        {activePass.valid_date || todayIST} → {activePass.valid_until || "–"}
                      </span>
                      {activePass.dwell_minutes && (
                        <span className="flex items-center gap-1 text-[11px] text-secondary px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                          <MdAccessTime size={12} /> {activePass.dwell_minutes} min/visit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Copy, Download PNG, Download PDF */}
                <div className="w-full space-y-2 mt-1">
                  <button
                    type="button"
                    onClick={() => copyCode(activePass.otp)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition ${
                      copied
                        ? "bg-green-600 text-white border-green-500 shadow-sm"
                        : "bg-primary text-white border-primary hover:bg-primary/90 shadow-sm"
                    }`}
                  >
                    {copied ? <MdCheckCircle size={15} /> : <MdContentCopy size={15} />}
                    {copied ? t("hhPassCopied", "Pass Code Copied!") : t("hhPassCopy", "Copy Code")}
                  </button>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      onClick={downloadPNG}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition"
                    >
                      <MdDownload size={14} className="text-cyan-400" /> {t("docDownload", "Download")} PNG
                    </button>
                    <button
                      type="button"
                      onClick={downloadPDF}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition"
                    >
                      <MdPictureAsPdf size={14} className="text-rose-400" /> {t("docDownload", "Download")} PDF
                    </button>
                  </div>
                </div>

                <p className="hh-pass-note text-left mt-2">
                  <MdEventNote size={13} className="shrink-0 text-secondary" />
                  <span>
                    {t(
                      "hhPassNote",
                      "Show this QR code at the security gate. Valid for 2 entries/exits per day until the end date."
                    )}
                  </span>
                </p>
              </div>
            ) : viewMode === "HISTORY" ? (
              /* ── HISTORY / PAST PASSES VIEW ── */
              <div className="space-y-3 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary font-medium">
                    {pastPasses.length} {t("hhPastPassesRecorded", "Previous Passes")}
                  </span>
                </div>
                <div className="space-y-2">
                  {pastPasses.map((p) => {
                    const f = flats.find((x) => String(x.flat_id) === String(p.flat_id)) || p.Flat;
                    const fName = f ? [f.block_name, f.flat_number].filter(Boolean).join(" ") : null;
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm tracking-wider text-white">
                              {p.otp}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                p.status === "USED"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : p.status === "EXPIRED"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-white/10 text-secondary"
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-secondary mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              {p.valid_date} {p.valid_until ? `→ ${p.valid_until}` : ""}
                            </span>
                            {fName && <span>· Flat {fName}</span>}
                            {p.dwell_minutes && <span>· {p.dwell_minutes}m</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyCode(p.otp)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-secondary hover:text-white border border-white/10 shrink-0"
                          title="Copy Code"
                        >
                          <MdContentCopy size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── GENERATE PASS FORM VIEW ── */
              <>
                {activePass && (
                  <div className="p-2.5 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>An active pass ({activePass.otp}) is already active till {activePass.valid_until}.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode("PASS")}
                      className="underline font-semibold shrink-0 hover:text-white"
                    >
                      View Pass
                    </button>
                  </div>
                )}

                {flats.length > 1 && (
                  <div className="hh-sal-box">
                    <div className="hh-sal-head">
                      <span className="hh-sal-head-ic"><MdApartment size={14} /></span>
                      <div>
                        <p className="hh-sal-title">{t("hhFieldSelectFlat", "Select Flat")}</p>
                        <p className="hh-sal-sub">{t("hhPassFlatSub", "Choose the unit for this daily gate pass")}</p>
                      </div>
                    </div>
                    <div className="hh-pass-grid">
                      {flats.map((f) => {
                        const label = [f.block_name, f.flat_number].filter(Boolean).join(" ");
                        const isRented = f.role === "OWNER" && f.occupancy_status === "RENTED";
                        const isSelected = String(selectedFlatId) === String(f.flat_id);
                        return (
                          <button
                            key={f.flat_id}
                            type="button"
                            disabled={isRented}
                            title={isRented ? t("hhFlatRentedOwnerNote", "Rented to tenant (Pre-approvals restricted)") : ""}
                            onClick={() => setSelectedFlatId(String(f.flat_id))}
                            className={`hh-pass-pick ${isSelected ? "hh-pass-pick--on" : ""} ${isRented ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span>{label}</span>
                            {isRented && (
                              <span style={{ fontSize: "0.68rem", display: "block", color: "var(--danger, #ef4444)", marginTop: "2px" }}>
                                ({t("rented", "Rented")})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="hh-sal-box">
                  <div className="hh-sal-head">
                    <span className="hh-sal-head-ic"><MdSchedule size={14} /></span>
                    <div>
                      <p className="hh-sal-title">{t("hhPassValidity", "Validity Period")}</p>
                      <p className="hh-sal-sub">{t("hhPassValiditySub", "Starting today, valid for")}</p>
                    </div>
                  </div>
                  <div className="hh-pass-grid">
                    {["1", "2", "3"].map((m) => (
                      <button key={m} type="button"
                        onClick={() => setValidity(m)}
                        className={`hh-pass-pick ${validity === m ? "hh-pass-pick--on" : ""}`}>
                        {m === "1"
                          ? t("hhPassMonthOne", "1 month")
                          : t("hhPassMonthMany", `${m} months`, { count: m })}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hh-sal-box">
                  <div className="hh-sal-head">
                    <span className="hh-sal-head-ic"><MdAccessTime size={14} /></span>
                    <div>
                      <p className="hh-sal-title">{t("hhPassDwell", "Allowed Time Inside")}</p>
                      <p className="hh-sal-sub">{t("hhPassDwellSub", "Guard is alerted once the time is over")}</p>
                    </div>
                  </div>
                  <div className="hh-pass-grid">
                    {[
                      { v: "30",  l: t("hhPassDwellMin", "30 min", { count: 30 }) },
                      { v: "45",  l: t("hhPassDwellMin", "45 min", { count: 45 }) },
                      { v: "60",  l: t("hhPassDwellHour", "1 hour") },
                      { v: "120", l: t("hhPassDwellHours", "2 hours", { count: 2 }) },
                      { v: "180", l: t("hhPassDwellHours", "3 hours", { count: 3 }) },
                      { v: "300", l: t("hhPassDwellHours", "5 hours", { count: 5 }) },
                    ].map((o) => (
                      <button key={o.v} type="button"
                        onClick={() => setDwellChoice(o.v)}
                        className={`hh-pass-pick ${dwellChoice === o.v ? "hh-pass-pick--on" : ""}`}>
                        {o.l}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setDwellChoice("other")}
                      className={`hh-pass-pick ${dwellChoice === "other" ? "hh-pass-pick--on" : ""}`}>
                      {t("hhPassDwellOther", "Other")}
                    </button>
                  </div>
                  {dwellChoice === "other" && (
                    <div>
                      <label className="hh-field-label" style={{ marginTop: "0.4rem" }}>
                        <span className="hh-field-label-icon"><MdAccessTime size={11} /></span>
                        {t("hhPassCustomMin", "Custom minutes")}
                      </label>
                      <input type="number" min="1" max="1440" className="input hh-sal-input"
                        placeholder="e.g. 90"
                        value={dwellCustom}
                        onChange={(e) => setDwellCustom(e.target.value)} />
                    </div>
                  )}
                </div>

                <p className="hh-pass-note" style={{ marginTop: "0.2rem" }}>
                  <MdEventNote size={12} /> {t("hhPassNote2", "Works for 2 visits per day (entry + exit). Resets every day until the end date.")}
                </p>

                <button type="button" onClick={generate} disabled={saving || !selectedFlatId}
                  className="btn-primary hh-save-btn">
                  <MdRepeat size={14} /> {saving ? t("hhPassGenerating", "Generating…") : t("hhPassGenerate", "Generate Daily Pass")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */
export default function MyHouseHold() {
  const { t }    = useLang();
  const { user } = useAuth();

  const [activeTab,    setActiveTab]    = useState("family");
  const [showModal,    setShowModal]    = useState(false);
  const [members,      setMembers]      = useState([]);
  const [flats,        setFlats]        = useState([]);
  const [pendingFlatId,setPendingFlatId]= useState(null);
  const [flatAssigned, setFlatAssigned] = useState(true);  // optimistic default
  const [confirm,      setConfirm]      = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [editMember,   setEditMember]   = useState(null);
  const [attMember,    setAttMember]    = useState(null);
  const [passMember,   setPassMember]   = useState(null);
  const [search,       setSearch]       = useState("");

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", relation: "", work: "",
  });

  /* unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showModal);

  useEffect(() => { checkFlat(); loadHousehold(); }, []);

  /* ✅ FIX: /users/get-flat returns an ARRAY — check array length, not .flat_number */
  async function checkFlat() {
    try {
      const res   = await API.get("/users/get-flat");
      const flats = Array.isArray(res.data) ? res.data : [];
      setFlats(flats);
      const eligible = flats.find((f) => f.role !== "OWNER" || f.occupancy_status !== "RENTED") || flats[0];
      setPendingFlatId(eligible ? String(eligible.flat_id) : (flats.length ? String(flats[0].flat_id) : null));
      setFlatAssigned(flats.length > 0);
    } catch {
      setFlats([]);
      setPendingFlatId(null);
      setFlatAssigned(false);
    }
  }

  async function loadHousehold() {
    try {
      const res = await API.get("/household");
      setMembers(res.data || []);
    } catch { setMembers([]); }
  }

  const handleAdd = async (payload) => {
    if (!flatAssigned) return;
    try {
      await API.post("/household/add", payload);
      setFormData({ name: "", phone: "", email: "", relation: "", work: "" });
      setShowModal(false);
      loadHousehold();
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to add member");
    }
  };

  const closeAddModal = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else setShowModal(false);
  };

  const handleMemberSaved = (updated) => {
    setMembers((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
  };

  const askDelete = (id, name) =>
    setConfirm({
      type: "delete", id,
      message: t("hhConfirmRemoveTitle"),
      subtext: `"${name}" ${t("hhConfirmRemoveSub")}`,
    });

  const askToggleAdmin = (id, name, isAdmin) =>
    setConfirm({
      type: "admin", id, isAdmin,
      message: isAdmin ? t("hhConfirmRevokeTitle") : t("hhConfirmGrantTitle"),
      subtext:  isAdmin
        ? `"${name}" ${t("hhConfirmRevokeSub")}`
        : `"${name}" ${t("hhConfirmGrantSub")}`,
    });

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmError(null);
    try {
      if (confirm.type === "delete") {
        await API.delete(`/household/${confirm.id}`);
        setMembers((p) => p.filter((m) => m.id !== confirm.id));
        setConfirm(null);
      } else {
        const res = await API.patch(`/household/${confirm.id}/toggle-admin`);
        setMembers((p) =>
          p.map((m) => m.id === confirm.id ? { ...m, isAdmin: res.data.isAdmin } : m)
        );
        setConfirm(null);
      }
    } catch (err) {
      setConfirmError(err.response?.data?.message || t("hhConfirmErr"));
    }
  };

  const familyMembers = members.filter((m) => !isHelper(m) && m.relation !== "Vehicle");
  const helpMembers   = members.filter((m) => isHelper(m) && m.relation !== "Vehicle");
  const adminCount    = familyMembers.filter((m) => m.isAdmin).length;
  const q = search.trim().toLowerCase();
  const matches = (m) =>
    !q ||
    [m.name, m.phone, m.email, m.relation, m.work].some((v) =>
      String(v || "").toLowerCase().includes(q)
    );
  const filtered = (list) => list.filter(matches);
  const familyList = filtered(familyMembers);
  const helpList   = filtered(helpMembers);
  const flatLabel  = (id) => {
    if (id == null) return "";
    const f = flats.find((x) => String(x.flat_id) === String(id));
    return f ? [f.block_name, f.flat_number].filter(Boolean).join(" ") : "";
  };

  return (
    <>
      <div className="ge-root hh-page animate-fadeIn">
        <div className="ge-er">
          <div className="ge-er-left">
            <div className="ad-page-icon">
              <MdFamilyRestroom size={22} />
            </div>
            <div>
              <h2 className="page-title">{t("hhTitle")}</h2>
              <p className="page-subtitle">
                {members.length} {members.length !== 1 ? t("hhMembers") : t("hhMember")} · {adminCount} {adminCount !== 1 ? t("hhAdmins") : t("hhAdmin")}
              </p>
            </div>
          </div>
          <div className="ge-er-right">
            {activeTab === "family" ? (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <MdAdd size={16} /> {t("hhAddFamilyTitle")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-muted flex items-center gap-2"
              >
                <MdAdd size={16} /> {t("hhAddHelperTitle")}
              </button>
            )}
          </div>
        </div>

        {!flatAssigned && (
          <div className="gc-warn">
            <MdShield size={15} /> {t("hhFlatWarning")}
          </div>
        )}

        <div className="ge-stats">
          <div className="complaint-stat-card complaint-stat-total">
            <span className="complaint-stat-val">{familyMembers.length}</span>
            <span className="complaint-stat-label">{t("hhTabFamily")}</span>
          </div>
          <div className="complaint-stat-card complaint-stat-inprogress">
            <span className="complaint-stat-val">{helpMembers.length}</span>
            <span className="complaint-stat-label">{t("hhTabHelp")}</span>
          </div>
          <div className="complaint-stat-card complaint-stat-resolved">
            <span className="complaint-stat-val">{adminCount}</span>
            <span className="complaint-stat-label">{t("hhAdmins")}</span>
          </div>
        </div>

        <div className="ge-toolbar">
          <div className="ml-auto">
            <ExpandableSearch
              placeholder={t("hhFieldNamePlaceholder") || "Search members..."}
              value={search}
              onChange={setSearch}
            />
          </div>
        </div>

        {flatAssigned && (
          <div className="hh-sections">
            {/* ── TOGGLE: FAMILY MEMBERS (default) / HOUSEHOLD HELP ── */}
            <SlidingTabs
              className="hh-tabs"
              items={[
                { id: "family", label: t("hhTabFamily"), badge: familyMembers.length },
                { id: "help",   label: t("hhSectionHelp"), badge: helpMembers.length },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />

            <section className="hh-section">
              <div className="hh-section-head">
                <span className={`hh-avatar ${activeTab === "family" ? "hh-avatar--family" : "hh-avatar--help"}`}>
                  {activeTab === "family" ? <MdFamilyRestroom size={16} /> : <MdWork size={16} />}
                </span>
                <span className="hh-section-title">
                  {activeTab === "family" ? t("hhSectionFamily") : t("hhSectionHelp")}
                  <span className="hh-section-count">
                    {activeTab === "family" ? familyMembers.length : helpMembers.length}
                  </span>
                </span>
                {flats.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                    <span className="text-xs text-secondary font-medium mr-1">{t("hhFieldSelectFlat", "Flat")}:</span>
                    {flats.map((f) => {
                      const label = [f.block_name, f.flat_number].filter(Boolean).join(" ");
                      const isSelected = String(pendingFlatId) === String(f.flat_id);
                      return (
                        <button
                          key={f.flat_id}
                          type="button"
                          onClick={() => setPendingFlatId(String(f.flat_id))}
                          className={`px-2.5 py-0.5 text-xs rounded-full border transition-all ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-sm font-semibold"
                              : "bg-surface text-secondary border-border hover:border-primary/40"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {(activeTab === "family" ? familyList : helpList).length === 0 ? (
                <div className="bg-card hh-empty-state">
                  <div className="hh-empty-icon-wrap">
                    {activeTab === "family" ? <MdFamilyRestroom size={19} /> : <MdWork size={19} />}
                  </div>
                  <p className="text-secondary" style={{ fontSize: "0.83rem", margin: 0 }}>
                    {q ? t("hhEmptyHint") : (activeTab === "family" ? t("hhEmptyFamily") : t("hhEmptyHelp"))}
                  </p>
                  {!q && <p className="hh-empty-hint">{t("hhEmptyHint")}</p>}
                </div>
              ) : (
                <div className="hh-list">
                  {(activeTab === "family" ? familyList : helpList).map((m) => (
                    <MemberRow key={m.id} member={m} isFamily={activeTab === "family"}
                      onDelete={() => askDelete(m.id, m.name)}
                      onToggleAdmin={() => askToggleAdmin(m.id, m.name, m.isAdmin)}
                      onEdit={() => setEditMember(m)}
                      onAttendance={() => setAttMember(m)}
                      onDailyPass={() => setPassMember(m)}
                      t={t} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && flatAssigned && (
        <PortalModal>
          <div onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }} className="hh-overlay">
            <div className="bg-card animate-scaleIn hh-add-box">
              <ModalContent activeTab={activeTab} formData={formData}
                setFormData={setFormData} handleAdd={handleAdd}
                setShowModal={closeAddModal} t={t}
                flats={flats} flatId={pendingFlatId}
                onFlatChange={setPendingFlatId} />
            </div>
          </div>
        </PortalModal>
      )}

      {/* ── EDIT MODAL ── */}
      {editMember && (
        <EditModal member={editMember} onClose={() => setEditMember(null)}
          onSaved={handleMemberSaved} t={t} />
      )}

      {/* ── ATTENDANCE MODAL ── */}
      {attMember && (
        <AttendanceModal member={attMember} onClose={() => setAttMember(null)} t={t} />
      )}

      {/* ── DAILY PASS MODAL ── */}
      {passMember && (
        <DailyPassModal member={passMember} flats={flats} defaultFlatId={pendingFlatId}
          onClose={() => setPassMember(null)} t={t} societyName={user?.society_name} />
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirm && (
        <ConfirmModal
          message={confirm.message} subtext={confirm.subtext}
          danger={confirm.type === "delete"}
          confirmLabel={
            confirm.type === "delete"
              ? t("hhRemoveBtn")
              : confirm.isAdmin ? t("hhRevokeBtn") : t("hhGrantBtn")
          }
          onConfirm={handleConfirm}
          onCancel={() => { setConfirm(null); setConfirmError(null); }}
          errorMsg={confirmError}
          t={t}
        />
      )}

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); setShowModal(false); }}
      />
    </>
  );
}

/* ── MEMBER ROW ── */
function MemberRow({ member, isFamily, onDelete, onToggleAdmin, onEdit, onAttendance, onDailyPass, t }) {
  const initial = member.name?.charAt(0).toUpperCase();
  return (
    <div className="ra-booking-row hh-member-row">
      <div className="ra-booking-left">
        <div className={`hh-avatar ${isFamily ? "hh-avatar--family" : "hh-avatar--help"}`}>
          {initial}
        </div>
        <div>
          <div className="hh-name-row">
            <span className="ra-booking-name" style={{ margin: 0 }}>{member.name}</span>
            {isFamily && member.isAdmin && (
              <span className="hh-admin-badge">
                <MdAdminPanelSettings size={9} /> {t("hhAdminBadge")}
              </span>
            )}
          </div>
          <div className="hh-meta-row">
            <span className="ra-booking-date">{isFamily ? member.relation : member.work}</span>
            {member.phone && (
              <span className="ra-booking-date hh-meta-item">
                <MdPhone size={10} className="hh-meta-icon" /> {member.phone}
              </span>
            )}
            {member.email && (
              <span className="ra-booking-date hh-meta-item">
                <MdEmail size={10} className="hh-meta-icon" /> {member.email}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="ra-booking-right" style={{ gap: "6px" }}>
        {isFamily && <AdminToggle checked={!!member.isAdmin} onChange={onToggleAdmin} />}
        {!isFamily && member.phone && (
          <button type="button" onClick={onDailyPass} className="hh-icon-btn hh-icon-btn--daily" title={t("hhPassBtn", "Daily Gate Pass")}>
            <MdRepeat size={14} />
          </button>
        )}
        {!isFamily && member.phone && (
          <button type="button" onClick={onAttendance} className="hh-icon-btn hh-icon-btn--att" title={t("hhViewAttendance", "View attendance")}>
            <MdCalendarToday size={14} />
          </button>
        )}
        <button type="button" onClick={onEdit} className="hh-icon-btn hh-icon-btn--edit" title={t("hhEditMember")}>
          <MdEdit size={14} />
        </button>
        <button type="button" onClick={onDelete} className="hh-icon-btn hh-icon-btn--delete" title={t("hhRemoveMember")}>
          <MdDelete size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── MODAL CONTENT ── */
function ModalContent({ activeTab, formData, setFormData, handleAdd, setShowModal, t, flats = [], flatId, onFlatChange }) {
  const isFamily = activeTab === "family";
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customRelation, setCustomRelation] = useState("");
  const [customWork, setCustomWork] = useState("");
  const showFlatPicker = flats.length > 1;

  const pickRelation = (key) => {
    setFormData((prev) => ({ ...prev, relation: key === "other" ? "Other" : tKey(t, "hhRel", key) }));
  };

  const pickWork = (key) => {
    setFormData((prev) => ({ ...prev, work: WORK_STORED[key] }));
  };

  /* Family:  name + relation quick-picks + custom relation + optional phone/email (mirrors AddFamilyScreen).
     Daily help: name + role quick-picks + custom role + required phone, no email (mirrors AddHelpsScreen). */
  const onSubmit = async (e) => {
    e.preventDefault();
    const nameErr = getTitleError(formData.name, "Name");
    if (nameErr) { setError(nameErr); return; }

    if (isFamily) {
      const finalRelation = formData.relation === "Other" ? customRelation.trim() : (formData.relation || "").trim();
      if (!finalRelation) { setError(t("hhRelationRequired")); return; }
      if (formData.phone.trim() && getMobileError(formData.phone.trim(), "Phone number")) {
        setError(getMobileError(formData.phone.trim(), "Phone number")); return;
      }
      if (formData.email.trim() && getEmailError(formData.email.trim())) {
        setError(getEmailError(formData.email.trim())); return;
      }
      setError(null);
      setSaving(true);
      try {
        await handleAdd({
          name: formData.name.trim(),
          relation: finalRelation,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          work: null,
          isAdmin: false,
          flat_id: flatId ? String(flatId) : undefined,
        });
      } catch (err) { setError(err.message); setSaving(false); }
      return;
    }

    const effectiveWork = formData.work === "Other" ? customWork.trim() : (formData.work || "").trim();
    const phoneErr = getMobileError(formData.phone, "Phone number");
    if (!effectiveWork) { setError(t("hhRoleRequired")); return; }
    if (phoneErr) { setError(phoneErr); return; }
    setError(null);
    setSaving(true);
    try {
      await handleAdd({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        relation: "Daily Help",
        work: effectiveWork,
        email: null,
        isAdmin: false,
        flat_id: flatId ? String(flatId) : undefined,
      });
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <>
      <div className="hh-edit-er">
        <div className="hh-edit-er-left">
          <div className="hh-edit-er-icon">
            {isFamily
              ? <MdFamilyRestroom size={16} className="hh-icon-admin" />
              : <MdWork size={16} className="hh-icon-admin" />}
          </div>
          <div>
            <p className="hh-edit-title">
              {isFamily ? t("hhAddFamilyTitle") : t("hhAddHelperTitle")}
            </p>
            <p className="hh-edit-sub">{t("hhFormSub")}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowModal(false)} className="hh-close-btn">
          <MdClose size={14} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="hh-form">
        {error && (
          <div className="hh-error-box" style={{ marginBottom: "0.75rem" }}>
            <span style={{ flexShrink: 0 }}>⚠️</span> {error}
          </div>
        )}

        <FieldLabel icon={<MdPerson size={11} />} label={t("hhFieldName")} />
        <input className="input" placeholder={t("hhFieldNamePlaceholder")}
          value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />

        {showFlatPicker && (
          <>
            <FieldLabel icon={<MdWork size={11} />} label={t("hhFieldSelectFlat")} />
            <div className="hh-pill-grid">
              {flats.map((f) => {
                const label = [f.block_name, f.flat_number].filter(Boolean).join(" ");
                const selected = String(flatId) === String(f.flat_id);
                return (
                  <button type="button" key={f.flat_id}
                    className={`hh-pill ${selected ? "hh-pill--selected" : ""}`}
                    onClick={() => { onFlatChange(String(f.flat_id)); }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {isFamily && (
          <>
            <FieldLabel icon={<MdFamilyRestroom size={11} />} label={t("hhFieldSelectRelation")} />
            <div className="hh-pill-grid">
              {RELATION_KEYS.map((key) => {
                const label = tKey(t, "hhRel", key);
                const selected = formData.relation === label || (key === "other" && formData.relation === "Other");
                return (
                  <button type="button" key={key}
                    className={`hh-pill ${selected ? "hh-pill--selected" : ""}`}
                    onClick={() => pickRelation(key)}>
                    {label}
                  </button>
                );
              })}
            </div>
            {formData.relation === "Other" && (
              <input className="input" placeholder={t("hhFieldSpecifyRelationPlaceholder")}
                value={customRelation}
                onChange={(e) => setCustomRelation(e.target.value)}
                required />
            )}
          </>
        )}

        {!isFamily && (
          <>
            <FieldLabel icon={<MdWork size={11} />} label={t("hhRoleTitle")} />
            <p className="hh-role-sub">{t("hhRoleSubtitle")}</p>
            <div className="hh-pill-grid">
              {WORK_KEYS.map((key) => {
                const label = tKey(t, "hhRole", key);
                const selected = formData.work === WORK_STORED[key];
                return (
                  <button type="button" key={key}
                    className={`hh-pill ${selected ? "hh-pill--selected" : ""}`}
                    onClick={() => pickWork(key)}>
                    {label}
                  </button>
                );
              })}
            </div>
            {formData.work === "Other" && (
              <input className="input" placeholder={t("hhFieldCustomRolePlaceholder")}
                value={customWork}
                onChange={(e) => setCustomWork(e.target.value)}
                required />
            )}
          </>
        )}

        <FieldLabel icon={<MdPhone size={11} />} label={isFamily ? t("hhFieldPhoneOptional") : t("hhFieldMobile")} />
        <input className="input" placeholder="+91 98765 43210" maxLength={10}
          value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />

        {isFamily && (
          <>
            <FieldLabel icon={<MdEmail size={11} />} label={t("hhFieldEmail")} />
            <input className="input" type="email" placeholder="example@email.com"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </>
        )}

        <button type="submit" disabled={saving} className="btn-primary hh-save-btn">
          {isFamily ? <MdFamilyRestroom size={16} /> : <MdWork size={16} />}
          {isFamily ? t("hhAddFamilyTitle") : t("hhAddHelperTitle")}
        </button>
      </form>
    </>
  );
}

/* ── FIELD LABEL ── */
function FieldLabel({ icon, label }) {
  return (
    <label className="hh-field-label">
      <span className="hh-field-label-icon">{icon}</span>
      {label}
    </label>
  );
}