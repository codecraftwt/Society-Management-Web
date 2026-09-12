import React, { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import {
  MdSearch, MdClose, MdOutlineInbox,
  MdLogin, MdLogout, MdPhone,
  MdDirectionsCar, MdAccessTime, MdExpandMore,
  MdChevronLeft, MdChevronRight, MdPeople,
} from "react-icons/md";
import GlobalBadge from "../../components/common/GlobalBadge";

/* ── Helpers ── */
const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const timeAgoRaw = (d) => {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  const m   = Math.floor(diff / 60000);
  const h   = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1)   return { key: "timeJustNow", val: 0   };
  if (m < 60)  return { key: "timeMinsAgo", val: m   };
  if (h < 24)  return { key: "timeHoursAgo",val: h   };
  if (day < 7) return { key: "timeDaysAgo", val: day };
  return { key: "formatted", val: d };
};

const calcDuration = (entry, exit) => {
  if (!entry || !exit) return null;
  const diff = new Date(exit) - new Date(entry);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
};

const LIMIT = 10;

/* ── Debounce hook ── */
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Spinner ── */
function Spinner({ small = false }) {
  const size = small ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <svg className={`animate-spin ${size} text-accent`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Avatar ── */
function Avatar({ name = "", size = "w-8 h-8", textSize = "text-xs" }) {
  const initials = name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center ${textSize} font-bold text-white shrink-0`}
      style={{ background: `hsl(${hue},50%,36%)` }}
    >
      {initials}
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ exitTime, t }) {
  return exitTime ? (
    <GlobalBadge variant="danger">
      {t("rvLeft") || "Left"}
    </GlobalBadge>
  ) : (
    <GlobalBadge variant="success">
      {t("rvInside") || "Inside"}
    </GlobalBadge>
  );
}

/* ── Pagination ── */
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="pagination-btn"
      >
        <MdChevronLeft size={15} /> Prev
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="pagination-btn"
      >
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentVisitors() {
  const { t } = useLang();

  const [visitors,     setVisitors]     = useState([]);
  const [expandedId,   setExpandedId]   = useState(null);

  // ── Two loading states to avoid unmounting content while searching ──
  const [initialLoad, setInitialLoad] = useState(true);  // full screen spinner (first load only)
  const [fetching,    setFetching]    = useState(false); // subtle spinner (search/filter/page)

  // ── Search & filter ──
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  // ── Debounced search — 500ms after user stops typing ──
  const debouncedSearch = useDebounce(search, 500);

  // ── Pagination ──
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ── Tab counts from server ──
  const [counts, setCounts] = useState({ ALL: 0, INSIDE: 0, LEFT: 0 });

  // ── Fetch ──
  const loadVisitors = useCallback(async (pageNum, currentFilter, currentSearch, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);

    try {
      const params = new URLSearchParams({
        page:   pageNum,
        limit:  LIMIT,
        filter: currentFilter,
        ...(currentSearch ? { search: currentSearch } : {}),
      });

      const res = await API.get(`/visitors/resident?${params}`);

      // setVisitors(res.data.data || []);
      // setTotalPages(res.data.pagination.totalPages);
      // setTotalItems(res.data.pagination.totalItems);
      // setCounts(res.data.counts);
      // setPage(pageNum);
      setVisitors(res.data.visitors || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.totalVisitors || 0);
      setCounts(res.data.counts || { ALL: 0, INSIDE: 0, LEFT: 0 });
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  // ── First load ──
  useEffect(() => {
    loadVisitors(1, "ALL", "", true);
  }, []);

  // ── Re-fetch on search/filter change (no full spinner — keeps input focused) ──
  useEffect(() => {
    // skip the very first render (handled by the effect above)
    if (initialLoad) return;
    loadVisitors(1, filter, debouncedSearch);
  }, [debouncedSearch, filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setExpandedId(null);
  };

  const handlePageChange = (newPage) => {
    setExpandedId(null);
    loadVisitors(newPage, filter, debouncedSearch);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilter("ALL");
    setExpandedId(null);
  };

  /* translate timeAgo */
  const timeAgo = (d) => {
    const r = timeAgoRaw(d);
    if (!r) return "";
    if (r.key === "timeJustNow") return t("timeJustNow");
    if (r.key === "formatted")   return formatDate(r.val);
    return `${r.val} ${t(r.key)}`;
  };

  const toggleExpand = (id) => setExpandedId((prev) => prev === id ? null : id);

  const isEmpty    = !initialLoad && counts.ALL === 0;
  const noMatch    = !initialLoad && counts.ALL > 0 && visitors.length === 0 && !fetching;
  const hasResults = !initialLoad && visitors.length > 0;

  return (
    <div className="ge-root animate-fadeIn">

      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdPeople size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("visTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("visRecorded")}</p>
          </div>
        </div>
      </div>

      <div className="ge-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{counts.ALL}</span>
          <span className="complaint-stat-label">{t("visStatTotal")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{counts.INSIDE}</span>
          <span className="complaint-stat-label">{t("visTabInside")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{counts.LEFT}</span>
          <span className="complaint-stat-label">{t("visTabLeft")}</span>
        </div>
      </div>

      <div className="ge-toolbar">
        <div className="ge-search-wrap">
          <MdSearch className="ge-search-icon" size={17} />
          <input
            className="ge-search-input"
            placeholder={t("visSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {fetching && !initialLoad ? (
            <div className="ge-search-action">
              <Spinner small />
            </div>
          ) : search ? (
            <button type="button" onClick={() => setSearch("")} className="ge-search-clear" aria-label="Clear search">
              <MdClose size={13} />
            </button>
          ) : null}
        </div>

        <SlidingTabs
          className="ge-filter-tabs"
          value={filter}
          onChange={handleFilterChange}
          items={[
            { id: "ALL", label: t("visTabAll"), badge: counts.ALL },
            { id: "INSIDE", label: t("visTabInside"), badge: counts.INSIDE, alert: counts.INSIDE },
            { id: "LEFT", label: t("visTabLeft"), badge: counts.LEFT },
          ]}
        />
      </div>

      {/* ── CONTENT ── */}
      <div className="bg-card p-4 sm:p-5">

        {initialLoad ? (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <Spinner />
            <p className="text-sm">{t("visLoading")}</p>
          </div>

        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-16 text-secondary animate-fadeIn">
            <MdOutlineInbox size={48} className="opacity-25" />
            <p className="text-sm">{t("visEmpty")}</p>
          </div>

        ) : noMatch ? (
          <div className="flex flex-col items-center gap-2 py-12 text-secondary animate-fadeIn">
            <MdSearch size={32} className="opacity-25" />
            <p className="text-sm">{t("visNoMatch")}</p>
            <button onClick={handleClearFilters} className="text-xs text-accent hover:underline mt-1">
              {t("billClearFilters")}
            </button>
          </div>

        ) : hasResults ? (
          <>
            {/* MOBILE CARDS */}
            <div className="md:hidden space-y-3">
              {visitors.map((v, i) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-white/8 overflow-hidden animate-fadeIn"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <button
                    className="w-full text-left p-4 flex items-center gap-3 hover:bg-white/3 transition-colors duration-200"
                    onClick={() => toggleExpand(v.id)}
                  >
                    <Avatar name={v.visitor_name} size="w-10 h-10" textSize="text-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{v.visitor_name}</p>
                        <StatusBadge exitTime={v.exit_time} t={t} />
                      </div>
                      <p className="text-xs text-secondary mt-0.5">{v.purpose}</p>
                      <span className="mt-2 inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/30">
                        Flat: {v.Flat?.flat_number || "—"}
                      </span>
                      <p className="text-[11px] text-secondary/50 mt-0.5 flex items-center gap-1">
                        <MdAccessTime size={11} /> {timeAgo(v.entry_time)}
                      </p>
                    </div>
                    <div
                      className="text-secondary shrink-0 transition-transform duration-200"
                      style={{ transform: expandedId === v.id ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      <MdExpandMore size={18} />
                    </div>
                  </button>

                  {expandedId === v.id && (
                    <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: MdPhone,         label: t("vrMobile"),  val: v.mobile               },
                          { icon: MdDirectionsCar, label: t("rvVehicle"), val: v.vehicle_number || "—" },
                        ].map(({ icon: Icon, label, val }) => (
                          <div key={label} className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-0">
                            <Icon size={14} className="text-accent shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-secondary uppercase tracking-wide">{label}</p>
                              <p className="text-xs font-medium mt-0.5 wrap-break-word">{val}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-white/5 rounded-xl px-3 py-3 space-y-2">
                        <div className="flex items-center gap-2.5 text-xs">
                          <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                            <MdLogin size={13} className="text-green-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-secondary uppercase tracking-wide">{t("vrEntry")}</p>
                            <p className="font-medium">{formatDate(v.entry_time)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${v.exit_time ? "bg-red-500/15" : "bg-white/5"}`}>
                            <MdLogout size={13} className={v.exit_time ? "text-red-400" : "text-secondary"} />
                          </div>
                          <div>
                            <p className="text-[10px] text-secondary uppercase tracking-wide">{t("vrExit")}</p>
                            <p className={`font-medium ${!v.exit_time ? "text-secondary" : ""}`}>
                              {v.exit_time ? formatDate(v.exit_time) : t("visStillInside")}
                            </p>
                          </div>
                        </div>
                        {calcDuration(v.entry_time, v.exit_time) && (
                          <div className="flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                              <MdAccessTime size={13} className="text-yellow-400" />
                            </div>
                            <div>
                              <p className="text-[10px] text-secondary uppercase tracking-wide">{t("visDuration")}</p>
                              <p className="font-medium text-yellow-400">{calcDuration(v.entry_time, v.exit_time)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* MOBILE PAGINATION */}
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>

            {/* DESKTOP TABLE */}
            <div className="data-table-wrap hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("vrVisitor")}</th>
                    <th>{t("vrPurpose")}</th>
                    <th>{t("vrEntry")}</th>
                    <th>{t("billStatusCol")}</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v, i) => (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => toggleExpand(v.id)}
                        className="border-b border-white/5 cursor-pointer group transition-colors duration-200 hover:bg-white/3"
                        style={{
                          animationDelay: `${i * 25}ms`,
                          background: expandedId === v.id ? "rgba(255,255,255,0.025)" : "",
                        }}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={v.visitor_name} />
                            <span className="font-medium">{v.visitor_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-secondary">{v.purpose}</td>
                        <td className="p-3 text-secondary text-xs whitespace-nowrap">{formatDate(v.entry_time)}</td>
                        <td className="p-3"><StatusBadge exitTime={v.exit_time} t={t} /></td>
                        <td className="p-3">
                          <div
                            className="text-secondary/40 group-hover:text-secondary transition-all duration-300"
                            style={{ transform: expandedId === v.id ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <MdExpandMore size={18} />
                          </div>
                        </td>
                      </tr>

                      {expandedId === v.id && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-4 pt-1">
                            <div className="rounded-xl bg-white/3 border border-white/8 p-4 animate-scaleIn">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                    <MdPhone size={14} className="text-blue-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-secondary uppercase tracking-wider">{t("vrMobile")}</p>
                                    <p className="text-xs font-medium mt-0.5 wrap-break-word">{v.mobile}</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                                    <MdDirectionsCar size={14} className="text-secondary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-secondary uppercase tracking-wider">{t("rvVehicle")}</p>
                                    <p className="text-xs font-medium mt-0.5 wrap-break-word">{v.vehicle_number || "—"}</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${v.exit_time ? "bg-red-500/15" : "bg-white/5"}`}>
                                    <MdLogout size={14} className={v.exit_time ? "text-red-400" : "text-secondary"} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-secondary uppercase tracking-wider">{t("visExitTime")}</p>
                                    <p className={`text-xs font-medium mt-0.5 wrap-break-word ${!v.exit_time ? "text-secondary" : ""}`}>
                                      {v.exit_time ? formatDate(v.exit_time) : t("visStillInside")}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                    <MdAccessTime size={14} className="text-yellow-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-secondary uppercase tracking-wider">{t("visDuration")}</p>
                                    <p className="text-xs font-medium mt-0.5 text-yellow-400">
                                      {v.exit_time
                                        ? calcDuration(v.entry_time, v.exit_time)
                                        : `${calcDuration(v.entry_time, new Date().toISOString()) || "< 1m"}+`
                                      }
                                    </p>
                                  </div>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* DESKTOP PAGINATION + row count */}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-secondary">
                  {t("reportShowing")} {visitors.length} {t("reportOf")} {totalItems} {t("rvVisitorsCount")}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
