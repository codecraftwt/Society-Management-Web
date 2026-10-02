import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { MdInventory2 } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import Index from "./index/Index";
import ParcelDetailModal from "./index/ParcelDetailModal";
import { emptyCounts, matchesQuery } from "./parcelDetails";

const SEARCH_DEBOUNCE_MS = 400;

const useDebounce = (value, delay = SEARCH_DEBOUNCE_MS) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/**
 * Parcel Management — read-only oversight for Society Admin and Super Admin.
 *
 * The gate actions themselves (arrival, handover) stay with the guard module;
 * this screen only reports what was recorded. Nothing here mutates a parcel.
 */
export default function Parcels() {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN" || user?.role === "SUPER_ADMIN";

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(emptyCounts());
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const debouncedSearch = useDebounce(search);

  /* Super Admin can filter by society or view all societies. */
  const [societies, setSocieties] = useState([]);
  const [societyId, setSocietyId] = useState(() => {
    const cached = localStorage.getItem("superadmin_society_filter");
    return cached && cached !== "ALL" ? cached : "";
  });

  /* Only the newest request may paint state; flipping tabs or societies quickly
     would otherwise let a slower response overwrite the active filter. */
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies")
      .then((res) => setSocieties(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSocieties([]));
  }, [isSuperAdmin]);

  const load = useCallback(
    async (nextPage, { nextStatus, nextSearch, nextSize, nextSocietyId }) => {
      const requestId = (requestIdRef.current += 1);
      let stale = false;

      requestId === 1 ? setLoading(true) : setRefreshing(true);
      setError("");

      try {
        const params = { page: nextPage, limit: nextSize };
        if (nextStatus && nextStatus !== "ALL") params.status = nextStatus;
        if (nextSearch) params.search = nextSearch;
        if (nextSocietyId && nextSocietyId !== "ALL") params.society_id = nextSocietyId;

        const res = await API.get("/parcels", { params });
        if (requestId !== requestIdRef.current) {
          stale = true;
          return;
        }

        const data = res?.data || {};
        const list = Array.isArray(data.data) ? data.data : [];

        setRows(list);
        setCounts({ ...emptyCounts(), ...(data.counts || {}) });
        setPagination({
          totalItems: data.pagination?.totalItems ?? list.length,
          totalPages: Math.max(data.pagination?.totalPages ?? 1, 1),
        });
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          stale = true;
          return;
        }
        console.error("Failed to load parcels:", err);
        setRows([]);
        setCounts(emptyCounts());
        setPagination({ totalItems: 0, totalPages: 1 });
        setError(err?.response?.data?.message || "Failed to load parcel records.");
        toast.error(err?.response?.data?.message || "Failed to load parcel records.");
      } finally {
        if (!stale) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    load(1, {
      nextStatus: status,
      nextSearch: debouncedSearch,
      nextSize: pageSize,
      nextSocietyId: societyId,
    });
  }, [status, debouncedSearch, societyId, load]);

  const handleSocietyChange = (value) => {
    const str = String(value || "");
    const next = !str || str === "ALL" ? "" : str;
    setSocietyId(next);
    localStorage.setItem("superadmin_society_filter", next || "ALL");
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const selectedSocietyName = useMemo(
    () => societies.find((s) => String(s.id) === String(societyId))?.name || "",
    [societies, societyId]
  );

  /* The API filters on courier name only; widen the current page to the unit
     and the people involved, which is what an admin actually scans for. */
  const visibleRows = useMemo(
    () => (debouncedSearch.trim() ? rows.filter((p) => matchesQuery(p, debouncedSearch)) : rows),
    [rows, debouncedSearch]
  );

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto pb-8">
      <Index
        rows={visibleRows}
        counts={counts}
        status={status}
        onStatusChange={handleStatusChange}
        search={search}
        onSearchChange={handleSearchChange}
        isSearchOpen={isSearchOpen}
        onSearchOpenChange={setIsSearchOpen}
        loading={loading}
        refreshing={refreshing}
        page={page}
        pageSize={pageSize}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onOpen={setSelected}
        societyLabel={isSuperAdmin ? selectedSocietyName : ""}
        isSuperAdmin={isSuperAdmin}
        societies={societies}
        societyId={societyId}
        onSocietyChange={handleSocietyChange}
      />

      {error && !loading ? (
        <p className="text-xs text-center mt-3" style={{ color: "#ef4444", margin: 0 }}>
          {error}
        </p>
      ) : null}

      {selected ? <ParcelDetailModal parcel={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
