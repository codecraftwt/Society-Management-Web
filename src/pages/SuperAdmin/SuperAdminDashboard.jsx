
import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import {
  MdAdd, MdDelete, MdManageAccounts, MdClose,
  MdApartment, MdTrendingUp, MdSearch,
  MdRefresh, MdCheckCircle, MdWarning,
  MdHomeWork // ✅ Added Row House Icon
} from "react-icons/md";
import { BiSolidEdit } from "react-icons/bi";
import { FaBuilding, FaUserShield } from "react-icons/fa";
import Select from "../../components/common/Select";

const DEFAULT_PASSWORD = "Admin@123";

export default function SuperAdminDashboard() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useLang();

  const [societies, setSocieties] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("Apartments"); // ✅ NEW STATE
  const [addLoading, setAddLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const res = await API.get("/societies");
      setSocieties(res.data || []);
    } catch {
      showToast(t("saErrLoadSocieties"), "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSocieties(); }, []);

  const addSociety = async () => {
    if (!name || !address) return;
    try {
      setAddLoading(true);
      // ✅ Send property_type
      const res = await API.post("/societies", { name, address, property_type: propertyType });
      // The API returns the raw row on POST. Append it to list.
      setSocieties((p) => [...p, { ...res.data, societyAdmins: null }]);
      setName(""); setAddress(""); setPropertyType("Apartments"); setShowAddForm(false);
      showToast(t("saToastSocietyCreated"));
    } catch {
      showToast(t("saErrCreateSociety"), "error");
    } finally { setAddLoading(false); }
  };

  const deleteSociety = async (id) => {
    if (!window.confirm(t("saConfirmDelete"))) return;
    try {
      await API.delete(`/societies/${id}`);
      setSocieties((p) => p.filter((s) => s.id !== id));
      showToast(t("saToastSocietyDeleted"));
    } catch {
      showToast(t("saErrDeleteFail"), "error");
    }
  };

  const saveAdmin = async () => {
    try {
      setSaveLoading(true);
      await API.post(`/users/societies/${selectedSocietyId}/admin`, {
        name: adminName, email: adminEmail, password: DEFAULT_PASSWORD,
      });
      fetchSocieties();
      setShowModal(false); setAdminName(""); setAdminEmail(""); setIsEditMode(false);
      showToast(isEditMode ? t("saToastAdminUpdated") : t("saToastAdminAssigned"));
    } catch {
      showToast(t("saErrSaveAdmin"), "error");
    } finally { setSaveLoading(false); }
  };

  const filteredSocieties = societies.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ? true
        : filterStatus === "assigned" ? !!s.societyAdmins
          : !s.societyAdmins;
    return matchesSearch && matchesFilter;
  });

  const totalAssigned = societies.filter((s) => !!s.societyAdmins).length;
  const totalUnassigned = societies.length - totalAssigned;

  const stats = [
    { label: t("saStatTotal"), value: societies.length, icon: FaBuilding, color: "var(--accent)", bg: "var(--accent-soft)" },
    { label: t("saStatAssigned"), value: totalAssigned, icon: FaUserShield, color: "#38A169", bg: "rgba(56,161,105,0.12)" },
    { label: t("saStatPending"), value: totalUnassigned, icon: MdWarning, color: "#DD6B20", bg: "rgba(221,107,32,0.12)" },
    {
      label: t("saStatCoverage"), value: societies.length ? `${Math.round((totalAssigned / societies.length) * 100)}%` : "0%",
      icon: MdTrendingUp, color: "#9F87D7", bg: "rgba(159,135,215,0.12)"
    },
  ];

  const filterBtns = [
    { key: "all", label: t("saFilterAll") },
    { key: "assigned", label: t("saFilterAssigned") },
    { key: "unassigned", label: t("saFilterUnassigned") },
  ];

  return (
    <div className="sa-page space-y-6">

      {toast && (
        <div className={`sa-toast ${toast.type === "error" ? "sa-toast-error" : "sa-toast-success"}`}>
          {toast.type === "error" ? <MdWarning size={18} /> : <MdCheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="sa-page-er">
        <div>
          <h1 className="sa-page-title">{t("saOverviewTitle")}</h1>
          <p className="sa-page-subtitle">{t("saOverviewSubtitle")}</p>
        </div>
        <button onClick={() => setShowAddForm((p) => !p)} className="sa-add-btn">
          {showAddForm ? <MdClose size={18} /> : <MdAdd size={18} />}
          {showAddForm ? t("cancel") : t("saAddSocietyBtn")}
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="sa-stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="sa-stat-card" style={{ "--stat-c": stat.color, "--stat-bg": stat.bg }}>
            <div className="sa-stat-icon">
              <stat.icon size={20} />
            </div>
            <div className="sa-stat-body">
              <p className="sa-stat-label">{stat.label}</p>
              <p className="sa-stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── ADD FORM ── */}
      {showAddForm && (
        <div className="sa-form-card">
          <div className="sa-form-er">
            <div className="sa-form-icon"><MdApartment size={20} /></div>
            <div>
              <h3 className="sa-form-title">{t("saCreateSocietyTitle")}</h3>
              <p className="sa-form-subtitle">{t("saCreateSocietySub")}</p>
            </div>
          </div>
          <div className="sa-form-fields" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "end" }}>
            <div className="sa-input-group">
              <label className="sa-label">{t("saSocietyName")}</label>
              <div className="sa-input">
                <MdApartment size={16} className="sa-input-icon" />
                <input placeholder={t("saSocietyNamePlaceholder")}
                  value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="sa-input-group">
              <label className="sa-label">{t("saSocietyAddress")}</label>
              <div className="sa-input">
                <MdHomeWork size={16} className="sa-input-icon" />
                <input placeholder={t("saSocietyAddressPlaceholder")}
                  value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            {/* ✅ NEW PROPERTY TYPE DROPDOWN */}
            <div className="sa-input-group">
              <label className="sa-label">Property Type</label>
              <Select className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="Apartments">Apartments / Flats</option>
                <option value="Row Houses">Row Houses / Villas</option>
                <option value="Mixed">Mixed (Flats & Villas)</option>
                <option value="Commercial">Commercial Complex</option>
              </Select>
            </div>
            <button onClick={addSociety} disabled={addLoading || !name || !address} className="sa-btn sa-btn-primary" style={{ height: "42px" }}>
              {addLoading ? <span className="sa-spinner" /> : <MdAdd size={18} />}
              {t("saCreateSocietyBtn")}
            </button>
          </div>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="sa-toolbar">
        <div className="sa-search-wrap">
          <MdSearch size={17} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input className="sa-search-input" placeholder={t("saSearchPlaceholder")}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="sa-segment">
          {filterBtns.map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={filterStatus === key ? "sa-segment-active" : ""}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={fetchSocieties} className="sa-btn sa-btn-ghost" title={t("gpRefresh")}
          style={{ width: 38, padding: 0, flexShrink: 0 }}>
          <MdRefresh size={17} />
        </button>
      </div>

      {/* ── SOCIETIES GRID ── */}
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
        </div>
      ) : (
        <div className="sa-grid">
          {filteredSocieties.map((s) => (
            <div key={s.id} className="sa-card">
              <div className="sa-card-er">
                {/* ✅ DYNAMIC ICON BASED ON PROPERTY TYPE */}
                <div className="sa-card-icon">
                  {s.property_type === "Row Houses" ? <MdHomeWork size={18} /> : <FaBuilding size={18} />}
                </div>
                <div className="sa-card-title-wrap">
                  <h3 className="sa-card-title">{s.name}</h3>
                  <p className="sa-card-address">{s.address}</p>
                </div>
                <span className={`sa-badge ${s.societyAdmins ? "sa-badge-active" : "sa-badge-pending"}`}>
                  {s.societyAdmins ? t("saBadgeActive") : t("saBadgePending")}
                </span>
              </div>

              {/* ✅ ADDED BADGE FOR PROPERTY TYPE */}
              {(() => {
                const toneMap = {
                  "Row Houses": ["#10b981", "rgba(16,185,129,0.12)", "rgba(16,185,129,0.24)"],
                  "Commercial": ["#5B8DEF", "rgba(91,141,239,0.12)", "rgba(91,141,239,0.24)"],
                  "Mixed": ["#9F87D7", "rgba(159,135,215,0.12)", "rgba(159,135,215,0.24)"],
                  "Apartments": ["#F59E0B", "rgba(245,158,11,0.12)", "rgba(245,158,11,0.24)"],
                };
                const [c, bg, bd] = toneMap[s.property_type] || toneMap["Commercial"];
                return (
                  <div className="sa-card-features">
                    <span className="sa-card-badge" data-tone
                      style={{ "--typeof-c": c, "--typeof-bg": bg, "--typeof-bd": bd }}>
                      {s.property_type || "Apartments"}
                    </span>
                  </div>
                );
              })()}

              <div className="sa-card-divider" />

              <div className="sa-admin-section">
                <div className="sa-admin-label">
                  <FaUserShield size={13} /> {t("saSocietyAdmin")}
                </div>
                {s.societyAdmins ? (
                  <div className="sa-admin-info">
                    <div className="sa-admin-avatar">
                      {s.societyAdmins.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="sa-admin-name">{s.societyAdmins.name}</p>
                      <p className="sa-admin-email">{s.societyAdmins.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="sa-admin-unassigned">
                    <MdWarning size={14} /> {t("saNotAssigned")}
                  </p>
                )}
              </div>

              <div className="sa-card-actions">
                <button
                  onClick={() => {
                    setSelectedSocietyId(s.id);
                    setAdminName(s.societyAdmins?.name || "");
                    setAdminEmail(s.societyAdmins?.email || "");
                    setIsEditMode(!!s.societyAdmins);
                    setShowModal(true);
                  }}
                  className="sa-btn sa-btn-ghost"
                >
                  <BiSolidEdit size={15} />
                  {s.societyAdmins ? t("saEditAdmin") : t("saAssignAdmin")}
                </button>

                <button onClick={() => navigate(`/superadmin/society/${s.id}/blocks`)}
                  className="sa-btn sa-btn-primary">
                  <MdManageAccounts size={15} /> {t("saManageBtn")}
                </button>

                <button onClick={() => deleteSociety(s.id)} className="sa-btn sa-btn-danger" title={t("mpDelete")}>
                  <MdDelete size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADMIN MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }}>
          <div className="sa-modal">
            <div className="sa-modal-er">
              <div className="sa-modal-icon"><FaUserShield size={20} /></div>
              <div>
                <h3 className="sa-modal-title">
                  {isEditMode ? t("saModalUpdateTitle") : t("saModalAssignTitle")}
                </h3>
                <p className="sa-modal-subtitle">
                  {isEditMode ? t("saModalUpdateSub") : t("saModalAssignSub")}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="sa-modal-close">
                <MdClose size={18} />
              </button>
            </div>

            <div className="sa-modal-body">
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

            <div className="sa-modal-footer">
              <button onClick={() => setShowModal(false)} className="sa-modal-cancel">{t("cancel")}</button>
              <button onClick={saveAdmin} disabled={saveLoading || !adminName || !adminEmail}
                className="sa-modal-save">
                {saveLoading ? <span className="sa-spinner" /> : null}
                {isEditMode ? t("saModalUpdateBtn") : t("saModalAssignBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}