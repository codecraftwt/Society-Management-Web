import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd,
  MdDirectionsWalk,
  MdPhone,
  MdDirectionsCar,
  MdAccessTime,
  MdCheckCircle,
  MdLogout,
} from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Pagination from "../../components/common/Pagination";
import StepVisitorEntryModal from "../../components/guard/StepVisitorEntryModal";
import StatCard from "../../components/common/StatCard";

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

export default function GuestEntry() {
  const { t } = useLang();

  const [showModal, setShowModal] = useState(false);
  const [visitors, setVisitors] = useState([]);
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

  const loadVisitors = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        filter: f,
        purpose: "GUEST",
        ...(q ? { search: q } : {}),
      });
      const res = await API.get(`/visitors?${params}`);
      const data = res.data;
      setVisitors(Array.isArray(data) ? data : data?.data || []);
      setCounts(data?.counts || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error("Failed to load guests:", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadVisitors(1, "", "ALL", true);
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadVisitors(1, debSearch, filter);
  }, [debSearch]);

  const handleFilterChange = (f) => {
    setFilter(f);
    loadVisitors(1, debSearch, f);
  };

  const handlePageChange = (p) => loadVisitors(p, debSearch, filter);

  const handleMarkExit = async (id, name) => {
    setExitLoadingId(id);
    try {
      await API.put(`/visitors/exit/${id}`);
      toast.success(t("geExitLogged", { name }, "Exit logged for {name}"));
      loadVisitors(page, debSearch, filter);
    } catch (err) {
      toast.error(err.response?.data?.message || t("geExitFailed", "Failed to log exit"));
    } finally {
      setExitLoadingId(null);
    }
  };

  const filterTabs = [
    { key: "ALL", label: t("geFilterAll", "All Guests"), count: counts.ALL },
    { key: "IN", label: t("geFilterInside", "Inside"), count: counts.IN },
    { key: "OUT", label: t("geFilterLeft", "Exited"), count: counts.OUT },
  ];

  return (
    <div className="ge-root space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="ge-er flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="ge-er-left flex items-center gap-3">
          <div className="ad-page-icon">
            <FaUserFriends size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("geTitle", "Guest Entry Log")}</h2>
            <p className="page-subtitle">
              {counts.ALL} {t("geTotal", "Total Guest Visits Today")}
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <MdAdd size={18} /> <span>{t("geAddBtn", "New Guest Entry")}</span>
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-2">
        <StatCard
          layout="inline"
          icon={<FaUserFriends size={20} />}
          tone="brand"
          interactive
          selected={filter === "ALL"}
          onClick={() => handleFilterChange("ALL")}
          value={counts.ALL}
          label={t("geStatTotal", "Total Guests")}
        />
        <StatCard
          layout="inline"
          icon={<MdDirectionsWalk size={20} />}
          tone="info"
          interactive
          selected={filter === "IN"}
          onClick={() => handleFilterChange("IN")}
          value={counts.IN}
          label={t("geStatInside", "Inside Premises")}
        />
        <StatCard
          layout="inline"
          icon={<MdLogout size={20} />}
          tone="success"
          interactive
          selected={filter === "OUT"}
          onClick={() => handleFilterChange("OUT")}
          value={counts.OUT}
          label={t("geStatExited", "Departed")}
        />
      </div>

      {/* ── SEARCH + FILTER ── */}
      <div className="ge-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={filter}
            onChange={handleFilterChange}
            items={filterTabs.map(({ key, label, count }) => ({
              id: key,
              label: label,
              badge: count,
            }))}
          />
        </div>

        <div className="sm:ml-auto w-full sm:w-auto">
          <ExpandableSearch
            placeholder={t("geSearchPlaceholder", "Search by guest name, phone, flat...")}
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* ── DATA SECTION (SINGLE UNIFIED LOADING & EMPTY STATES) ── */}
      {initialLoad ? (
        <div className="ge-table-card p-12 text-center text-secondary">
          <Spinner size={26} />
          <p className="mt-2 text-xs font-bold">{t("geLoading", "Loading guest records...")}</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="ge-table-card p-12 text-center text-secondary">
          <div className="ge-empty py-4">
            <span className="ge-empty-icon text-3xl">👥</span>
            <p className="mt-2 text-sm font-semibold">{t("geEmpty", "No guest records found")}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="ge-table-card hidden md:block">
            <div className="overflow-x-auto">
              <table className="ge-table">
              <thead>
                <tr>
                  <th>{t("geColVisitor", "Guest Name")}</th>
                  <th>{t("geColFlat", "Flat Visited")}</th>
                  <th>{t("geColPhone", "Phone Number")}</th>
                  <th>{t("geColVehicle", "Vehicle Details")}</th>
                  <th>{t("geColEntry", "Entry Time")}</th>
                  <th>{t("geColExit", "Exit Time")}</th>
                  <th>{t("geColStatus", "Status")}</th>
                  <th>{t("geColAction", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((item) => {
                  const isInside = !item.exit_time;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            <FaUserFriends size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-primary block text-sm">
                              {item.visitor_name}
                            </span>
                            <span className="text-[11px] text-secondary">
                              {t("gePersonalGuest", "Personal Guest")}
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
                        <div className="text-xs">
                          <span className="font-mono text-primary font-medium">
                            {item.vehicle_number || "—"}
                          </span>
                          {item.assigned_slot && (
                            <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                              {t("geSlot", { slot: item.assigned_slot }, "Slot: {slot}")}
                            </span>
                          )}
                        </div>
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
                            ● {t("geFilterInside", "Inside")}
                          </span>
                        ) : (
                          <span className="ge-badge ge-badge--left">
                            ✔ {t("geFilterLeft", "Exited")}
                          </span>
                        )}
                      </td>
                      <td>
                        {isInside ? (
                          <button
                            onClick={() => handleMarkExit(item.id, item.visitor_name)}
                            disabled={exitLoadingId === item.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            {exitLoadingId === item.id ? (
                              <Spinner size={12} />
                            ) : (
                              <MdLogout size={13} />
                            )}
                            <span>{t("geMarkExit", "Mark Exit")}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-secondary italic">{t("geCompleted", "Completed")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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

          {/* Mobile Cards */}
          <div className="ge-mobile-list block md:hidden space-y-3">
            {visitors.map((item) => (
              <div key={item.id} className="ge-mobile-card">
                <div className="ge-mc-top">
                  <div className="ge-mc-name-row">
                    <span
                      className={`ge-row-bar ${
                        item.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"
                      }`}
                    />
                    <span className="ge-mc-name">{item.visitor_name}</span>
                  </div>
                  {item.exit_time ? (
                    <span className="ge-badge ge-badge--left">✔ {t("geFilterLeft", "Exited")}</span>
                  ) : (
                    <span className="ge-badge ge-badge--inside">● {t("geFilterInside", "Inside")}</span>
                  )}
                </div>
                <div className="ge-mc-rows">
                  <div className="ge-mc-row">
                    <span className="ge-mc-label">{t("geColFlat", "Flat")}</span>
                    <span className="ge-flat-chip">{resolveVisitorFlatLabel(item)}</span>
                  </div>
                  <div className="ge-mc-row">
                    <span className="ge-mc-label">{t("geColPhone", "Phone")}</span>
                    <a
                      href={`tel:${item.mobile}`}
                      className="ge-mc-val text-blue-600 flex items-center gap-1"
                    >
                      <MdPhone size={12} /> {item.mobile}
                    </a>
                  </div>
                  {item.vehicle_number && (
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("geVehicle", "Vehicle")}</span>
                      <span className="ge-mc-val font-mono">{item.vehicle_number}</span>
                    </div>
                  )}
                  <div className="ge-mc-row">
                    <span className="ge-mc-label">{t("geColEntry", "Entry Time")}</span>
                    <span className="ge-mc-val">
                      {item.entry_time ? new Date(item.entry_time).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                  {!item.exit_time && (
                    <div className="mt-3 pt-2 border-t border-divider flex justify-end">
                      <button
                        onClick={() => handleMarkExit(item.id, item.visitor_name)}
                        disabled={exitLoadingId === item.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        {exitLoadingId === item.id ? <Spinner size={12} /> : <MdLogout size={14} />}
                        <span>{t("geMarkExit", "Mark Exit")}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

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
          </div>
        </>
      )}

      {/* ── 4-STEP WIZARD ENTRY MODAL ── */}
      <StepVisitorEntryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        purpose="GUEST"
        onSuccess={() => {
          setShowModal(false);
          loadVisitors(1, search, filter);
        }}
      />
    </div>
  );
}
