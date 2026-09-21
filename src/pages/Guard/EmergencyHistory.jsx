import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdSearch, MdClose, MdWarning, MdCheckCircle, MdOutlineInbox,
} from "react-icons/md";
import { toast } from "react-toastify";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalButton from "../../components/common/GlobalButton";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";



export default function EmergencyHistory() {
  const { t } = useLang();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [resolvingId, setResolvingId] = useState(null);

  const loadAlerts = async () => {
    try {
      const res = await API.get("/emergency");
      setAlerts(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Failed to load emergency alerts", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const counts = useMemo(() => ({
    ALL: alerts.length,
    ACTIVE: alerts.filter((a) => a.status === "ACTIVE").length,
    RESOLVED: alerts.filter((a) => a.status === "RESOLVED").length,
  }), [alerts]);

  const resolveLocationLabel = (a) => {
    if (a.Flat) {
      const b = a.Flat.Floor?.Block?.name || a.Flat.Block?.name || "";
      const fn = a.Flat.flat_number || "";
      if (b && fn) return `🏢 Block ${b} · Flat ${fn}`;
      if (fn) return `🏢 Flat ${fn}`;
    }

    if (a.source === "RESIDENT") {
      const b = a.Resident?.FlatMemberships?.[0]?.Flat?.Block?.name;
      const fn = a.Resident?.FlatMemberships?.[0]?.Flat?.flat_number;
      if (b && fn) return `🏢 Block ${b} · Flat ${fn}`;
      if (fn) return `🏢 Flat ${fn}`;
      return "🏠 Resident Unit";
    }

    if (a.source === "GUARD") {
      return "🛡️ Security Gate";
    }

    if (a.source === "ADMIN") {
      return "🏛️ Admin Office";
    }

    if (a.source === "COMMITTEE") {
      return "📋 Committee Office";
    }

    if (a.source === "SUPER_ADMIN") {
      return "🌐 System HQ";
    }

    if (a.other_reason) {
      return `📍 ${a.other_reason}`;
    }

    return "📍 Society Campus";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (tab !== "ALL" && a.status !== tab) return false;
      if (!q) return true;
      const raised = a.source === "RESIDENT"
        ? (a.Resident?.name || t("ehResident") || "Resident")
        : a.source === "GUARD"
        ? (a.Guard?.name || t("ehGuard") || "Guard")
        : (a.Admin?.name || "Staff");
      const loc = resolveLocationLabel(a);
      return [a.type, a.message, a.status, raised, loc, a.other_reason].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [alerts, search, tab, t]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * limit, safePage * limit);

  const handleTabChange = (next) => {
    setTab(next);
    setPage(1);
  };

  const sourceLabel = (a) => {
    if (a.source === "RESIDENT") return a.Resident?.name || t("ehResident") || "Resident";
    if (a.source === "GUARD") return a.Guard?.name || t("ehGuard") || "Guard";
    if (a.source === "ADMIN") return a.Admin?.name || "Society Admin";
    if (a.source === "COMMITTEE") return a.Admin?.name || "Committee Member";
    if (a.source === "SUPER_ADMIN") return a.Admin?.name || "Super Admin";
    return "Staff";
  };

  const raisedBy = (a) => sourceLabel(a);

  const resolveAlert = async (id) => {
    try {
      setResolvingId(id);
      await API.patch(`/emergency/${id}/resolve`);
      toast.success(t("ehResolved") || "Emergency marked as resolved");
      await loadAlerts();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("ehResolveFail") || "Failed to resolve emergency");
    } finally {
      setResolvingId(null);
    }
  };

  const filterTabs = [
    { key: "ALL", label: t("geFilterAll") || "All", count: counts.ALL },
    { key: "ACTIVE", label: t("ehFilterActive") || "Active", count: counts.ACTIVE, alert: counts.ACTIVE },
    { key: "RESOLVED", label: t("ehFilterResolved") || "Resolved", count: counts.RESOLVED },
  ];

  const columns = [
    {
      key: "type",
      header: t("ehColType"),
      render: (a) => (
        <span className={`eh-type eh-type--${String(a.type || "other").toLowerCase()}`}>{a.type}</span>
      ),
    },
    {
      key: "message",
      header: t("ehColMessage"),
      render: (a) => (
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{a.message}</span>
      ),
    },
    {
      key: "raised",
      header: t("ehColRaisedBy"),
      render: (a) => raisedBy(a),
    },
    {
      key: "location",
      header: t("geColFlat") || "Location / Unit",
      render: (a) => (
        <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.82rem" }}>
          {resolveLocationLabel(a)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("billStatusCol") || "Status",
      render: (a) => (
        <GlobalBadge variant={a.status === "RESOLVED" ? "success" : "danger"}>
          {a.status}
        </GlobalBadge>
      ),
    },
    {
      key: "time",
      header: t("ehColTime"),
      render: (a) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
          {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (a) => a.status === "ACTIVE" ? (
        <GlobalButton
          variant="success"
          size="sm"
          icon={MdCheckCircle}
          loading={resolvingId === a.id}
          onClick={() => resolveAlert(a.id)}
        >
          {t("ehResolve") || "Resolve"}
        </GlobalButton>
      ) : null,
    },
  ];

  return (
    <div className="ge-root eh-root animate-fadeIn">
      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdWarning size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("ehTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("ehSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="ge-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{counts.ALL}</span>
          <span className="complaint-stat-label">{t("geStatTotal") || "Total"}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{counts.ACTIVE}</span>
          <span className="complaint-stat-label">{t("ehFilterActive") || "Active"}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{counts.RESOLVED}</span>
          <span className="complaint-stat-label">{t("ehFilterResolved") || "Resolved"}</span>
        </div>
      </div>

      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={tab}
            onChange={handleTabChange}
            tabs={filterTabs.map(({ key, label, count, alert }) => ({
              id: key,
              label,
              badge: count,
              alert,
            }))}
          />
        </div>

        <div className="ml-auto">
          <ExpandableSearch
            placeholder={t("ehSearch") || "Search type, message, name..."}
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
          />
        </div>
      </div>

      <GlobalTable
        columns={columns}
        data={pageItems}
        loading={loading}
        emptyMessage={search || tab !== "ALL" ? (t("ehEmptyFilter") || "No alerts match your filters") : t("ehEmpty")}
        emptyIcon={MdOutlineInbox}
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        onPageChange={setPage}
        rowKey="id"
      
          pageSize={limit}
          onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        />
    </div>
  );
}
