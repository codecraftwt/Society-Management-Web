import { useEffect, useState, useCallback, useContext } from "react";
import {
  MdSearch, MdPerson, MdApartment,
  MdLogin, MdLogout, MdOutlineInbox,
  MdClose, MdAccessTime, MdCalendarToday, MdInfoOutline,
  MdChevronLeft, MdChevronRight, MdFilterList,
} from "react-icons/md";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import Select from "../../components/common/Select";

/* ── Debounce ── */
function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── Spinner ── */
function Spinner({ small = false }) {
  const s = small ? 13 : 20;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin text-accent" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Pagination ── */
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e${i}`} className="pagination-ellipsis">…</span> : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status, t }) {
  if (status === "IN")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20 whitespace-nowrap">
        <MdLogin size={11} /> {t("vlIn")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-300 border border-gray-500/20 whitespace-nowrap">
      <MdLogout size={11} /> {t("vlOut")}
    </span>
  );
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

const tabActive   = "bg-blue-500/20 text-blue-400 border border-blue-500/30";
const tabInactive = "bg-white/5 text-secondary border border-white/10 hover:bg-white/10 hover:text-white";

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
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
        ...(filterFlatId ? { flat_id: filterFlatId } : {}),
      });

      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
      const res  = await API.get(`/visitors?${params}`, { headers });
      const data = res.data;

      setLogs((data.data || []).map(formatVisitor));
      setCounts(data.counts || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) { console.error("Failed to load visitor logs", err); }
    finally { setInitialLoad(false); setFetching(false); }
  }, [isSuperAdmin, filterSocietyId, filterBlockId, filterFloorId, filterFlatId, user?.society_id]);

  /* ── Cascading Data Fetching ── */
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies").then(res => setSocietiesList(res.data || [])).catch(console.error);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const activeSocId = isSuperAdmin ? filterSocietyId : user?.society_id;
    if (activeSocId) {
      const headers = isSuperAdmin ? { "x-society-id": activeSocId } : {};
      API.get(`/blocks/${activeSocId}`, { headers }).then(res => setBlocks(res.data || [])).catch(console.error);
    } else {
      setBlocks([]);
    }
    setFilterBlockId("");
  }, [filterSocietyId, isSuperAdmin, user?.society_id]);

  useEffect(() => {
    const activeSocId = isSuperAdmin ? filterSocietyId : user?.society_id;
    if (filterBlockId && activeSocId) {
      const headers = isSuperAdmin ? { "x-society-id": activeSocId } : {};
      API.get(`/floors/${filterBlockId}`, { headers }).then(res => setFloors(res.data || [])).catch(console.error);
    } else {
      setFloors([]);
    }
    setFilterFloorId("");
  }, [filterBlockId, filterSocietyId, isSuperAdmin, user?.society_id]);

  useEffect(() => {
    const activeSocId = isSuperAdmin ? filterSocietyId : user?.society_id;
    if (filterFloorId && activeSocId) {
      const headers = isSuperAdmin ? { "x-society-id": activeSocId } : {};
      API.get(`/flats/floor/${filterFloorId}`, { headers }).then(res => setFlats(res.data || [])).catch(console.error);
    } else {
      setFlats([]);
    }
    setFilterFlatId("");
  }, [filterFloorId, filterSocietyId, isSuperAdmin, user?.society_id]);

  /* ── Initial load ── */
  useEffect(() => { loadLogs(1, "", filter, true); }, [filterSocietyId, filterBlockId, filterFloorId, filterFlatId]);

  /* ── Re-fetch on search change ── */
  useEffect(() => {
    if (initialLoad) return;
    loadLogs(1, debSearch, filter);
  }, [debSearch, filter]);

  /* ── Filter change ── */
  const handleFilterChange = (f) => setFilter(f);
  const handlePageChange   = (p) => loadLogs(p, debSearch, filter);

  /* ── Tab config ── */
  const filterTabs = [
    { key: "ALL", label: t("vlTabAll"),    count: counts.ALL },
    { key: "IN",  label: t("vlTabInside"), count: counts.IN  },
    { key: "OUT", label: t("vlTabExited"), count: counts.OUT },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
            <MdPerson size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("vlTitle")}</h2>
            <p className="text-secondary text-xs mt-0.5">
              {initialLoad ? "—" : `${counts.ALL} ${t("vlSubtitle")}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      {!initialLoad && counts.ALL > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fadeIn">
          {[
            { label: t("vlStatTotal"),  val: counts.ALL, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
            { label: t("vlTabInside"),  val: counts.IN,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20"  },
            { label: t("vlTabExited"),  val: counts.OUT, color: "text-gray-300",   bg: "bg-gray-500/10 border-gray-500/20"    },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3.5 animate-scaleIn flex flex-col justify-between min-h-18 ${s.bg}`}>
              <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.val}</p>
              <p className="text-[11px] text-secondary mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── SEARCH + FILTERS ── */}
      <div className="bg-card p-4 rounded-xl border border-white/5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              className="input h-11 w-full bg-white/5"
              style={{ paddingLeft: 40, paddingRight: 40 }}
              placeholder={t("vlSearch")}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white">
                <MdClose size={16} />
              </button>
            )}
          </div>

          {/* Unit Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 shrink-0">
              <MdFilterList size={16} className="text-secondary" />
              <span className="text-xs font-bold text-secondary uppercase tracking-wider hidden sm:inline">{t("rptFilters") || "Filters"}:</span>
            </div>
            
            {isSuperAdmin && (
              <Select className="input h-9 text-xs min-w-30 bg-white/5 border-white/10"
                value={filterSocietyId} onChange={e => setFilterSocietyId(e.target.value)}>
                <option value="">{t("allSocieties")}</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}

            <Select className="input h-9 text-xs min-w-25 bg-white/5 border-white/10"
              value={filterBlockId} onChange={e => setFilterBlockId(e.target.value)}>
              <option value="">{t("allBlocks")}</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>

            <Select className="input h-9 text-xs min-w-25 bg-white/5 border-white/10"
              value={filterFloorId} onChange={e => setFilterFloorId(e.target.value)} disabled={!filterBlockId}>
              <option value="">{t("allFloors")}</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
            </Select>

            <Select className="input h-9 text-xs min-w-25 bg-white/5 border-white/10"
              value={filterFlatId} onChange={e => setFilterFlatId(e.target.value)} disabled={!filterFloorId}>
              <option value="">{t("allFlats")}</option>
              {flats.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
            </Select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${filter === tab.key ? tabActive : tabInactive}`}
              >
                {tab.label} <span className="ml-1.5 opacity-50 font-normal">({tab.count})</span>
              </button>
            ))}
          </div>
          {fetching && <div className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-widest px-2 animate-pulse"><Spinner small />Syncing</div>}
        </div>
      </div>

      {/* ── STATES ── */}
      {initialLoad && (
        <div className="bg-card p-14 flex flex-col items-center gap-3 text-secondary">
          <Spinner /><p className="text-sm">{t("vlLoading")}</p>
        </div>
      )}

      {!initialLoad && counts.ALL === 0 && (
        <div className="bg-card p-16 flex flex-col items-center gap-2 text-secondary animate-fadeIn">
          <MdOutlineInbox size={48} className="opacity-25" />
          <p className="text-sm">{t("vlEmpty")}</p>
        </div>
      )}

      {!initialLoad && counts.ALL > 0 && logs.length === 0 && !fetching && (
        <div className="bg-card p-14 flex flex-col items-center gap-2 text-secondary animate-fadeIn">
          <MdSearch size={40} className="opacity-25" />
          <p className="text-sm">{t("vlNoMatch")}</p>
          <button onClick={() => { setSearch(""); handleFilterChange("ALL"); }} className="text-xs text-accent hover:underline mt-1">
            {t("reportClearFilters")}
          </button>
        </div>
      )}

      {/* ══ DATA ══ */}
      {!initialLoad && logs.length > 0 && (
        <>
          {/* ── Mobile cards ── */}
          <div className="space-y-3 md:hidden">
            {logs.map((v, i) => (
              <div key={v.id} className="bg-card p-4 space-y-3 animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <MdPerson size={15} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{v.name}</p>
                      <p className="text-xs text-secondary">{v.mobile}</p>
                    </div>
                  </div>
                  <StatusBadge status={v.status} t={t} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-secondary">
                    <MdApartment size={13} className="text-accent/70 shrink-0" />
                    <span>{v.flat}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary">
                    <MdCalendarToday size={12} className="text-accent/70 shrink-0" />
                    <span>{v.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary">
                    <MdLogin size={13} className="text-green-400/70 shrink-0" />
                    <span>{v.intime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary">
                    <MdLogout size={13} className="text-gray-400/70 shrink-0" />
                    <span>{v.outtime ?? <span className="opacity-40">—</span>}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-secondary border-t border-white/5 pt-2.5">
                  <MdInfoOutline size={13} className="text-accent/60 shrink-0" />
                  <span>{v.purpose}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">{t("vlColVisitor")}</th>
                    <th className="p-3 text-left hidden sm:table-cell">{t("vlColFlat")}</th>
                    <th className="p-3 text-left hidden md:table-cell">{t("vlColPurpose")}</th>
                    <th className="p-3 text-left hidden lg:table-cell">{t("vlColDate")}</th>
                    <th className="p-3 text-left">{t("vlColIn")}</th>
                    <th className="p-3 text-left hidden sm:table-cell">{t("vlColOut")}</th>
                    <th className="p-3 text-left">{t("billStatusCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((v, i) => (
                    <tr key={v.id} className="border-b border-white/5 hover:bg-white/3 transition-colors duration-150 animate-fadeIn"
                      style={{ animationDelay: `${i * 20}ms` }}>
                      <td className="p-3 text-secondary text-xs">{(page - 1) * LIMIT + i + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <MdPerson size={13} className="text-accent" />
                          </div>
                          <div>
                            <p className="font-medium leading-tight">{v.name}</p>
                            <p className="text-xs text-secondary">{v.mobile}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-secondary hidden sm:table-cell">{v.flat}</td>
                      <td className="p-3 text-secondary hidden md:table-cell">{v.purpose}</td>
                      <td className="p-3 text-secondary hidden lg:table-cell">{v.date}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <MdAccessTime size={13} />{v.intime}
                        </span>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {v.outtime
                          ? <span className="flex items-center gap-1 text-secondary text-xs"><MdAccessTime size={13} />{v.outtime}</span>
                          : <span className="text-secondary/30 text-xs">—</span>}
                      </td>
                      <td className="p-3"><StatusBadge status={v.status} t={t} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-secondary">
                {t("reportShowing")}{" "}
                <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong>
                {" "}{t("reportOf")}{" "}
                <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>
                {" "}{t("reportRecords")}
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>

          {/* Mobile footer pagination */}
          <div className="md:hidden flex flex-col items-center gap-2 pb-2">
            <p className="text-xs text-secondary">
              {t("reportShowing")} <strong>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong> {t("reportOf")} <strong>{totalItems}</strong>
            </p>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>
      )}
    </div>
  );
}