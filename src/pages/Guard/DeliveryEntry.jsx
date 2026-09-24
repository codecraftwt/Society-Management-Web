import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd,
  MdLocalShipping,
  MdPhone,
  MdLogout,
} from "react-icons/md";
import { FaTruck } from "react-icons/fa";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
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

function resolveFlatLabel(flat, tl = (_k, _p, fb) => fb) {
  if (!flat) return "NA";
  const block = flat.Floor?.Block?.name || flat.Block?.name || null;
  const floorNumber = flat.Floor?.floor_number ?? null;
  const flatNumber = flat.flat_number || "";
  return (
    [
      block,
      floorNumber != null ? tl("delFloor", { n: floorNumber }, `Floor ${floorNumber}`) : null,
      flatNumber,
    ]
      .filter(Boolean)
      .join(" / ") || "NA"
  );
}

function resolveVisitorFlatLabel(v, tl) {
  return resolveFlatLabel(v?.Flat, tl);
}

function splitDeliveryName(name = "") {
  const idx = name.indexOf(" - ");
  if (idx === -1) return { company: "Delivery", agent: name };
  return { company: name.slice(0, idx), agent: name.slice(idx + 3) };
}

export default function DeliveryEntry() {
  const { t } = useLang();

  const [showModal, setShowModal] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
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

  const loadDeliveries = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: limitRef.current,
        filter: f,
        purpose: "DELIVERY",
        ...(q ? { search: q } : {}),
      });
      const res = await API.get(`/visitors?${params}`);
      const data = res.data;
      setDeliveries(Array.isArray(data) ? data : data?.data || []);
      setCounts(data?.counts || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveries(1, "", "ALL", true);
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadDeliveries(1, debSearch, filter);
  }, [debSearch]);

  const handleFilterChange = (f) => {
    setFilter(f);
    loadDeliveries(1, debSearch, f);
  };

  const handlePageChange = (p) => loadDeliveries(p, debSearch, filter);

  const handleMarkExit = async (id, name) => {
    setExitLoadingId(id);
    try {
      await API.put(`/visitors/exit/${id}`);
      toast.success(t("delToastExit", { name }, "Exit logged for delivery {name}"));
      loadDeliveries(page, debSearch, filter);
    } catch (err) {
      toast.error(err.response?.data?.message || t("delToastExitFail", "Failed to mark delivery exit"));
    } finally {
      setExitLoadingId(null);
    }
  };

  const filterTabs = [
    { key: "ALL", label: t("delFilterAll", "All Deliveries"), count: counts.ALL },
    { key: "IN", label: t("delFilterInside", "Inside"), count: counts.IN },
    { key: "OUT", label: t("delFilterLeft", "Exited"), count: counts.OUT },
  ];

  return (
    <div className="ge-root">
      {/* ── HEADER ── */}
      <div className="ge-er">
        <div className="ge-er-left">
          <div
            className="ad-page-icon"
            style={{ background: "rgba(8, 145, 178, 0.15)", color: "#0891B2" }}
          >
            <FaTruck size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("delTitle", "Delivery & Parcel Entry Log")}</h2>
            <p className="page-subtitle">
              {counts.ALL} {t("delTotal", "Total Deliveries Processed Today")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ background: "#0891B2" }}
        >
          <MdAdd size={18} /> {t("delAddBtn", "New Delivery Entry")}
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="ge-stats">
        <div
          onClick={() => handleFilterChange("ALL")}
          className={`complaint-stat-card complaint-stat-total cursor-pointer ${
            filter === "ALL" ? "ring-2 ring-cyan-500 shadow-md" : ""
          }`}
        >
          <span className="complaint-stat-val text-cyan-600">{counts.ALL}</span>
          <span className="complaint-stat-label">{t("delStatTotal", "Total Deliveries")}</span>
        </div>
        <div
          onClick={() => handleFilterChange("IN")}
          className={`complaint-stat-card complaint-stat-inprogress cursor-pointer ${
            filter === "IN" ? "ring-2 ring-emerald-500 shadow-md" : ""
          }`}
        >
          <span className="complaint-stat-val text-emerald-600">{counts.IN}</span>
          <span className="complaint-stat-label">{t("delStatInside", "Inside Campus")}</span>
        </div>
        <div
          onClick={() => handleFilterChange("OUT")}
          className={`complaint-stat-card complaint-stat-resolved cursor-pointer ${
            filter === "OUT" ? "ring-2 ring-gray-500 shadow-md" : ""
          }`}
        >
          <span className="complaint-stat-val text-gray-500">{counts.OUT}</span>
          <span className="complaint-stat-label">{t("delStatExited", "Departed Gate")}</span>
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
              id: key,
              label: (
                <span className="flex items-center gap-1.5">
                  <span>{label}</span>
                  <span className="opacity-75 font-normal">({count})</span>
                </span>
              ),
            }))}
          />
        </div>

        <ExpandableSearch
          placeholder={t("delSearchPlaceholder", "Search agent, Swiggy/Zomato, phone, flat...")}
          value={search}
          onChange={setSearch}
        />
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="ge-table-card">
        {initialLoad ? (
          <div className="p-8 text-center text-secondary">
            <Spinner size={24} />
            <p className="mt-2 text-xs">{t("delLoading", "Loading delivery records...")}</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="ge-empty">
            <span className="ge-empty-icon">📦</span>
            <span>{t("delEmpty", "No delivery records found")}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ge-table">
              <thead>
                <tr>
                  <th>{t("delColPartner", "Delivery Partner & Agent")}</th>
                  <th>{t("delColFlat", "Flat Destination")}</th>
                  <th>{t("delColContact", "Contact")}</th>
                  <th>{t("delColVehicleNo", "Vehicle Number")}</th>
                  <th>{t("delColEntryTime", "Entry Time")}</th>
                  <th>{t("delColExitTime", "Exit Time")}</th>
                  <th>{t("delColStatus", "Status")}</th>
                  <th>{t("delColAction", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((item) => {
                  const isInside = !item.exit_time;
                  const { company, agent } = splitDeliveryName(item.visitor_name);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                            <FaTruck size={15} />
                          </div>
                          <div>
                            <span className="font-bold text-primary block text-sm">
                              {agent}
                            </span>
                            <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                              {company}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ge-flat-chip">{resolveVisitorFlatLabel(item, t)}</span>
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
                        <span className="text-xs font-mono text-secondary">
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
                            ● {t("delBadgeInside", "Inside")}
                          </span>
                        ) : (
                          <span className="ge-badge ge-badge--left">
                            ✔ {t("delBadgeExited", "Exited")}
                          </span>
                        )}
                      </td>
                      <td>
                        {isInside ? (
                          <button
                            onClick={() => handleMarkExit(item.id, agent)}
                            disabled={exitLoadingId === item.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            {exitLoadingId === item.id ? (
                              <Spinner size={12} />
                            ) : (
                              <MdLogout size={13} />
                            )}
                            <span>{t("delMarkExit", "Mark Exit")}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-secondary italic">{t("delCompleted", "Completed")}</span>
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
        ) : deliveries.length === 0 ? (
          <div className="ge-empty">
            <span className="ge-empty-icon">📦</span>
            <span>{t("delEmpty", "No delivery records found")}</span>
          </div>
        ) : (
          <>
            {deliveries.map((item) => {
              const { company, agent } = splitDeliveryName(item.visitor_name);
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
                        <span className="ge-mc-name">{agent}</span>
                        <span className="text-[10px] text-cyan-600 block font-semibold">
                          {company}
                        </span>
                      </div>
                    </div>
                    {item.exit_time ? (
                      <span className="ge-badge ge-badge--left">✔ {t("delBadgeExited", "Exited")}</span>
                    ) : (
                      <span className="ge-badge ge-badge--inside">● {t("delBadgeInside", "Inside")}</span>
                    )}
                  </div>
                  <div className="ge-mc-rows">
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("delDest", "Destination")}</span>
                      <span className="ge-flat-chip">{resolveVisitorFlatLabel(item, t)}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("delContact", "Contact")}</span>
                      <a
                        href={`tel:${item.mobile}`}
                        className="ge-mc-val text-blue-600 flex items-center gap-1"
                      >
                        <MdPhone size={12} /> {item.mobile}
                      </a>
                    </div>
                    {item.vehicle_number && (
                      <div className="ge-mc-row">
                        <span className="ge-mc-label">{t("delVehicle", "Vehicle")}</span>
                        <span className="ge-mc-val font-mono">{item.vehicle_number}</span>
                      </div>
                    )}
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("delEntryTime", "Entry Time")}</span>
                      <span className="ge-mc-val">
                        {item.entry_time ? new Date(item.entry_time).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    {!item.exit_time && (
                      <div className="mt-3 pt-2 border-t border-divider flex justify-end">
                        <button
                          onClick={() => handleMarkExit(item.id, agent)}
                          disabled={exitLoadingId === item.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          {exitLoadingId === item.id ? <Spinner size={12} /> : <MdLogout size={14} />}
                          <span>{t("delRecordExit", "Record Exit")}</span>
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
        purpose="DELIVERY"
        onSuccess={() => {
          setShowModal(false);
          loadDeliveries(1, search, filter);
        }}
      />
    </div>
  );
}
