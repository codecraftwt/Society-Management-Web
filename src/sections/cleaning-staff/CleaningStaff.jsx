/* NEW CLEANING STAFF SECTION (Web Admin)
 *
 * Route entry point. Deliberately thin: it owns data fetching, loading flags and
 * modal wiring, and delegates every pixel to the section's own components —
 * the same division of labour as sections/notice/Notice.jsx.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useLang } from "../../context/LanguageContext";
import RoleBasedAccess from "../../components/common/RoleBasedAccess";
import Index from "./index/Index";
import Create from "./create/Create";
import Edit from "./edit/Edit";
import Detail from "./detail/Detail";
import Delete from "./delete/Delete";
import { getCleaningStaff, getAllAttendance } from "./cleaningStaffService";
import { todayIST } from "./format";
import "./CleaningStaff.css";

/* Same debounce the notice section uses, so typing does not spam the API. */
function useDebounce(value, delay = 450) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function CleaningStaff() {
  const { t } = useLang();

  /* ── Staff list ───────────────────────────────────────────────────── */
  const [staff, setStaff] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState("staff");

  /* ── Attendance ───────────────────────────────────────────────────── */
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState(() => {
    const today = todayIST();
    return { from: today, to: today };
  });

  /* ── Modals ───────────────────────────────────────────────────────── */
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const debouncedSearch = useDebounce(search);

  /* Guards against a slow earlier response overwriting a newer one. */
  const listRequestRef = useRef(0);
  const attRequestRef = useRef(0);

  /* ── Data ─────────────────────────────────────────────────────────── */

  /**
   * `status` is intentionally NOT sent: the KPI cards must describe the whole
   * society, and the status tabs filter the already-loaded list locally.
   * `search` IS sent because the backend supports it.
   */
  const loadStaff = useCallback(async () => {
    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;
    setFetching(true);
    setListError("");
    try {
      const rows = await getCleaningStaff({ search: debouncedSearch });
      if (requestId !== listRequestRef.current) return;
      setStaff(Array.isArray(rows) ? rows : []);
    } catch (err) {
      if (requestId !== listRequestRef.current) return;
      setStaff([]);
      /* 403 means the role lost the section; surface it rather than showing a
         misleading empty list. */
      if (err?.response?.status === 403) {
        setListError(t("csForbidden", "You do not have permission to view cleaning staff."));
      } else {
        setListError(
          err?.response?.data?.message ||
            t("csLoadFail", "Could not load cleaning staff.")
        );
      }
    } finally {
      if (requestId === listRequestRef.current) {
        setFetching(false);
        setInitialLoad(false);
      }
    }
  }, [debouncedSearch, t]);

  const loadAttendance = useCallback(async () => {
    const requestId = attRequestRef.current + 1;
    attRequestRef.current = requestId;
    setAttendanceLoading(true);
    try {
      const rows = await getAllAttendance({
        from: attendanceFilter.from || undefined,
        to: attendanceFilter.to || undefined,
      });
      if (requestId !== attRequestRef.current) return;
      setAttendance(Array.isArray(rows) ? rows : []);
    } catch {
      if (requestId === attRequestRef.current) setAttendance([]);
    } finally {
      if (requestId === attRequestRef.current) setAttendanceLoading(false);
    }
  }, [attendanceFilter.from, attendanceFilter.to]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  /* Attendance is only fetched when its tab is actually open. */
  useEffect(() => {
    if (view !== "attendance") return;
    loadAttendance();
  }, [view, loadAttendance]);

  /* Changing a filter resets to page 1 so an empty page is never stranded. */
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const refreshAll = useCallback(() => {
    loadStaff();
    if (view === "attendance") loadAttendance();
  }, [loadStaff, loadAttendance, view]);

  const openDetail = useCallback((row) => {
    setDetailId(row?.id ?? null);
  }, []);

  const onStatusChanged = useCallback(() => {
    refreshAll();
    setStatusTarget(null);
  }, [refreshAll]);

  const kpiLoading = initialLoad;

  return (
    /* Defence in depth: PermissionRoute already guards the URL. This keeps the
       controls from rendering if the section is ever disabled at runtime by a
       permissions refresh while the user is on the page. */
    <RoleBasedAccess module="cleaning_staff" action="view" fallback={null}>
      <div className="cs-root" style={{ padding: "18px 0 8px" }}>
        <Index
          view={view}
          onViewChange={setView}

          staff={staff}
          loading={fetching}
          error={listError}
          kpiLoading={kpiLoading}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
          onCreate={() => setCreateOpen(true)}
          onOpenDetail={openDetail}
          onToggleStatus={(row) => setStatusTarget(row)}
          page={page}
          pageSize={pageSize}
          onPageChange={(p) => {
            setPage(p);
            setFetching(false);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}

          attendance={attendance}
          attendanceLoading={attendanceLoading}
          attendanceFilter={attendanceFilter}
          onAttendanceFilterChange={setAttendanceFilter}
          onAttendanceReload={loadAttendance}
        />

        <Create
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={refreshAll}
        />

        <Edit
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          staff={editTarget}
          onUpdated={refreshAll}
        />

        <Detail
          isOpen={Boolean(detailId)}
          onClose={() => setDetailId(null)}
          staffId={detailId}
          onChanged={refreshAll}
          onEdit={(row) => {
            setDetailId(null);
            setEditTarget(row);
          }}
          onToggleStatus={(row) => {
            setDetailId(null);
            setStatusTarget(row);
          }}
        />

        <Delete
          isOpen={Boolean(statusTarget)}
          onClose={() => setStatusTarget(null)}
          staff={statusTarget}
          onChanged={onStatusChanged}
        />
      </div>
    </RoleBasedAccess>
  );
}