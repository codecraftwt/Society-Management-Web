import { useEffect, useState, useCallback, useContext } from "react";
import {
  MdSearch, MdPerson,
  MdOutlineInbox, MdAccessTime,
  MdFilterList,
} from "react-icons/md";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import Select from "../../components/common/Select";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalButton from "../../components/common/GlobalButton";

/* ── Debounce ── */
function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── Format visitor row ── */
const formatVisitor = (v) => {
  const flat = v.Flat;
  const block = flat?.Floor?.Block?.name || flat?.Block?.name || "";
  const floor = flat?.Floor?.floor_number;
  const flatNo = flat?.flat_number || "NA";

  const flatLabel = [
    block,
    floor != null ? `Floor ${floor}` : null,
    flatNo,
  ].filter(Boolean).join(" / ");

  return {
    id:      v.id,
    name:    v.visitor_name,
    mobile:  v.mobile || "—",
    flat:    flatLabel,
    purpose: v.purpose,
    date:    new Date(v.entry_time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    intime:  new Date(v.entry_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    outtime: v.exit_time
      ? new Date(v.exit_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : null,
    status: v.exit_time ? "OUT" : "IN",
  };
};

const LIMIT = 10;

export default function VisitorLog() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";

  /* ── List state ── */
  const [logs,        setLogs]        = useState([]);
  const [counts,      setCounts]      = useState({ ALL: 0, IN: 0, OUT: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  /* ── Pagination ── */
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Search & filter ── */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  // --- UNIT FILTERS ---
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter");
    return (saved === "ALL" || !saved) ? "" : saved;
  });
  const [filterBlockId,   setFilterBlockId]   = useState("");
  const [filterFloorId,   setFilterFloorId]   = useState("");
  const [filterFlatId,    setFilterFlatId]    = useState("");

  const [societiesList, setSocietiesList] = useState([]);
  const [blocks,        setBlocks]        = useState([]);
  const [floors,        setFloors]        = useState([]);
  const [flats,         setFlats]         = useState([]);

  /* ────────────────────────────────────
     LOAD
  ──────────────────────────────────── */
  const loadLogs = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const activeSocId = isSuperAdmin ? filterSocietyId : user?.society_id;
      const params = new URLSearchParams({
        page: pg, 
        limit: LIMIT, 
        filter: f, 
        ...(q ? { search: q } : {}),
        ...(activeSocId ? { society_id: activeSocId } : {}),
        ...(filterBlockId ? { block_id: filterBlockId } : {}),
        ...(filterFloorId ? { floor_id: filterFloorId } : {}),
        ...(filterFlatId ? { flat_id: filterFlatId } : {})
      });

      const res = await API.get(`/visitors?${params.toString()}`);
      const raw = Array.isArray(res.data?.visitors)
        ? res.data.visitors
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      const total = res.data?.total ?? res.data?.pagination?.totalItems ?? raw.length;

      setLogs(raw.map(formatVisitor));
      setTotalItems(total);
      setTotalPages(Math.ceil(total / LIMIT) || 1);

      if (res.data?.counts) {
        setCounts(res.data.counts);
      } else {
        const inC  = raw.filter(v => !v.exit_time).length;
        const outC = raw.filter(v => !!v.exit_time).length;
        setCounts({ ALL: total, IN: inC, OUT: outC });
      }
    } catch {
      setLogs([]);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [user, isSuperAdmin, filterSocietyId, filterBlockId, filterFloorId, filterFlatId]);

  // Load Societies for SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then(res => setSocietiesList(res.data || []))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  // Load Blocks when Society changes
  useEffect(() => {
    const targetSocId = isSuperAdmin ? filterSocietyId : user?.society_id;
    if (targetSocId) {
      API.get(`/blocks/${targetSocId}`)
        .then(res => {
          setBlocks(res.data || []);
          setFilterBlockId("");
          setFilterFloorId("");
          setFilterFlatId("");
        })
        .catch(() => setBlocks([]));
    } else {
      setBlocks([]);
    }
  }, [isSuperAdmin, filterSocietyId, user?.society_id]);

  // Load Floors when Block changes
  useEffect(() => {
    if (filterBlockId) {
      API.get(`/floors/${filterBlockId}`)
        .then(res => {
          setFloors(res.data || []);
          setFilterFloorId("");
          setFilterFlatId("");
        })
        .catch(() => setFloors([]));
    } else {
      setFloors([]);
      setFilterFloorId("");
      setFilterFlatId("");
    }
  }, [filterBlockId]);

  // Load Flats when Floor changes
  useEffect(() => {
    if (filterFloorId) {
      API.get(`/flats/floor/${filterFloorId}`)
        .then(res => {
          setFlats(res.data || []);
          setFilterFlatId("");
        })
        .catch(() => setFlats([]));
    } else {
      setFlats([]);
      setFilterFlatId("");
    }
  }, [filterFloorId]);

  useEffect(() => {
    loadLogs(page, debSearch, filter, initialLoad);
  }, [page, debSearch, filter, loadLogs]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const filterTabs = [
    { key: "ALL", label: t("vlFilterAll"), count: counts.ALL },
    { key: "IN",  label: t("vlFilterIn"),  count: counts.IN  },
    { key: "OUT", label: t("vlFilterOut"), count: counts.OUT },
  ];

  const columns = [
    {
      key: "idx",
      header: "#",
      width: 50,
      render: (_, idx) => (
        <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
          {(page - 1) * LIMIT + idx + 1}
        </span>
      ),
    },
    {
      key: "visitor",
      header: t("vlColVisitor") || "Visitor",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(160, 90, 255, 0.15)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MdPerson size={15} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.25 }}>
              {v.name}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              {v.mobile}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "flat",
      header: t("vlColFlat") || "Flat",
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.85rem" }}>
          {v.flat}
        </span>
      ),
    },
    {
      key: "purpose",
      header: t("vlColPurpose") || "Purpose",
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {v.purpose}
        </span>
      ),
    },
    {
      key: "date",
      header: t("vlColDate") || "Date",
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
          {v.date}
        </span>
      ),
    },
    {
      key: "intime",
      header: t("vlColIn") || "In Time",
      render: (v) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: "0.82rem", fontWeight: 600 }}>
          <MdAccessTime size={13} /> {v.intime}
        </span>
      ),
    },
    {
      key: "outtime",
      header: t("vlColOut") || "Out Time",
      hiddenMobile: true,
      render: (v) => (
        v.outtime ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            <MdAccessTime size={13} /> {v.outtime}
          </span>
        ) : (
          <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>—</span>
        )
      ),
    },
    {
      key: "status",
      header: t("billStatusCol") || "Status",
      render: (v) => (
        <GlobalBadge
          variant={v.status === "IN" ? "success" : "neutral"}
          dot
        >
          {v.status === "IN" ? t("vlIn") || "IN" : t("vlOut") || "OUT"}
        </GlobalBadge>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{t("vlTitle")}</h1>
          <p className="text-xs text-secondary mt-0.5">
            {totalItems} {t("vlSubtitle")}
          </p>
        </div>
      </div>

      {/* ── TOOLBAR / SEARCH & FILTERS ── */}
      <div className="bg-card p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder={t("vlSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input search-input w-full pl-10 pr-4 h-10 text-sm bg-white/5 border-white/10"
            />
          </div>

          {/* Unit dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
              <MdFilterList size={14} /> Filters:
            </span>

            {isSuperAdmin && (
              <Select
                className="input h-9 text-xs min-w-30 bg-white/5 border-white/10"
                value={filterSocietyId}
                onChange={e => setFilterSocietyId(e.target.value)}
              >
                <option value="">{t("allSocieties")}</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}

            <Select
              className="input h-9 text-xs min-w-25 bg-white/5 border-white/10"
              value={filterBlockId}
              onChange={e => setFilterBlockId(e.target.value)}
            >
              <option value="">{t("allBlocks")}</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>

            <Select
              className="input h-9 text-xs min-w-25 bg-white/5 border-white/10"
              value={filterFloorId}
              onChange={e => setFilterFloorId(e.target.value)}
              disabled={!filterBlockId}
            >
              <option value="">{t("allFloors")}</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
            </Select>

            <Select
              className="input h-9 text-xs min-w-25 bg-white/5 border-white/10"
              value={filterFlatId}
              onChange={e => setFilterFlatId(e.target.value)}
              disabled={!filterFloorId}
            >
              <option value="">{t("allFlats")}</option>
              {flats.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
            </Select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="sa-segment">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={filter === tab.key ? "sa-segment-active" : ""}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          {fetching && (
            <span className="text-xs text-accent font-semibold animate-pulse">
              Syncing…
            </span>
          )}
        </div>
      </div>

      {/* ── GLOBAL TABLE ── */}
      <GlobalTable
        columns={columns}
        data={logs}
        loading={initialLoad}
        emptyMessage={counts.ALL === 0 ? (t("vlEmpty") || "No visitor logs yet") : (t("vlNoMatch") || "No matching visitor logs")}
        emptyIcon={MdOutlineInbox}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}