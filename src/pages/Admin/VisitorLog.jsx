import { useEffect, useState, useCallback, useContext, useRef} from "react";
import {
  MdSearch, MdPerson,
  MdOutlineInbox, MdAccessTime,
  MdFilterList,
} from "react-icons/md";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalButton from "../../components/common/GlobalButton";
import "./Admin.css";

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



export default function VisitorLog() {
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
        limit: limitRef.current, 
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
      setTotalPages(Math.ceil(total / limitRef.current) || 1);

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

  const getCleanLabel = (key, fallback) => {
    const raw = t(key);
    if (!raw || raw === key || raw.toLowerCase().includes("filter") || raw.toLowerCase().includes("vifilter")) {
      return fallback;
    }
    return raw;
  };

  const filterTabs = [
    { id: "ALL", label: getCleanLabel("vlFilterAll", getCleanLabel("vlTabAll", "All")), badge: counts.ALL || 0 },
    { id: "IN",  label: getCleanLabel("vlFilterIn", getCleanLabel("vlTabInside", "Currently In")), badge: counts.IN || 0 },
    { id: "OUT", label: getCleanLabel("vlFilterOut", getCleanLabel("vlTabExited", "Checked Out")), badge: counts.OUT || 0 },
  ];

  const columns = [
    {
      key: "idx",
      header: t("srNo") || "Sr. No.",
      width: 65,
      render: (_, idx) => (
        <span style={{ color: "var(--text-tertiary)", fontSize: "0.82rem", fontWeight: 500 }}>
          {(page - 1) * limit + idx + 1}
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
      {/* ── Page Header: Unified Single Row with Sliding Tabs, Unit Filters & Search ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdOutlineInbox size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>
              {t("vlTitle") || "Visitor Logs"}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {totalItems} {t("vlSubtitle") || "Total visitor records"}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1">
          {/* Status Toggle Sliding Tabs */}
          <SlidingTabs
            value={filter}
            onChange={handleFilterChange}
            items={isSearchOpen ? filterTabs.filter((t) => t.id === filter) : filterTabs}
          />

          {/* Unit Filters Dropdowns */}
          {isSuperAdmin && (
            <Select
              className="input h-10 text-xs min-w-30 bg-white/5 border-white/10"
              value={filterSocietyId}
              onChange={e => { setFilterSocietyId(e.target.value); setPage(1); }}
            >
              <option value="">{t("allSocieties") || "All Societies"}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterBlockId}
            onChange={e => { setFilterBlockId(e.target.value); setPage(1); }}
          >
            <option value="">{t("allBlocks") || "All Blocks"}</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>

          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterFloorId}
            onChange={e => { setFilterFloorId(e.target.value); setPage(1); }}
            disabled={!filterBlockId}
          >
            <option value="">{t("allFloors") || "All Floors"}</option>
            {floors.map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
          </Select>

          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterFlatId}
            onChange={e => { setFilterFlatId(e.target.value); setPage(1); }}
            disabled={!filterFloorId}
          >
            <option value="">{t("allFlats") || "All Flats"}</option>
            {flats.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
          </Select>

          {/* Expandable Animated Search Slider */}
          <ExpandableSearch
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder={t("vlSearch") || "Search visitors, flat, purpose…"}
            fetching={fetching}
            isOpen={isSearchOpen}
            onOpenChange={setIsSearchOpen}
          />
        </div>
      </div>

      {/* ── GLOBAL TABLE WITH ANIMATION ── */}
      <div key={`${filter}-${page}`} className="animate-slide-page">
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
        
          pageSize={limit}
          onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); loadLogs(1, debSearch, filter); }}
        />
      </div>
    </div>
  );
}