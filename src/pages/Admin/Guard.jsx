import { useEffect, useState, useContext, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdDelete, MdPerson, MdEmail,
  MdVisibility, MdVisibilityOff,
  MdSecurity, MdSchedule, MdCalendarToday,
  MdWbSunny, MdNightsStay, MdBrightness5, MdEdit, MdApartment,
} from "react-icons/md";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getEmailError } from "../../utils/validators";
import { useCustomAlert } from "../../context/CustomAlertContext";

function ShiftBadge({ type, t }) {
  const SHIFT_CFG = {
    MORNING:   { label: t("guardShiftMorning") || "Morning",   icon: MdWbSunny,     variant: "info" },
    AFTERNOON: { label: t("guardShiftAfternoon") || "Afternoon", icon: MdBrightness5, variant: "warning" },
    NIGHT:     { label: t("guardShiftNight") || "Night",     icon: MdNightsStay,  variant: "neutral" },
  };
  const cfg = SHIFT_CFG[type] || SHIFT_CFG.MORNING;
  return (
    <GlobalBadge variant={cfg.variant} icon={cfg.icon} size="sm">
      {cfg.label}
    </GlobalBadge>
  );
}

function Avatar({ name, size = 34 }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "G";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, var(--accent), #9e58ff)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 800, color: "#fff",
      boxShadow: "0 2px 8px rgba(160,90,255,0.35)",
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

export default function Guard() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const { showUnauthorized, showError } = useCustomAlert();
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";
  
  const canCreateGuard = hasPermission(user, "guard", "create");
  const canEditGuard = hasPermission(user, "guard", "edit");
  const canDeleteGuard = hasPermission(user, "guard", "delete");
  const canShiftGuard = hasPermission(user, "guard", "edit_shift");

  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [guardShifts, setGuardShifts] = useState({});
  const [shiftForm, setShiftForm] = useState({ shift_type: "", start_date: "", end_date: "" });
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [shiftError, setShiftError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", password: "", society_id: "" });
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // SuperAdmin society filter
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    return localStorage.getItem("superadmin_society_filter") || "ALL";
  });

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, societyId: null, loading: false });

  const fetchSocieties = async () => {
    try {
      const res = await API.get("/societies");
      setSocietiesList(res.data || []);
    } catch {
      setSocietiesList([]);
    }
  };

  const loadShifts = async (guardList) => {
    const shiftMap = {};
    for (const g of guardList) {
      try {
        const res = await API.get(`/guards/${g.id}/shifts`);
        shiftMap[g.id] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.shifts || []);
      } catch {
        shiftMap[g.id] = [];
      }
    }
    setGuardShifts(shiftMap);
  };

  const fetchGuards = async () => {
    setLoading(true);
    try {
      let res;
      if (isSuperAdmin) {
        if (!filterSocietyId || filterSocietyId === "ALL") {
          res = await API.get("/guards/all");
        } else {
          res = await API.get(`/guards/society/${filterSocietyId}`);
        }
      } else {
        res = await API.get("/guards");
      }
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.guards)
        ? res.data.guards
        : [];
      setGuards(list);
      await loadShifts(list);
    } catch (err) {
      console.error(err);
      setGuards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchSocieties();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchGuards();
  }, [isSuperAdmin, filterSocietyId]);

  const handleOpenAddModal = () => {
    if (!hasPermission(user, "guard", "create")) {
      showUnauthorized("You do not have permission to add guards.");
      return;
    }
    setEditingId(null);
    setFormData({ name: "", email: "", password: "", society_id: filterSocietyId === "ALL" ? "" : filterSocietyId });
    setShowGuardModal(true);
  };

  const handleEdit = (g) => {
    if (!hasPermission(user, "guard", "edit")) {
      showUnauthorized("You do not have permission to edit guard details.");
      return;
    }
    setEditingId(g.id);
    setFormData({
      name: g.name,
      email: g.email,
      password: "",
      society_id: g.society_id || "",
    });
    setShowGuardModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const reqAction = editingId ? "edit" : "create";
    if (!hasPermission(user, "guard", reqAction)) {
      showUnauthorized(`You do not have permission to ${reqAction} guards.`);
      return;
    }
    const nameErr = getTitleError(formData.name, "Guard name");
    if (nameErr) { showError(nameErr); return; }
    const emailErr = getEmailError(formData.email);
    if (emailErr) { showError(emailErr); return; }
    if (!editingId) {
      if (!formData.password) { showError("Password is required for new guards."); return; }
      if (formData.password.length < 6) { showError("Password must be at least 6 characters."); return; }
    }

    try {
      setSubmitLoading(true);
      if (editingId) {
        await API.put(`/guards/${editingId}`, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          ...(formData.password ? { password: formData.password } : {}),
          ...(isSuperAdmin && formData.society_id ? { society_id: formData.society_id } : {}),
        });
      } else {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          society_id: isSuperAdmin ? (formData.society_id || filterSocietyId) : user?.society_id,
        };
        await API.post("/guards", payload);
      }
      setShowGuardModal(false);
      setEditingId(null);
      setFormData({ name: "", email: "", password: "", society_id: "" });
      fetchGuards();
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        showError(err.response?.data?.message || "Operation failed");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenDelete = (g) => {
    if (!hasPermission(user, "guard", "delete")) {
      showUnauthorized("You do not have permission to delete guards.");
      return;
    }
    setDeleteConfirm({ isOpen: true, id: g.id, societyId: g.society_id, loading: false });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    if (!hasPermission(user, "guard", "delete")) {
      showUnauthorized("You do not have permission to delete guards.");
      setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false });
      return;
    }
    try {
      setDeleteConfirm(p => ({ ...p, loading: true }));
      await API.delete(`/guards/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false });
      fetchGuards();
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        showError(err.response?.data?.message || "Failed to delete guard");
      }
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

  /* ── SHIFTS ── */
  const openShiftModal = (guard, shift = null) => {
    if (!hasPermission(user, "guard", "edit_shift")) {
      showUnauthorized("You do not have permission to manage guard shifts.");
      return;
    }
    setSelectedGuard(guard);
    setShiftError("");
    const shifts = guardShifts[guard.id] || [];
    const targetShift = shift || (shifts.length > 0 ? shifts[0] : null);
    if (targetShift) {
      setEditingShiftId(targetShift.id);
      setShiftForm({
        shift_type: targetShift.shift_type,
        start_date: targetShift.start_date,
        end_date: targetShift.end_date,
      });
    } else {
      setEditingShiftId(null);
      setShiftForm({ shift_type: "", start_date: "", end_date: "" });
    }
    setShowShiftModal(true);
  };

  const handleShiftSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!shiftForm.shift_type || !shiftForm.start_date || !shiftForm.end_date) {
      setShiftError("Please fill all shift fields.");
      return;
    }
    if (new Date(shiftForm.start_date) > new Date(shiftForm.end_date)) {
      setShiftError("Start date cannot be after End date.");
      return;
    }

    const existingShift = (guardShifts[selectedGuard.id] || [])
      .filter(s => !editingShiftId || s.id !== editingShiftId)
      .find(s => shiftForm.start_date <= s.end_date && shiftForm.end_date >= s.start_date);
    if (existingShift) {
      const typeLabels = { MORNING: "Morning", AFTERNOON: "Afternoon", NIGHT: "Night" };
      const label = typeLabels[existingShift.shift_type] || existingShift.shift_type;
      setShiftError(
        `Guard already has a ${label} shift from ${existingShift.start_date} to ${existingShift.end_date}. ` +
        `A guard can only have one shift per date — edit that shift instead of creating a new one.`
      );
      return;
    }

    try {
      setSubmitLoading(true);
      if (editingShiftId) {
        await API.put(`/guards/shifts/${editingShiftId}`, shiftForm);
      } else {
        await API.post(`/guards/${selectedGuard.id}/shifts`, shiftForm);
      }
      setShowShiftModal(false);
      fetchGuards();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409 && data?.existingShift && !editingShiftId) {
        openShiftModal(selectedGuard, data.existingShift);
      } else {
        setShiftError(data?.message || "Failed to save shift");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      key: "guard",
      header: t("guardColGuard") || "Guard",
      render: (g) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={g.name} size={36} />
          <div>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {g.name}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: t("guardColEmail") || "Email",
      render: (g) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
          <MdEmail size={13} style={{ color: "var(--text-tertiary)" }} />
          <span>{g.email}</span>
        </div>
      ),
    },
    ...(isSuperAdmin
      ? [{
          key: "society",
          header: "Society",
          hiddenMobile: true,
          render: (g) => {
            const societyName =
              (g.societyName && g.societyName !== "NA"
                ? g.societyName
                : societiesList.find(s => String(s.id) === String(g.society_id))?.name) ||
              "Not assigned";
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MdApartment size={13} style={{ color: "var(--accent)", opacity: 0.8 }} />
                <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {societyName}
                </span>
              </div>
            );
          },
        }]
      : []),
    {
      key: "shift",
      header: t("guardColShift") || "Shift",
      render: (g) => {
        const shifts = guardShifts[g.id] || [];
        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {shifts.length > 0 ? (
              shifts.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openShiftModal(g, s)}
                  style={{ padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }}
                  title={`Edit ${s.shift_type} shift (${s.start_date} → ${s.end_date})`}
                >
                  <ShiftBadge type={s.shift_type} t={t} />
                </button>
              ))
            ) : (
              <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", opacity: 0.6 }}>—</span>
            )}
          </div>
        );
      },
    },
    {
      key: "schedule",
      header: t("guardColSchedule") || "Schedule",
      hiddenMobile: true,
      render: (g) => {
        const shifts = guardShifts[g.id] || [];
        return shifts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {shifts.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => openShiftModal(g, s)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem",
                  color: "var(--text-secondary)", background: "none", border: "none",
                  cursor: "pointer", padding: 0, textAlign: "left",
                }}
                title={`Edit ${s.shift_type} shift (${s.start_date} → ${s.end_date})`}
              >
                <MdCalendarToday size={11} style={{ opacity: 0.7 }} />
                <span>{s.shift_type}: {s.start_date} → {s.end_date}</span>
              </button>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontStyle: "italic", opacity: 0.6 }}>
            {t("guardNotScheduled") || "Not scheduled"}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: t("guardColActions") || "Actions",
      align: "right",
      render: (g) => {
        const shifts = guardShifts[g.id] || [];
        return (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {canEditGuard && (
              <GlobalButton
                variant="edit"
                size="sm"
                icon={MdEdit}
                onClick={() => handleEdit(g)}
                title="Edit Guard"
              >
                Edit
              </GlobalButton>
            )}
            {canShiftGuard && (
              <GlobalButton
                variant="secondary"
                size="sm"
                icon={MdSchedule}
                onClick={() => openShiftModal(g)}
                title={t("guardEditShift") || "Edit Guard Shift"}
              >
                {t("guardColShift") || "Shift"}
              </GlobalButton>
            )}
            {canDeleteGuard && (
              <GlobalButton
                variant="delete"
                size="sm"
                icon={MdDelete}
                onClick={() => handleOpenDelete(g)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, rgba(160,90,255,0.15), rgba(160,90,255,0.08))",
            border: "1.5px solid rgba(160,90,255,0.25)", color: "var(--accent)",
          }}>
            <MdSecurity size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("guardTitle")}</h2>
            <p className="page-subtitle">{guards.length} {t("guardRegistered")}</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isSuperAdmin && (
            <Select
              className="input"
              value={filterSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val);
              }}
              style={{ height: 40, fontSize: 13, minWidth: 200 }}
            >
              <option value="ALL">All Societies (Global View)</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          {canCreateGuard && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenAddModal}
            >
              {t("guardAddBtn") || "Add Guard"}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── GUARD LIST TABLE ── */}
      <GlobalTable
        columns={columns}
        data={guards}
        loading={loading}
        emptyMessage={t("guardEmpty") || "No security guards registered yet."}
        emptyIcon={MdSecurity}
        emptyAction={
          canCreateGuard ? (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenAddModal}
            >
              {t("guardAddBtn") || "Add Guard"}
            </GlobalButton>
          ) : null
        }
      />

      {/* ── ADD / EDIT GUARD MODAL ── */}
      <GlobalModal
        isOpen={showGuardModal}
        onClose={() => setShowGuardModal(false)}
        title={editingId ? "Update Security Guard" : t("guardFormTitle") || "Add Security Guard"}
        subtitle="Credentials and Society Assignment"
        icon={MdPerson}
        size="md"
        showFooter
        submitLabel={editingId ? "Update Guard" : t("guardCreateBtn") || "Add Guard"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleSubmit}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || Boolean(getTitleError(formData.name, "Guard name")) || Boolean(getEmailError(formData.email)) || (!editingId && (!formData.password || formData.password.length < 6))}
        submitIcon={editingId ? MdEdit : MdAdd}
        submitVariant={editingId ? "edit" : "primary"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <SectionLabel>Society</SectionLabel>
              <Select
                className="input"
                value={formData.society_id}
                onChange={e => setFormData({ ...formData, society_id: e.target.value })}
                required
              >
                <option value="">Select Society</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          )}

          <div>
            <SectionLabel>{t("guardName")}</SectionLabel>
            <div style={{ position: "relative" }}>
              <MdPerson size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder={t("guardNamePlaceholder")}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div>
            <SectionLabel>{t("guardEmail")}</SectionLabel>
            <div style={{ position: "relative" }}>
              <MdEmail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="email"
                placeholder={t("guardEmailPlaceholder")}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div>
            <SectionLabel>{editingId ? "New Password (Leave blank to keep)" : t("guardPassword")}</SectionLabel>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={editingId ? "Leave blank to keep current password" : t("guardPassword")}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required={!editingId}
                className="input"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-secondary)", display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <MdVisibilityOff size={17} /> : <MdVisibility size={17} />}
              </button>
            </div>
          </div>
        </form>
      </GlobalModal>

      {/* ── SHIFT ASSIGNMENT MODAL ── */}
      <GlobalModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title={editingShiftId ? "Edit Guard Shift" : "Assign Guard Shift"}
        subtitle={selectedGuard ? `Guard: ${selectedGuard.name}` : "Shift schedule"}
        icon={MdSchedule}
        size="md"
        showFooter
        submitLabel={editingShiftId ? "Update Shift" : "Assign Shift"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleShiftSubmit}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !shiftForm.shift_type || !shiftForm.start_date || !shiftForm.end_date}
        submitIcon={editingShiftId ? MdEdit : MdAdd}
      >
        <form onSubmit={handleShiftSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Shift Selection Toggle Options */}
          {selectedGuard && (guardShifts[selectedGuard.id] || []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10, borderBottom: "1px solid var(--divider, rgba(255,255,255,0.08))" }}>
              <SectionLabel>Assigned Shifts ({guardShifts[selectedGuard.id].length})</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {guardShifts[selectedGuard.id].map((s) => {
                  const isSelected = editingShiftId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setEditingShiftId(s.id);
                        setShiftForm({
                          shift_type: s.shift_type,
                          start_date: s.start_date,
                          end_date: s.end_date,
                        });
                        setShiftError("");
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        background: isSelected ? "rgba(107,70,193,0.2)" : "var(--card-inner-bg)",
                        border: isSelected ? "1.5px solid var(--accent, #6B46C1)" : "1px solid var(--glass-border)",
                        color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: isSelected ? "0 2px 10px rgba(107,70,193,0.3)" : "none",
                      }}
                    >
                      <ShiftBadge type={s.shift_type} t={t} />
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.01em" }}>
                        {s.start_date} → {s.end_date}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setEditingShiftId(null);
                    setShiftForm({ shift_type: "", start_date: "", end_date: "" });
                    setShiftError("");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    background: editingShiftId === null ? "rgba(16,185,129,0.15)" : "var(--card-inner-bg)",
                    border: editingShiftId === null ? "1.5px solid #10b981" : "1px dashed var(--glass-border)",
                    color: editingShiftId === null ? "#34d399" : "var(--text-secondary)",
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  <MdAdd size={14} /> New Shift
                </button>
              </div>
            </div>
          )}

          {shiftError && (
            <div style={{
              color: "#ef4444", fontSize: 12, padding: "8px 12px",
              borderRadius: 8, background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}>
              {shiftError}
            </div>
          )}

          <div>
            <SectionLabel>Shift Type</SectionLabel>
            <Select
              className="input"
              value={shiftForm.shift_type}
              onChange={e => setShiftForm({ ...shiftForm, shift_type: e.target.value })}
              required
            >
              <option value="">Select Shift Type</option>
              <option value="MORNING">Morning (06:00 AM - 02:00 PM)</option>
              <option value="AFTERNOON">Afternoon (02:00 PM - 10:00 PM)</option>
              <option value="NIGHT">Night (10:00 PM - 06:00 AM)</option>
            </Select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <SectionLabel>Start Date</SectionLabel>
              <input
                type="date"
                className="input"
                value={shiftForm.start_date}
                onChange={e => setShiftForm({ ...shiftForm, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <SectionLabel>End Date</SectionLabel>
              <input
                type="date"
                className="input"
                value={shiftForm.end_date}
                onChange={e => setShiftForm({ ...shiftForm, end_date: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </GlobalModal>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, societyId: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Security Guard"
        message="Are you sure you want to delete this guard account? They will lose access to gate check-in systems immediately."
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}