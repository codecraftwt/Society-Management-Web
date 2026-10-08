import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import API from "../../services/api";
import {
  MdAdd, MdApartment, MdHomeWork, MdWarning, MdPalette, MdRefresh
} from "react-icons/md";
import { FaBuilding, FaUserShield } from "react-icons/fa";
import Select from "../../components/common/Select";
import { getTitleError, getRequiredError, getEmailError } from "../../utils/validators";
import SocietyActionMenu from "../../components/super-admin/SocietyActionMenu";
import SocietyDetailModal from "../../components/super-admin/SocietyDetailModal";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import ThemeBrandingEditor from "../../components/common/ThemeBrandingEditor";
import { isValidHexColor } from "../../utils/themeUtils";

const DEFAULT_PASSWORD = "Admin@123";

const socPropTypeLabel = (pt, t) => {
  const map = {
    Apartments: t("saAnPropApt", "Apartments"),
    "Row Houses": t("saAnPropRow", "Row Houses"),
    Mixed: t("saAnPropMixed", "Mixed"),
    Commercial: t("saAnPropCom", "Commercial"),
  };
  return map[pt] || pt;
};

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

  // Theme Customization Modal states
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themeSociety, setThemeSociety] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#a05aff");
  const [accentColor, setAccentColor] = useState("#9e58ff");
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeSaveLoading, setThemeSaveLoading] = useState(false);
  const [themeResetLoading, setThemeResetLoading] = useState(false);

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  // Society detail modal state
  const [detailSociety, setDetailSociety] = useState(null);

  const openThemeModal = useCallback((s) => {
    const url = `/superadmin/society-theme?societyId=${s.id}&societyName=${encodeURIComponent(s.name)}`;
    navigate(url);
  }, [navigate]);

  const saveSocietyTheme = async () => {
    if (!themeSociety) return;
    if (!isValidHexColor(primaryColor)) {
      toast.error("Please enter a valid primary HEX color (e.g. #7c3aed)");
      return;
    }
    if (accentColor && !isValidHexColor(accentColor)) {
      toast.error("Please enter a valid accent HEX color (e.g. #8b5cf6)");
      return;
    }
    try {
      setThemeSaveLoading(true);
      await API.put(`/societies/${themeSociety.id}/theme`, {
        primary: primaryColor,
        accent: accentColor || primaryColor,
      });
      toast.success(t("saToastThemeSaved", "Society branding saved successfully"));
      setShowThemeModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t("saErrSaveTheme", "Failed to save society theme"));
    } finally {
      setThemeSaveLoading(false);
    }
  };

  const handleResetTheme = async () => {
    if (!themeSociety) return;
    try {
      setThemeResetLoading(true);
      await API.post(`/societies/${themeSociety.id}/theme/reset`);
      setPrimaryColor("#a05aff");
      setAccentColor("#9e58ff");
      toast.success(t("saToastThemeReset", "Theme reset to system default"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("saErrResetTheme", "Failed to reset theme"));
    } finally {
      setThemeResetLoading(false);
    }
  };

  const loadSocieties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/societies");
      setSocieties(res.data || []);
    } catch {
      toast.error(t("saErrLoadSocieties"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSocieties();
  }, [loadSocieties]);

  const addSociety = async (e) => {
    if (e) e.preventDefault();
    const nameErr = getTitleError(name, "Society name");
    if (nameErr) { toast.error(nameErr); return; }
    const addressErr = getRequiredError(address, "Address");
    if (addressErr) { toast.error(addressErr); return; }
    try {
      setAddLoading(true);
      const res = await API.post("/societies", { name: name.trim(), address: address.trim(), property_type: propertyType });
      setSocieties((p) => [...p, { ...res.data, societyAdmins: null }]);
      setName(""); setAddress(""); setPropertyType("Apartments"); setShowAddForm(false);
      toast.success(t("saToastSocietyCreated"));
    } catch {
      toast.error(t("saErrCreateSociety"));
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
      toast.success(t("saToastSocietyDeleted"));
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error(t("saErrDeleteFail"));
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const saveAdmin = async () => {
    const nameErr = getTitleError(adminName, "Admin name");
    if (nameErr) { toast.error(nameErr); return; }
    const emailErr = getEmailError(adminEmail);
    if (emailErr) { toast.error(emailErr); return; }
    try {
      setSaveLoading(true);
      await API.post(`/users/societies/${selectedSocietyId}/admin`, {
        name: adminName.trim(), email: adminEmail.trim(), password: DEFAULT_PASSWORD,
      });
      loadSocieties();
      setShowModal(false); setAdminName(""); setAdminEmail(""); setIsEditMode(false);
      toast.success(isEditMode ? t("saToastAdminUpdated") : t("saToastAdminAssigned"));
    } catch {
      toast.error(t("saErrSaveAdmin"));
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
    "Apartments": "var(--accent)",
  };

  const filterBtns = [
    { id: "all", label: t("saFilterAll"), badge: societies.length },
    { id: "assigned", label: t("saFilterAssigned"), badge: societies.filter((s) => !!s.societyAdmins).length },
    { id: "unassigned", label: t("saFilterUnassigned"), badge: societies.filter((s) => !s.societyAdmins).length },
  ];

  return (
    <div className="sa-page sa-dash-page animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(158, 88, 255, 0.3)",
              color: "#ffffff",
            }}
          >
            <MdApartment size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("saSocPageTitle", "Manage Societies")}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {t("saSocCountSub", "{count} societies", { count: societies.length })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 flex-wrap shrink-0">
          <SlidingTabs value={filterStatus} onChange={setFilterStatus} items={filterBtns} />
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("saSearchPlaceholder")}
            maxWidth={280}
          />
          <GlobalButton
            variant="add"
            borderDraw
            icon={MdAdd}
            className="w-full sm:w-auto justify-center shrink-0"
            style={{ fontWeight: 700 }}
            onClick={() => setShowAddForm(true)}
          >
            {t("saAddSocietyBtn")}
          </GlobalButton>
        </div>
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
        submitDisabled={addLoading || Boolean(getTitleError(name, "Society name")) || Boolean(getRequiredError(address, "Address"))}
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
            <label className="sa-label">{t("saSocPropTypeLabel", "Property Type")}</label>
            <Select className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option value="Apartments">{t("saSocTypeApt", "Apartments / Flats")}</option>
              <option value="Row Houses">{t("saSocTypeRow", "Row Houses / Villas")}</option>
              <option value="Mixed">{t("saSocTypeMixed", "Mixed (Flats & Villas)")}</option>
              <option value="Commercial">{t("saSocTypeCom", "Commercial Complex")}</option>
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
              borderDraw
              onClick={() => setShowAddForm(true)}
              style={{ marginTop: 12 }}
            >
              {t("saAddSocietyBtn")}
            </GlobalButton>
          )}
        </div>
      ) : (
        <div className="sa-society-grid" key={`${filterStatus}-${searchQuery.trim().toLowerCase()}`}>
          {filteredSocieties.map((s, i) => {
            const typeColor = typeColors[s.property_type] || "#9F87D7";
            return (
              <div key={s.id} className="sa-society-card animate-fadeIn" style={{ animationDelay: `${i * 30}ms`, cursor: "pointer" }} onClick={() => setDetailSociety(s)}>
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
                    onCustomizeTheme={() => openThemeModal(s)}
                    onDelete={() => setDeleteConfirm({ isOpen: true, id: s.id, loading: false })}
                  />
                </div>

                <div className="sa-soc-divider" />

                {/* Property Type row */}
                <div className="sa-soc-row">
                  <span className="sa-soc-row-label">{t("saSocRowType", "TYPE")}</span>
                  <span className="sa-soc-type-badge" style={{ color: typeColor, background: `${typeColor}18`, borderColor: `${typeColor}30` }}>
                    {socPropTypeLabel(s.property_type || "Apartments", t)}
                  </span>
                </div>

                {/* Admin row */}
                <div className="sa-soc-row">
                  <span className="sa-soc-row-label">{t("saSocRowAdmin", "ADMIN")}</span>
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
        submitDisabled={saveLoading || Boolean(getTitleError(adminName, "Admin name")) || Boolean(getEmailError(adminEmail))}
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

      {/* ── THEME CUSTOMIZATION MODAL ── */}
      <GlobalModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title={t("saThemeModalTitle", "Society Branding & Theme")}
        subtitle={
          themeSociety
            ? `${themeSociety.name} · Custom brand color tokens`
            : t("saThemeModalSub", "Configure society-specific brand palette")
        }
        icon={MdPalette}
        size="lg"
        showFooter
        submitLabel={t("saThemeSaveBtn", "Save Theme")}
        cancelLabel={t("cancel")}
        onSubmit={saveSocietyTheme}
        submitLoading={themeSaveLoading}
        submitDisabled={themeSaveLoading || !isValidHexColor(primaryColor)}
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <GlobalButton
              variant="secondary"
              icon={MdRefresh}
              onClick={handleResetTheme}
              loading={themeResetLoading}
              title="Revert to default application theme"
            >
              {t("saResetToDefault", "Reset to Default")}
            </GlobalButton>
            <div className="flex items-center gap-2">
              <GlobalButton
                variant="secondary"
                onClick={() => setShowThemeModal(false)}
                disabled={themeSaveLoading || themeResetLoading}
              >
                {t("cancel", "Cancel")}
              </GlobalButton>
              <GlobalButton
                variant="primary"
                onClick={saveSocietyTheme}
                loading={themeSaveLoading}
                disabled={!isValidHexColor(primaryColor) || themeResetLoading}
              >
                {t("saSaveTheme", "Save Theme")}
              </GlobalButton>
            </div>
          </div>
        }
      >
        <div className="py-2">
          {themeLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <p className="text-xs text-secondary">Loading society branding configuration…</p>
            </div>
          ) : (
            <ThemeBrandingEditor
              primaryColor={primaryColor}
              accentColor={accentColor}
              onChangePrimary={setPrimaryColor}
              onChangeAccent={setAccentColor}
              onApplyPreset={(p) => {
                setPrimaryColor(p.primary);
                setAccentColor(p.accent);
              }}
              societyName={themeSociety?.name || "Society"}
            />
          )}
        </div>
      </GlobalModal>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title={t("saConfirmDelete") || "Delete Society"}
        message={t("saSocDeleteMsg", "Are you sure you want to delete this society? This will remove all associated units, records, and accounts. This action cannot be undone.")}
        confirmLabel={t("saSocDeleteLabel", "Delete Society")}
        cancelLabel={t("cancel") || "Cancel"}
        variant="danger"
        loading={deleteConfirm.loading}
      />

      {/* ── SOCIETY DETAIL MODAL ── */}
      <SocietyDetailModal
        society={detailSociety}
        onClose={() => setDetailSociety(null)}
        onEditAdmin={() => {
          const s = detailSociety;
          setDetailSociety(null);
          if (s) openAdminModal(s);
        }}
        onManage={() => {
          const s = detailSociety;
          setDetailSociety(null);
          if (s) navigate(`/superadmin/society/${s.id}/blocks`);
        }}
        t={t}
      />
    </div>
  );
}