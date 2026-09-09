import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { MdSearch, MdExitToApp, MdAccessTime, MdPerson, MdOutlineInbox } from "react-icons/md";
import { toast } from "react-toastify";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalButton from "../../components/common/GlobalButton";

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const LIMIT = 10;

export default function VisitorLogScreen() {
  const { t } = useLang();

  const [visitors, setVisitors] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0, IN: 0, OUT: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("IN");
  const debSearch = useDebounce(search, 500);

  const loadVisitors = useCallback(async (pg, q, f, isInit = false) => {
    if (isInit) setInitialLoad(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: LIMIT,
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
      toast.success(t("vlsMarkExitSuccess") || "Visitor marked as OUT");
      loadVisitors(page, debSearch, tab);
    } catch (err) {
      toast.error(err.response?.data?.message || t("vlsMarkExitFail") || "Failed to mark exit");
    }
  };

  const flatLabel = (v) => {
    if (!v.Flat) return "NA";
    const b = v.Flat.Floor?.Block?.name || v.Flat.Block?.name || "";
    const fl = v.Flat.Floor?.floor_number;
    const fn = v.Flat.flat_number || "NA";
    return [b, fl != null ? `Fl ${fl}` : null, fn].filter(Boolean).join(" · ");
  };

  const filterTabs = [
    { key: "IN",  label: t("geFilterInside") || "Inside", count: counts.IN },
    { key: "OUT", label: t("geFilterLeft") || "Exited", count: counts.OUT },
    { key: "ALL", label: t("geFilterAll") || "All Logs", count: counts.ALL },
  ];

  const columns = [
    {
      key: "idx",
      header: "#",
      width: 50,
      render: (_, idx) => <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>{(page - 1) * LIMIT + idx + 1}</span>,
    },
    {
      key: "visitor",
      header: t("geColName") || "Visitor",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(37, 99, 235, 0.15)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <MdPerson size={15} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              {v.visitor_name || t("vlsUnknown") || "Unknown"}
            </p>
            {v.mobile && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                {v.mobile}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: t("vlsPurpose") || "Purpose",
      render: (v) => <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{v.purpose}</span>,
    },
    {
      key: "flat",
      header: t("geColFlat") || "Flat",
      render: (v) => (
        <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {flatLabel(v)}
        </span>
      ),
    },
    {
      key: "entry",
      header: t("geColEntry") || "Entry Time",
      render: (v) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: "0.8rem", fontWeight: 600 }}>
          <MdAccessTime size={13} /> {new Date(v.entry_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "exit",
      header: t("geColExit") || "Exit Time",
      render: (v) =>
        v.exit_time ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
            <MdAccessTime size={13} /> {new Date(v.exit_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : (
          <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>—</span>
        ),
    },
    {
      key: "status",
      header: t("billStatusCol") || "Status",
      render: (v) => (
        <GlobalBadge variant={v.exit_time ? "neutral" : "success"} dot>
          {v.exit_time ? t("geFilterLeft") || "Exited" : t("geFilterInside") || "Inside"}
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
        ) : null,
    },
  ];

  return (
    <div className="vls-page animate-fadeIn space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{t("vlsTitle")}</h1>
          <p className="text-xs text-secondary mt-0.5">{t("vlsSubtitle")}</p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder={t("vlsSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full pl-10 pr-4 h-10 text-sm bg-white/5 border-white/10"
            />
          </div>

          <div className="sa-segment">
            {filterTabs.map((tabItem) => (
              <button
                key={tabItem.key}
                onClick={() => handleTabChange(tabItem.key)}
                className={tab === tabItem.key ? "sa-segment-active" : ""}
              >
                {tabItem.label} ({tabItem.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <GlobalTable
        columns={columns}
        data={visitors}
        loading={initialLoad}
        emptyMessage={t("geEmpty") || "No visitors currently found."}
        emptyIcon={MdOutlineInbox}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}