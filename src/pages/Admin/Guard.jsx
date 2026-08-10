import { useEffect, useState, useContext, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdDelete, MdPerson, MdEmail,
  MdVisibility, MdVisibilityOff,
  MdSecurity, MdSchedule, MdCalendarToday,
  MdWbSunny, MdNightsStay, MdBrightness5, MdEdit,
} from "react-icons/md";
import Select from "../../components/common/Select";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

function ShiftBadge({ type, t }) {
  const SHIFT_CFG = {
    MORNING:   { label: t("guardShiftMorning"),   icon: <MdWbSunny size={11} />,     color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    AFTERNOON: { label: t("guardShiftAfternoon"), icon: <MdBrightness5 size={11} />, color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
    NIGHT:     { label: t("guardShiftNight"),     icon: <MdNightsStay size={11} />,  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  };
  const cfg = SHIFT_CFG[type];
  if (!cfg) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function Avatar({ name, size = 34 }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "G";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, var(--accent-color,#6366f1), #8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, color: "#fff",
      boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
    }}>
      {initials}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 5,
    }}>
      {children}
    </p>
  );
}

const MODAL_STYLE = `
  @keyframes modalPop {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
`;

export default function Guard() {
  const isMobile = useIsMobile();
  const { t }    = useLang();
  const { user } = useContext(AuthContext);
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  const [showForm,      setShowForm]      = useState(false);
  const [guards,        setGuards]        = useState([]);
  const [showPassword,  setShowPassword]  = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [guardShifts,   setGuardShifts]   = useState({});
  const [shiftForm,     setShiftForm]     = useState({ shift_type: "", start_date: "", end_date: "" });
  const [formData,      setFormData]      = useState({ name: "", email: "", password: "", society_id: "" });
  const [editingId,     setEditingId]     = useState(null);

  // --- SUPER ADMIN FILTER ---
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter");
    return (saved === "ALL" || !saved) ? "" : saved;
  });

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then(res => setSocietiesList(res.data || []))
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  useEffect(() => { loadGuards(); }, [filterSocietyId]);

  const loadGuards = async () => {
    try {
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
      const res  = await API.get("/users/guard", { headers });
      const list = res.data || [];
      setGuards(list);
      loadGuardShifts(list);
    } catch (e) { console.error(e); }
  };

  const loadGuardShifts = async (list) => {
    try {
      const map = {};
      for (const g of list) {
        try {
          const headers = isSuperAdmin ? { "x-society-id": g.society_id } : {};
          const r = await API.get(`/guard-shift/${g.id}`, { headers });
          if (r.data) map[g.id] = r.data;
        } catch {}
      }
      setGuardShifts(map);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const activeSocId = isSuperAdmin ? (formData.society_id || filterSocietyId) : user?.society_id;
      if (!activeSocId && isSuperAdmin) {
        alert("Please select a society");
        return;
      }

      const headers = isSuperAdmin ? { "x-society-id": activeSocId } : {};

      if (editingId) {
        await API.put(`/users/guard/${editingId}`, formData, { headers });
      } else {
        await API.post("/users/guard", formData, { headers });
      }

      setFormData({ name: "", email: "", password: "", society_id: "" });
      setShowPassword(false);
      setShowForm(false);
      setEditingId(null);
      loadGuards();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (g) => {
    setFormData({ name: g.name, email: g.email, password: "", society_id: g.society_id || "" });
    setEditingId(g.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, socId) => {
    if (!window.confirm(t("guardDeleteConfirm"))) return;
    const headers = isSuperAdmin ? { "x-society-id": socId || filterSocietyId } : {};
    await API.delete(`/users/guard/${id}`, { headers });
    loadGuards();
  };

  const openShiftModal = (guard) => {
    setSelectedGuard(guard);
    const s = guardShifts[guard.id];
    setShiftForm(
      s
        ? { shift_type: s.shift_type || "", start_date: s.start_date || "", end_date: s.end_date || "" }
        : { shift_type: "", start_date: "", end_date: "" }
    );
    setShowShiftForm(true);
  };

  /* Always POST — backend upserts (one row per guard) */
  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = isSuperAdmin ? { "x-society-id": selectedGuard?.society_id } : {};
      await API.post("/guard-shift", {
        guard_id: selectedGuard.id,
        ...shiftForm,
      }, { headers });
      setShowShiftForm(false);
      loadGuards();
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <style>{MODAL_STYLE}</style>

      <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="er-icon er-icon--complaint" style={{
              background: "linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.18))",
              border: "1.5px solid rgba(99,102,241,.3)",
            }}>
              <MdSecurity size={20} style={{ color: "#818cf8" }} />
            </div>
            <div>
              <h2 className="page-title">{t("guardTitle")}</h2>
              <p className="page-subtitle">{guards.length} {t("guardRegistered")}</p>
            </div>
          </div>
          {(!isSuperAdmin || filterSocietyId) && (guards.length < 5) && (
            <button
              onClick={() => {
                if (!showForm) {
                  setFormData({ name: "", email: "", password: "", society_id: filterSocietyId || "" });
                  setEditingId(null);
                }
                setShowForm(p => !p);
              }}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <MdAdd size={16} /> {editingId ? "Edit Guard" : t("guardAddBtn")}
            </button>
          )}
        </div>

        {/* ── ADD GUARD FORM ── */}
        {showForm && (
          <div className="bill-form-card animate-fadeIn" style={{ boxSizing: "border-box", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <MdPerson size={16} style={{ color: "var(--accent-color,#6366f1)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {editingId ? "Update Security Guard" : t("guardFormTitle")}
              </span>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {isSuperAdmin && (
                <div>
                  <SectionLabel>Society</SectionLabel>
                  <Select
                    className="input"
                    value={formData.society_id}
                    onChange={e => setFormData({ ...formData, society_id: e.target.value })}
                    required
                    style={{ width: "100%", boxSizing: "border-box", height: 40 }}
                  >
                    <option value="">Select Society</option>
                    {societiesList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <SectionLabel>{t("guardName")}</SectionLabel>
                <div style={{ position: "relative" }}>
                  <MdPerson size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    placeholder={t("guardNamePlaceholder")}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="input"
                    style={{ width: "100%", boxSizing: "border-box", paddingLeft: 34 }}
                  />
                </div>
              </div>
              <div>
                <SectionLabel>{t("guardEmail")}</SectionLabel>
                <div style={{ position: "relative" }}>
                  <MdEmail size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="email"
                    placeholder={t("guardEmailPlaceholder")}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="input"
                    style={{ width: "100%", boxSizing: "border-box", paddingLeft: 34 }}
                  />
                </div>
              </div>
              <div>
                <SectionLabel>{t("guardPassword")}</SectionLabel>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("guardPassword")}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required={!editingId}
                    className="input"
                    style={{ width: "100%", boxSizing: "border-box", paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-secondary)", display: "flex", alignItems: "center",
                    }}
                  >
                    {showPassword ? <MdVisibilityOff size={17} /> : <MdVisibility size={17} />}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, whiteSpace: "nowrap" }}>
                  {editingId ? "Update Guard" : t("guardCreateBtn")}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-muted" style={{ flex: 1, whiteSpace: "nowrap" }}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── GUARD LIST ── */}
        <div
          className="data-table-wrap"
          style={isMobile ? {
            marginLeft:  "calc(-1 * var(--page-padding, 16px))",
            marginRight: "calc(-1 * var(--page-padding, 16px))",
            width:       "calc(100% + 2 * var(--page-padding, 16px))",
            borderRadius: 0, boxSizing: "border-box", overflowX: "hidden",
          } : { boxSizing: "border-box", overflowX: "hidden" }}
        >
          {/* Toolbar */}
          <div style={{
            padding: "16px", borderBottom: "1px solid var(--divider)",
            background: "var(--card-inner-bg)", display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: guards.length > 0 ? "#22c55e" : "#475569",
                  boxShadow: guards.length > 0 ? "0 0 6px rgba(34,197,94,0.7)" : "none",
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("guardAllGuards")}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.6, marginLeft: 4 }}>
                  ({guards.length})
                </span>
              </div>
              
              {!isSuperAdmin && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                  background: "rgba(99,102,241,0.1)", color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.2)", whiteSpace: "nowrap",
                }}>
                  {guards.length} / 5 {t("guardSlots")}
                </span>
              )}
            </div>

            {isSuperAdmin && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Select className="input" style={{ width: 160, height: 36, fontSize: 12 }}
                  value={filterSocietyId} onChange={(e) => setFilterSocietyId(e.target.value)}>
                  <option value="">— All Societies —</option>
                  {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>
                  Filter by society
                </span>
              </div>
            )}
          </div>

          {guards.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}>
              <MdSecurity size={44} style={{ opacity: 0.15 }} />
              <p style={{ fontSize: 13 }}>{t("guardEmpty")}</p>
            </div>

          ) : isMobile ? (

            /* ── MOBILE CARDS ── */
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {guards.map((g, i) => {
                const shift = guardShifts[g.id];
                return (
                  <div
                    key={g.id}
                    className="animate-fadeIn"
                    style={{
                      animationDelay: `${i * 50}ms`,
                      background: "var(--chip-bg,rgba(255,255,255,0.04))",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 12, overflow: "hidden", boxSizing: "border-box",
                    }}
                  >
                    <div style={{ height: 3, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                    <div style={{ padding: "11px 12px", boxSizing: "border-box" }}>

                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: shift ? 7 : 10, minWidth: 0 }}>
                        <Avatar name={g.name} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {g.name}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {g.email}
                          </p>
                        </div>
                        {shift
                          ? <ShiftBadge type={shift.shift_type} t={t} />
                          : <span style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.5, whiteSpace: "nowrap", flexShrink: 0 }}>{t("guardNoShift")}</span>
                        }
                      </div>

                      {shift && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)", marginBottom: 10 }}>
                          <MdCalendarToday size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                          <span style={{ whiteSpace: "nowrap" }}>{shift.start_date} → {shift.end_date}</span>
                        </div>
                      )}

                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleEdit(g)}
                            className="action-btn-inprogress"
                            style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}
                          >
                            <MdEdit size={13} /> Edit
                          </button>
                          <button
                            onClick={() => openShiftModal(g)}
                            className="btn-primary"
                            style={{ flex: 1, minWidth: 0, padding: "8px 10px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}
                          >
                            {shift
                              ? <><MdEdit size={13} /> Shift</>
                              : <><MdSchedule size={13} /> {t("guardSchedule")}</>
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(g.id, g.society_id)}
                            className="btn-danger"
                            style={{ flexShrink: 0, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: 10 }}
                          >
                            <MdDelete size={15} />
                          </button>
                        </div>

                    </div>
                  </div>
                );
              })}
            </div>

          ) : (

            /* ── DESKTOP TABLE ── */
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    {[t("guardColGuard"), t("guardColEmail"), t("guardColShift"), t("guardColSchedule"), t("billActionCol")].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guards.map((g, i) => {
                    const shift = guardShifts[g.id];
                    return (
                      <tr key={g.id} className="animate-fadeIn" style={{ animationDelay: `${i * 40}ms` }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={g.name} size={36} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{g.name}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <MdEmail size={13} style={{ color: "var(--text-secondary)", opacity: 0.6, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{g.email}</span>
                          </div>
                        </td>
                        <td>
                          {shift
                            ? <ShiftBadge type={shift.shift_type} t={t} />
                            : <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.5 }}>—</span>
                          }
                        </td>
                        <td>
                          {shift ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
                              <MdCalendarToday size={11} style={{ opacity: 0.6 }} />
                              {shift.start_date} → {shift.end_date}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", opacity: 0.5 }}>
                              {t("guardNotScheduled")}
                            </span>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={() => handleEdit(g)}
                              className="action-btn-inprogress"
                              style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                              title="Edit Details"
                            >
                              <MdEdit size={14} />
                            </button>
                            <button
                              onClick={() => openShiftModal(g)}
                              className="btn-primary"
                              style={{ width: "auto", padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                            >
                              {shift
                                ? <><MdEdit size={13} /> {t("guardEditShift")}</>
                                : <><MdSchedule size={13} /> {t("guardSchedule")}</>
                              }
                            </button>
                            <button
                              onClick={() => handleDelete(g.id, g.society_id)}
                              className="btn-danger"
                              style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                            >
                              <MdDelete size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="table-footer">
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{guards.length}</strong> {t("guardSlotsUsed")}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── SHIFT MODAL ── */}
      {showShiftForm && (
        <>
          <div
            onClick={() => setShowShiftForm(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            }}
          />
          <div
            onClick={e => e.stopPropagation()}
            className="bill-form-card"
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 51,
              width: "min(420px, 92vw)",
              boxSizing: "border-box",
              animation: "modalPop 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                <Avatar name={selectedGuard?.name} size={36} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {t("guardManageShift")}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedGuard?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftForm(false)}
                style={{
                  flexShrink: 0, marginLeft: 10,
                  background: "var(--chip-bg)", border: "1px solid var(--glass-border)",
                  borderRadius: 8, width: 30, height: 30, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-secondary)", fontSize: 14,
                }}
              >✕</button>
            </div>

            <form onSubmit={handleShiftSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div>
                <SectionLabel>{t("guardShiftType")}</SectionLabel>
                <Select
                  className="input"
                  required
                  value={shiftForm.shift_type}
                  style={{ width: "100%", boxSizing: "border-box" }}
                  onChange={e => setShiftForm({ ...shiftForm, shift_type: e.target.value })}
                >
                  <option value="">{t("guardSelectShift")}</option>
                  <option value="MORNING">🌅 {t("guardShiftMorning")}</option>
                  <option value="AFTERNOON">☀️ {t("guardShiftAfternoon")}</option>
                  <option value="NIGHT">🌙 {t("guardShiftNight")}</option>
                </Select>
              </div>
              <div>
                <SectionLabel>{t("guardStartDate")}</SectionLabel>
                <input
                  type="date"
                  className="input"
                  required
                  value={shiftForm.start_date}
                  style={{ width: "100%", boxSizing: "border-box" }}
                  onChange={e => setShiftForm({ ...shiftForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <SectionLabel>{t("guardEndDate")}</SectionLabel>
                <input
                  type="date"
                  className="input"
                  required
                  value={shiftForm.end_date}
                  style={{ width: "100%", boxSizing: "border-box" }}
                  onChange={e => setShiftForm({ ...shiftForm, end_date: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, whiteSpace: "nowrap" }}>
                  {t("guardSaveSchedule")}
                </button>
                <button type="button" onClick={() => setShowShiftForm(false)} className="btn-muted" style={{ flex: 1, whiteSpace: "nowrap" }}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}