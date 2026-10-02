import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import { hasPermission } from "../../utils/permissions";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Pagination from "../../components/common/Pagination";
import HoloToggle from "../../components/common/HoloToggle";
import {
  FaShieldAlt,
  FaUserTie,
  FaCalculator,
  FaSave,
  FaSearch,
  FaBuilding,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaLayerGroup,
} from "react-icons/fa";
import {
  MdSecurity,
  MdDashboard,
  MdApartment,
  MdCampaign,
  MdReportProblem,
  MdAccountBalance,
  MdVerified,
  MdSettings,
  MdBuild,
  MdOutlineReceiptLong,
  MdOutlineFolderShared,
  MdOutlineDirectionsCar,
  MdOutlineHistory,
  MdOutlinePersonAdd,
  MdOutlineLocalPolice,
  MdOutlineBadge,
  MdInventory2,
  MdOutlineEditOff,
  MdPayments,
  MdAttachMoney,
  MdListAlt,
  MdHistory,
} from "react-icons/md";
import "./Admin.css";
import "./RolePermissions.css";

const MODULE_GROUPS = {
  "Overview & Administration": ["dashboard", "settings"],
  "Community & Property": ["resident", "property", "parking_slots", "flat_history", "tenant_management"],
  "Finance & Operations": ["manage_bills", "payments", "expenses", "general_ledger", "financial_audit_log", "maintenance", "accounting", "accountant", "amenities"],
  "Communication & Support": ["notice", "complaints", "emergency"],
  "Security & Logs": ["guard", "visitor_logs", "parcel"],
  "Reports & Documents": ["reports", "society_documents"],
};

const MODULE_META = {
  dashboard: { label: "Dashboard", icon: MdDashboard, desc: "Society overview, KPI summary metrics, and quick statistics" },
  resident: { label: "Residents", icon: MdApartment, desc: "Resident profiles, flat mapping, and directory access" },
  property: { label: "Manage Property", icon: MdApartment, desc: "Society blocks, floors, and unit layouts" },
  parking_slots: { label: "Parking Management", icon: MdOutlineDirectionsCar, desc: "Allocate, inspect, and manage vehicle parking assignments and slots" },
  flat_history: { label: "Flat History", icon: MdOutlineHistory, desc: "Historical occupancy, tenancy, and ownership records" },
  tenant_management: { label: "Tenant Management", icon: MdOutlinePersonAdd, desc: "Review, approve, and manage tenant move-in applications" },
  guard: { label: "Guards", icon: MdOutlineLocalPolice, desc: "Guard accounts, daily rosters, and shift schedules" },
  visitor_logs: { label: "Visitor Logs", icon: MdOutlineBadge, desc: "Gate check-ins, deliveries, guest activity, and entries" },
  parcel: { label: "Parcels", icon: MdInventory2, desc: "Read-only oversight of society parcel records and gate handovers" },
  notice: { label: "Notices", icon: MdCampaign, desc: "Broadcast, draft, view, and publish society-wide circulars" },
  complaints: { label: "Complaints", icon: MdReportProblem, desc: "Track, discuss, and update maintenance issue tickets" },
  accountant: { label: "Accountant", icon: MdAccountBalance, desc: "Appoint and manage assigned society accountants" },
  manage_bills: { label: "Manage Bills", icon: MdOutlineReceiptLong, desc: "Create, distribute, and collect utility & maintenance dues" },
  payments: { label: "Payments", icon: MdPayments, desc: "View and confirm resident & online payments against bills" },
  expenses: { label: "Expenses", icon: MdAttachMoney, desc: "Record, edit, and void society money-out expenses" },
  general_ledger: { label: "Cash Book Ledger", icon: MdListAlt, desc: "View the running cash book of credits (income) and debits (money-out)" },
  financial_audit_log: { label: "Financial Audit Log", icon: MdHistory, desc: "View the trail of opening balance, expense, and payment records" },
  accounting: { label: "Account Management", icon: MdOutlineReceiptLong, desc: "Financial overview, balance KPIs, and share of income by source" },
  maintenance: { label: "Maintenance", icon: MdBuild, desc: "Configure recurring maintenance schedules, rates, and dues" },
  amenities: { label: "Amenities", icon: MdBuild, desc: "Configure facilities and manage member slot bookings" },
  reports: { label: "Reports", icon: MdOutlineFolderShared, desc: "Generate and export financial, visitor, and complaint reports" },
  society_documents: { label: "Document", icon: MdVerified, desc: "Official bylaws, certificates, circulars, and society records" },
  emergency: { label: "SOS Management", icon: MdSecurity, desc: "Broadcast SOS alerts and resolve active society emergencies" },
  settings: { label: "General Settings", icon: MdSettings, desc: "Configure society preferences and notification defaults" },
};

const ROLE_TABS = [
  { key: "COMMITTEE_MEMBER", label: "Committee Member", icon: FaUserTie, color: "var(--accent)" },
  { key: "ACCOUNTANT", label: "Accountant", icon: FaCalculator, color: "var(--accent)" },
];

const ROLE_TAB_ITEMS = [
  {
    id: "COMMITTEE_MEMBER",
    label: "Committee Member",
    icon: <FaUserTie size={14} className="mr-1" />,
  },
  {
    id: "ACCOUNTANT",
    label: "Accountant",
    icon: <FaCalculator size={14} className="mr-1" />,
  },
];

const STATUS_FILTER_ITEMS = [
  { id: "ALL", label: "All" },
  { id: "ENABLED", label: "Granted" },
  { id: "DISABLED", label: "Denied" },
];

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

export default function RolePermissions({ embedded = false }) {
  const { t } = useLang();
  const { user, refreshPermissions } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.activeRole === "SUPER_ADMIN";

  const [selectedRole, setSelectedRole] = useState("COMMITTEE_MEMBER");
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(user?.society_id || "");

  const [availableModules, setAvailableModules] = useState({});
  const [sectionStates, setSectionStates] = useState({});
  const [initialSectionStates, setInitialSectionStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // 'ALL' | 'ENABLED' | 'DISABLED'
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef(null);

  const [societyOpen, setSocietyOpen] = useState(false);
  const [societySearch, setSocietySearch] = useState("");
  const societyRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const userRole = (user?.activeRole || user?.role || "").toUpperCase();
  const isAdminOrSocietyAdmin = ["SUPER_ADMIN", "SOCIETY_ADMIN", "ADMIN"].includes(userRole);
  const canEdit = isAdminOrSocietyAdmin && hasPermission(user, "settings", "edit");
  const hasSocietyTarget = isSuperAdmin ? !!selectedSocietyId : true;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }
      if (societyRef.current && !societyRef.current.contains(e.target)) {
        setSocietyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAdminOrSocietyAdmin) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-semibold text-slate-300">Access Denied</p>
        <p className="text-sm mt-1">Only Administrators and Society Administrators can manage role & section permissions.</p>
      </div>
    );
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMode, selectedGroup, selectedRole, selectedSocietyId]);

  // Load societies for Super Admin target dropdown
  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    API.get("/societies")
      .then((res) => {
        if (active) setSocieties(res.data || []);
      })
      .catch((err) => console.error("Error fetching societies:", err));
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  // Fetch modules catalog & dynamic permissions
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await Promise.resolve();
        if (!active) return;

        if (isSuperAdmin && !selectedSocietyId) {
          setLoading(false);
          setSectionStates({});
          setInitialSectionStates({});
          return;
        }

        setLoading(true);
        const modRes = await API.get("/permissions/modules");
        if (!active) return;
        const catalog = modRes.data?.data || modRes.data || {};
        const modulesData = catalog.modules || catalog.availableModules || MODULE_META;
        setAvailableModules(modulesData);

        const params = { role: selectedRole };
        if (selectedSocietyId) {
          params.society_id = selectedSocietyId;
        }

        const permRes = await API.get("/permissions", { params });
        if (!active) return;
        const rawPerms = permRes.data?.permissions || permRes.data?.data?.permissions || {};
        const rawSections = permRes.data?.sections || permRes.data?.data?.sections || {};

        const parsedSections = {};
        Object.keys(modulesData).forEach((key) => {
          if (rawSections[key] !== undefined) {
            parsedSections[key] = !!rawSections[key];
          } else {
            const val = rawPerms[key];
            parsedSections[key] = Array.isArray(val) ? val.length > 0 : !!val;
          }
        });

        setSectionStates(parsedSections);
        setInitialSectionStates(deepCopy(parsedSections));
      } catch (err) {
        if (!active) return;
        console.error("Error fetching permissions:", err);
        toast.error(err.response?.data?.message || "Failed to load permissions");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [selectedRole, selectedSocietyId, isSuperAdmin]);

  // Direct section toggle with confirmation prompt and live update
  const requestToggleSection = (moduleKey) => {
    if (!canEdit || !hasSocietyTarget) return;
    const meta = MODULE_META[moduleKey] || { label: moduleKey };
    const roleMeta = ROLE_TABS.find((r) => r.key === selectedRole) || { label: selectedRole };
    const willEnable = !sectionStates[moduleKey];

    setConfirmModal({
      isOpen: true,
      title: willEnable ? `Enable "${meta.label}" Section?` : `Disable "${meta.label}" Section?`,
      message: willEnable
        ? `Are you sure you want to enable "${meta.label}" for all ${roleMeta.label} users? It will appear immediately on their navigation menu.`
        : `Are you sure you want to disable "${meta.label}" for all ${roleMeta.label} users? It will be removed from their navigation menu immediately.`,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        const updated = { ...sectionStates, [moduleKey]: willEnable };
        setSectionStates(updated);

        // Commit immediately to backend
        try {
          const payload = {
            role: selectedRole,
            society_id: selectedSocietyId || user?.society_id,
            sections: { [moduleKey]: willEnable },
          };
          const res = await API.post("/permissions/update", payload);
          if (res.data?.success) {
            toast.success(
              willEnable
                ? `"${meta.label}" enabled for ${roleMeta.label}`
                : `"${meta.label}" disabled for ${roleMeta.label}`
            );
            setInitialSectionStates((prev) => ({ ...prev, [moduleKey]: willEnable }));

            // Sync local AuthContext permissions immediately if modifying user's role
            if (refreshPermissions) {
              await refreshPermissions();
            }
            window.dispatchEvent(new CustomEvent("permissions_updated", { detail: { role: selectedRole, module: moduleKey, enabled: willEnable } }));
          }
        } catch (err) {
          console.error("Failed to update permission:", err);
          toast.error("Failed to save permission change.");
          // Revert state on failure
          setSectionStates((prev) => ({ ...prev, [moduleKey]: !willEnable }));
        }
      },
    });
  };

  // Category bulk toggle
  const requestToggleCategory = (groupTitle, groupModules, willEnable) => {
    if (!canEdit || !hasSocietyTarget) return;
    const roleMeta = ROLE_TABS.find((r) => r.key === selectedRole) || { label: selectedRole };

    setConfirmModal({
      isOpen: true,
      title: willEnable ? `Enable all sections in "${groupTitle}"?` : `Disable all sections in "${groupTitle}"?`,
      message: willEnable
        ? `This will turn ON all ${groupModules.length} sections under "${groupTitle}" for ${roleMeta.label}.`
        : `This will turn OFF all ${groupModules.length} sections under "${groupTitle}" for ${roleMeta.label}.`,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        const updated = { ...sectionStates };
        const changedSections = {};
        groupModules.forEach((mod) => {
          updated[mod] = willEnable;
          changedSections[mod] = willEnable;
        });
        setSectionStates(updated);

        try {
          const payload = {
            role: selectedRole,
            society_id: selectedSocietyId || user?.society_id,
            sections: changedSections,
          };
          const res = await API.post("/permissions/update", payload);
          if (res.data?.success) {
            toast.success(`"${groupTitle}" updated successfully!`);
            setInitialSectionStates((prev) => ({ ...prev, ...changedSections }));
            if (refreshPermissions) {
              await refreshPermissions();
            }
            window.dispatchEvent(new CustomEvent("permissions_updated", { detail: { role: selectedRole } }));
          }
        } catch (err) {
          console.error("Failed to save category permissions:", err);
          toast.error("Failed to update category permissions.");
        }
      },
    });
  };

  const selectedRoleMeta = ROLE_TABS.find((r) => r.key === selectedRole);

  const flatModuleList = useMemo(() => {
    const list = [];
    const seen = new Set();

    Object.entries(MODULE_GROUPS).forEach(([groupName, mods]) => {
      mods.forEach((modKey) => {
        // Exclude accountant module when managing ACCOUNTANT role
        if (selectedRole === "ACCOUNTANT" && modKey === "accountant") return;

        seen.add(modKey);
        list.push({
          key: modKey,
          group: groupName,
          meta: MODULE_META[modKey] || { label: modKey, icon: MdSecurity, desc: "Section Module" },
        });
      });
    });

    // Also include any other module from availableModules or MODULE_META if not already added
    const allKnown = { ...availableModules, ...MODULE_META };
    Object.keys(allKnown).forEach((modKey) => {
      if (!seen.has(modKey)) {
        if (selectedRole === "ACCOUNTANT" && modKey === "accountant") return;
        seen.add(modKey);
        list.push({
          key: modKey,
          group: "Other Services",
          meta: MODULE_META[modKey] || { label: modKey, icon: MdSecurity, desc: "System Module" },
        });
      }
    });

    return list;
  }, [availableModules, selectedRole]);

  const filteredModulesList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return flatModuleList.filter((item) => {
      const isEnabled = !!sectionStates[item.key];

      if (selectedGroup !== "ALL" && item.group !== selectedGroup) return false;
      if (filterMode === "ENABLED" && !isEnabled) return false;
      if (filterMode === "DISABLED" && isEnabled) return false;
      if (!query) return true;

      return (
        item.meta.label.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query) ||
        item.meta.desc.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query) ||
        (isEnabled ? "granted enabled access" : "denied disabled blocked").includes(query)
      );
    });
  }, [flatModuleList, sectionStates, searchQuery, filterMode, selectedGroup]);

  const totalPages = Math.max(1, Math.ceil(filteredModulesList.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedList = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredModulesList.slice(start, start + itemsPerPage);
  }, [filteredModulesList, safeCurrentPage, itemsPerPage]);

  const startIdx = filteredModulesList.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(safeCurrentPage * itemsPerPage, filteredModulesList.length);

  const filteredSocieties = useMemo(() => {
    if (!societySearch.trim()) return societies;
    const q = societySearch.toLowerCase();
    return societies.filter(
      (s) => s.name?.toLowerCase().includes(q) || String(s.id).includes(q)
    );
  }, [societies, societySearch]);

  return (
    <div className="set-rp">
      {/* ── Header. Skipped when embedded because the Settings detail shell
             already renders the page title. ── */}
      {!embedded && (
        <div className="set-rp__head">
          <div className="set-rp__head-titles">
            <h2 className="set-rp__head-title">Role &amp; Section Permissions</h2>
            <p className="set-rp__head-sub">
              Manage section-level access controls. Toggle any module on or off for the selected role.
            </p>
          </div>

          <div className="set-rp__head-right">
            <span className="set-rp__role">
              <span className="set-rp__role-ic" style={{ background: "var(--accent)" }}>
                {selectedRoleMeta?.icon ? <selectedRoleMeta.icon size={12} /> : <FaShieldAlt size={12} />}
              </span>
              <span>{selectedRoleMeta?.label || selectedRole}</span>
            </span>
          </div>
        </div>
      )}

      {/* ── READ-ONLY NOTICE FOR NON-EDITORS ── */}
      {!canEdit && (
        <div className="set-rp__readonly">
          <MdOutlineEditOff size={18} />
          <div>
            <strong>Read-only mode:</strong> You do not have permission to modify role settings.
          </div>
        </div>
      )}

      {/* ── CONTROLS TOOLBAR: one row, everything vertically aligned ── */}
      <div className="set-rp__toolbar">
        {/* Left: Role Switcher segmented control */}
        <SlidingTabs
          items={ROLE_TAB_ITEMS}
          value={selectedRole}
          onChange={setSelectedRole}
        />

        <span className="set-rp__spacer" />

        {/* Right: Society Select (Super Admin), Category, Status filters, Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Target Society Dropdown (Super Admin) */}
          {isSuperAdmin && (
            <div ref={societyRef} className="set-rp__soc">
              <button
                type="button"
                onClick={() => canEdit && setSocietyOpen((prev) => !prev)}
                className="set-rp__soc-btn"
                data-open={societyOpen}
                disabled={!canEdit}
                style={!canEdit ? { cursor: "not-allowed", opacity: 0.6 } : undefined}
              >
                <span className="set-rp__soc-ic">
                  <FaBuilding size={13} />
                </span>
                <span className="set-rp__soc-text">
                  <span className="set-rp__soc-tag">Target Society</span>
                  <span className="set-rp__soc-name">
                    {selectedSocietyId
                      ? societies.find((s) => String(s.id) === String(selectedSocietyId))?.name || "Select Society"
                      : "Choose a Society..."}
                  </span>
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="set-rp__soc-chev"
                  style={{ transform: societyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {societyOpen && (
                <div className="set-rp__panel">
                  <div className="set-rp__panel-search">
                    <input
                      value={societySearch}
                      onChange={(e) => setSocietySearch(e.target.value)}
                      placeholder="Search societies..."
                      aria-label="Search societies"
                    />
                  </div>

                  {filteredSocieties.length === 0 ? (
                    <div className="set-rp__panel-label">No societies found</div>
                  ) : (
                    filteredSocieties.map((soc) => {
                      const isSelected = String(selectedSocietyId) === String(soc.id);
                      return (
                        <button
                          key={soc.id}
                          type="button"
                          onClick={() => {
                            setSelectedSocietyId(String(soc.id));
                            setSocietyOpen(false);
                          }}
                          className="set-rp__opt"
                          data-selected={isSelected}
                        >
                          <FaBuilding size={13} className="set-rp__opt-ic" />
                          <span className="set-rp__opt-label">{soc.name}</span>
                          <span className="set-rp__opt-id">#{soc.id}</span>
                          {isSelected && <FaCheck size={11} className="set-rp__opt-check" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category Dropdown */}
          <div ref={categoryRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setCategoryOpen((prev) => !prev)}
              className="set-rp__cat"
              data-open={categoryOpen}
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
            >
              <FaLayerGroup size={13} />
              <span>{selectedGroup === "ALL" ? "All Categories" : selectedGroup}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="set-rp__cat-chev"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {categoryOpen && (
              <div className="set-rp__panel set-rp__panel--right" role="listbox">
                <div className="set-rp__panel-label">Filter Category</div>

                {[
                  { key: "ALL", label: "All Categories", icon: FaLayerGroup },
                  { key: "Overview & Administration", label: "Overview & Administration", icon: MdDashboard },
                  { key: "Community & Property", label: "Community & Property", icon: MdApartment },
                  { key: "Finance & Operations", label: "Finance & Operations", icon: MdOutlineReceiptLong },
                  { key: "Communication & Support", label: "Communication & Support", icon: MdCampaign },
                  { key: "Security & Logs", label: "Security & Logs", icon: MdOutlineLocalPolice },
                  { key: "Reports & Documents", label: "Reports & Documents", icon: MdOutlineFolderShared },
                ].map((cat) => {
                  const isSelected = selectedGroup === cat.key;
                  const IconComp = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedGroup(cat.key);
                        setCategoryOpen(false);
                      }}
                      className="set-rp__opt"
                      data-selected={isSelected}
                    >
                      <IconComp size={14} className="set-rp__opt-ic" />
                      <span className="set-rp__opt-label">{cat.label}</span>
                      {isSelected && <FaCheck size={11} className="set-rp__opt-check" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status Filters */}
          <SlidingTabs
            items={STATUS_FILTER_ITEMS}
            value={filterMode}
            onChange={setFilterMode}
          />

          {/* Search */}
          <ExpandableSearch
            placeholder={t("rpSearchSections")}
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
            maxWidth={260}
          />
        </div>
      </div>

      {/* ── PERMISSION LIST ── */}
      {isSuperAdmin && !selectedSocietyId ? (
        <div className="set-rp__empty">
          <FaBuilding size={38} />
          <h3>{t("paySelectContinue")}</h3>
          <p>Choose a target society from the dropdown above to view and configure section permissions.</p>
        </div>
      ) : loading ? (
        <div className="set-rp__loading">
          <div className="set-rp__spinner" />
          <p>{t("rpLoading")}</p>
        </div>
      ) : filteredModulesList.length === 0 ? (
        <div className="set-rp__empty">
          <MdSecurity size={38} />
          <h3>{t("rpNoMatch")}</h3>
          <p>Try adjusting your search query or reset the filter mode.</p>
        </div>
      ) : (
        <div
          className="set-rp__list"
          role="table"
          aria-label="Section permissions"
        >
          {/* Column header — desktop only. */}
          <div className="set-rp__row set-rp__row--head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Section / Module</span>
            <span role="columnheader" className="set-rp__col-cat">Category</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="set-rp__col-access">Access</span>
          </div>

          {paginatedList.map((item, idx) => {
            const IconComp = item.meta.icon || MdSecurity;
            const isEnabled = !!sectionStates[item.key];
            const editable = canEdit && hasSocietyTarget;
            const itemIndex = (safeCurrentPage - 1) * itemsPerPage + idx + 1;

            return (
              <div
                key={item.key}
                className="set-rp__row"
                role="row"
                data-enabled={isEnabled}
              >
                <span className="set-rp__col-index" role="cell">
                  {String(itemIndex).padStart(2, "0")}
                </span>

                {/* Icon container never touches the text. */}
                <div className="set-rp__col-mod set-rp__mod" role="cell">
                  <span className="set-rp__mod-ic" aria-hidden="true">
                    <IconComp size={18} />
                  </span>
                  <div className="set-rp__mod-text">
                    <p className="set-rp__mod-title">{item.meta.label}</p>
                    <p className="set-rp__mod-desc">{item.meta.desc}</p>
                  </div>
                </div>

                <div className="set-rp__col-cat" role="cell">
                  <span className="set-rp__cat-badge" title={item.group}>{item.group}</span>
                </div>

                <div className="set-rp__col-status" role="cell">
                  <span
                    className={`set-rp__status ${
                      isEnabled ? "set-rp__status--on" : "set-rp__status--off"
                    }`}
                  >
                    <span className="set-rp__status-dot" aria-hidden="true" />
                    {isEnabled ? "Granted" : "Denied"}
                  </span>
                </div>

                <div className="set-rp__col-access" role="cell">
                  <HoloToggle
                    id={`holo-toggle-${item.key}`}
                    checked={isEnabled}
                    onChange={() => requestToggleSection(item.key)}
                    disabled={!editable}
                  />
                </div>
              </div>
            );
          })}

          {/* ── Compact pagination footer ── */}
          <div className="set-rp__foot">
            <span className="set-rp__count">
              Showing <b>{startIdx}</b>–<b>{endIdx}</b> of <b>{filteredModulesList.length}</b> sections
            </span>

            <Pagination
              page={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={itemsPerPage}
              onPageSizeChange={(s) => {
                setItemsPerPage(s);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmModal.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center animate-fadeIn"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 1400,
            }}
            onClick={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
          >
            <div
              className="p-6 rounded-2xl w-[92%] max-w-md animate-scaleIn"
              style={{
                background: "var(--modal-bg)",
                border: "1.5px solid var(--glass-border)",
                boxShadow: "0 20px 40px -15px rgba(0,0,0,0.6)",
                color: "var(--text-primary)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f59e0b",
                    flexShrink: 0,
                  }}
                >
                  <FaExclamationTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {confirmModal.title}
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                    Role Access Confirmation
                  </p>
                </div>
              </div>

              <p style={{ fontSize: "13px", lineHeight: "1.5", color: "var(--text-secondary)", marginBottom: 24 }}>
                {confirmModal.message}
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
                  className="btn-secondary"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="btn-primary"
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
