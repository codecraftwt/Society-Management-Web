import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import {
  MdAdd, MdApartment, MdSearch, MdRefresh, MdCheckCircle,
  MdWarning, MdHomeWork, MdArrowBack
} from "react-icons/md";
import { FaBuilding, FaUserShield } from "react-icons/fa";
import Select from "../../components/common/Select";
import SocietyActionMenu from "../../components/super-admin/SocietyActionMenu";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";

const DEFAULT_PASSWORD = "Admin@123";

export default function Societies() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Add Society form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("Apartments");
  const [addLoading, setAddLoading] = useState(false);

  // Admin Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSocieties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/societies");
      setSocieties(res.data || []);
    } catch {
      showToast(t("saErrLoadSocieties"), "error");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSocieties();
  }, [loadSocieties]);

  const addSociety = async (e) => {
    if (e) e.preventDefault();
    if (!name || !address) return;
    try {
      setAddLoading(true);
      const res = await API.post("/societies", { name, address, property_type: propertyType });
      setSocieties((p) => [...p, { ...res.data, societyAdmins: null }]);
      setName(""); setAddress(""); setPropertyType("Apartments"); setShowAddForm(false);
      showToast(t("saToastSocietyCreated"));
    } catch {
      showToast(t("saErrCreateSociety"), "error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      setDeleteConfirm((prev) => ({ ...prev, loading: true }));
      await API.delete(`/societies/${deleteConfirm.id}`);
      setSocieties((p) => p.filter((s) => s.id !== deleteConfirm.id));
      showToast(t("saToastSocietyDeleted"));
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      showToast(t("saErrDeleteFail"), "error");
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const saveAdmin = async () => {
    try {
      setSaveLoading(true);
      await API.post(`/users/societies/${selectedSocietyId}/admin`, {
        name: adminName, email: adminEmail, password: DEFAULT_PASSWORD,
      });
      loadSocieties();
      setShowModal(false); setAdminName(""); setAdminEmail(""); setIsEditMode(false);
      showToast(isEditMode ? t("saToastAdminUpdated") : t("saToastAdminAssigned"));
    } catch {
      showToast(t("saErrSaveAdmin"), "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const openAdminModal = useCallback((s) => {
    setSelectedSocietyId(s.id);
    setAdminName(s.societyAdmins?.name || "");
    setAdminEmail(s.societyAdmins?.email || "");
    setIsEditMode(!!s.societyAdmins);
    setShowModal(true);
  }, []);

  const filteredSocieties = useMemo(() =>
    societies.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" ? true
          : filterStatus === "assigned" ? !!s.societyAdmins
            : !s.societyAdmins;
      return matchesSearch && matchesFilter;
    }), [societies, searchQuery, filterStatus]);

  const typeColors = {
    "Row Houses": "#10b981",
    "Commercial": "#5B8DEF",
    "Mixed": "#9F87D7",
    "Apartments": "#3B82F6",
  };

  const filterBtns = [
    { key: "all", label: t("saFilterAll") },
    { key: "assigned", label: t("saFilterAssigned") },
    { key: "unassigned", label: t("saFilterUnassigned") },
  ];

  return (
    <div className="sa-page sa-dash-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`sa-toast ${toast.type === "error" ? "sa-toast-error" : "sa-toast-success"}`}>
          {toast.type === "error" ? <MdWarning size={18} /> : <MdCheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="sa-dash-header">
        <div className="sa-dash-header-text">
          <h1 className="sa-page-title">Manage Societies</h1>
        </div>
        <GlobalButton
          variant="add"
          icon={MdAdd}
          onClick={() => setShowAddForm(true)}
        >
          {t("saAddSocietyBtn")}
        </GlobalButton>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="sa-toolbar">
        <GlobalButton
          variant="secondary"
          size="sm"
          icon={MdArrowBack}
          onClick={() => navigate(-1)}
        >
          {t("socBack")}
        </GlobalButton>
        <div className="sa-search-wrap" style={{ flex: 1 }}>
          <MdSearch size={17} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            className="sa-search-input"
            placeholder={t("saSearchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sa-segment">
          {filterBtns.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={filterStatus === key ? "sa-segment-active" : ""}
            >
              {label}
            </button>
          ))}
        </div>
        <GlobalButton
          variant="secondary"
          size="sm"
          icon={MdRefresh}
          onClick={loadSocieties}
          title={t("gpRefresh")}
          style={{ width: 38, padding: 0 }}
        />
      </div>

      {/* ── ADD SOCIETY MODAL ── */}
      <GlobalModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title={t("saCreateSocietyTitle")}
        subtitle={t("saCreateSocietySub")}
        icon={MdApartment}
        size="md"
        showFooter
        submitLabel={t("saCreateSocietyBtn")}
        cancelLabel={t("cancel")}
        onSubmit={addSociety}
        submitLoading={addLoading}
        submitDisabled={addLoading || !name || !address}
        submitIcon={MdAdd}
      >
        <form onSubmit={addSociety} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px" }}>
          <div className="sa-input-group">
            <label className="sa-label">{t("saSocietyName")}</label>
            <div className="sa-input">
              <MdApartment size={16} className="sa-input-icon" />
              <input
                placeholder={t("saSocietyNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="sa-input-group">
            <label className="sa-label">{t("saSocietyAddress")}</label>
            <div className="sa-input">
              <MdHomeWork size={16} className="sa-input-icon" />
              <input
                placeholder={t("saSocietyAddressPlaceholder")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="sa-input-group" style={{ gridColumn: "1 / -1" }}>
            <label className="sa-label">Property Type</label>
            <Select className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option value="Apartments">Apartments / Flats</option>
              <option value="Row Houses">Row Houses / Villas</option>
              <option value="Mixed">Mixed (Flats &amp; Villas)</option>
              <option value="Commercial">Commercial Complex</option>
            </Select>
          </div>
        </form>
      </GlobalModal>

      {/* ── SOCIETIES CARDS GRID ── */}
      {loading ? (
        <div className="sa-loading-state">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="sa-skeleton-card" />)}
        </div>
      ) : filteredSocieties.length === 0 ? (
        <div className="sa-empty-state">
          <FaBuilding size={48} style={{ color: "var(--text-secondary)", opacity: 0.3 }} />
          <p className="sa-empty-title">{t("saEmptyTitle")}</p>
          <p className="sa-empty-subtitle">
            {searchQuery ? t("saEmptySearchSub") : t("saEmptyDefaultSub")}
          </p>
          {!searchQuery && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              onClick={() => setShowAddForm(true)}
              style={{ marginTop: 12 }}
            >
              {t("saAddSocietyBtn")}
            </GlobalButton>
          )}
        </div>
      ) : (
        <div className="sa-society-grid">
          {filteredSocieties.map((s) => {
            const typeColor = typeColors[s.property_type] || "#9F87D7";
            return (
              <div key={s.id} className="sa-society-card">
                {/* Header row */}
                <div className="sa-soc-card-top">
                  <div className="sa-soc-icon" style={{ background: `${typeColor}1A`, color: typeColor }}>
                    {s.property_type === "Row Houses" ? <MdHomeWork size={17} /> : <FaBuilding size={17} />}
                  </div>
                  <div className="sa-soc-name-wrap">
                    <h3 className="sa-soc-name" title={s.name}>{s.name}</h3>
                    <span className={`sa-soc-status ${s.societyAdmins ? "sa-soc-active" : "sa-soc-pending"}`}>
                      <span className="sa-soc-dot" />
                      {s.societyAdmins ? t("saBadgeActive") : t("saBadgePending")}
                    </span>
                  </div>
                  {/* Action Menu */}
                  <SocietyActionMenu
                    hasAdmin={!!s.societyAdmins}
                    t={t}
                    onEditAdmin={() => openAdminModal(s)}
                    onManage={() => navigate(`/superadmin/society/${s.id}/blocks`)}
                    onDelete={() => setDeleteConfirm({ isOpen: true, id: s.id, loading: false })}
                  />
                </div>

                <div className="sa-soc-divider" />

                {/* Property Type row */}
                <div className="sa-soc-row">
                  <span className="sa-soc-row-label">TYPE</span>
                  <span className="sa-soc-type-badge" style={{ color: typeColor, background: `${typeColor}18`, borderColor: `${typeColor}30` }}>
                    {s.property_type || "Apartments"}
                  </span>
                </div>

                {/* Admin row */}
                <div className="sa-soc-row">
                  <span className="sa-soc-row-label">ADMIN</span>
                  {s.societyAdmins ? (
                    <div className="sa-soc-admin-info">
                      <div className="sa-soc-avatar">
                        {s.societyAdmins.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="sa-soc-admin-name">{s.societyAdmins.name}</span>
                    </div>
                  ) : (
                    <span className="sa-soc-unassigned">
                      <MdWarning size={13} /> {t("saNotAssigned")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADMIN MODAL ── */}
      <GlobalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditMode ? t("saModalUpdateTitle") : t("saModalAssignTitle")}
        subtitle={isEditMode ? t("saModalUpdateSub") : t("saModalAssignSub")}
        icon={FaUserShield}
        size="md"
        showFooter
        submitLabel={isEditMode ? t("saModalUpdateBtn") : t("saModalAssignBtn")}
        cancelLabel={t("cancel")}
        onSubmit={saveAdmin}
        submitLoading={saveLoading}
        submitDisabled={saveLoading || !adminName || !adminEmail}
      >
        <div className="sa-modal-body" style={{ padding: 0 }}>
          <div className="sa-input-group">
            <label className="sa-label">{t("saAdminName")}</label>
            <input className="input" placeholder={t("saAdminNamePlaceholder")}
              value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </div>
          <div className="sa-input-group">
            <label className="sa-label">{t("saAdminEmail")}</label>
            <input className="input" placeholder={t("saAdminEmailPlaceholder")}
              value={adminEmail} disabled={isEditMode}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={isEditMode ? { opacity: 0.6, cursor: "not-allowed" } : {}} />
          </div>
          <div className="sa-input-group">
            <label className="sa-label">{t("saDefaultPassword")}</label>
            <input className="input" value={DEFAULT_PASSWORD} readOnly
              style={{ opacity: 0.6, cursor: "default" }} />
            <p className="sa-hint">{t("saPasswordHint")}</p>
          </div>
        </div>
      </GlobalModal>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title={t("saConfirmDelete") || "Delete Society"}
        message="Are you sure you want to delete this society? This will remove all associated units, records, and accounts. This action cannot be undone."
        confirmLabel="Delete Society"
        cancelLabel={t("cancel") || "Cancel"}
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}