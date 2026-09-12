import { useEffect, useState, useContext } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdEdit, MdPerson,
  MdCheck, MdAccountBalance,
  MdApartment, MdHome, MdPersonAdd,
  MdCheckCircle, MdBlock, MdInfoOutline,
  MdArrowForward
} from "react-icons/md";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import { isCommitteeMember } from "../../utils/permissions";
import { toast } from "react-toastify";

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
      const defaultSocId = residentSocietyId || (isSuperAdmin ? (filterSocietyId === "ALL" ? "" : filterSocietyId) : (user?.society_id || ""));
      setResidentSocietyId(defaultSocId || "");
      fetchEligibleResidents(defaultSocId);
      setShowResidentModal(true);
    } else {
      setShowExternalModal(true);
    }
  };

  // Appoint Resident Handler
  const handleAppointResident = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResidentId) {
      toast.error("Please select a resident to appoint");
      return;
    }

    const targetSocId = isSuperAdmin ? residentSocietyId : user?.society_id;
    if (!targetSocId) {
      toast.error("Please select a society");
      return;
    }

    try {
      setSubmitLoading(true);
      await API.post("/accountant/appoint-resident", {
        resident_id: selectedResidentId,
        society_id: targetSocId,
      });

      toast.success("Resident appointed as Accountant successfully!");
      setShowResidentModal(false);
      setSelectedResidentId("");
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to appoint resident as accountant");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Create External Accountant Handler
  const handleCreateExternal = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    if (formData.phone && !isValidIndianPhone(formData.phone)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }

    const targetSocId = isSuperAdmin ? formData.society_id : user?.society_id;
    if (isSuperAdmin && !targetSocId) {
      toast.error("Please select a society");
      return;
    }

    try {
      setSubmitLoading(true);
      await API.post("/accountant", {
        ...formData,
        phone: formData.phone.trim() || undefined,
        society_id: targetSocId,
      });

      toast.success("External accountant created successfully!");
      setShowExternalModal(false);
      setFormData({ name: "", email: "", password: "Admin@123", phone: "", society_id: "" });
      setPhoneError("");
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create accountant");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update Accountant Handler
  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (formData.phone && !isValidIndianPhone(formData.phone)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSubmitLoading(true);
      const targetId = editTarget?.user_id || editTarget?.id;
      await API.put(`/accountant/${targetId}`, {
        name: formData.name,
        phone: formData.phone.trim() || undefined,
      });

      toast.success("Accountant details updated successfully!");
      setShowEditModal(false);
      setPhoneError("");
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update accountant");
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (acc) => {
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

  // Status Toggle (Disable / Make Inactive / Activate) Handler
  const handleToggleStatusConfirm = async () => {
    const target = statusConfirm.item;
    if (!target) return;
    const targetId = target.assignment_id || target.user_id || target.id;
    const nextStatus = statusConfirm.action === "deactivate" ? "INACTIVE" : "ACTIVE";

    try {
      setStatusConfirm(p => ({ ...p, loading: true }));
      await API.patch(`/accountant/${targetId}/status`, { status: nextStatus });
      toast.success(
        nextStatus === "INACTIVE"
          ? "Accountant has been made inactive."
          : "Accountant activated successfully!"
      );
      setStatusConfirm({ isOpen: false, item: null, action: "deactivate", loading: false });
      fetchAccountants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update accountant status");
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
      header: "Accountant",
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
      header: "Society",
      render: (acc) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          <MdApartment size={15} style={{ color: "var(--accent)" }} />
          <span>{acc.societyName || "—"}</span>
        </div>
      ),
    }] : []),
    {
      key: "contact",
      header: "Contact",
      render: (acc) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {acc.phone ? `+91 ${acc.phone}` : "—"}
        </span>
      ),
    },
    {
      key: "from_society",
      header: "From Society",
      render: (acc) => (
        acc.from_society ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 700, padding: "3px 9px",
            borderRadius: 999, background: "rgba(59,130,246,0.12)",
            color: "#60a5fa", border: "1px solid rgba(59,130,246,0.28)",
          }}>
            <MdHome size={13} /> Yes (Resident)
          </span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600, padding: "3px 9px",
            borderRadius: 999, background: "rgba(148,163,184,0.12)",
            color: "var(--text-secondary)", border: "1px solid var(--glass-border)",
          }}>
            No (External)
          </span>
        )
      ),
    },
    {
      key: "start_date",
      header: "Working Since",
      render: (acc) => (
        <span style={{ color: "var(--text-primary)", fontSize: "0.83rem", fontWeight: 500 }}>
          {formatDate(acc.start_date)}
        </span>
      ),
    },
    {
      key: "inactive_date",
      header: "Inactive Since",
      render: (acc) => (
        <span style={{ color: acc.inactive_date ? "#f87171" : "var(--text-secondary)", fontSize: "0.83rem", fontWeight: 500 }}>
          {acc.status === "INACTIVE" || acc.inactive_date ? formatDate(acc.inactive_date) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (acc) => (
        acc.status === "ACTIVE" ? (
          <GlobalBadge variant="success" dot>Active</GlobalBadge>
        ) : (
          <GlobalBadge variant="danger" dot>Inactive</GlobalBadge>
        )
      ),
    },
    ...(isCommittee ? [] : [{
      key: "actions",
      header: "Actions",
      align: "right",
      render: (acc) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          <GlobalButton
            variant="edit"
            size="sm"
            icon={MdEdit}
            onClick={() => openEditModal(acc)}
          >
            {t("acctEdit") || "Edit"}
          </GlobalButton>

          {acc.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => setStatusConfirm({ isOpen: true, item: acc, action: "deactivate", loading: false })}
              className="sa-btn"
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.28)",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
              }}
              title="Make accountant inactive"
            >
              <MdBlock size={14} />
              <span>Disable</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatusConfirm({ isOpen: true, item: acc, action: "activate", loading: false })}
              className="sa-btn"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.28)",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
              }}
              title="Re-activate accountant"
            >
              <MdCheckCircle size={14} />
              <span>Activate</span>
            </button>
          )}
        </div>
      ),
    }]),
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
            <MdAccountBalance size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("acctTitle") || "Accountants"}</h2>
            <p className="page-subtitle">{t("acctSubtitle") || "Manage society accountants, roles, and status tracking"}</p>
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
                <option value="ALL">All Societies (Global View)</option>
                {societiesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {!isCommittee && (
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
        columns={tableColumns}
        data={accountants}
        loading={loading}
        emptyMessage="No accountants registered in this society."
        emptyIcon={MdPerson}
        emptyAction={
          !isCommittee ? (
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
        title="Add Accountant"
        subtitle="Choose accountant origin"
        icon={MdPersonAdd}
        size="md"
        showFooter={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Select how you would like to appoint or register this accountant:
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
                  From Society (Resident)
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Appoint an existing society resident. They will gain Accountant access while retaining resident features.
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
                  Outside of Society
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Create a new external accountant account with email and password credentials.
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
        title="Appoint Resident as Accountant"
        subtitle="Select an eligible resident to appoint"
        icon={MdHome}
        size="md"
        showFooter
        submitLabel="Appoint as Accountant"
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleAppointResident}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !selectedResidentId || (isSuperAdmin && !residentSocietyId)}
        submitIcon={MdCheck}
      >
        <form onSubmit={handleAppointResident} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <SectionLabel>Society</SectionLabel>
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
                <option value="">Select Society</option>
                {societiesList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <SectionLabel>Select Resident</SectionLabel>
            {loadingEligible ? (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: 8 }}>Loading eligible residents…</p>
            ) : isSuperAdmin && !residentSocietyId ? (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)",
                color: "#60a5fa", fontSize: 12, lineHeight: 1.5,
              }}>
                Please select a society above to view its eligible residents.
              </div>
            ) : eligibleResidents.length === 0 ? (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)",
                color: "#eab308", fontSize: 12, lineHeight: 1.5,
              }}>
                No eligible residents found in this society. (Residents who are already Committee Members, Admins, or Accountants are excluded).
              </div>
            ) : (
              <Select
                className="input"
                value={selectedResidentId}
                required
                onChange={(e) => setSelectedResidentId(e.target.value)}
              >
                <option value="">Choose resident to appoint…</option>
                {eligibleResidents.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.flat_number ? `(Unit ${r.flat_number}${r.block_name ? ` - ${r.block_name}` : ''})` : ''} — {r.email}
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
                Selected: {selectedResidentObj.name}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                Email: {selectedResidentObj.email} {selectedResidentObj.phone ? `| Phone: +91 ${selectedResidentObj.phone}` : ''}
              </p>
              {selectedResidentObj.flat_number && (
                <p style={{ fontSize: 11, color: "#60a5fa", margin: 0, fontWeight: 600 }}>
                  Assigned Flat: {selectedResidentObj.flat_number} {selectedResidentObj.block_name ? `(${selectedResidentObj.block_name})` : ''}
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
              A resident can only be an <strong>Accountant</strong> or <strong>Committee Member</strong>, not both. They will be able to choose between the Resident Panel and Accountant Panel upon login.
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
        title="Create External Accountant"
        subtitle="Accountant credentials and assignment"
        icon={MdPersonAdd}
        size="md"
        showFooter
        submitLabel="Create Accountant"
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleCreateExternal}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !formData.name || !formData.email || !formData.password || (isSuperAdmin && !formData.society_id)}
        submitIcon={MdAdd}
      >
        <form onSubmit={handleCreateExternal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSuperAdmin && (
            <div>
              <SectionLabel>Society</SectionLabel>
              <Select
                className="input"
                value={formData.society_id}
                required
                onChange={(e) => setFormData({ ...formData, society_id: e.target.value })}
              >
                <option value="">Select Society</option>
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
            <input
              className="input"
              type="password"
              placeholder={t("acctPassword") || "Initial Password"}
              value={formData.password}
              required
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, opacity: 0.7 }}>
              Default: Admin@123 (Accountant can change password after login)
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
        title="Edit Accountant"
        subtitle="Update accountant contact details"
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
              Email address cannot be modified directly.
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
        title={statusConfirm.action === "deactivate" ? "Make Accountant Inactive" : "Activate Accountant"}
        message={
          statusConfirm.action === "deactivate"
            ? `Are you sure you want to deactivate ${statusConfirm.item?.name || 'this accountant'}? If this person is a resident, their resident account will remain intact but accountant privileges will be suspended.`
            : `Are you sure you want to reactivate ${statusConfirm.item?.name || 'this accountant'}? They will regain access to manage society finance.`
        }
        variant={statusConfirm.action === "deactivate" ? "danger" : "info"}
        confirmLabel={statusConfirm.action === "deactivate" ? "Yes, Make Inactive" : "Yes, Activate"}
        loading={statusConfirm.loading}
      />
    </div>
  );
}