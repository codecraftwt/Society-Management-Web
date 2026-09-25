import { useEffect, useState, useCallback, useContext, useRef } from "react";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import Index from "./index/Index";

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

  const handlePageSizeChange = (s) => {
    limitRef.current = s;
    setLimit(s);
    setPage(1);
    loadLogs(1, debSearch, filter);
  };

  return (
    <Index
      isSuperAdmin={isSuperAdmin}
      counts={counts}
      logs={logs}
      initialLoad={initialLoad}
      fetching={fetching}
      page={page}
      pageSize={limit}
      totalPages={totalPages}
      totalItems={totalItems}
      filter={filter}
      search={search}
      isSearchOpen={isSearchOpen}
      societiesList={societiesList}
      blocks={blocks}
      floors={floors}
      flats={flats}
      filterSocietyId={filterSocietyId}
      filterBlockId={filterBlockId}
      filterFloorId={filterFloorId}
      filterFlatId={filterFlatId}
      onFilterChange={handleFilterChange}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onSearchChange={(val) => { setSearch(val); setPage(1); }}
      onSearchOpenChange={setIsSearchOpen}
      onSocietyChange={(val) => { setFilterSocietyId(val); setPage(1); }}
      onBlockChange={(val) => { setFilterBlockId(val); setPage(1); }}
      onFloorChange={(val) => { setFilterFloorId(val); setPage(1); }}
      onFlatChange={(val) => { setFilterFlatId(val); setPage(1); }}
    />
  );
}