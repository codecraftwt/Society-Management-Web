import React, { useEffect, useState, useCallback, useRef} from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import {
  MdOutlineInbox, MdSearch,
  MdLogin, MdLogout, MdPhone,
  MdDirectionsCar, MdAccessTime, MdExpandMore,
  MdChevronLeft, MdChevronRight, MdPeople,
  MdPerson, MdLocalShipping, MdLocalTaxi, MdBuild,
  MdClose,
} from "react-icons/md";
import GlobalBadge from "../../components/common/GlobalBadge";

import Pagination from "../../components/common/Pagination";

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentVisitors() {
  const { t } = useLang();

  const [visitors,     setVisitors]     = useState([]);
  const [expandedId,   setExpandedId]   = useState(null);

  // ── Loading states ──
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  // ── Search & filter ──
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, INSIDE, LEFT
  const [purposeFilter, setPurposeFilter] = useState("ALL"); // ALL, GUEST, DELIVERY, CAB, SERVICE

  // ── Debounced search ──
  const debouncedSearch = useDebounce(search, 500);

  // ── Pagination ──
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ── Counts from server ──
  const [counts, setCounts] = useState({
    ALL: 0,
    INSIDE: 0,
    LEFT: 0,
    GUEST: 0,
    DELIVERY: 0,
    CAB: 0,
    SERVICE: 0,
  });

  // ── Fetch ──
  const loadVisitors = useCallback(async (pageNum, currentFilter, currentPurpose, currentSearch, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);

    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: limitRef.current,
        filter: currentFilter,
        ...(currentPurpose && currentPurpose !== "ALL" ? { purpose: currentPurpose } : {}),
        ...(currentSearch ? { search: currentSearch } : {}),
      });

      const res = await API.get(`/visitors/resident?${params}`);

      setVisitors(res.data.visitors || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.totalVisitors || 0);
      setCounts(res.data.counts || { ALL: 0, INSIDE: 0, LEFT: 0, GUEST: 0, DELIVERY: 0, CAB: 0, SERVICE: 0 });
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
    loadVisitors(1, "ALL", "ALL", "", true);
  }, []);

  // ── Re-fetch on filter/search change ──
  useEffect(() => {
    if (initialLoad) return;
    loadVisitors(1, filter, purposeFilter, debouncedSearch);
  }, [debouncedSearch, filter, purposeFilter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setExpandedId(null);
  };

  const handlePurposeChange = (newPurpose) => {
    setPurposeFilter(newPurpose);
    setExpandedId(null);
  };

  const handlePageChange = (newPage) => {
    setExpandedId(null);
    loadVisitors(newPage, filter, purposeFilter, debouncedSearch);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilter("ALL");
    setPurposeFilter("ALL");
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

  const purposeOptions = [
    { id: "ALL", label: t("visAllTypes") || "All Types", icon: MdPeople, count: counts.ALL },
    { id: "GUEST", label: t("visGuest") || "Guest", icon: MdPerson, count: counts.GUEST },
    { id: "DELIVERY", label: t("visDelivery") || "Delivery", icon: MdLocalShipping, count: counts.DELIVERY },
    { id: "CAB", label: t("visCab") || "Cab", icon: MdLocalTaxi, count: counts.CAB },
    { id: "SERVICE", label: t("visService") || "Service", icon: MdBuild, count: counts.SERVICE },
  ];

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

      {/* ── Toolbar: Status Tabs & Search ── */}
      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={filter}
            onChange={handleFilterChange}
            tabs={[
              { id: "ALL", label: t("visTabAll"), badge: counts.ALL },
              { id: "INSIDE", label: t("visTabInside"), badge: counts.INSIDE, alert: counts.INSIDE },
              { id: "LEFT", label: t("visTabLeft"), badge: counts.LEFT },
            ]}
          />
        </div>

        <div className="ml-auto">
          <ExpandableSearch
            placeholder={t("visSearch") || "Search by name, vehicle, purpose..."}
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* ── Entry Type / Purpose Filter Chips ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {purposeOptions.map((opt) => {
          const IconComponent = opt.icon;
          const isActive = purposeFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handlePurposeChange(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 border ${
                isActive
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-secondary hover:text-white border-white/10"
              }`}
            >
              <IconComponent size={14} className={isActive ? "text-white" : "text-secondary"} />
              <span>{opt.label}</span>
              {typeof opt.count === 'number' && opt.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-white/10 text-secondary"
                }`}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}

        {(purposeFilter !== "ALL" || search || filter !== "ALL") && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors shrink-0"
          >
            <MdClose size={14} />
            <span>{t("clearFilter") || "Reset"}</span>
          </button>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 border border-white/8">

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
              {t("billClearFilters") || "Clear all filters"}
            </button>
          </div>

        ) : hasResults ? (
          <>
            {/* MOBILE CARDS */}
            <div className="md:hidden space-y-3">
              {visitors.map((v, i) => {
                const pConfig = getPurposeConfig(v.purpose);
                const PurposeIcon = pConfig.icon;
                return (
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
                        
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${pConfig.bg} ${pConfig.color} font-medium`}>
                            <PurposeIcon size={12} />
                            {pConfig.label}
                          </span>
                          <span className="inline-block bg-blue-500/15 text-blue-400 text-[11px] px-2 py-0.5 rounded-full border border-blue-500/25">
                            Flat: {v.Flat?.flat_number || "—"}
                          </span>
                        </div>

                        <p className="text-[11px] text-secondary/50 mt-1 flex items-center gap-1">
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
                );
              })}

              {/* MOBILE PAGINATION */}
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
            </div>

            {/* DESKTOP TABLE */}
            <div className="data-table-wrap hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("vrVisitor")}</th>
                    <th>{t("vrPurpose") || "Type / Purpose"}</th>
                    <th>Flat</th>
                    <th>{t("vrEntry")}</th>
                    <th>{t("billStatusCol")}</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v, i) => {
                    const pConfig = getPurposeConfig(v.purpose);
                    const PurposeIcon = pConfig.icon;
                    return (
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
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${pConfig.bg} ${pConfig.color} font-medium`}>
                              <PurposeIcon size={13} />
                              {pConfig.label}
                            </span>
                          </td>
                          <td className="p-3 text-secondary text-xs">
                            <span className="inline-block bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                              {v.Flat?.flat_number || "—"}
                            </span>
                          </td>
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
                            <td colSpan={6} className="px-4 pb-4 pt-1">
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
                    );
                  })}
                </tbody>
              </table>

              {/* DESKTOP PAGINATION + row count */}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-secondary">
                  {t("reportShowing")} {visitors.length} {t("reportOf")} {totalItems} {t("rvVisitorsCount")}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
