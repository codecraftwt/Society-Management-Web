import { useState, useEffect, useContext } from "react";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaShieldAlt,
  FaUserTie,
  FaCalculator,
  FaCheckSquare,
  FaRegSquare,
  FaUndo,
  FaSave,
  FaSearch,
  FaBuilding,
  FaInfoCircle,
} from "react-icons/fa";
import {
  MdSecurity,
  MdLockOutline,
  MdDashboard,
  MdApartment,
  MdCampaign,
  MdReportProblem,
  MdAccountBalance,
  MdVerified,
  MdSettings,
  MdBuild,
} from "react-icons/md";
import "./Admin.css";

const MODULE_GROUPS = {
  "Overview & Administration": ["dashboard", "settings"],
  "Community & Property": ["resident", "property", "parking_slots", "flat_history", "tenant_management"],
  "Finance & Operations": ["manage_bills", "accountant", "amenities"],
  "Communication & Support": ["notice", "complaints", "emergency"],
  "Security & Logs": ["guard", "visitor_logs"],
  "Reports & Documents": ["reports", "society_documents"],
};

const MODULE_META = {
  dashboard: { label: "Dashboard", icon: MdDashboard, desc: "Access society overview and summary stats" },
  resident: { label: "Residents & Directory", icon: MdApartment, desc: "View, approve, and manage resident profiles" },
  property: { label: "Properties & Flats", icon: MdApartment, desc: "Manage society blocks, floors, and units" },
  parking_slots: { label: "Parking Slots", icon: MdVerified, desc: "Allocate, inspect, and manage vehicle parking" },
  flat_history: { label: "Flat History", icon: MdVerified, desc: "Access historical ownership and occupancy logs" },
  tenant_management: { label: "Tenant Approvals", icon: MdApartment, desc: "Review, approve, or reject tenant requests" },
  guard: { label: "Guards & Security Staff", icon: MdSecurity, desc: "Manage guard accounts, duties, and shift rosters" },
  visitor_logs: { label: "Visitor Records", icon: MdVerified, desc: "Monitor visitor check-ins and gate entries" },
  notice: { label: "Notices & Circulars", icon: MdCampaign, desc: "Post, edit, and broadcast society announcements" },
  complaints: { label: "Complaints & Helpdesk", icon: MdReportProblem, desc: "Review, track, and resolve society complaints" },
  accountant: { label: "Accountant Roles", icon: MdAccountBalance, desc: "Manage finance managers and accounting users" },
  manage_bills: { label: "Manage Bills & Invoices", icon: MdAccountBalance, desc: "Create, distribute, and track maintenance bills" },
  amenities: { label: "Amenities & Facilities", icon: MdBuild, desc: "Manage amenities and member booking slots" },
  reports: { label: "Analytics & Reports", icon: MdReportProblem, desc: "Generate and export society activity reports" },
  society_documents: { label: "Documents & Files", icon: MdVerified, desc: "Upload and share official society documents" },
  emergency: { label: "Emergency & SOS", icon: MdSecurity, desc: "Monitor active alerts and trigger emergencies" },
  settings: { label: "General Settings", icon: MdSettings, desc: "Configure society configurations and preferences" },
};

const ACTION_LABELS = {
  view: "View / Read",
  create: "Create / Add",
  edit: "Edit / Update",
  delete: "Delete / Remove",
  promote: "Promote / Demote",
  status: "Change Status",
  create_slot: "Add Slot",
  edit_slot: "Edit Slot",
  delete_slot: "Delete Slot",
  allocate: "Allocate Slot",
  release: "Release Slot",
  approve: "Approve Requests",
  reject: "Reject Requests",
  edit_shift: "Manage Shifts",
  checkin: "Check In",
  checkout: "Check Out",
  discuss: "Comment / Discuss",
  update_status: "Update Status",
  toggle_status: "Toggle Active State",
  appoint: "Appoint Role",
  generate: "Generate Invoices",
  manage_bookings: "Manage Bookings",
  export: "Export Reports",
  upload: "Upload Files",
  download: "Download Files",
  trigger: "Trigger SOS",
  resolve: "Resolve SOS",
  view_directory: "Directory View",
  edit_own: "Edit Own Only",
  delete_own: "Delete Own Only",
  edit_profile: "Edit Profile",
};

export default function RolePermissions() {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [selectedRole, setSelectedRole] = useState("COMMITTEE_MEMBER");
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(
    user?.society_id || ""
  );
  const [availableModules, setAvailableModules] = useState({});
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load societies for Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then((res) => {
          const socList = res.data || [];
          setSocieties(socList);
          if (!selectedSocietyId && socList.length > 0) {
            setSelectedSocietyId(socList[0].id);
          }
        })
        .catch((err) => console.error("Error fetching societies:", err));
    }
  }, [isSuperAdmin]);

  // Load modules catalog and current permissions
  const fetchPermissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch module definitions
      const modRes = await API.get("/permissions/modules");
      const modulesData =
        modRes.data?.data?.modules ||
        modRes.data?.modules ||
        modRes.data?.availableModules ||
        {};
      setAvailableModules(modulesData);

      // 2. Fetch effective permissions
      const params = { role: selectedRole };
      if (selectedSocietyId) {
        params.society_id = selectedSocietyId;
      }

      const permRes = await API.get("/permissions", { params });
      if (permRes.data) {
        const rawPerms =
          permRes.data?.data?.permissions ||
          permRes.data?.permissions ||
          {};

        const parsedPerms = {};
        Object.keys(rawPerms).forEach((key) => {
          const val = rawPerms[key];
          if (Array.isArray(val)) {
            parsedPerms[key] = val;
          } else if (val && Array.isArray(val.grantedActions)) {
            parsedPerms[key] = val.grantedActions;
          } else {
            parsedPerms[key] = [];
          }
        });

        setPermissions(parsedPerms);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
      toast.error(err.response?.data?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [selectedRole, selectedSocietyId]);

  // Toggle specific action for a module
  const toggleAction = (moduleKey, action) => {
    setPermissions((prev) => {
      const currentActions = prev[moduleKey] || [];
      const updated = currentActions.includes(action)
        ? currentActions.filter((a) => a !== action)
        : [...currentActions, action];
      return {
        ...prev,
        [moduleKey]: updated,
      };
    });
  };

  // Toggle all actions for a module
  const toggleAllInModule = (moduleKey) => {
    const allActions = availableModules[moduleKey] || [];
    const currentActions = permissions[moduleKey] || [];
    const isAllSelected = allActions.every((act) => currentActions.includes(act));

    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: isAllSelected ? [] : [...allActions],
    }));
  };

  // Grant all view permissions
  const applyViewOnlyPreset = () => {
    const nextPerms = {};
    Object.keys(availableModules).forEach((mod) => {
      const acts = availableModules[mod] || [];
      nextPerms[mod] = acts.includes("view") ? ["view"] : [];
    });
    setPermissions(nextPerms);
    toast.info("Applied 'View Only' preset. Click 'Save Permissions' to persist.");
  };

  // Grant full permissions
  const applyFullAccessPreset = () => {
    const nextPerms = {};
    Object.keys(availableModules).forEach((mod) => {
      nextPerms[mod] = [...(availableModules[mod] || [])];
    });
    setPermissions(nextPerms);
    toast.info("Applied 'Full Access' preset. Click 'Save Permissions' to persist.");
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        role: selectedRole,
        society_id: selectedSocietyId || user?.society_id,
        permissions,
      };

      const res = await API.post("/permissions/update", payload);
      if (res.data && res.data.success) {
        toast.success(
          res.data.message || `Permissions for ${selectedRole} saved successfully!`
        );
      }
    } catch (err) {
      console.error("Save permissions error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update role permissions"
      );
    } finally {
      setSaving(false);
    }
  };

  const getFilteredModules = () => {
    const query = searchQuery.trim().toLowerCase();
    const modules = Object.keys(availableModules);
    if (!query) return modules;
    return modules.filter((key) => {
      const meta = MODULE_META[key] || {};
      const label = meta.label || key;
      return label.toLowerCase().includes(query) || key.toLowerCase().includes(query);
    });
  };

  const filteredModulesList = getFilteredModules();

  return (
    <div className="admin-page-container role-permissions-container p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 rounded-2xl shadow-lg mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl">
              <FaShieldAlt className="text-2xl text-blue-200" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Role Permissions Manager
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                Dynamically customize granular access controls for Committee Members and Accountants.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchPermissions}
            disabled={loading || saving}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold flex items-center gap-2 text-sm transition-all shadow-sm disabled:opacity-50"
          >
            <FaUndo className={loading ? "animate-spin" : ""} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <FaSave /> {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>

      {/* Control Bar: Role Tabs & Society Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-xl self-start">
          <button
            onClick={() => setSelectedRole("COMMITTEE_MEMBER")}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              selectedRole === "COMMITTEE_MEMBER"
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FaUserTie className="text-base" /> Committee Member
          </button>
          <button
            onClick={() => setSelectedRole("ACCOUNTANT")}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              selectedRole === "ACCOUNTANT"
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FaCalculator className="text-base" /> Accountant
          </button>
        </div>

        {/* SuperAdmin Society Selector */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <FaBuilding className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Society:
            </span>
            <select
              value={selectedSocietyId}
              onChange={(e) => setSelectedSocietyId(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100"
            >
              {societies.map((soc) => (
                <option key={soc.id} value={soc.id}>
                  {soc.name} (#{soc.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search module or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={applyViewOnlyPreset}
              className="px-3 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-all"
            >
              View Only Preset
            </button>
            <button
              onClick={applyFullAccessPreset}
              className="px-3 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg transition-all"
            >
              Full Access Preset
            </button>
          </div>
        </div>
      </div>

      {/* Information Alert */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-3 text-blue-900 dark:text-blue-200 text-sm">
        <FaInfoCircle className="text-lg mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <span className="font-semibold">Granular Dynamic Permission Enforcement:</span>{" "}
          Unchecked permissions will immediately restrict module access in the user interface and return a safe{" "}
          <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded font-mono text-xs font-bold">
            403 Forbidden
          </code>{" "}
          response if unpermitted API endpoints are triggered.
        </div>
      </div>

      {/* Permissions Grid */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p className="font-medium text-sm">Loading role permissions matrix...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(MODULE_GROUPS).map(([groupTitle, groupModules]) => {
            const activeGroupModules = groupModules.filter((mod) =>
              filteredModulesList.includes(mod)
            );

            if (activeGroupModules.length === 0) return null;

            return (
              <div
                key={groupTitle}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60 mb-4">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    {groupTitle}
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                    {activeGroupModules.length} Modules
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeGroupModules.map((moduleKey) => {
                    const meta = MODULE_META[moduleKey] || {
                      label: moduleKey,
                      icon: MdSecurity,
                      desc: "Module permissions",
                    };
                    const IconComponent = meta.icon;
                    const availableActions = availableModules[moduleKey] || [];
                    const assignedActions = permissions[moduleKey] || [];
                    const isAllSelected =
                      availableActions.length > 0 &&
                      availableActions.every((a) => assignedActions.includes(a));
                    const isNoneSelected = assignedActions.length === 0;

                    return (
                      <div
                        key={moduleKey}
                        className={`rounded-xl border p-4 transition-all duration-200 ${
                          isNoneSelected
                            ? "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 opacity-80 hover:opacity-100"
                            : "border-blue-100 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm"
                        }`}
                      >
                        {/* Module Card Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-xl shrink-0 mt-0.5">
                              <IconComponent />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                                {meta.label}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {meta.desc}
                              </p>
                            </div>
                          </div>

                          {/* Quick Toggle Module Button */}
                          <button
                            type="button"
                            onClick={() => toggleAllInModule(moduleKey)}
                            title={isAllSelected ? "Deselect All" : "Select All"}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                          >
                            {isAllSelected ? (
                              <FaCheckSquare className="text-blue-600 dark:text-blue-400 text-lg" />
                            ) : (
                              <FaRegSquare className="text-gray-400 text-lg" />
                            )}
                          </button>
                        </div>

                        {/* Action Pills / Checkboxes */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                          {availableActions.map((action) => {
                            const isChecked = assignedActions.includes(action);
                            const label = ACTION_LABELS[action] || action;

                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => toggleAction(moduleKey, action)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                }`}
                              >
                                {isChecked ? (
                                  <FaCheckSquare className="text-xs" />
                                ) : (
                                  <FaRegSquare className="text-xs opacity-60" />
                                )}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 mt-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <MdLockOutline className="text-base text-blue-500" />
          <span>Configuring permissions for <strong>{selectedRole}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPermissions}
            disabled={loading || saving}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            Cancel / Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <FaSave /> {saving ? "Saving Changes..." : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}
