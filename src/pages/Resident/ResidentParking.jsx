import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdSearch, MdClose, MdOutlineInbox,
  MdDirectionsCar, MdTwoWheeler,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import Select from "../../components/common/Select";

/* ── Debounce hook — keeps input focused ── */
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Spinner ── */
function Spinner({ size = 20, small = false }) {
  const s = small ? 13 : size;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
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

const LIMIT = 10;

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentParking() {
  const { t } = useLang();

  const [showForm,     setShowForm]     = useState(false);
  const [hasFlat,      setHasFlat]      = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitLoading,setSubmitLoading]= useState(false);

  const [form, setForm] = useState({
    guest_name:       "",
    vehicle_number:   "",
    vehicle_type:     "CAR",
    expected_arrival: "",
    duration_hours:   24,
  });

  // ── Requests data ── ✅ FIX: Added COMPLETED to counts
  const [requests,   setRequests]   = useState([]);
  const [counts,     setCounts]     = useState({ ALL: 0, APPROVED: 0, REJECTED: 0, COMPLETED: 0 });

  // ── Two loading states ──
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  // ── Search & filter ──
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debouncedSearch = useDebounce(search, 500);

  // ── Pagination ──
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Check flat ── */
useEffect(() => {
  API.get("/users/get-flat")
    .then((res) => {
      const flats = Array.isArray(res.data) ? res.data : [];
      setHasFlat(flats.length > 0);   // ✅ correct check
    })
    .catch(() => setHasFlat(false));
}, []);

  /* ── Fetch requests ── */
  const fetchData = useCallback(async (
    pageNum, currentFilter, currentSearch, isInitial = false
  ) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);

    try {
      const params = new URLSearchParams({
        page:   pageNum,
        limit:  LIMIT,
        filter: currentFilter,
        ...(currentSearch ? { search: currentSearch } : {}),
      });

      const res = await API.get(`/parking?${params}`);

      setRequests(res.data.data || []);
      setCounts(res.data.counts  || {});
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
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
    fetchData(1, "ALL", "", true);
  }, [fetchData]);

  // ── Re-fetch on search/filter change ──
  useEffect(() => {
    if (initialLoad) return;
    fetchData(1, filter, debouncedSearch);
  }, [debouncedSearch, filter, initialLoad, fetchData]);

  const handleFilterChange = (newFilter) => setFilter(newFilter);

  const handlePageChange = (newPage) =>
    fetchData(newPage, filter, debouncedSearch);

  /* ── Submit new request ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitLoading(true);
    try {
      await API.post("/parking", form);
      setForm({ guest_name: "", vehicle_number: "", vehicle_type: "CAR", expected_arrival: "", duration_hours: 24 });
      setShowForm(false);
      // reload page 1
      fetchData(1, filter, debouncedSearch);
    } catch (err) {
      const message = err.response?.data?.message;
      if (message === "Flat not found") {
        setHasFlat(false);
        setErrorMessage(t("parkNoFlat"));
      } else {
        setErrorMessage(message || t("parkSomethingWrong"));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── Helpers ── ✅ FIX: Added COMPLETED status */
  const statusColor = (status) => {
    if (status === "APPROVED")  return "bg-green-500/20 text-green-400";
    if (status === "REJECTED")  return "bg-red-500/20 text-red-400";
    if (status === "COMPLETED") return "bg-purple-500/20 text-purple-400"; // ✅ ADDED
    return "bg-yellow-500/20 text-yellow-400";
  };

  const statusLabel = (status) => {
    if (status === "APPROVED")  return t("parkStatusApproved");
    if (status === "REJECTED")  return t("parkStatusRejected");
    if (status === "COMPLETED") return t("parkStatusCompleted"); // ✅ ADDED
    return t("parkStatusPending");
  };

  const tabActive   = "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  const tabInactive = "bg-white/5 text-secondary border border-white/10 hover:bg-white/10 hover:text-white";

  // ✅ FIX: Added COMPLETED filter tab
  const filterTabs = [
    { key: "ALL",       label: t("billTabAll"),          count: counts.ALL       },
    { key: "PENDING",   label: t("parkStatusPending"),   count: counts.PENDING   },
    { key: "APPROVED",  label: t("parkStatusApproved"),  count: counts.APPROVED  },
    { key: "COMPLETED", label: t("parkStatusCompleted"), count: counts.COMPLETED }, // ✅ ADDED
    { key: "REJECTED",  label: t("parkStatusRejected"),  count: counts.REJECTED  },
  ];

  const isEmpty    = !initialLoad && counts.ALL === 0;
  const noMatch    = !initialLoad && counts.ALL > 0 && requests.length === 0 && !fetching;
  const hasResults = !initialLoad && requests.length > 0;

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t("parkTitle")}</h2>
          <p className="text-secondary text-xs mt-0.5">
            {counts.ALL} {t("parkCount") || "requests"}
          </p>
        </div>
        {hasFlat && (
          <button
            onClick={() => setShowForm((p) => !p)}
            className="btn-primary flex items-center gap-2"
          >
            <MdAdd size={18} /> {t("parkRequestBtn")}
          </button>
        )}
      </div>

      {/* ── NO FLAT WARNING ── */}
      {!hasFlat && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-400">
          ⚠️ {t("parkNoFlat")}
        </div>
      )}

      {/* ── ERROR ── */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="ml-3 opacity-60 hover:opacity-100">
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && hasFlat && (
        <div className="bg-card p-5 max-w-3xl animate-scaleIn">
          <h3 className="font-semibold mb-4">{t("parkFormTitle")}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="input h-12"
              placeholder={t("parkGuestName")}
              value={form.guest_name}
              onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              required
            />
            <input
              className="input h-12"
              placeholder={t("parkVehicleNumber")}
              value={form.vehicle_number}
              onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
              required
            />
            <Select
              className="input h-12"
              value={form.vehicle_type}
              onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
            >
              <option value="CAR">{t("parkCar")}</option>
              <option value="BIKE">{t("parkBike")}</option>
            </Select>
            <input
              type="datetime-local"
              className="input h-12"
              value={form.expected_arrival}
              onChange={(e) => setForm({ ...form, expected_arrival: e.target.value })}
              required
            />
            <input
              type="number"
              className="input h-12 md:col-span-2"
              placeholder={t("parkDuration")}
              value={form.duration_hours}
              onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
            />
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary h-11" disabled={submitLoading}>
                {submitLoading
                  ? <span className="flex items-center gap-2"><Spinner size={14} /> {t("compSubmitting")}</span>
                  : t("compSubmitBtn")}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setErrorMessage(""); }}
                className="h-11 px-4 rounded-xl bg-white/10 text-sm hover:bg-white/15 transition"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── REQUEST LIST ── */}
      <div className="bg-card p-4 sm:p-5">

        {/* Toolbar — search + filter */}
        {!initialLoad && counts.ALL > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            {/* Search */}
            <div className="relative">
              <MdSearch size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <input
                key="parking-search-input"
                className="input h-9 pl-8 pr-8 text-xs w-full"
                placeholder={t("visSearch") || "Search guest, vehicle…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                {fetching ? (
                  <Spinner small />
                ) : search ? (
                  <button onClick={() => setSearch("")} className="text-secondary hover:text-white transition-colors">
                    <MdClose size={13} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    filter === tab.key ? tabActive : tabInactive
                  }`}
                >
                  {tab.label}
                  <span className="opacity-60 ml-0.5">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {initialLoad ? (
          <div className="flex flex-col items-center gap-3 py-12 text-secondary">
            <Spinner size={28} />
            <p className="text-sm">{t("parkLoading")}</p>
          </div>

        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary animate-fadeIn">
            <MdOutlineInbox size={48} className="opacity-20" />
            <p className="text-sm">{t("parkEmpty")}</p>
            {hasFlat && (
              <button onClick={() => setShowForm(true)} className="btn-primary mt-1">
                <MdAdd size={16} /> {t("parkRequestBtn")}
              </button>
            )}
          </div>

        ) : noMatch ? (
          <div className="flex flex-col items-center gap-2 py-12 text-secondary animate-fadeIn">
            <MdSearch size={32} className="opacity-25" />
            <p className="text-sm">{t("visNoMatch") || "No requests match your search"}</p>
            <button
              onClick={() => { setSearch(""); setFilter("ALL"); }}
              className="text-xs text-accent hover:underline mt-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {t("billClearFilters")}
            </button>
          </div>

        ) : hasResults ? (
          <>
            {/* MOBILE CARDS */}
            <div className="md:hidden space-y-4">
              {requests.map((r, i) => (
                <div
                  key={r.id}
                  className="rounded-xl overflow-hidden animate-fadeIn"
                  style={{
                    animationDelay: `${i * 35}ms`,
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div style={{
                    height: 3,
                    background:
                      r.status === "APPROVED"  ? "linear-gradient(90deg,#34d399,#059669)"
                      : r.status === "REJECTED"  ? "linear-gradient(90deg,#f87171,#dc2626)"
                      : r.status === "COMPLETED" ? "linear-gradient(90deg,#9F87D7,#5A3BA2)" // ✅ ADDED
                      : "linear-gradient(90deg,#60A5FA,#2563EB)",
                  }} />
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{r.guest_name}</p>
                        <p className="text-xs text-secondary mt-0.5 flex items-center gap-1">
                          {r.vehicle_type === "BIKE"
                            ? <MdTwoWheeler size={12} />
                            : <MdDirectionsCar size={12} />}
                          {r.vehicle_number}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    {r.assigned_spot && (
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        <MdDirectionsCar size={14} />
                        {t("parkSpot")}: <strong>{r.assigned_spot}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Mobile pagination */}
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-secondary border-b border-white/10">
                    <th className="p-3 text-left">{t("parkColGuest")}</th>
                    <th className="p-3 text-left">{t("parkColVehicle")}</th>
                    <th className="p-3 text-left">{t("parkColSpot")}</th>
                    <th className="p-3 text-left">{t("billStatusCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 hover:bg-white/3 transition animate-fadeIn"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                        {r.guest_name}
                      </td>
                      <td className="p-3 text-secondary">
                        <span className="flex items-center gap-1.5">
                          {r.vehicle_type === "BIKE"
                            ? <MdTwoWheeler size={14} className="shrink-0" />
                            : <MdDirectionsCar size={14} className="shrink-0" />}
                          {r.vehicle_number}
                        </span>
                      </td>
                      <td className="p-3" style={{ color: "var(--accent)" }}>
                        {r.assigned_spot || "—"}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Desktop footer: count + pagination */}
              <div className="flex flex-col gap-2 mt-3">
                <p className="text-xs text-secondary text-right">
                  {t("reportShowing") || "Showing"} {requests.length} {t("reportOf") || "of"} {totalItems} {t("parkCount") || "requests"}
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