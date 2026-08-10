
import { useEffect, useState, useContext } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdEdit, MdPerson, MdEmail, MdBadge,
  MdCheck, MdClose, MdAccountBalance, MdPhone,
  MdFilterList, MdApartment, MdDelete
} from "react-icons/md";
import Select from "../../components/common/Select";

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
      textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6,
    }}>
      {children}
    </p>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 12,
      background: "var(--chip-bg, rgba(99,102,241,0.04))",
      border: "1px solid var(--glass-border)",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
        border: "1px solid rgba(99,102,241,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#818cf8",
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 2,
        }}>
          {label}
        </p>
        <p style={{
          fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Indian phone validator ── */
const isValidIndianPhone = (val) => /^[6-9]\d{9}$/.test(val.replace(/\s/g, ""));

/* ── Phone input with +91 prefix ── */
function PhoneInput({ value, onChange, required = false, disabled = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      border: "1px solid var(--glass-border)",
      borderRadius: 10, overflow: "hidden",
      background: disabled ? "rgba(255,255,255,0.02)" : "var(--input-bg, rgba(255,255,255,0.05))",
      opacity: disabled ? 0.5 : 1,
    }}>
      {/* +91 badge */}
      <div style={{
        padding: "0 12px", height: 40,
        display: "flex", alignItems: "center", gap: 6,
        borderRight: "1px solid var(--glass-border)",
        background: "rgba(99,102,241,0.08)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13 }}>🇮🇳</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>+91</span>
      </div>

      <input
        className="input"
        type="tel"
        placeholder="98765 43210"
        value={value}
        maxLength={10}
        required={required}
        disabled={disabled}
        onChange={(e) => {
          // Only allow digits
          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
          onChange(digits);
        }}
        style={{
          flex: 1, border: "none", borderRadius: 0,
          background: "transparent", height: 40,
          outline: "none", paddingLeft: 12,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />

      {/* Live digit counter */}
      <span style={{
        paddingRight: 10, fontSize: 11,
        color: value.length === 10
          ? (isValidIndianPhone(value) ? "#22c55e" : "#f87171")
          : "var(--text-secondary)",
        fontWeight: 600, flexShrink: 0,
      }}>
        {value.length}/10
      </span>
    </div>
  );
}

export default function Accountant() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const activeRole = user?.activeRole || user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  const [accountant,     setAccountant]     = useState(null);
  const [accountants,    setAccountants]    = useState([]); // For Super Admin
  const [loading,        setLoading]        = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode,       setEditMode]       = useState(false);
  const [phoneError,     setPhoneError]     = useState("");
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", phone: "", society_id: "",
  });

  const [societiesList,   setSocietiesList]   = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(
    isSuperAdmin ? (localStorage.getItem("superadmin_society_filter") || "ALL") : ""
  );

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies").then(res => setSocietiesList(res.data || [])).catch(console.error);
    }
  }, [isSuperAdmin]);

  useEffect(() => { loadAccountant(); }, [filterSocietyId]);

  const loadAccountant = async () => {
    try {
      setLoading(true);
      const isNoFilter = !filterSocietyId || filterSocietyId === "ALL";
      const params = (isSuperAdmin && !isNoFilter) ? `?society_id=${filterSocietyId}` : "";
      const res = await API.get(`/users/accountant${params}`);
      
      if (isSuperAdmin && isNoFilter) {
        const data = Array.isArray(res.data) ? res.data : [];
        setAccountants(data);
        setAccountant(null);
      } else {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setAccountant(data || null);
        if (data) {
          setFormData({
            name: data.name,
            email: data.email,
            password: "",
            phone: data.phone || "",
            society_id: data.society_id || "",
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setPhoneError("");

    if (!isValidIndianPhone(formData.phone)) {
      setPhoneError(t("acctPhoneError") || "Enter a valid 10-digit Indian mobile number (starts with 6–9).");
      return;
    }

    try {
      await API.post("/users/accountant", formData);
      setShowCreateForm(false);
      setFormData({ name: "", email: "", password: "", phone: "", society_id: "" });
      loadAccountant();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setPhoneError("");

    if (formData.phone && !isValidIndianPhone(formData.phone)) {
      setPhoneError(t("acctPhoneError") || "Enter a valid 10-digit Indian mobile number (starts with 6–9).");
      return;
    }

    try {
      await API.put("/users/accountant", {
        name:  formData.name,
        phone: formData.phone || undefined,
        society_id: accountant?.society_id,
      });
      setEditMode(false);
      loadAccountant();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this accountant account? This action cannot be undone.")) return;
    try {
      const sid = isSuperAdmin && filterSocietyId && filterSocietyId !== "ALL" 
        ? filterSocietyId 
        : (accountant?.society_id || "");
      await API.delete(`/users/accountant?society_id=${sid}`);
      setAccountant(null);
      setEditMode(false);
      loadAccountant();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSpecific = async (acc) => {
    if (!window.confirm(`Are you sure you want to delete accountant ${acc.name}?`)) return;
    try {
      await API.delete(`/users/accountant?society_id=${acc.society_id}`);
      loadAccountant();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="page-root">
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", fontSize: 13 }}>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
            <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {t("acctLoading")}
        </div>
      </div>
    );
  }

  return (
    <div className="page-root animate-fadeIn">

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="er-icon er-icon--complaint" style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.18))",
            border: "1.5px solid rgba(99,102,241,0.3)",
          }}>
            <MdAccountBalance size={22} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <h2 className="page-title">{t("acctTitle")}</h2>
            <p className="page-subtitle">
              {isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL")
                ? `${accountants.length} accountants registered across societies`
                : (accountant ? t("acctRegistered") : t("acctNone"))}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 10, border: "1px solid var(--glass-border)" }}>
              <MdFilterList size={16} style={{ color: "var(--text-secondary)" }} />
              <Select
                style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}
                value={filterSocietyId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterSocietyId(val);
                  if (isSuperAdmin) localStorage.setItem("superadmin_society_filter", val);
                }}
              >
                <option value="ALL" style={{ background: "#1e1e2e" }}>All Societies</option>
                {societiesList.map(s => (
                  <option key={s.id} value={s.id} style={{ background: "#1e1e2e" }}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {!accountant && (
            <button
              onClick={() => {
                const sid = (filterSocietyId === "ALL" ? "" : filterSocietyId);
                setFormData(p => ({ ...p, society_id: sid }));
                setShowCreateForm((p) => !p);
              }}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <MdAdd size={18} /> {t("acctAddBtn")}
            </button>
          )}
        </div>
      </div>

      {/* ── CREATE FORM ── */}
      {!accountant && showCreateForm && (
        <div className="bill-form-card animate-fadeIn" style={{ maxWidth: 440, width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <MdPerson size={18} style={{ color: "#818cf8" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              {t("acctCreateTitle")}
            </span>
          </div>

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Society Selector for Super Admin */}
            {isSuperAdmin && (
              <div>
                <SectionLabel>Society</SectionLabel>
                <div style={{ position: "relative" }}>
                  <MdApartment size={15} style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)", color: "var(--text-secondary)",
                  }} />
                  <Select
                    className="input"
                    value={formData.society_id}
                    required
                    onChange={(e) => setFormData({ ...formData, society_id: e.target.value })}
                    style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36 }}
                  >
                    <option value="">Select Society</option>
                    {societiesList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <SectionLabel>{t("acctName")}</SectionLabel>
              <div style={{ position: "relative" }}>
                <MdPerson size={15} style={{
                  position: "absolute", left: 12, top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-secondary)",
                }} />
                <input
                  className="input" type="text" placeholder={t("acctNamePlaceholder")}
                  value={formData.name} required
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <SectionLabel>{t("acctEmail")}</SectionLabel>
              <div style={{ position: "relative" }}>
                <MdEmail size={15} style={{
                  position: "absolute", left: 12, top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-secondary)",
                }} />
                <input
                  className="input" type="email" placeholder={t("acctEmailPlaceholder")}
                  value={formData.email} required
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <SectionLabel>{t("acctMobile") || "Mobile Number"}</SectionLabel>
              <PhoneInput
                value={formData.phone}
                onChange={(val) => {
                  setFormData({ ...formData, phone: val });
                  setPhoneError("");
                }}
                required
              />
              {phoneError && (
                <p style={{ fontSize: 11, color: "#f87171", marginTop: 5, paddingLeft: 2 }}>
                  {phoneError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <SectionLabel>{t("acctPassword")}</SectionLabel>
              <input
                className="input" type="password" placeholder={t("acctPassword")}
                value={formData.password} required
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, opacity: 0.7, paddingLeft: 2 }}>
                This password will be emailed to the accountant along with login instructions.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                {t("acctCreate")}
              </button>
              <button type="button" onClick={() => {
                setShowCreateForm(false);
                setFormData({ name: "", email: "", password: "", phone: "", society_id: "" });
              }} className="btn-muted" style={{ flex: 1 }}>
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SUPER ADMIN LIST VIEW ── */}
      {isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL") && (
        <div className="data-table-wrap animate-fadeIn">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>#</th>
                  <th style={{ padding: "12px 16px" }}>Accountant</th>
                  <th style={{ padding: "12px 16px" }}>Society</th>
                  <th style={{ padding: "12px 16px" }}>Contact</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountants.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                      No accountants found.
                    </td>
                  </tr>
                ) : (
                  accountants.map((acc, idx) => (
                    <tr key={acc.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} className="hover:bg-white/3">
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{idx + 1}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800, color: "#fff"
                          }}>
                            {acc.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{acc.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{acc.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <MdApartment size={14} style={{ color: "#818cf8" }} />
                          {acc.societyName}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {acc.phone ? `+91 ${acc.phone}` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                          background: "rgba(34,197,94,0.12)", color: "#4ade80",
                          border: "1px solid rgba(34,197,94,0.2)"
                        }}>
                          Active
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={() => {
                              setAccountant(acc);
                              setEditMode(true);
                              setFormData({
                                name: acc.name,
                                email: acc.email,
                                password: "",
                                phone: acc.phone || "",
                                society_id: acc.society_id || "",
                              });
                            }}
                            className="action-btn-inprogress"
                            style={{ width: "auto", padding: "6px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <MdEdit size={14} /> {t("acctEdit")}
                          </button>
                          <button
                            onClick={() => handleDeleteSpecific(acc)}
                            className="action-btn-danger"
                            style={{ width: "auto", padding: "6px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 6, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
                          >
                            <MdDelete size={14} /> {t("delete") || "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW / EDIT CARD (Admin or Filtered) ── */}
      {accountant && (
        <div className="data-table-wrap animate-fadeIn" style={{ maxWidth: 480, width: "100%", boxSizing: "border-box" }}>

          {/* Card header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 800, color: "#fff",
                boxShadow: "0 2px 10px rgba(99,102,241,0.35)",
              }}>
                {accountant.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                  {accountant.name}
                </p>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                  background: "rgba(99,102,241,0.12)", color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.25)", marginTop: 3,
                }}>
                  <MdBadge size={11} /> {t("acctRole").toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!editMode && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setEditMode(true)}
                    className="action-btn-inprogress"
                    style={{ width: "auto", padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <MdEdit size={14} /> {t("acctEdit")}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="action-btn-danger"
                    style={{ width: "auto", padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
                  >
                    <MdDelete size={14} /> {t("delete") || "Delete"}
                  </button>
                </div>
              )}
              {isSuperAdmin && filterSocietyId && filterSocietyId !== "ALL" && (
                <button
                  onClick={() => {
                    setAccountant(null);
                    setFilterSocietyId("ALL");
                    localStorage.setItem("superadmin_society_filter", "ALL");
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", cursor: "pointer"
                  }}
                  title="Close"
                >
                  <MdClose size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {!editMode ? (
              /* ── VIEW MODE ── */
              <>
                <InfoRow icon={<MdPerson size={16} />} label={t("acctName")}      value={accountant.name} />
                <InfoRow icon={<MdEmail  size={16} />} label={t("acctEmail")}     value={accountant.email} />
                <InfoRow
                  icon={<MdPhone size={16} />}
                  label={t("acctMobileShort") || "Mobile"}
                  value={accountant.phone ? `+91 ${accountant.phone}` : "Not set"}
                />
                <InfoRow icon={<MdBadge size={16} />} label={t("acctRoleLabel")} value={t("acctRole")} />
              </>
            ) : (
              /* ── EDIT MODE ── */
              <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Name */}
                <div>
                  <SectionLabel>{t("acctName")}</SectionLabel>
                  <div style={{ position: "relative" }}>
                    <MdPerson size={15} style={{
                      position: "absolute", left: 12, top: "50%",
                      transform: "translateY(-50%)", color: "var(--text-secondary)",
                    }} />
                    <input
                      className="input" type="text" placeholder={t("acctNamePlaceholder")}
                      value={formData.name} required
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36 }}
                    />
                  </div>
                </div>

                {/* Email — locked */}
                <div>
                  <SectionLabel>{t("acctEmail")}</SectionLabel>
                  <div style={{ position: "relative" }}>
                    <MdEmail size={15} style={{
                      position: "absolute", left: 12, top: "50%",
                      transform: "translateY(-50%)", color: "var(--text-secondary)", opacity: 0.5,
                    }} />
                    <input
                      className="input" type="email" value={accountant.email} disabled
                      style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, opacity: 0.5, cursor: "not-allowed" }}
                    />
                    <span style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                      color: "var(--text-secondary)", opacity: 0.6,
                    }}>
                      {t("acctLocked")}
                    </span>
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.6, marginTop: 4, paddingLeft: 2 }}>
                    {t("acctEmailLockNote")}
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <SectionLabel>{t("acctMobile") || "Mobile Number"}</SectionLabel>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => {
                      setFormData({ ...formData, phone: val });
                      setPhoneError("");
                    }}
                  />
                  {phoneError && (
                    <p style={{ fontSize: 11, color: "#f87171", marginTop: 5, paddingLeft: 2 }}>
                      {phoneError}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button type="submit" className="btn-primary"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <MdCheck size={15} /> {t("acctUpdate")}
                  </button>
                  <button type="button" className="btn-muted"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => {
                      setEditMode(false);
                      setPhoneError("");
                      setFormData({ name: accountant.name, email: accountant.email, password: "", phone: accountant.phone || "", society_id: accountant.society_id || "" });
                    }}>
                    <MdClose size={15} /> {t("cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}