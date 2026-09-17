import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { hasPermission } from "../../utils/permissions";
import HoloToggle from "../../components/common/HoloToggle";
import {
  FaShieldAlt,
  FaUserTie,
  FaUserShield,
  FaUsers,
  FaHome,
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
  MdOutlineEditOff,
  MdPayments,
  MdAttachMoney,
  MdListAlt,
  MdHistory,
} from "react-icons/md";
import "./Admin.css";

const MODULE_GROUPS = {
  "Overview & Administration": ["dashboard", "settings"],
  "Community & Property": ["resident", "property", "parking_slots", "flat_history", "tenant_management"],
  "Finance & Operations": ["manage_bills", "payments", "expenses", "general_ledger", "financial_audit_log", "maintenance", "accounting", "accountant", "amenities"],
  "Communication & Support": ["notice", "complaints", "emergency"],
  "Security & Logs": ["guard", "visitor_logs"],
  "Reports & Documents": ["reports", "society_documents"],
};

const MODULE_META = {
  dashboard: { label: "Dashboard", icon: MdDashboard, desc: "Society overview, KPI summary metrics, and quick statistics" },
  resident: { label: "Residents & Directory", icon: MdApartment, desc: "Resident profiles, flat mapping, and directory access" },
  property: { label: "Properties & Flats", icon: MdApartment, desc: "Society blocks, floors, and unit layouts" },
  parking_slots: { label: "Parking Management", icon: MdOutlineDirectionsCar, desc: "Allocate, inspect, and manage vehicle parking assignments and slots" },
  flat_history: { label: "Flat History", icon: MdOutlineHistory, desc: "Historical occupancy, tenancy, and ownership records" },
  tenant_management: { label: "Tenant Approvals", icon: MdOutlinePersonAdd, desc: "Review, approve, and manage tenant move-in applications" },
  guard: { label: "Guards & Security Staff", icon: MdOutlineLocalPolice, desc: "Guard accounts, daily rosters, and shift schedules" },
  visitor_logs: { label: "Visitor Records", icon: MdOutlineBadge, desc: "Gate check-ins, deliveries, guest activity, and entries" },
  notice: { label: "Notices & Circulars", icon: MdCampaign, desc: "Broadcast, draft, view, and publish society-wide circulars" },
  complaints: { label: "Complaints & Helpdesk", icon: MdReportProblem, desc: "Track, discuss, and update maintenance issue tickets" },
  accountant: { label: "Accountant Roles", icon: MdAccountBalance, desc: "Appoint and manage assigned society accountants" },
  manage_bills: { label: "Manage Bills & Invoices", icon: MdOutlineReceiptLong, desc: "Create, distribute, and collect utility & maintenance dues" },
  payments: { label: "Payments", icon: MdPayments, desc: "View and confirm resident & online payments against bills" },
  expenses: { label: "Expenses", icon: MdAttachMoney, desc: "Record, edit, and void society money-out expenses" },
  general_ledger: { label: "Cash Book Ledger", icon: MdListAlt, desc: "View the running cash book of credits (income) and debits (money-out)" },
  financial_audit_log: { label: "Financial Audit Log", icon: MdHistory, desc: "View the trail of opening balance, expense, and payment records" },
  accounting: { label: "Account Management", icon: MdOutlineReceiptLong, desc: "Financial overview, balance KPIs, and share of income by source" },
  maintenance: { label: "Maintenance Management", icon: MdBuild, desc: "Configure recurring maintenance schedules, rates, and dues" },
  amenities: { label: "Amenities & Facilities", icon: MdBuild, desc: "Configure facilities and manage member slot bookings" },
  reports: { label: "Analytics & Reports", icon: MdOutlineFolderShared, desc: "Generate and export financial, visitor, and complaint reports" },
  society_documents: { label: "Documents & Files", icon: MdVerified, desc: "Official bylaws, certificates, circulars, and society records" },
  emergency: { label: "Emergency & SOS", icon: MdSecurity, desc: "Broadcast SOS alerts and resolve active society emergencies" },
  settings: { label: "General Settings", icon: MdSettings, desc: "Configure society preferences and notification defaults" },
};

const ROLE_TABS = [
  { key: "COMMITTEE_MEMBER", label: "Committee Member", icon: FaUserTie, color: "#818cf8" },
  { key: "ACCOUNTANT", label: "Accountant", icon: FaCalculator, color: "#34d399" },
  { key: "GUARD", label: "Guard", icon: FaUserShield, color: "#38bdf8" },
  { key: "RESIDENT", label: "Resident", icon: FaUsers, color: "#2dd4bf" },
  { key: "TENANT", label: "Tenant", icon: FaHome, color: "#e879f9" },
];

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

export default function RolePermissions() {
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
  const itemsPerPage = 10;

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

  const totalEnabled = useMemo(
    () => Object.values(sectionStates).filter(Boolean).length,
    [sectionStates]
  );

  const filteredSocieties = useMemo(() => {
    if (!societySearch.trim()) return societies;
    const q = societySearch.toLowerCase();
    return societies.filter(
      (s) => s.name?.toLowerCase().includes(q) || String(s.id).includes(q)
    );
  }, [societies, societySearch]);

  return (
    <div className="rp-root">
      {/* ── TOP HEADER ── */}
      <div className="rp-header">
        <div className="rp-header-left">
          <div
            className="rp-header-icon"
            style={{
              background: `linear-gradient(135deg, ${selectedRoleMeta?.color || "#6366f1"}33, ${selectedRoleMeta?.color || "#6366f1"}11)`,
              borderColor: `${selectedRoleMeta?.color || "#6366f1"}55`,
              color: selectedRoleMeta?.color || "#6366f1",
            }}
          >
            {selectedRoleMeta?.icon ? <selectedRoleMeta.icon size={22} /> : <FaShieldAlt size={22} />}
          </div>
          <div className="rp-header-titles">
            <h2 className="rp-header-title">Role & Section Permissions</h2>
            <p className="rp-header-sub">
              Manage section-level access controls. Toggle any module on or off for the selected role.
            </p>
          </div>
        </div>

        <div className="rp-header-right">
          <span
            className="rp-role-badge"
            style={{
              background: `${selectedRoleMeta?.color || "#6366f1"}1a`,
              borderColor: `${selectedRoleMeta?.color || "#6366f1"}44`,
            }}
          >
            <span className="rp-role-ic" style={{ background: selectedRoleMeta?.color || "#6366f1" }}>
              {selectedRoleMeta?.icon ? <selectedRoleMeta.icon size={12} /> : null}
            </span>
            <span>{selectedRoleMeta?.label || selectedRole}</span>
          </span>
        </div>
      </div>

      {/* ── READ-ONLY NOTICE FOR NON-EDITORS ── */}
      {!canEdit && (
        <div
          className="rp-readonly-banner"
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            borderColor: "rgba(245, 158, 11, 0.25)",
          }}
        >
          <MdOutlineEditOff size={18} />
          <div>
            <strong>Read-only mode:</strong> You do not have permission to modify role settings.
          </div>
        </div>
      )}

      {/* ── CONTROLS: ROLE TABS & TARGET SOCIETY ── */}
      <div className="rp-controls">
        <div className="rp-controls-row">
          {/* Role tabs */}
          <div className="rp-role-tabs">
            {ROLE_TABS.map((role) => {
              const active = selectedRole === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedRole(role.key)}
                  className={`rp-role-tab${active ? " active" : ""}`}
                  style={
                    active
                      ? {
                        background: `${role.color}22`,
                        color: role.color,
                        borderColor: `${role.color}66`,
                        boxShadow: `0 6px 18px -8px ${role.color}`,
                      }
                      : undefined
                  }
                >
                  <role.icon size={14} />
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>

          {/* Theme-compatible Custom Society target dropdown (Super Admin) */}
          {isSuperAdmin && (
            <div ref={societyRef} style={{ position: "relative", minWidth: "260px" }}>
              <button
                type="button"
                onClick={() => canEdit && setSocietyOpen((prev) => !prev)}
                className="rp-society-select-card"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 14px",
                  borderRadius: "14px",
                  border: `1.5px solid ${societyOpen ? (selectedRoleMeta?.color || "var(--accent)") : "var(--glass-border)"}`,
                  background: "var(--card-inner-bg)",
                  color: "var(--text-primary)",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: societyOpen
                    ? "0 6px 22px -4px rgba(99, 102, 241, 0.28)"
                    : "0 4px 16px -4px rgba(0, 0, 0, 0.15)",
                }}
              >
                <div
                  className="rp-society-icon-box"
                  style={{
                    background: `${selectedRoleMeta?.color || "var(--accent)"}22`,
                    color: selectedRoleMeta?.color || "var(--accent)",
                  }}
                >
                  <FaBuilding size={14} />
                </div>
                <div className="rp-society-info" style={{ textAlign: "left" }}>
                  <span className="rp-society-tag">Target Society</span>
                  <span className="rp-society-display-name">
                    {selectedSocietyId
                      ? societies.find((s) => String(s.id) === String(selectedSocietyId))?.name || "Select Society"
                      : "Choose a Society..."}
                  </span>
                </div>
                <div className="rp-society-arrow-box">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{
                      transform: societyOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {societyOpen && (
                <div
                  className="animate-scaleIn"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    left: 0,
                    minWidth: "280px",
                    maxHeight: "320px",
                    background: "var(--card-bg, #1e293b)",
                    border: "1.5px solid var(--glass-border)",
                    borderRadius: "14px",
                    padding: "8px",
                    boxShadow: "0 16px 36px -8px rgba(0, 0, 0, 0.45)",
                    zIndex: 110,
                    backdropFilter: "blur(12px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      padding: "4px 8px 6px 8px",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Select Target Society</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>
                      {societies.length} societies
                    </span>
                  </div>

                  {societies.length > 5 && (
                    <div style={{ position: "relative", marginBottom: "4px" }}>
                      <input
                        type="text"
                        placeholder="Search society..."
                        value={societySearch}
                        onChange={(e) => setSocietySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          border: "1px solid var(--glass-border)",
                          background: "var(--card-inner-bg)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      overflowY: "auto",
                      maxHeight: "220px",
                    }}
                  >
                    {filteredSocieties.length === 0 ? (
                      <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                        No societies found
                      </div>
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
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "10px",
                              border: "none",
                              background: isSelected ? `${selectedRoleMeta?.color || "var(--accent)"}1c` : "transparent",
                              color: isSelected ? (selectedRoleMeta?.color || "var(--accent)") : "var(--text-primary)",
                              fontSize: "12px",
                              fontWeight: isSelected ? "700" : "600",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "var(--card-inner-bg)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "transparent";
                              }
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                              <FaBuilding size={13} style={{ opacity: isSelected ? 1 : 0.65, flexShrink: 0, color: isSelected ? (selectedRoleMeta?.color || "var(--accent)") : "inherit" }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {soc.name}
                              </span>
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: "var(--card-inner-bg)",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--glass-border)",
                                }}
                              >
                                #{soc.id}
                              </span>
                            </div>
                            {isSelected && (
                              <FaCheck size={11} style={{ flexShrink: 0, marginLeft: "6px" }} />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search & filter strip */}
        <div className="rp-search-strip">
          <div className="rp-search" style={{ position: "relative" }}>
            <FaSearch className="rp-search-ic" size={13} />
            <input
              type="text"
              placeholder="Search section name, category, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rp-search-input"
              disabled={loading}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rp-search-clear"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Theme-compatible Custom Category Dropdown */}
            <div ref={categoryRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setCategoryOpen((prev) => !prev)}
                className="rp-category-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: `1.5px solid ${categoryOpen ? (selectedRoleMeta?.color || "var(--accent)") : "var(--glass-border)"}`,
                  background: "var(--card-inner-bg)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: categoryOpen ? "0 4px 16px -2px rgba(99, 102, 241, 0.2)" : "0 2px 6px rgba(0, 0, 0, 0.04)",
                }}
              >
                <FaLayerGroup size={12} style={{ color: selectedRoleMeta?.color || "var(--accent)" }} />
                <span>{selectedGroup === "ALL" ? "All Categories" : selectedGroup}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{
                    marginLeft: "2px",
                    color: "var(--text-secondary)",
                    transform: categoryOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {categoryOpen && (
                <div
                  className="animate-scaleIn"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    minWidth: "230px",
                    background: "var(--card-bg, #1e293b)",
                    border: "1.5px solid var(--glass-border)",
                    borderRadius: "14px",
                    padding: "6px",
                    boxShadow: "0 16px 36px -8px rgba(0, 0, 0, 0.45)",
                    zIndex: 100,
                    backdropFilter: "blur(12px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px 4px 10px",
                      fontSize: "10px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                    }}
                  >
                    Filter Category
                  </div>

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
                        onClick={() => {
                          setSelectedGroup(cat.key);
                          setCategoryOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "10px",
                          border: "none",
                          background: isSelected ? `${selectedRoleMeta?.color || "var(--accent)"}1c` : "transparent",
                          color: isSelected ? (selectedRoleMeta?.color || "var(--accent)") : "var(--text-primary)",
                          fontSize: "12px",
                          fontWeight: isSelected ? "700" : "600",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "var(--card-inner-bg)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <IconComp size={14} style={{ opacity: isSelected ? 1 : 0.65, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cat.label}
                          </span>
                        </div>
                        {isSelected && (
                          <FaCheck size={11} style={{ flexShrink: 0, marginLeft: "6px" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rp-filters">
              {[
                { id: "ALL", label: "All" },
                { id: "ENABLED", label: "Granted" },
                { id: "DISABLED", label: "Denied" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setFilterMode(mode.id)}
                  className={`rp-filter-btn${filterMode === mode.id ? " active" : ""}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SUMMARY STRIP ── */}
      <div className="rp-summary">
        <div className="rp-summary-item">
          <span className="rp-summary-key">Enabled Sections</span>
          <span className="rp-summary-val" style={{ color: selectedRoleMeta?.color }}>
            {totalEnabled} / {flatModuleList.length}
          </span>
        </div>
        <div className="rp-summary-divider" />
        <div className="rp-summary-item">
          <span className="rp-summary-key">Target Role</span>
          <span className="rp-summary-val">{selectedRoleMeta?.label || selectedRole}</span>
        </div>
        {isSuperAdmin && (
          <>
            <div className="rp-summary-divider" />
            <div className="rp-summary-item">
              <span className="rp-summary-key">Society</span>
              <span className="rp-summary-val">
                {selectedSocietyId
                  ? societies.find((s) => String(s.id) === String(selectedSocietyId))?.name ||
                  `#${selectedSocietyId}`
                  : "—"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── PERMISSIONS TABLE ── */}
      {isSuperAdmin && !selectedSocietyId ? (
        <div className="rp-empty">
          <FaBuilding size={40} />
          <h3>Select a society to continue</h3>
          <p>Choose a target society from the dropdown above to view and configure section permissions.</p>
        </div>
      ) : loading ? (
        <div className="rp-loading">
          <div className="rp-spinner" />
          <p>Loading section permissions table...</p>
        </div>
      ) : filteredModulesList.length === 0 ? (
        <div className="rp-empty">
          <MdSecurity size={40} />
          <h3>No matching sections found</h3>
          <p>Try adjusting your search query or reset the filter mode.</p>
        </div>
      ) : (
        <div
          className="rp-table-card"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
            marginTop: "1.5rem",
          }}
        >
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--card-inner-bg, rgba(255, 255, 255, 0.03))",
                    borderBottom: "1px solid var(--glass-border)",
                  }}
                >
                  <th style={{ padding: "14px 18px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", width: "60px" }}>
                    #
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                    Section / Feature Module
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", width: "200px" }}>
                    Category
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", width: "140px" }}>
                    Status
                  </th>
                  <th style={{ padding: "14px 18px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", width: "160px", textAlign: "center" }}>
                    Access Control
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((item, idx) => {
                  const IconComp = item.meta.icon || MdSecurity;
                  const isEnabled = !!sectionStates[item.key];
                  const editable = canEdit && hasSocietyTarget;
                  const itemIndex = (safeCurrentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={item.key}
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        background: isEnabled
                          ? "linear-gradient(90deg, rgba(99, 102, 241, 0.03) 0%, transparent 100%)"
                          : "transparent",
                        transition: "background 0.2s ease",
                      }}
                      className="hover:bg-white/3"
                    >
                      {/* Index */}
                      <td style={{ padding: "16px 18px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {itemIndex}
                      </td>

                      {/* Section Info */}
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isEnabled ? "rgba(99, 102, 241, 0.15)" : "var(--card-inner-bg)",
                              border: `1px solid ${isEnabled ? "rgba(99, 102, 241, 0.3)" : "var(--glass-border)"}`,
                              color: isEnabled ? "var(--accent)" : "var(--text-secondary)",
                              flexShrink: 0,
                            }}
                          >
                            <IconComp size={20} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                              {item.meta.label}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                              {item.meta.desc}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: "16px 18px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "var(--card-inner-bg)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item.group}
                        </span>
                      </td>

                      {/* Status Pill */}
                      <td style={{ padding: "16px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isEnabled ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.12)",
                            border: `1px solid ${isEnabled ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.25)"}`,
                            color: isEnabled ? "#10b981" : "#94a3b8",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: isEnabled ? "#10b981" : "#64748b",
                            }}
                          />
                          {isEnabled ? "Access Granted" : "Access Denied"}
                        </span>
                      </td>

                      {/* Holo Toggle Button */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <HoloToggle
                            id={`holo-toggle-${item.key}`}
                            checked={isEnabled}
                            onChange={() => requestToggleSection(item.key)}
                            disabled={!editable}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION CONTROLS (10 PER PAGE) ── */}
          {filteredModulesList.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderTop: "1px solid var(--glass-border)",
                background: "var(--card-inner-bg, rgba(255, 255, 255, 0.02))",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                Showing <strong style={{ color: "var(--text-primary)" }}>{startIdx}</strong> to{" "}
                <strong style={{ color: "var(--text-primary)" }}>{endIdx}</strong> of{" "}
                <strong style={{ color: "var(--text-primary)" }}>{filteredModulesList.length}</strong> sections
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: safeCurrentPage === 1 ? "transparent" : "var(--card-bg)",
                      border: "1px solid var(--glass-border)",
                      color: safeCurrentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                      opacity: safeCurrentPage === 1 ? 0.4 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isActive = safeCurrentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isActive
                            ? `${selectedRoleMeta?.color || "var(--accent)"}26`
                            : "var(--card-bg)",
                          border: `1px solid ${isActive
                            ? selectedRoleMeta?.color || "var(--accent)"
                            : "var(--glass-border)"
                            }`,
                          color: isActive
                            ? selectedRoleMeta?.color || "var(--accent)"
                            : "var(--text-primary)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: safeCurrentPage === totalPages ? "transparent" : "var(--card-bg)",
                      border: "1px solid var(--glass-border)",
                      color: safeCurrentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                      opacity: safeCurrentPage === totalPages ? 0.4 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
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
                background: "var(--modal-bg, var(--card-bg, #1e293b))",
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