import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { hasPermission } from "../../utils/permissions";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";
import SOSModal from "../../components/emergency/SOSModal";
import {
  MdSecurity,
  MdWarning,
  MdLocalFireDepartment,
  MdLocalHospital,
  MdHelp,
  MdCheckCircle,
  MdSearch,
  MdRefresh,
  MdDeleteOutline,
  MdEdit,
  MdVisibility,
  MdPeople,
  MdDoneAll,
  MdHourglassEmpty,
  MdApartment,
  MdAccessTime,
  MdLocationOn,
  MdFilterList,
  MdClose,
  MdCalendarToday,
} from "react-icons/md";
import { FaUserShield, FaExclamationTriangle } from "react-icons/fa";
import "./Admin.css";

const EMERGENCY_TYPES = [
  { key: "ALL", labelKey: "sosAllTypes" },
  { key: "SECURITY", labelKey: "sosTypeSecurity", icon: MdSecurity, color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  { key: "FIRE", labelKey: "sosTypeFire", icon: MdLocalFireDepartment, color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  { key: "MEDICAL", labelKey: "sosTypeMedical", icon: MdLocalHospital, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  { key: "LIFT_STUCK", labelKey: "sosTypeLiftStuck", icon: MdWarning, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" },
  { key: "ANIMAL", labelKey: "sosTypeAnimal", icon: MdHelp, color: "#06b6d4", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)" },
  { key: "OTHER", labelKey: "sosTypeOther", icon: MdHelp, color: "#ec4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.3)" },
];

const TYPE_MAP = Object.fromEntries(EMERGENCY_TYPES.filter(t => t.key !== "ALL").map(t => [t.key, t]));

const SOURCE_META = {
  RESIDENT: "sosSourceResident",
  GUARD: "sosSourceGuard",
  ADMIN: "sosSourceAdmin",
  COMMITTEE: "sosSourceCommittee",
  SUPER_ADMIN: "sosSourceSuperAdmin",
};

export default function AdminEmergency() {
  const { user } = useContext(AuthContext);
  const { showAlert } = useCustomAlert();
  const { t } = useLang();

  const typeLabel = (typeKey) => t(TYPE_MAP[typeKey]?.labelKey || "sosTypeOther");
  const sourceLabel = (source) => t(SOURCE_META[source] || "sosSourceStaff");

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.activeRole === "SUPER_ADMIN";
  const isGuard = user?.role === "GUARD" || user?.activeRole === "GUARD";
  const isAdminOrCommittee = ["SUPER_ADMIN", "ADMIN", "SOCIETY_ADMIN", "COMMITTEE_MEMBER"].includes(user?.role) || ["SUPER_ADMIN", "ADMIN", "SOCIETY_ADMIN", "COMMITTEE_MEMBER"].includes(user?.activeRole);

  // Permissions check
  const canView = true;
  const canTrigger = hasPermission(user, "emergency", "trigger") || isGuard || isAdminOrCommittee;
  const canResolve = hasPermission(user, "emergency", "resolve") || isGuard || isAdminOrCommittee;
  const canEdit = hasPermission(user, "emergency", "edit") || isGuard || isAdminOrCommittee;
  const canDelete = hasPermission(user, "emergency", "delete") || isGuard || isAdminOrCommittee;
  const canViewHistory = hasPermission(user, "emergency", "view_history") || canView;

  // State
  const [alerts, setAlerts] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(() => {
    if (!isSuperAdmin) return user?.society_id || "";
    const saved = localStorage.getItem("superadmin_society_filter");
    return saved && saved !== "ALL" ? saved : "";
  });
  const [loading, setLoading] = useState(true);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | RESOLVED
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // History Modal State
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    alert: null,
    loading: false,
    data: null,
    search: "",
    statusFilter: "ALL", // ALL | READ | UNREAD
  });

  // Resolve Modal State
  const [resolveModal, setResolveModal] = useState({
    isOpen: false,
    alert: null,
    notes: "",
    loading: false,
  });

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    alert: null,
    type: "MEDICAL",
    message: "",
    other_reason: "",
    resolution_notes: "",
    loading: false,
  });

  // Fetch societies for Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then((res) => {
          setSocieties(Array.isArray(res.data) ? res.data : res.data.data || []);
        })
        .catch((err) => console.error("Error fetching societies:", err));
    }
  }, [isSuperAdmin]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isSuperAdmin && selectedSocietyId) {
        params.append("society_id", selectedSocietyId);
      }
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (search.trim()) params.append("search", search.trim());

      const res = await API.get(`/emergency?${params.toString()}`);
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load emergency alerts:", err);
      toast.error(t("sosToastLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedSocietyId, statusFilter, typeFilter, startDate, endDate, search, t]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter((a) => a.status === "ACTIVE").length;
    const resolved = alerts.filter((a) => a.status === "RESOLVED").length;
    let totalAcks = 0;
    alerts.forEach((a) => {
      totalAcks += Array.isArray(a.acknowledgements) ? a.acknowledgements.length : 0;
    });
    return { total, active, resolved, totalAcks };
  }, [alerts]);

  // Open Acknowledgements History
  const openHistoryModal = async (alertItem) => {
    setHistoryModal({
      isOpen: true,
      alert: alertItem,
      loading: true,
      data: null,
      search: "",
      statusFilter: "ALL",
    });

    try {
      const res = await API.get(`/emergency/${alertItem.id}/acknowledgements`);
      setHistoryModal((prev) => ({
        ...prev,
        loading: false,
        data: res.data,
      }));
    } catch (err) {
      console.error("Failed to fetch SOS acknowledgement history:", err);
      toast.error(t("sosToastHistoryFailed"));
      setHistoryModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Filter Acknowledgements inside modal
  const fetchModalHistory = async (alertId, querySearch, queryStatus) => {
    try {
      const params = new URLSearchParams();
      if (querySearch) params.append("search", querySearch);
      if (queryStatus && queryStatus !== "ALL") params.append("status", queryStatus);

      const res = await API.get(`/emergency/${alertId}/acknowledgements?${params.toString()}`);
      setHistoryModal((prev) => ({
        ...prev,
        data: res.data,
      }));
    } catch (err) {
      console.error("Error filtering history:", err);
    }
  };

  // Handle Mark Resolved
  const handleConfirmResolve = async () => {
    if (!resolveModal.alert) return;
    try {
      setResolveModal((prev) => ({ ...prev, loading: true }));
      await API.patch(`/emergency/${resolveModal.alert.id}/resolve`, {
        resolution_notes: resolveModal.notes.trim() || undefined,
      });
      toast.success(t("sosToastResolved"));
      setResolveModal({ isOpen: false, alert: null, notes: "", loading: false });
      fetchAlerts();
    } catch (err) {
      console.error("Failed to resolve emergency:", err);
      toast.error(err?.response?.data?.message || t("sosToastResolveFailed"));
      setResolveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Handle Edit Submit
  const handleConfirmEdit = async () => {
    if (!editModal.alert) return;
    if (editModal.type === "OTHER" && !editModal.other_reason?.trim()) {
      toast.error(t("sosToastOtherReason"));
      return;
    }

    try {
      setEditModal((prev) => ({ ...prev, loading: true }));
      await API.put(`/emergency/${editModal.alert.id}`, {
        type: editModal.type,
        message: editModal.message,
        other_reason: editModal.other_reason,
        resolution_notes: editModal.resolution_notes,
      });
      toast.success(t("sosToastUpdated"));
      setEditModal({ isOpen: false, alert: null, type: "MEDICAL", message: "", other_reason: "", resolution_notes: "", loading: false });
      fetchAlerts();
    } catch (err) {
      console.error("Failed to update emergency:", err);
      toast.error(err?.response?.data?.message || t("sosToastUpdateFailed"));
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Handle Delete with CustomAlertModal
  const handleDelete = (alertItem) => {
    showAlert({
      title: t("sosDeleteTitle"),
      message: t("sosDeleteConfirmMsg", { type: typeLabel(alertItem.type) }),
      type: "danger",
      confirmText: t("sosDeleteConfirm"),
      cancelText: t("sosDeleteCancel"),
      onConfirm: async () => {
        try {
          await API.delete(`/emergency/${alertItem.id}`);
          toast.success(t("sosToastDeleted"));
          fetchAlerts();
        } catch (err) {
          console.error("Failed to delete emergency:", err);
          toast.error(err?.response?.data?.message || t("sosToastDeleteFailed"));
        }
      },
    });
  };

  if (!canView) {
    return (
      <div className="admin-page p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl max-w-md mx-auto">
          <FaExclamationTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("sosAccessDeniedTitle")}</h2>
          <p className="text-secondary text-sm">
            {t("sosAccessDeniedMsg")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-root animate-fadeIn space-y-5 max-w-400 mx-auto pb-8">
      {/* ── 1. UNIFIED PAGE HEADER ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
            <MdSecurity size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("sosPageTitle")}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {t("sosPageSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1" style={{ scrollbarWidth: "none" }}>
          {/* Status Sliding Tabs */}
          <SlidingTabs
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            items={[
              { id: "ALL", label: t("sosStatusAll"), badge: metrics.total },
              { id: "ACTIVE", label: t("sosStatusActive"), badge: metrics.active },
              { id: "RESOLVED", label: t("sosStatusResolved"), badge: metrics.resolved },
            ]}
          />

          {/* Expandable Search */}
          <ExpandableSearch
            value={search}
            onChange={setSearch}
            placeholder={t("sosSearch")}
          />

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ height: 42, minHeight: 42, fontSize: 13, borderRadius: 12, minWidth: 150 }}
          >
            {EMERGENCY_TYPES.map((type) => (
              <option key={type.key} value={type.key}>
                {t(type.labelKey)}
              </option>
            ))}
          </Select>

          {/* Super Admin Society Filter */}
          {isSuperAdmin && (
            <Select
              value={selectedSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val);
              }}
              style={{ height: 42, minHeight: 42, fontSize: 13, borderRadius: 12, minWidth: 160 }}
            >
              <option value="">{t("allSocieties")}</option>
              {societies.map((soc) => (
                <option key={soc.id} value={soc.id}>
                  {soc.name}
                </option>
              ))}
            </Select>
          )}

          {/* Broadcast SOS Action Button */}
          {canTrigger && (
            <button
              type="button"
              onClick={() => setIsSOSModalOpen(true)}
              className="btn bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-red-600/30 transition-all cursor-pointer"
              style={{ height: 42, minHeight: 42 }}
            >
              <FaExclamationTriangle size={14} className="animate-pulse" />
              <span>{t("sosBroadcastBtn")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchAlerts}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl"
            style={{ height: 42, minHeight: 42 }}
          >
            <MdRefresh size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── 2. KEY METRICS KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ad-kpi ad-kpi--residents">
          <span className="ad-kpi-val">{metrics.total}</span>
          <span className="ad-kpi-label">{t("sosKpiTotalTitle")}</span>
          <span className="ad-kpi-desc">{t("sosAllEmergencies")}</span>
        </div>

        <div className="ad-kpi ad-kpi--complaints">
          <span className="ad-kpi-val">{metrics.active}</span>
          <span className="ad-kpi-label">{t("sosKpiActiveTitle")}</span>
          <span className="ad-kpi-desc">
            {metrics.active > 0 ? t("sosKpiActiveDesc") : t("sosKpiNoActiveDesc")}
          </span>
        </div>

        <div className="ad-kpi ad-kpi--guards">
          <span className="ad-kpi-val">{metrics.resolved}</span>
          <span className="ad-kpi-label">{t("sosKpiResolvedTitle")}</span>
          <span className="ad-kpi-desc">{t("sosKpiResolvedDesc")}</span>
        </div>

        <div className="ad-kpi ad-kpi--flats">
          <span className="ad-kpi-val">{metrics.totalAcks}</span>
          <span className="ad-kpi-label">{t("sosKpiAcksTitle")}</span>
          <span className="ad-kpi-desc">{t("sosKpiAcksDesc")}</span>
        </div>
      </div>

      {/* ── ALERTS CARDS GRID ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-5 rounded-2xl border border-glass bg-card animate-pulse space-y-4">
              <div className="h-6 bg-white/10 rounded-lg w-1/3" />
              <div className="h-16 bg-white/5 rounded-xl" />
              <div className="h-8 bg-white/10 rounded-lg" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 rounded-2xl border border-glass bg-card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
            <MdCheckCircle size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {t("sosEmptyTitle")}
            </h3>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {search || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? t("sosEmptyFiltered")
                : t("sosEmptyAll")}
            </p>
          </div>
          {canTrigger && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsSOSModalOpen(true)}
                className="btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
              >
                <FaExclamationTriangle size={14} className="animate-pulse" />
                <span>{t("sosTriggerBtn")}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {alerts.map((alert) => {
            const typeMeta = TYPE_MAP[alert.type] || TYPE_MAP.OTHER || {
              labelKey: "sosTypeOther",
              icon: MdWarning,
              color: "#ef4444",
              bg: "rgba(239,68,68,0.12)",
              border: "rgba(239,68,68,0.3)",
            };
            const Icon = typeMeta.icon || MdWarning;
            const isResolved = alert.status === "RESOLVED";
            const ackCount = Array.isArray(alert.acknowledgements) ? alert.acknowledgements.length : 0;

            const senderName =
              alert.Resident?.name ||
              alert.Guard?.name ||
              alert.Admin?.name ||
              (alert.source === "GUARD" ? t("sosSourceGuard") : alert.source === "RESIDENT" ? t("sosSourceResident") : t("sosSourceStaff"));

            const flatStr = alert.Flat
              ? `${alert.Flat.Block?.name ? `${t("sosBlockWord")} ${alert.Flat.Block.name} · ` : ""}${t("sosFlatWord")} ${alert.Flat.flat_number}`
              : alert.source === "GUARD"
              ? t("sosSecurityGate")
              : t("sosSocietyPremises");

            return (
              <div
                key={alert.id}
                className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg ${
                  !isResolved ? "ring-1 ring-red-500/40" : "hover:border-purple-500/30"
                }`}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {/* Card Top: Type Badge & Status */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="px-3 py-1.5 rounded-xl border flex items-center gap-2"
                      style={{ background: typeMeta.bg, borderColor: typeMeta.border }}
                    >
                      <Icon size={17} style={{ color: typeMeta.color }} />
                      <span className="text-xs font-black tracking-wide" style={{ color: typeMeta.color }}>
                        {t(typeMeta.labelKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSuperAdmin && alert.Society && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-card-inner-bg text-secondary border border-glass-border">
                          {alert.Society.name}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isResolved
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-600 text-white shadow-sm shadow-red-500/30 animate-pulse"
                        }`}
                      >
                        {isResolved ? <MdCheckCircle size={13} /> : <MdWarning size={13} />}
                        {isResolved ? t("sosStatusResolved") : t("sosStatusActive")}
                      </span>
                    </div>
                  </div>

                  {/* Sender & Flat Info Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ background: isResolved ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: isResolved ? "#22c55e" : "#ef4444" }}
                      >
                        {senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                          {senderName}
                        </p>
                        <p className="text-[10px] text-secondary">
                          {t("sosSourceLabel")} <span className="font-semibold text-primary">{sourceLabel(alert.source)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold flex items-center gap-1 text-primary justify-end">
                        <MdLocationOn size={13} className="text-red-400" /> {flatStr}
                      </p>
                      <p className="text-[10px] text-secondary flex items-center gap-1 justify-end">
                        <MdAccessTime size={11} /> {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Emergency Message Block */}
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
                      {alert.message || t("sosDefaultMsg")}
                    </p>

                    {alert.other_reason && (
                      <div className="mt-2 pt-2 border-t border-glass flex items-center gap-1.5 text-xs text-pink-400 font-semibold">
                        <span>{t("sosReason", { reason: alert.other_reason })}</span>
                      </div>
                    )}
                  </div>

                  {/* Resolution Notes (if resolved) */}
                  {isResolved && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        background: "rgba(34, 197, 94, 0.08)",
                        border: "1px solid rgba(34, 197, 94, 0.2)",
                        fontSize: "11.5px",
                      }}
                    >
                      <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                        <span>{t("sosResolvedBy", { name: alert.Resolver?.name || t("sosSourceStaff") })}</span>
                        <span>{alert.resolved_at ? new Date(alert.resolved_at).toLocaleTimeString() : ""}</span>
                      </div>
                      {alert.resolution_notes && (
                        <p className="text-secondary text-[11px] leading-tight mt-1" style={{ margin: "4px 0 0" }}>
                          {t("sosNote", { note: alert.resolution_notes })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingTop: 12,
                    borderTop: "1px solid var(--glass-border)",
                    marginTop: "auto",
                  }}
                >
                  {/* Read Acknowledgements */}
                  <button
                    type="button"
                    onClick={() => openHistoryModal(alert)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 11px",
                      borderRadius: 10,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <MdVisibility size={14} style={{ color: "var(--accent)" }} />
                    <span>{t("sosAcksBtn")}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "rgba(107, 70, 193, 0.15)",
                        color: "var(--accent)",
                      }}
                    >
                      {ackCount}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Mark as Resolved button */}
                    {!isResolved && canResolve && (
                      <button
                        type="button"
                        onClick={() => setResolveModal({ isOpen: true, alert, notes: "", loading: false })}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <MdCheckCircle size={14} /> {t("sosResolveBtn")}
                      </button>
                    )}

                    {/* Edit button */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditModal({
                            isOpen: true,
                            alert,
                            type: alert.type || "MEDICAL",
                            message: alert.message || "",
                            other_reason: alert.other_reason || "",
                            resolution_notes: alert.resolution_notes || "",
                            loading: false,
                          })
                        }
                        className="p-2 rounded-xl text-secondary hover:text-primary transition"
                        style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", cursor: "pointer" }}
                        title={t("sosEditTitleTip")}
                      >
                        <MdEdit size={14} />
                      </button>
                    )}

                    {/* Delete button */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(alert)}
                        className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                        style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", cursor: "pointer" }}
                        title={t("sosDeleteTitleTip")}
                      >
                        <MdDeleteOutline size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ACKNOWLEDGEMENT / READ HISTORY MODAL ── */}
      {historyModal.isOpen && (
        <GlobalModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal({ isOpen: false, alert: null, loading: false, data: null, search: "", statusFilter: "ALL" })}
          title={t("sosHistoryTitle")}
          subtitle={t("sosHistorySubtitle", { type: typeLabel(historyModal.alert?.type) })}
          icon={MdDoneAll}
          size="xl"
          warnUnsavedChanges={false}
        >
          <div className="space-y-4">
            {/* Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="p-3.5 rounded-2xl flex items-center gap-3.5 transition"
                style={{
                  background: "linear-gradient(135deg, rgba(160, 90, 255, 0.12), rgba(160, 90, 255, 0.04))",
                  border: "1px solid rgba(160, 90, 255, 0.25)",
                  boxShadow: "0 2px 10px rgba(160, 90, 255, 0.08)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(160, 90, 255, 0.18)",
                    color: "var(--accent, #a05aff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdPeople size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-secondary">{t("sosTotalRecipients")}</p>
                  <p className="text-xl font-black" style={{ color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {historyModal.data?.summary?.total ?? 0}
                  </p>
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl flex items-center gap-3.5 transition"
                style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.08)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(16, 185, 129, 0.18)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdDoneAll size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-secondary">{t("sosMarkedRead")}</p>
                  <p className="text-xl font-black text-emerald-400" style={{ lineHeight: 1.2 }}>
                    {historyModal.data?.summary?.read ?? 0}
                  </p>
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl flex items-center gap-3.5 transition"
                style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  boxShadow: "0 2px 10px rgba(245, 158, 11, 0.08)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(245, 158, 11, 0.18)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MdHourglassEmpty size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-secondary">{t("sosStatusUnread")}</p>
                  <p className="text-xl font-black text-amber-400" style={{ lineHeight: 1.2 }}>
                    {historyModal.data?.summary?.unread ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Filter Toolbar: Unified Single Row */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <SlidingTabs
                value={historyModal.statusFilter}
                onChange={(val) => {
                  setHistoryModal((prev) => ({ ...prev, statusFilter: val }));
                  fetchModalHistory(historyModal.alert.id, historyModal.search, val);
                }}
                items={[
                  { id: "ALL", label: t("sosStatusAll"), badge: historyModal.data?.summary?.total ?? 0 },
                  { id: "READ", label: t("sosStatusRead"), badge: historyModal.data?.summary?.read ?? 0 },
                  { id: "UNREAD", label: t("sosStatusUnread"), badge: historyModal.data?.summary?.unread ?? 0 },
                ]}
              />

              <ExpandableSearch
                value={historyModal.search}
                onChange={(val) => {
                  setHistoryModal((prev) => ({ ...prev, search: val }));
                  fetchModalHistory(historyModal.alert.id, val, historyModal.statusFilter);
                }}
                placeholder={t("sosSearchRecipient")}
              />
            </div>

            {/* Recipient Table */}
            <div
              style={{
                border: "1px solid var(--glass-border)",
                borderRadius: "14px",
                overflow: "hidden",
                maxHeight: "360px",
                overflowY: "auto",
                background: "var(--card-inner-bg)",
              }}
            >
              {historyModal.loading ? (
                <div className="p-8 text-center text-secondary text-xs">{t("sosLoadingAck")}</div>
              ) : !historyModal.data?.recipients || historyModal.data.recipients.length === 0 ? (
                <div className="p-8 text-center text-secondary text-xs">{t("sosNoRecipients")}</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead
                    style={{
                      background: "var(--card-bg)",
                      borderBottom: "1px solid var(--glass-border)",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                    className="uppercase text-[10px] text-secondary font-bold"
                  >
                    <tr>
                      <th className="p-3">{t("sosColResident")}</th>
                      <th className="p-3">{t("sosColFlat")}</th>
                      <th className="p-3">{t("sosColRole")}</th>
                      <th className="p-3">{t("sosColStatus")}</th>
                      <th className="p-3">{t("sosColReadAt")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass">
                    {historyModal.data.recipients.map((rec) => {
                      const isRead = rec.status === "READ";
                      return (
                        <tr key={rec.user_id} className="hover:bg-white/5 transition">
                          <td className="p-3">
                            <p className="font-bold" style={{ color: "var(--text-primary)", margin: 0 }}>{rec.name}</p>
                            <p className="text-[10px] text-secondary mt-0.5" style={{ margin: 0 }}>{rec.email || rec.phone || ""}</p>
                          </td>
                          <td className="p-3 font-semibold">
                            {rec.flat_number !== "—" ? `${rec.block_name ? `${rec.block_name}-` : ""}${rec.flat_number}` : "—"}
                          </td>
                          <td className="p-3">
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "10px",
                                fontWeight: 600,
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid var(--glass-border)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {rec.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 9px",
                                borderRadius: "999px",
                                fontSize: "10px",
                                fontWeight: 700,
                                background: isRead ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: isRead ? "#10b981" : "#f59e0b",
                                border: `1px solid ${isRead ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                              }}
                            >
                              {isRead ? t("sosReadBadge") : t("sosUnreadBadge")}
                            </span>
                          </td>
                          <td className="p-3 text-secondary">
                            {rec.read_at ? new Date(rec.read_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </GlobalModal>
      )}

      {/* ── RESOLVE MODAL ── */}
      {resolveModal.isOpen && (
        <GlobalModal
          isOpen={resolveModal.isOpen}
          onClose={() => setResolveModal({ isOpen: false, alert: null, notes: "", loading: false })}
          title={t("sosResolveModalTitle")}
          subtitle={t("sosResolveModalSubtitle", { type: typeLabel(resolveModal.alert?.type) })}
          icon={MdCheckCircle}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-secondary">
              {t("sosResolveModalDesc")}
            </p>

            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                {t("sosResolutionNotesLabel")}
              </label>
              <textarea
                rows={4}
                style={{ minHeight: "100px", fontSize: "13px", lineHeight: "1.5" }}
                placeholder={t("sosResolutionPlaceholder")}
                value={resolveModal.notes}
                onChange={(e) => setResolveModal((prev) => ({ ...prev, notes: e.target.value }))}
                className="input w-full rounded-xl p-3.5 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveModal({ isOpen: false, alert: null, notes: "", loading: false })}
                className="btn btn-secondary text-xs px-4 py-2"
                disabled={resolveModal.loading}
              >
                {t("sosCancelBtn")}
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={resolveModal.loading}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 py-2 font-bold flex items-center gap-1.5 shadow-sm"
              >
                <MdCheckCircle size={16} />
                {resolveModal.loading ? t("sosResolving") : t("sosConfirmResolution")}
              </button>
            </div>
          </div>
        </GlobalModal>
      )}

      {/* ── EDIT MODAL ── */}
      {editModal.isOpen && (
        <GlobalModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, alert: null, type: "MEDICAL", message: "", other_reason: "", resolution_notes: "", loading: false })}
          title={t("sosEditModalTitle")}
          subtitle={t("sosEditModalSubtitle")}
          icon={MdEdit}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                {t("sosEmergencyTypeLabel")}
              </label>
              <Select
                value={editModal.type}
                onChange={(e) => setEditModal((prev) => ({ ...prev, type: e.target.value }))}
                className="input w-full text-xs rounded-xl h-10"
              >
                {EMERGENCY_TYPES.filter((type) => type.key !== "ALL").map((type) => (
                  <option key={type.key} value={type.key}>
                    {t(type.labelKey)}
                  </option>
                ))}
              </Select>
            </div>

            {editModal.type === "OTHER" && (
              <div>
                <label className="block text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">
                  {t("sosReasonOtherLabel")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  style={{ minHeight: "70px", fontSize: "13px", lineHeight: "1.5" }}
                  placeholder={t("sosReasonOtherPlaceholder")}
                  value={editModal.other_reason}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, other_reason: e.target.value }))}
                  className="input w-full rounded-xl p-3 resize-y border-pink-500/40"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                {t("sosMessageLabel")}
              </label>
              <textarea
                rows={4}
                style={{ minHeight: "110px", fontSize: "13px", lineHeight: "1.5" }}
                placeholder={t("sosMessagePlaceholder")}
                value={editModal.message}
                onChange={(e) => setEditModal((prev) => ({ ...prev, message: e.target.value }))}
                className="input w-full rounded-xl p-3.5 resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                {t("sosResolutionNotesLabel")}
              </label>
              <textarea
                rows={3}
                style={{ minHeight: "85px", fontSize: "13px", lineHeight: "1.5" }}
                placeholder={t("sosNotesPlaceholder")}
                value={editModal.resolution_notes}
                onChange={(e) => setEditModal((prev) => ({ ...prev, resolution_notes: e.target.value }))}
                className="input w-full rounded-xl p-3 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, alert: null, type: "MEDICAL", message: "", other_reason: "", resolution_notes: "", loading: false })}
                className="btn btn-secondary text-xs px-4 py-2"
                disabled={editModal.loading}
              >
                {t("sosCancelBtn")}
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                disabled={editModal.loading}
                className="btn bg-red-600 hover:bg-red-700 text-white text-xs px-5 py-2 font-bold shadow-sm"
              >
                {editModal.loading ? t("sosSaving") : t("sosSaveChanges")}
              </button>
            </div>
          </div>
        </GlobalModal>
      )}

      {/* ── SOS TRIGGER / BROADCAST MODAL ── */}
      {isSOSModalOpen && (
        <SOSModal
          key={String(isSOSModalOpen)}
          isOpen={isSOSModalOpen}
          onClose={() => setIsSOSModalOpen(false)}
          onRefresh={fetchAlerts}
          societies={societies}
          defaultSocietyId={selectedSocietyId || user?.society_id || ""}
          requireSociety={isSuperAdmin && !selectedSocietyId}
          withAlerts={false}
          senderLabel="sosSenderAdmin"
          modalTitle="sosBroadcastModalTitle"
          successMessage="sosBroadcastSuccess"
        />
      )}
    </div>
  );
}
