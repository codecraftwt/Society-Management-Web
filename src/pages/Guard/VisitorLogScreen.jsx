import { useEffect, useState, useCallback, useRef} from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdSearch,
  MdExitToApp,
  MdAccessTime,
  MdPerson,
  MdOutlineInbox,
  MdHistory,
  MdDirectionsWalk,
  MdLogin,
  MdLogout,
  MdDirectionsCar,
  MdApartment,
  MdEvent,
} from "react-icons/md";
import { toast } from "react-toastify";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalButton from "../../components/common/GlobalButton";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}



export default function VisitorLogScreen() {
  const { t } = useLang();

  const [visitors, setVisitors] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0, IN: 0, OUT: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  const loadVisitors = useCallback(async (pg, q, f, isInit = false) => {
    if (isInit) setInitialLoad(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        filter: f,
        ...(q ? { search: q } : {}),
      });

      const res = await API.get(`/visitors?${params}`);
      const data = res.data;

      setVisitors(Array.isArray(data) ? data : data?.data || data?.visitors || []);
      setCounts(data?.counts || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? (data?.total || 0));
      setPage(pg);
    } catch (err) {
      console.error(err);
      setVisitors([]);
    } finally {
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    loadVisitors(1, debSearch, tab, true);
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      loadVisitors(1, debSearch, tab);
    }
  }, [debSearch, tab]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadVisitors(newPage, debSearch, tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markExit = async (id) => {
    try {
      await API.put(`/visitors/exit/${id}`);
      toast.success(t("vlsMarkExitSuccess", "Visitor marked as OUT"));
      loadVisitors(page, debSearch, tab);
    } catch (err) {
      toast.error(err.response?.data?.message || t("vlsMarkExitFail", "Failed to mark exit"));
    }
  };

  const flatLabel = (v) => {
    if (!v.Flat) return "—";
    const b = v.Flat.Floor?.Block?.name || v.Flat.Block?.name || "";
    const fl = v.Flat.Floor?.floor_number;
    const fn = v.Flat.flat_number || "—";
    return [
      b ? t("vlsBlockPrefix", { name: b }, "Block {name}") : null,
      fl != null ? t("vlsFloorPrefix", { floor: fl }, "Fl {floor}") : null,
      t("vlsFlatPrefix", { number: fn }, "Flat {number}"),
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const filterTabs = [
    { key: "ALL", label: t("geFilterAll") || "All Logs & History", count: counts.ALL },
    { key: "IN",  label: t("geFilterInside") || "Currently Inside", count: counts.IN },
    { key: "OUT", label: t("vlsHistoryExited", "History (Exited)"), count: counts.OUT },
  ];

  const columns = [
    {
      key: "idx",
      header: "#",
      width: 50,
      render: (_, idx) => <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>{(page - 1) * limit + idx + 1}</span>,
    },
    {
      key: "visitor",
      header: t("geColName") || "Visitor Details",
      render: (v) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0 font-bold text-xs">
            {v.visitor_name ? v.visitor_name.charAt(0).toUpperCase() : <MdPerson size={15} />}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-primary truncate m-0 text-sm">
              {v.visitor_name || t("vlsUnknown", "Unknown")}
            </p>
            <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
              {v.mobile && <span>{v.mobile}</span>}
              {v.vehicle_number && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-card-inner-bg border border-glass-border font-mono text-[10px] text-primary">
                  <MdDirectionsCar size={11} /> {v.vehicle_number}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: t("vlsPurpose") || "Type / Purpose",
      render: (v) => {
        const p = (v.purpose || "GUEST").toUpperCase();
        let colorClass = "bg-blue-500/15 text-blue-400 border-blue-500/25";
        if (p === "DELIVERY") colorClass = "bg-purple-500/15 text-purple-400 border-purple-500/25";
        if (p === "CAB") colorClass = "bg-amber-500/15 text-amber-400 border-amber-500/25";
        if (p === "SERVICE" || p === "MAINTENANCE") colorClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${colorClass}`}>
            {v.purpose || t("vlsGuest", "Guest")}
          </span>
        );
      },
    },
    {
      key: "flat",
      header: t("geColFlat") || "Destination Unit",
      render: (v) => (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <MdApartment className="text-secondary shrink-0" size={14} />
          <span>{flatLabel(v)}</span>
        </div>
      ),
    },
    {
      key: "entry",
      header: t("geColEntry") || "Entry Time",
      render: (v) => {
        const dt = formatDateTime(v.entry_time);
        if (!dt) return <span className="text-secondary">—</span>;
        return (
          <div className="text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
              <MdLogin size={13} /> {dt.time}
            </span>
            <span className="text-[10px] text-secondary block mt-0.5">{dt.date}</span>
          </div>
        );
      },
    },
    {
      key: "exit",
      header: t("geColExit") || "Exit Time",
      render: (v) => {
        if (!v.exit_time) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {t("vlsInsideBadge", "Inside")}
            </span>
          );
        }
        const dt = formatDateTime(v.exit_time);
        return (
          <div className="text-xs">
            <span className="inline-flex items-center gap-1 text-secondary font-semibold">
              <MdLogout size={13} /> {dt.time}
            </span>
            <span className="text-[10px] text-secondary/70 block mt-0.5">{dt.date}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: t("billStatusCol") || "Status",
      render: (v) => (
        <GlobalBadge variant={v.exit_time ? "neutral" : "success"} dot>
          {v.exit_time ? t("geFilterLeft") || "Exited / History" : t("geFilterInside") || "Inside"}
        </GlobalBadge>
      ),
    },
    {
      key: "actions",
      header: t("billActionCol") || "Actions",
      align: "right",
      render: (v) =>
        !v.exit_time ? (
          <GlobalButton
            variant="edit"
            size="sm"
            icon={MdExitToApp}
            onClick={() => markExit(v.id)}
          >
            {t("vlsMarkExit") || "Mark OUT"}
          </GlobalButton>
        ) : (
          <span className="text-[11px] text-secondary/60 font-medium">{t("vlsLogged", "Logged")}</span>
        ),
    },
  ];

  return (
    <div className="vls-page animate-fadeIn space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ad-page-icon">
            <MdHistory size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {t("vlsTitle") || "Visitor Logs & History"}
            </h1>
            <p className="text-xs text-secondary mt-0.5">
              {t("vlsHeaderSub", "Complete gate logs and historical records of all visitors, deliveries, and cabs")}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Summary Cards (Clickable Filter Shortcuts) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => handleTabChange("ALL")}
          className={`ad-kpi ad-kpi--total cursor-pointer transition-all ${
            tab === "ALL" ? "ring-2 ring-blue-500/50 scale-[1.02]" : "hover:opacity-90"
          }`}
        >
          <div className="ad-kpi-icon">
            <MdHistory size={20} />
          </div>
          <div className="ad-kpi-info">
            <span className="ad-kpi-val">{counts.ALL}</span>
            <span className="ad-kpi-label">{t("vlsStatTotal", "Total Visitor Logs")}</span>
          </div>
        </div>

        <div
          onClick={() => handleTabChange("IN")}
          className={`ad-kpi ad-kpi--gate cursor-pointer transition-all ${
            tab === "IN" ? "ring-2 ring-cyan-500/50 scale-[1.02]" : "hover:opacity-90"
          }`}
        >
          <div className="ad-kpi-icon">
            <MdDirectionsWalk size={20} />
          </div>
          <div className="ad-kpi-info">
            <span className="ad-kpi-val">{counts.IN}</span>
            <span className="ad-kpi-label">{t("vlsStatInside", "Currently Inside")}</span>
          </div>
        </div>

        <div
          onClick={() => handleTabChange("OUT")}
          className={`ad-kpi ad-kpi--collected cursor-pointer transition-all ${
            tab === "OUT" ? "ring-2 ring-emerald-500/50 scale-[1.02]" : "hover:opacity-90"
          }`}
        >
          <div className="ad-kpi-icon">
            <MdLogout size={20} />
          </div>
          <div className="ad-kpi-info">
            <span className="ad-kpi-val">{counts.OUT}</span>
            <span className="ad-kpi-label">{t("vlsStatOut", "Exit History (Left)")}</span>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={tab}
            onChange={handleTabChange}
            tabs={filterTabs.map(({ key, label, count }) => ({
              id: key,
              label,
              badge: count,
            }))}
          />
        </div>

        <div className="ml-auto">
          <ExpandableSearch
            placeholder={t("vlsSearchPlaceholder", "Search by visitor name, mobile, vehicle...")}
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
          />
        </div>
      </div>

      {/* ── Table of Visitor Records & History ── */}
      <GlobalTable
        columns={columns}
        data={visitors}
        loading={initialLoad}
        emptyMessage={
          tab === "OUT"
            ? t("vlsEmptyOut", "No visitor exit history found.")
            : tab === "IN"
            ? t("vlsEmptyIn", "No visitors are currently inside the premises.")
            : t("vlsEmptyAll", "No visitor logs found.")
        }
        emptyIcon={MdOutlineInbox}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      
          pageSize={limit}
          onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); loadVisitors(1, debSearch, tab); }}
        />
    </div>
  );
}