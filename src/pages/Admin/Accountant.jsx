import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdEdit, MdPerson,
  MdCheck, MdAccountBalance,
  MdApartment, MdHome, MdPersonAdd,
  MdCheckCircle, MdBlock, MdInfoOutline,
  MdArrowForward, MdVisibility, MdVisibilityOff,
  MdMoreVert
} from "react-icons/md";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getEmailError, getMobileError } from "../../utils/validators";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { toast } from "react-toastify";

/* ─────────────────────────────────────────
   ACCOUNTANT ACTION MENU (three-dot kebab)
   ───────────────────────────────────────── */
function AccountantActionMenu({ canEdit, onEdit, canToggle, status, onToggle, t }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const onReposition = () => close();
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, close]);

  const toggle = () => {
    if (open) { close(); return; }
    const rect = btnRef.current.getBoundingClientRect();
    const menuW = 120;
    const menuH = 4 * 34 + 24;
    const left = Math.max(8, rect.right - menuW);
    const spaceBelow = window.innerHeight - rect.bottom;
    setPos(
      spaceBelow >= menuH
        ? { left, top: rect.bottom + 6 }
        : { left, bottom: window.innerHeight - rect.top + 6 }
    );
    setOpen(true);
  };

  const act = (fn) => { close(); fn(); };

  if (!canEdit && !canToggle) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="sa-action-dots"
        aria-label={t("acctActionsMenu") || "Accountant actions"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MdMoreVert size={20} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="sa-action-dropdown"
          style={{ position: "fixed", zIndex: 11000, right: "auto", ...pos }}
        >
          {canEdit && (
            <button role="menuitem" className="sa-action-item" onClick={() => act(onEdit)}>
              <MdEdit size={15} />
              {t("acctEdit") || "Edit"}
            </button>
          )}
          {canEdit && canToggle && <div className="sa-action-divider" />}
          {canToggle && (
            status === "ACTIVE" ? (
              <button role="menuitem" className="sa-action-item sa-action-item-danger" onClick={() => act(onToggle)}>
                <MdBlock size={15} />
                {t("acctDisable") || "Disable"}
              </button>
            ) : (
              <button role="menuitem" className="sa-action-item" onClick={() => act(onToggle)}>
                <MdCheckCircle size={15} style={{ color: "#4ade80" }} />
                {t("acctActivate") || "Activate"}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </>
  );
}

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
      <div style={{
        padding: "0 12px", height: 40,
        display: "flex", alignItems: "center", gap: 6,
        borderRight: "1px solid var(--glass-border)",
        background: "rgba(160,90,255,0.08)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13 }}>🇮🇳</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>+91</span>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="9876543210"
        maxLength={10}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
          onChange(digits);
        }}
        style={{
          border: "none", outline: "none", background: "transparent",
          padding: "0 12px", height: 40, width: "100%",
          fontSize: 13, color: "var(--text-primary)",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  );
}

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export default function Accountant() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const { showUnauthorized } = useCustomAlert();

  const acctSelectedLabel = (name) => (t("acctSelected", { name }) || `Selected: ${name}`);
  const acctEmailLabel = (email) => (t("acctEmailOnly", { email }) || `Email: ${email}`);
  const acctPhoneLabel = (phone) => (t("acctPhoneOnly", { phone }) || `Phone: +91 ${phone} | `);
  const acctFlatLabel = (flat, block) => (t("acctAssignedFlat", { flat, block }) || `Assigned Flat: ${flat}${block ? ` (${block})` : ""}`);

  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";
  const isCommittee = isCommitteeMember(user);

  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(true);

  // SuperAdmin Society Filter
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    return localStorage.getItem("superadmin_society_filter") || "ALL";
  });

  // Modals state
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Eligible residents state for "From Society" appointment
  const [eligibleResidents, setEligibleResidents] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [residentSocietyId, setResidentSocietyId] = useState("");

  // External form state
  const [formData, setFormData] = useState({
    name: "", email: "", password: "Admin@123", phone: "", society_id: "",
  });
  const [editTarget, setEditTarget] = useState(null);
  const [phoneError, setPhoneError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status toggle confirm dialog state (Disable / Activate)
  const [statusConfirm, setStatusConfirm] = useState({
    isOpen: false, item: null, action: "deactivate", loading: false,
  });

  const fetchSocieties = async () => {
    try {
      const res = await API.get("/societies");
      setSocietiesList(res.data || []);
    } catch {
      setSocietiesList([]);
    }
  };

  const fetchAccountants = async () => {
    setLoading(true);
    try {
      let endpoint = "/accountant";
      if (isSuperAdmin) {
        if (!filterSocietyId || filterSocietyId === "ALL") {
          endpoint = "/accountant/all";
        } else {
          endpoint = `/accountant/society/${filterSocietyId}`;
        }
      } else {
        endpoint = "/accountant/me";
      }

      const res = await API.get(endpoint);
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      } else if (res.data && typeof res.data === "object" && res.data.id) {
        list = [res.data];
      }
      setAccountants(list);
    } catch {
      setAccountants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleResidents = async (targetSocId) => {
    setLoadingEligible(true);
    try {
      let sid = targetSocId;
      if (!sid) {
        sid = isSuperAdmin ? (filterSocietyId === "ALL" ? "" : filterSocietyId) : (user?.society_id || "");
      }
      const endpoint = `/accountant/eligible-residents${sid ? `?society_id=${sid}` : ""}`;
      const res = await API.get(endpoint);
      setEligibleResidents(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      console.error("fetchEligibleResidents error:", err);
      setEligibleResidents([]);
    } finally {
      setLoadingEligible(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchSocieties();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchAccountants();
  }, [isSuperAdmin, filterSocietyId]);

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setFilterSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
    setShowOriginModal(false);
    setShowResidentModal(false);
    setShowExternalModal(false);
    setShowEditModal(false);
  };

  const handleOpenOriginModal = () => {
    if (!hasPermission(user, "accountant", "create") && !hasPermission(user, "accountant", "appoint")) {
      showUnauthorized(t("acctUnauthAdd") || "You do not have permission to add or appoint an accountant.");
      return;
    }
    const defaultSocId = (isSuperAdmin ? (filterSocietyId === "ALL" ? "" : filterSocietyId) : (user?.society_id || ""));
    setResidentSocietyId(defaultSocId || "");
    setFormData({
      name: "", email: "", password: "Admin@123", phone: "", society_id: defaultSocId || "",
    });
    setSelectedResidentId("");
    setPhoneError("");
    setShowOriginModal(true);
  };

  const handleChooseOrigin = (type) => {
    setShowOriginModal(false);
    if (type === "society") {
      if (!hasPermission(user, "accountant", "appoint")) {
        showUnauthorized(t("acctUnauthAppoint") || "You do not have permission to appoint a resident as accountant.");
        return;
      }
      const defaultSocId = residentSocietyId || (isSuperAdmin ? (filterSocietyId === "ALL" ? "" : filterSocietyId) : (user?.society_id || ""));
      setResidentSocietyId(defaultSocId || "");
      fetchEligibleResidents(defaultSocId);
      setShowResidentModal(true);
    } else {
      if (!hasPermission(user, "accountant", "create")) {
        showUnauthorized(t("acctUnauthCreateExt") || "You do not have permission to create an external accountant.");
        return;
      }
      setShowExternalModal(true);
    }
  };

  // Appoint Resident Handler
  const handleAppointResident = async (e) => {
    if (e) e.preventDefault();
    if (!hasPermission(user, "accountant", "appoint")) {
      showUnauthorized(t("acctUnauthAppoint") || "You do not have permission to appoint a resident as accountant.");
      return;
    }
    if (!selectedResidentId) {
      toast.error(t("acctToastSelectResident") || "Please select a resident to appoint");
      return;
    }

    const targetSocId = isSuperAdmin ? residentSocietyId : user?.society_id;
    if (!targetSocId) {
      toast.error(t("acctToastSelectSociety") || "Please select a society");
      return;
    }

    try {
      setSubmitLoading(true);
      await API.post("/accountant/appoint-resident", {
        resident_id: selectedResidentId,
        society_id: targetSocId,
      });

      toast.success(t("acctToastAppointed") || "Resident appointed as Accountant successfully!");
      setShowResidentModal(false);
      setSelectedResidentId("");
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || (t("acctToastAppointFail") || "Failed to appoint resident as accountant"));
    } finally {
      setSubmitLoading(false);
    }
  };

  // Create External Accountant Handler
  const handleCreateExternal = async (e) => {
    if (e) e.preventDefault();
    if (!hasPermission(user, "accountant", "create")) {
      showUnauthorized(t("acctUnauthCreateExt") || "You do not have permission to create an external accountant.");
      return;
    }
    if (!formData.name || !formData.email || !formData.password) return;

    const nameErr = getTitleError(formData.name, "Name");
    if (nameErr) { toast.error(nameErr); return; }
    const emailErr = getEmailError(formData.email);
    if (emailErr) { toast.error(emailErr); return; }
    if (formData.phone) {
      const phoneErr = getMobileError(formData.phone);
      if (phoneErr) { setPhoneError(phoneErr); return; }
    }

    const targetSocId = isSuperAdmin ? formData.society_id : user?.society_id;
    if (isSuperAdmin && !targetSocId) {
      toast.error(t("acctToastSelectSociety") || "Please select a society");
      return;
    }

    try {
      setSubmitLoading(true);
      await API.post("/accountant", {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        society_id: targetSocId,
      });

      toast.success(t("acctToastCreated") || "External accountant created successfully!");
      setShowExternalModal(false);
      setFormData({ name: "", email: "", password: "Admin@123", phone: "", society_id: "" });
      setPhoneError("");
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || (t("acctToastCreateFail") || "Failed to create accountant"));
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update Accountant Handler
  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!hasPermission(user, "accountant", "edit")) {
      showUnauthorized(t("acctUnauthEdit") || "You do not have permission to edit accountant details.");
      return;
    }
    const nameErr = getTitleError(formData.name, "Name");
    if (nameErr) { toast.error(nameErr); return; }
    if (formData.phone) {
      const phoneErr = getMobileError(formData.phone);
      if (phoneErr) { setPhoneError(phoneErr); return; }
    }

    try {
      setSubmitLoading(true);
      const targetId = editTarget?.user_id || editTarget?.id;
      await API.put(`/accountant/${targetId}`, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
      });

      toast.success(t("acctToastUpdated") || "Accountant details updated successfully!");
      setShowEditModal(false);
      setPhoneError("");
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || (t("acctToastUpdateFail") || "Failed to update accountant"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (acc) => {
    if (!hasPermission(user, "accountant", "edit")) {
      showUnauthorized(t("acctUnauthEdit") || "You do not have permission to edit accountant details.");
      return;
    }
    setEditTarget(acc);
    setFormData({
      name: acc.name || "",
      email: acc.email || "",
      password: "",
      phone: acc.phone || "",
      society_id: acc.society_id || "",
    });
    setPhoneError("");
    setShowEditModal(true);
  };

  const openStatusConfirm = (item, action) => {
    if (!hasPermission(user, "accountant", "toggle_status")) {
      showUnauthorized(t("acctUnauthStatus") || "You do not have permission to modify accountant status.");
      return;
    }
    setStatusConfirm({ isOpen: true, item, action, loading: false });
  };

  // Status Toggle (Disable / Make Inactive / Activate) Handler
  const handleToggleStatusConfirm = async () => {
    if (!hasPermission(user, "accountant", "toggle_status")) {
      showUnauthorized(t("acctUnauthStatus") || "You do not have permission to modify accountant status.");
      return;
    }
    const target = statusConfirm.item;
    if (!target) return;
    const targetId = target.assignment_id || target.user_id || target.id;
    const nextStatus = statusConfirm.action === "deactivate" ? "INACTIVE" : "ACTIVE";

    try {
      setStatusConfirm(p => ({ ...p, loading: true }));
      await API.patch(`/accountant/${targetId}/status`, { status: nextStatus });
      toast.success(
        nextStatus === "INACTIVE"
          ? (t("acctToastInactivated") || "Accountant has been made inactive.")
          : (t("acctToastActivated") || "Accountant activated successfully!")
      );
      setStatusConfirm({ isOpen: false, item: null, action: "deactivate", loading: false });
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || (t("acctToastStatusFail") || "Failed to update accountant status"));
      setStatusConfirm(p => ({ ...p, loading: false }));
    }
  };

  const selectedResidentObj = eligibleResidents.find((r) => String(r.id) === String(selectedResidentId));

  const tableColumns = [
    {
      key: "idx",
      header: "#",
      width: 50,
      render: (_, idx) => <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>{idx + 1}</span>,
    },
    {
      key: "name",
      header: t("acctColAccountant") || "Accountant",
      render: (acc) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: acc.status === "INACTIVE"
              ? "linear-gradient(135deg, #64748b, #475569)"
              : "linear-gradient(135deg, var(--accent), #9e58ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
            flexShrink: 0,
          }}>
            {acc.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "0.9rem" }}>{acc.name}</p>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>{acc.email}</p>
          </div>
        </div>
      ),
    },
    ...(isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL") ? [{
      key: "society",
      header: t("acctColSociety") || "Society",
      width: 170,
      render: (acc) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          <MdApartment size={15} style={{ color: "var(--accent)" }} />
          <span>{acc.societyName || "—"}</span>
        </div>
      ),
    }] : []),
    {
      key: "contact",
      header: t("acctColContact") || "Contact",
      width: 150,
      render: (acc) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
          {acc.phone ? `+91 ${acc.phone}` : "—"}
        </span>
      ),
    },
    {
      key: "from_society",
      header: t("acctColFromSociety") || "From Society",
      width: 150,
      render: (acc) => (
        acc.from_society ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 700, padding: "3px 9px",
            borderRadius: 999, background: "rgba(59,130,246,0.12)",
            color: "#60a5fa", border: "1px solid rgba(59,130,246,0.28)",
          }}>
            <MdHome size={13} /> {t("acctYesResident") || "Yes (Resident)"}
          </span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600, padding: "3px 9px",
            borderRadius: 999, background: "rgba(148,163,184,0.12)",
            color: "var(--text-secondary)", border: "1px solid var(--glass-border)",
          }}>
            {t("acctNoExternal") || "No (External)"}
          </span>
        )
      ),
    },
    {
      key: "start_date",
      header: t("acctColWorkingSince") || "Working Since",
      width: 130,
      render: (acc) => (
        <span style={{ color: "var(--text-primary)", fontSize: "0.83rem", fontWeight: 500, whiteSpace: "nowrap" }}>
          {formatDate(acc.start_date)}
        </span>
      ),
    },
    {
      key: "inactive_date",
      header: t("acctColInactiveSince") || "Inactive Since",
      width: 130,
      render: (acc) => (
        <span style={{ color: acc.inactive_date ? "#f87171" : "var(--text-secondary)", fontSize: "0.83rem", fontWeight: 500, whiteSpace: "nowrap" }}>
          {acc.status === "INACTIVE" || acc.inactive_date ? formatDate(acc.inactive_date) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: t("acctColStatus") || "Status",
      width: 110,
      render: (acc) => (
        acc.status === "ACTIVE" ? (
          <GlobalBadge variant="success" dot>{t("acctActive") || "Active"}</GlobalBadge>
        ) : (
          <GlobalBadge variant="danger" dot>{t("acctInactive") || "Inactive"}</GlobalBadge>
        )
      ),
    },
    ...((hasPermission(user, "accountant", "edit") || hasPermission(user, "accountant", "toggle_status")) ? [{
      key: "actions",
      header: t("acctColActions") || "Actions",
      align: "right",
      width: 80,
      render: (acc) => (
        <AccountantActionMenu
          t={t}
          canEdit={hasPermission(user, "accountant", "edit")}
          onEdit={() => openEditModal(acc)}
          canToggle={hasPermission(user, "accountant", "toggle_status")}
          status={acc.status}
          onToggle={() => openStatusConfirm(acc, acc.status === "ACTIVE" ? "deactivate" : "activate")}
        />
      ),
    }] : []),
  ];

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), #9e58ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(158, 88, 255, 0.3)",
              color: "#ffffff",
            }}
          >
            <MdAccountBalance size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("acctTitle") || "Accountants"}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {t("acctSubtitle") || "Manage society accountants, roles, and status tracking"}
            </p>
          </div>
        </div>

        {/* Action button & society selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isSuperAdmin && (
            <div style={{ position: "relative" }}>
              <Select
                className="input"
                value={filterSocietyId}
                onChange={handleSocietyChange}
                style={{ height: 40, fontSize: 13, minWidth: 200 }}
              >
              <option value="ALL">{t("allSocietiesGlobalView")}</option>
                {societiesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {(hasPermission(user, "accountant", "create") || hasPermission(user, "accountant", "appoint")) && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenOriginModal}
            >
              {t("acctAddBtn") || "Add Accountant"}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── ACCOUNTANTS TABLE ── */}
      <GlobalTable
        className="acct-table"
        columns={tableColumns}
        data={accountants}
        loading={loading}
        emptyMessage={t("acctEmpty") || "No accountants registered in this society."}
        emptyIcon={MdPerson}
        emptyAction={
          (hasPermission(user, "accountant", "create") || hasPermission(user, "accountant", "appoint")) ? (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleOpenOriginModal}
            >
              {t("acctAddBtn") || "Add Accountant"}
            </GlobalButton>
          ) : null
        }
      />

      {/* ── STEP 1: CHOOSE ORIGIN MODAL (From Society vs Outside Society) ── */}
      <GlobalModal
        isOpen={showOriginModal}
        onClose={() => setShowOriginModal(false)}
        title={t("acctOriginTitle") || "Add Accountant"}
        subtitle={t("acctOriginSubtitle") || "Choose accountant origin"}
        icon={MdPersonAdd}
        size="md"
        showFooter={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 4px", lineHeight: 1.5 }}>
            {t("acctOriginIntro") || "Select how you would like to appoint or register this accountant:"}
          </p>

          <div
            onClick={() => handleChooseOrigin("society")}
            style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              border: "1.5px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            className="hover:border-accent hover:bg-accent/5 group"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(160,90,255,0.12)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <MdHome size={22} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("acctOriginFromSociety") || "From Society (Resident)"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {t("acctOriginFromSocietyDesc") || "Appoint an existing society resident. They will gain Accountant access while retaining resident features."}
                </p>
              </div>
            </div>
            <MdArrowForward size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
          </div>

          <div
            onClick={() => handleChooseOrigin("external")}
            style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              border: "1.5px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            className="hover:border-accent hover:bg-accent/5 group"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(139,92,246,0.12)", color: "#a855f7",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <MdPersonAdd size={22} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("acctOriginExternal") || "Outside of Society"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {t("acctOriginExternalDesc") || "Create a new external accountant account with email and password credentials."}
                </p>
              </div>
            </div>
            <MdArrowForward size={20} style={{ color: "#a855f7", flexShrink: 0 }} />
          </div>
        </div>
      </GlobalModal>

      {/* ── APPOINT RESIDENT MODAL (From Society) ── */}
      <GlobalModal
        isOpen={showResidentModal}
        onClose={() => {
          setShowResidentModal(false);
          setSelectedResidentId("");
        }}
        title={t("acctAppointTitle") || "Appoint Resident as Accountant"}
        subtitle={t("acctAppointSubtitle") || "Select an eligible resident to appoint"}
        icon={MdHome}
        size="md"
        showFooter
        submitLabel={t("acctAppointSubmit") || "Appoint as Accountant"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleAppointResident}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !selectedResidentId || (isSuperAdmin && !residentSocietyId)}
        submitIcon={MdCheck}
      >
        <form onSubmit={handleAppointResident} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <SectionLabel>{t("acctSocietyLabel") || "Society"}</SectionLabel>
              <Select
                className="input"
                value={residentSocietyId}
                required
                onChange={(e) => {
                  const val = e.target.value;
                  setResidentSocietyId(val);
                  setSelectedResidentId("");
                  if (val) fetchEligibleResidents(val);
                  else setEligibleResidents([]);
                }}
              >
                <option value="">{t("selectSociety") || "Select Society"}</option>
                {societiesList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <SectionLabel>{t("acctSelectResident") || "Select Resident"}</SectionLabel>
            {loadingEligible ? (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: 8 }}>{t("acctEligibleLoading")}</p>
            ) : isSuperAdmin && !residentSocietyId ? (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)",
                color: "#60a5fa", fontSize: 12, lineHeight: 1.5,
              }}>
                {t("acctSelectSocietyFirst") || "Please select a society above to view its eligible residents."}
              </div>
            ) : eligibleResidents.length === 0 ? (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)",
                color: "#eab308", fontSize: 12, lineHeight: 1.5,
              }}>
                {t("acctNoEligible") || "No eligible residents found in this society. (Residents who are already Committee Members, Admins, or Accountants are excluded)."}
              </div>
            ) : (
              <Select
                className="input"
                value={selectedResidentId}
                required
                onChange={(e) => setSelectedResidentId(e.target.value)}
              >
                <option value="">{t("acctChooseResident") || "Choose resident to appoint…"}</option>
                {eligibleResidents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.flat_number ? `(${t("mpUnit") || "Unit"} ${r.flat_number}${r.block_name ? ` - ${r.block_name}` : ''})` : ''} — {r.email}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {selectedResidentObj && (
            <div style={{
              padding: "12px 14px", borderRadius: 12,
              background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
              border: "1px solid var(--glass-border)",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {acctSelectedLabel(selectedResidentObj.name)}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {acctEmailLabel(selectedResidentObj.email)}
                {selectedResidentObj.phone ? acctPhoneLabel(selectedResidentObj.phone) : ""}
              </p>
              {selectedResidentObj.flat_number && (
                <p style={{ fontSize: 11, color: "#60a5fa", margin: 0, fontWeight: 600 }}>
                  {acctFlatLabel(selectedResidentObj.flat_number, selectedResidentObj.block_name)}
                </p>
              )}
            </div>
          )}

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(160,90,255,0.08)", border: "1px solid rgba(160,90,255,0.22)",
          }}>
            <MdInfoOutline size={18} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {t("acctInfoOnlyAn") || "A resident can only be an"} <strong>{t("acctRole") || "Accountant"}</strong> {t("acctInfoOr") || "or"} <strong>{t("roleCommittee") || "Committee Member"}</strong>{t("acctInfoNotBoth") || ", not both. They will be able to choose between the Resident Panel and Accountant Panel upon login."}
            </p>
          </div>
        </form>
      </GlobalModal>

      {/* ── CREATE EXTERNAL ACCOUNTANT MODAL (Outside of Society) ── */}
      <GlobalModal
        isOpen={showExternalModal}
        onClose={() => {
          setShowExternalModal(false);
          setPhoneError("");
        }}
        title={t("acctExternalTitle") || "Create External Accountant"}
        subtitle={t("acctExternalSubtitle") || "Accountant credentials and assignment"}
        icon={MdPersonAdd}
        size="md"
        showFooter
        submitLabel={t("acctExternalSubmit") || "Create Accountant"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleCreateExternal}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !formData.name || !formData.email || !formData.password || (isSuperAdmin && !formData.society_id)}
        submitIcon={MdAdd}
      >
        <form onSubmit={handleCreateExternal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <SectionLabel>{t("acctSocietyLabel") || "Society"}</SectionLabel>
              <Select
                className="input"
                value={formData.society_id}
                required
                onChange={(e) => setFormData({ ...formData, society_id: e.target.value })}
              >
                <option value="">{t("selectSociety") || "Select Society"}</option>
                {societiesList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <SectionLabel>{t("acctName") || "Full Name"}</SectionLabel>
            <input
              className="input"
              type="text"
              placeholder={t("acctNamePlaceholder") || "e.g. Rahul Sharma"}
              value={formData.name}
              required
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <SectionLabel>{t("acctEmail") || "Email Address"}</SectionLabel>
            <input
              className="input"
              type="email"
              placeholder={t("acctEmailPlaceholder") || "e.g. rahul@example.com"}
              value={formData.email}
              required
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

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

          <div>
            <SectionLabel>{t("acctPassword") || "Initial Password"}</SectionLabel>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder={t("acctPassword") || "Initial Password"}
                value={formData.password}
                required
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingRight: 40, width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? t("rcaHidePassword") : t("rcaShowPassword")}
                title={showPassword ? t("rcaHidePassword") : t("rcaShowPassword")}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: 0,
                }}
              >
                {showPassword ? <MdVisibilityOff size={17} /> : <MdVisibility size={17} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, opacity: 0.7 }}>
              {t("acctPasswordHint") || "Default: Admin@123 (Accountant can change password after login)"}
            </p>
          </div>
        </form>
      </GlobalModal>

      {/* ── EDIT ACCOUNTANT MODAL ── */}
      <GlobalModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setPhoneError("");
        }}
        title={t("acctEditTitle") || "Edit Accountant"}
        subtitle={t("acctEditSubtitle") || "Update accountant contact details"}
        icon={MdEdit}
        size="md"
        showFooter
        submitLabel={t("acctUpdate") || "Update Accountant"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleUpdate}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !formData.name}
        submitIcon={MdCheck}
        submitVariant="edit"
      >
        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <SectionLabel>{t("acctName") || "Full Name"}</SectionLabel>
            <input
              className="input"
              type="text"
              placeholder={t("acctNamePlaceholder") || "Accountant name"}
              value={formData.name}
              required
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <SectionLabel>{t("acctEmail") || "Email Address"}</SectionLabel>
            <input
              className="input"
              type="email"
              value={formData.email}
              disabled
              style={{ opacity: 0.5, cursor: "not-allowed" }}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.6, marginTop: 4 }}>
              {t("acctEmailLockHint") || "Email address cannot be modified directly."}
            </p>
          </div>

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
        </form>
      </GlobalModal>

      {/* ── STATUS TOGGLE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={statusConfirm.isOpen}
        onClose={() => setStatusConfirm({ isOpen: false, item: null, action: "deactivate", loading: false })}
        onConfirm={handleToggleStatusConfirm}
        title={statusConfirm.action === "deactivate" ? (t("acctConfirmDeactivateTitle") || "Make Accountant Inactive") : (t("acctConfirmActivateTitle") || "Activate Accountant")}
        message={
          statusConfirm.action === "deactivate"
            ? (t("acctConfirmDeactivateMsg", { name: statusConfirm.item?.name || 'this accountant' }) || `Are you sure you want to deactivate ${statusConfirm.item?.name || 'this accountant'}? If this person is a resident, their resident account will remain intact but accountant privileges will be suspended.`)
            : (t("acctConfirmActivateMsg", { name: statusConfirm.item?.name || 'this accountant' }) || `Are you sure you want to reactivate ${statusConfirm.item?.name || 'this accountant'}? They will regain access to manage society finance.`)
        }
        variant={statusConfirm.action === "deactivate" ? "danger" : "info"}
        confirmLabel={statusConfirm.action === "deactivate" ? (t("acctConfirmDeactivateBtn") || "Yes, Make Inactive") : (t("acctConfirmActivateBtn") || "Yes, Activate")}
        loading={statusConfirm.loading}
      />
    </div>
  );
}