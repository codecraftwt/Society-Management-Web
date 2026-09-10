import { useEffect, useState, useContext } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdEdit, MdPerson, MdEmail, MdBadge,
  MdCheck, MdAccountBalance, MdPhone,
  MdApartment, MdDelete
} from "react-icons/md";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";

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
      background: "var(--chip-bg, rgba(37,99,235,0.04))",
      border: "1px solid var(--glass-border)",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: "rgba(37,99,235,0.12)",
        border: "1px solid rgba(37,99,235,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--accent)",
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
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0,
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
      <div style={{
        padding: "0 12px", height: 40,
        display: "flex", alignItems: "center", gap: 6,
        borderRight: "1px solid var(--glass-border)",
        background: "rgba(37,99,235,0.08)",
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

export default function Accountant() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);

  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  const [accountant, setAccountant] = useState(null);
  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(true);

  // SuperAdmin Society Filter
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    return localStorage.getItem("superadmin_society_filter") || "ALL";
  });

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", phone: "", society_id: "",
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null, loading: false });

  const fetchSocieties = async () => {
    try {
      const res = await API.get("/societies");
      setSocietiesList(res.data || []);
    } catch {
      setSocietiesList([]);
    }
  };

  const fetchAccountant = async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        if (!filterSocietyId || filterSocietyId === "ALL") {
          const res = await API.get("/accountant/all");
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.accountants || []);
          setAccountants(list);
          setAccountant(null);
        } else {
          const res = await API.get(`/accountant/society/${filterSocietyId}`);
          const accObj = res.data?.accountant || res.data?.data || res.data;
          setAccountant(accObj && typeof accObj === "object" && !Array.isArray(accObj) ? accObj : null);
          setAccountants([]);
        }
      } else {
        const res = await API.get("/accountant/me");
        const accObj = res.data?.accountant || res.data?.data || res.data;
        setAccountant(accObj && typeof accObj === "object" && !Array.isArray(accObj) ? accObj : null);
      }
    } catch {
      setAccountant(null);
      setAccountants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchSocieties();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchAccountant();
  }, [isSuperAdmin, filterSocietyId]);

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setFilterSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    if (formData.phone && !isValidIndianPhone(formData.phone)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSubmitLoading(true);
      const targetSocId = isSuperAdmin ? formData.society_id : undefined;
      const res = await API.post("/accountant", {
        ...formData,
        phone: formData.phone.trim() || undefined,
        society_id: targetSocId,
      });

      if (isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL")) {
        fetchAccountant();
      } else {
        setAccountant(res.data);
      }
      setShowCreateModal(false);
      setFormData({ name: "", email: "", password: "", phone: "", society_id: "" });
      setPhoneError("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create accountant");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (formData.phone && !isValidIndianPhone(formData.phone)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSubmitLoading(true);
      const targetId = accountant?.id;
      const res = await API.put(`/accountant/${targetId || ""}`, {
        name: formData.name,
        phone: formData.phone.trim() || undefined,
      });

      if (isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL")) {
        fetchAccountant();
      } else {
        setAccountant(res.data);
      }
      setShowEditModal(false);
      setPhoneError("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update accountant");
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (acc) => {
    const target = acc || accountant;
    setAccountant(target);
    setFormData({
      name: target.name || "",
      email: target.email || "",
      password: "",
      phone: target.phone || "",
      society_id: target.society_id || "",
    });
    setPhoneError("");
    setShowEditModal(true);
  };

  const handleDeleteConfirm = async () => {
    const target = deleteConfirm.item || accountant;
    if (!target) return;
    try {
      setDeleteConfirm(p => ({ ...p, loading: true }));
      await API.delete(`/accountant/${target.id}`);
      if (isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL")) {
        fetchAccountant();
      } else {
        setAccountant(null);
      }
      setDeleteConfirm({ isOpen: false, item: null, loading: false });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete accountant");
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

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
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
            flexShrink: 0,
          }}>
            {acc.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{acc.name}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>{acc.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "society",
      header: "Society",
      render: (acc) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          <MdApartment size={15} style={{ color: "var(--accent)" }} />
          <span>{acc.societyName || "—"}</span>
        </div>
      ),
    },
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
      key: "status",
      header: "Status",
      render: () => <GlobalBadge variant="success" dot>Active</GlobalBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (acc) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <GlobalButton
            variant="edit"
            size="sm"
            icon={MdEdit}
            onClick={() => openEditModal(acc)}
          >
            {t("acctEdit") || "Edit"}
          </GlobalButton>
          <GlobalButton
            variant="delete"
            size="sm"
            icon={MdDelete}
            onClick={() => setDeleteConfirm({ isOpen: true, item: acc, loading: false })}
          />
        </div>
      ),
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
            background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.08))",
            border: "1.5px solid rgba(37,99,235,0.25)", color: "var(--accent)",
          }}>
            <MdAccountBalance size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("acctTitle")}</h2>
            <p className="page-subtitle">{t("acctSubtitle")}</p>
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

          {!accountant && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={() => {
                const sid = (filterSocietyId === "ALL" ? "" : filterSocietyId);
                setFormData({ name: "", email: "", password: "", phone: "", society_id: sid });
                setShowCreateModal(true);
              }}
            >
              {t("acctAddBtn") || "Add Accountant"}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── SUPER ADMIN LIST VIEW ── */}
      {isSuperAdmin && (!filterSocietyId || filterSocietyId === "ALL") && (
        <GlobalTable
          columns={tableColumns}
          data={accountants}
          loading={loading}
          emptyMessage="No accountants registered."
          emptyIcon={MdPerson}
          emptyAction={
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={() => {
                setFormData({ name: "", email: "", password: "", phone: "", society_id: "" });
                setShowCreateModal(true);
              }}
            >
              {t("acctAddBtn") || "Add Accountant"}
            </GlobalButton>
          }
        />
      )}

      {/* ── VIEW CARD (Admin or Filtered Single Society) ── */}
      {accountant && (
        <div className="data-table-wrap animate-fadeIn" style={{ maxWidth: 520, width: "100%", borderRadius: 16 }}>
          {/* Card header */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: "#fff",
                boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              }}>
                {accountant.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {accountant.name}
                </p>
                <div style={{ marginTop: 4 }}>
                  <GlobalBadge variant="info" icon={MdBadge}>
                    {t("acctRole")?.toUpperCase() || "ACCOUNTANT"}
                  </GlobalBadge>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GlobalButton
                variant="edit"
                size="sm"
                icon={MdEdit}
                onClick={() => openEditModal(accountant)}
              >
                {t("acctEdit") || "Edit"}
              </GlobalButton>
              <GlobalButton
                variant="delete"
                size="sm"
                icon={MdDelete}
                onClick={() => setDeleteConfirm({ isOpen: true, item: accountant, loading: false })}
              />
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <InfoRow icon={<MdPerson size={16} />} label={t("acctName")} value={accountant.name} />
            <InfoRow icon={<MdEmail size={16} />} label={t("acctEmail")} value={accountant.email} />
            <InfoRow
              icon={<MdPhone size={16} />}
              label={t("acctMobileShort") || "Mobile"}
              value={accountant.phone ? `+91 ${accountant.phone}` : "Not set"}
            />
            <InfoRow icon={<MdBadge size={16} />} label={t("acctRoleLabel")} value={t("acctRole")} />
          </div>
        </div>
      )}

      {/* ── CREATE ACCOUNTANT MODAL ── */}
      <GlobalModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPhoneError("");
        }}
        title={t("acctCreateTitle") || "Create Accountant"}
        subtitle="Accountant credentials and assignment"
        icon={MdPerson}
        size="md"
        showFooter
        submitLabel={t("acctCreate") || "Create Accountant"}
        cancelLabel={t("cancel") || "Cancel"}
        onSubmit={handleCreate}
        submitLoading={submitLoading}
        submitDisabled={submitLoading || !formData.name || !formData.email || !formData.password || (isSuperAdmin && !formData.society_id)}
        submitIcon={MdAdd}
      >
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
            <SectionLabel>{t("acctName")}</SectionLabel>
            <input
              className="input"
              type="text"
              placeholder={t("acctNamePlaceholder")}
              value={formData.name}
              required
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <SectionLabel>{t("acctEmail")}</SectionLabel>
            <input
              className="input"
              type="email"
              placeholder={t("acctEmailPlaceholder")}
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
            <SectionLabel>{t("acctPassword")}</SectionLabel>
            <input
              className="input"
              type="password"
              placeholder={t("acctPassword")}
              value={formData.password}
              required
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, opacity: 0.7 }}>
              This password will be sent to the accountant for account activation.
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
            <SectionLabel>{t("acctName")}</SectionLabel>
            <input
              className="input"
              type="text"
              placeholder={t("acctNamePlaceholder")}
              value={formData.name}
              required
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <SectionLabel>{t("acctEmail")}</SectionLabel>
            <input
              className="input"
              type="email"
              value={formData.email}
              disabled
              style={{ opacity: 0.5, cursor: "not-allowed" }}
            />
            <p style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.6, marginTop: 4 }}>
              {t("acctEmailLockNote") || "Email cannot be changed once created"}
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

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Accountant"
        message="Are you sure you want to delete this accountant account? All billing logs created by this user will be preserved."
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}