import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd,
  MdClose,
  MdLocalTaxi,
  MdPhone,
  MdDirectionsCar,
  MdAccessTime,
  MdCheckCircle,
  MdLogout,
} from "react-icons/md";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";
import ToggleSearchBar from "../../components/common/ToggleSearchBar";
import Pagination from "../../components/common/Pagination";
import StepVisitorEntryModal from "../../components/guard/StepVisitorEntryModal";

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        style={{ opacity: 0.25 }}
      />
      <path
        fill="currentColor"
        style={{ opacity: 0.75 }}
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

function resolveFlatLabel(flat) {
  if (!flat) return "NA";
  const block = flat.Floor?.Block?.name || flat.Block?.name || null;
  const floorNumber = flat.Floor?.floor_number ?? null;
  const flatNumber = flat.flat_number || "";
  return (
    [
      block,
      floorNumber != null ? `Floor ${floorNumber}` : null,
      flatNumber,
    ]
      .filter(Boolean)
      .join(" / ") || "NA"
  );
}

function resolveVisitorFlatLabel(v) {
  return resolveFlatLabel(v?.Flat);
}

function splitCabName(name = "") {
  const idx = name.indexOf(" - ");
  if (idx === -1) return { aggregator: "Cab", driver: name };
  return { aggregator: name.slice(0, idx), driver: name.slice(idx + 3) };
}

export default function CabEntry() {
  const { t } = useLang();

  const [showModal, setShowModal] = useState(false);
  const [cabs, setCabs] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0, IN: 0, OUT: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [exitLoadingId, setExitLoadingId] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  const loadCabs = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        filter: f,
        purpose: "CAB",
        ...(q ? { search: q } : {}),
      });
      const res = await API.get(`/visitors?${params}`);
      const data = res.data;
      setCabs(Array.isArray(data) ? data : data?.data || []);
      setCounts(data?.counts || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error("Failed to load cabs:", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadCabs(1, "", "ALL", true);
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadCabs(1, debSearch, filter);
  }, [debSearch]);

  const handleFilterChange = (f) => {
    setFilter(f);
    loadCabs(1, debSearch, f);
  };

  const handlePageChange = (p) => loadCabs(p, debSearch, filter);

  const handleMarkExit = async (id, name) => {
    setExitLoadingId(id);
    try {
      await API.put(`/visitors/exit/${id}`);
      toast.success(`Cab exit logged for ${name}`);
      loadCabs(page, debSearch, filter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark cab exit");
    } finally {
      setExitLoadingId(null);
    }
  };

  const filterTabs = [
    { key: "ALL", label: t("cabFilterAll", "All Cabs"), count: counts.ALL },
    { key: "IN", label: t("cabFilterInside", "Inside"), count: counts.IN },
    { key: "OUT", label: t("cabFilterLeft", "Exited"), count: counts.OUT },
  ];

  return (
    <div className="ge-root">
      {/* ── HEADER ── */}
      <div className="ge-er">
        <div className="ge-er-left">
          <div
            className="ad-page-icon"
            style={{ background: "rgba(217, 119, 6, 0.15)", color: "#D97706" }}
          >
            <MdLocalTaxi size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("cabTitle", "Cab Entry Log")}</h2>
            <p className="page-subtitle">
              {counts.ALL} {t("cabTotal", "Total Cab Trips Today")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ background: "#D97706" }}
        >
          <MdAdd size={18} /> {t("cabAddBtn", "New Cab Entry")}
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="ge-stats">
        <div
          onClick={() => handleFilterChange("ALL")}
          className={`complaint-stat-card complaint-stat-total cursor-pointer ${
            filter === "ALL" ? "ring-2 ring-amber-500 shadow-md" : ""
          }`}
        >
          <span className="complaint-stat-val text-amber-600">{counts.ALL}</span>
          <span className="complaint-stat-label">Total Cabs</span>
        </div>
        <div
          onClick={() => handleFilterChange("IN")}
          className={`complaint-stat-card complaint-stat-inprogress cursor-pointer ${
            filter === "IN" ? "ring-2 ring-emerald-500 shadow-md" : ""
          }`}
        >
          <span className="complaint-stat-val text-emerald-600">{counts.IN}</span>
          <span className="complaint-stat-label">Inside Society</span>
        </div>
        <div
          onClick={() => handleFilterChange("OUT")}
          className={`complaint-stat-card complaint-stat-resolved cursor-pointer ${
            filter === "OUT" ? "ring-2 ring-gray-500 shadow-md" : ""
          }`}
        >
          <span className="complaint-stat-val text-gray-500">{counts.OUT}</span>
          <span className="complaint-stat-label">Exited Gate</span>
        </div>
      </div>

      {/* ── SEARCH + FILTER ── */}
      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={filter}
            onChange={handleFilterChange}
            tabs={filterTabs.map(({ key, label, count }) => ({
              key,
              label: (
                <span className="flex items-center gap-1.5">
                  <span>{label}</span>
                  <span className="opacity-75 font-normal">({count})</span>
                </span>
              ),
            }))}
          />
        </div>

        <div className="ge-search-wrap">
          <ToggleSearchBar
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder={t("cabSearchPlaceholder", "Search driver, taxi brand, vehicle no, flat...")}
          />
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="ge-table-card">
        {initialLoad ? (
          <div className="p-8 text-center text-secondary">
            <Spinner size={24} />
            <p className="mt-2 text-xs">Loading cab records...</p>
          </div>
        ) : cabs.length === 0 ? (
          <div className="ge-empty">
            <span className="ge-empty-icon">🚖</span>
            <span>No cab entries found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ge-table">
              <thead>
                <tr>
                  <th>Driver &amp; Cab Service</th>
                  <th>Flat Destination</th>
                  <th>Contact</th>
                  <th>Vehicle Number</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cabs.map((item) => {
                  const isInside = !item.exit_time;
                  const { aggregator, driver } = splitCabName(item.visitor_name);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                            <MdLocalTaxi size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-primary block text-sm">
                              {driver}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              {aggregator}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ge-flat-chip">{resolveVisitorFlatLabel(item)}</span>
                      </td>
                      <td>
                        <a
                          href={`tel:${item.mobile}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <MdPhone size={12} />
                          {item.mobile || "—"}
                        </a>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-primary font-bold">
                          {item.vehicle_number || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-primary font-medium">
                          {item.entry_time
                            ? new Date(item.entry_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-secondary font-medium">
                          {item.exit_time
                            ? new Date(item.exit_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </td>
                      <td>
                        {isInside ? (
                          <span className="ge-badge ge-badge--inside">
                            ● Inside
                          </span>
                        ) : (
                          <span className="ge-badge ge-badge--left">
                            ✔ Exited
                          </span>
                        )}
                      </td>
                      <td>
                        {isInside ? (
                          <button
                            onClick={() => handleMarkExit(item.id, driver)}
                            disabled={exitLoadingId === item.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            {exitLoadingId === item.id ? (
                              <Spinner size={12} />
                            ) : (
                              <MdLogout size={13} />
                            )}
                            <span>Mark Exit</span>
                          </button>
                        ) : (
                          <span className="text-xs text-secondary italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={limit}
                onPageSizeChange={(s) => {
                  limitRef.current = s;
                  setLimit(s);
                  setPage(1);
                  handlePageChange(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="ge-mobile-list">
        {initialLoad ? (
          <div className="p-6 text-center text-secondary">
            <Spinner size={20} />
          </div>
        ) : cabs.length === 0 ? (
          <div className="ge-empty">
            <span className="ge-empty-icon">🚖</span>
            <span>No cab entries found</span>
          </div>
        ) : (
          <>
            {cabs.map((item) => {
              const { aggregator, driver } = splitCabName(item.visitor_name);
              return (
                <div key={item.id} className="ge-mobile-card">
                  <div className="ge-mc-top">
                    <div className="ge-mc-name-row">
                      <span
                        className={`ge-row-bar ${
                          item.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"
                        }`}
                      />
                      <div>
                        <span className="ge-mc-name">{driver}</span>
                        <span className="text-[10px] text-amber-600 block font-semibold">
                          {aggregator}
                        </span>
                      </div>
                    </div>
                    {item.exit_time ? (
                      <span className="ge-badge ge-badge--left">✔ Exited</span>
                    ) : (
                      <span className="ge-badge ge-badge--inside">● Inside</span>
                    )}
                  </div>
                  <div className="ge-mc-rows">
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">Destination</span>
                      <span className="ge-flat-chip">{resolveVisitorFlatLabel(item)}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">Vehicle</span>
                      <span className="ge-mc-val font-mono">{item.vehicle_number || "—"}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">Contact</span>
                      <a
                        href={`tel:${item.mobile}`}
                        className="ge-mc-val text-blue-600 flex items-center gap-1"
                      >
                        <MdPhone size={12} /> {item.mobile}
                      </a>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">Entry Time</span>
                      <span className="ge-mc-val">
                        {item.entry_time ? new Date(item.entry_time).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    {!item.exit_time && (
                      <div className="mt-3 pt-2 border-t border-divider flex justify-end">
                        <button
                          onClick={() => handleMarkExit(item.id, driver)}
                          disabled={exitLoadingId === item.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          {exitLoadingId === item.id ? <Spinner size={12} /> : <MdLogout size={14} />}
                          <span>Record Exit</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={limit}
                onPageSizeChange={(s) => {
                  limitRef.current = s;
                  setLimit(s);
                  setPage(1);
                  handlePageChange(1);
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── 4-STEP WIZARD ENTRY MODAL ── */}
      <StepVisitorEntryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        purpose="CAB"
        onSuccess={() => {
          setShowModal(false);
          loadCabs(1, search, filter);
        }}
      />
    </div>
  );
}
