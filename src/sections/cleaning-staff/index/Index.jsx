import { useContext, useMemo ,useState} from "react";
import {
  MdCleaningServices,
  MdCheckCircle,
  MdPauseCircle,
  MdConfirmationNumber,
  MdHistory,
  MdAdd,
  MdSearch,
  MdEventAvailable,
  MdEventBusy,
  MdCalendarMonth,
  MdPeople,
  MdQrCode,
} from "react-icons/md";

import { AuthContext } from "../../../context/AuthContext";
import { useLang } from "../../../context/LanguageContext";
import { hasPermission } from "../../../utils/permissions";
import GlobalTable from "../../../components/common/GlobalTable";
import GlobalBadge from "../../../components/common/GlobalBadge";
import GlobalButton from "../../../components/common/GlobalButton";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import SlidingTabs from "../../../components/common/SlidingTabs";
import UserAvatar from "../../../components/common/UserAvatar";
import AttendancePanel from "../detail/AttendancePanel";
import PassQrModal from "../detail/PassQrModal";
import useStaffEnrichment from "../useStaffEnrichment";
import {
  STAFF_STATUS,
  STAFF_STATUS_LABEL,
  PASS_STATUS,
  MAX_SCANS_PER_DAY,
} from "../constants";
import {
  buildKpiSummary,
  formatPhone,
  formatPassCode,
  formatPassValidity,
  paginate,
  deriveAttendanceState,
  ATTENDANCE_STATE,
  todayIST,
  addDaysIST,
  formatDateOnly,
} from "../format";

/* ── KPI tile ───────────────────────────────────────────────────────────── */

function KpiCard({ icon: Icon, label, value, desc, accent, loading }) {
  return (
    <div className="cs-kpi" style={{ "--cs-kpi-accent": accent }}>
      <div className="cs-kpi__head">
        <span className="cs-kpi__icon">
          <Icon size={16} />
        </span>
        <span className="cs-kpi__label">{label}</span>
      </div>
      {loading ? (
        <div className="cs-kpi__value cs-kpi__value--skeleton">0</div>
      ) : (
        <div className="cs-kpi__value">{value}</div>
      )}
      {desc && <div className="cs-kpi__desc">{desc}</div>}
    </div>
  );
}

/* ── Copyable pass code with QR view trigger ─────────────── */

function CurrentPass({ pass, onOpenQr }) {
  const { t } = useLang();
  if (!pass) {
    return (
      <span style={{ fontSize: 12, color: "var(--text-tertiary, var(--text-secondary))" }}>
        {t("csNoPass", "No pass")}
      </span>
    );
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span className="cs-passcode" style={{ fontSize: 11 }}>
          {formatPassCode(pass.pass_code)}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary, var(--text-secondary))" }}>
          {formatPassValidity(pass)}
        </span>
      </div>
      {onOpenQr && (
        <button
          type="button"
          className="cs-passcode__copy"
          onClick={(e) => {
            e.stopPropagation();
            onOpenQr();
          }}
          title={t("csViewQr", "View QR Code")}
          aria-label={t("csViewQr", "View QR Code")}
          style={{ padding: "4px 6px" }}
        >
          <MdQrCode size={15} />
        </button>
      )}
    </div>
  );
}

/**
 * Index — the Cleaning Staff management screen.
 *
 * Two top-level views behind SlidingTabs:
 *   Staff      → KPI cards + status filter + search + table
 *   Attendance → every staff member's attendance for a day or range
 *
 * All filtering that the API supports (status, search, date range) is pushed to
 * the server. The staff list is the one exception: GET /cleaning-staff returns
 * the whole society list with no paging params, so paging is applied locally.
 */
export default function Index({
  view,
  onViewChange,

  staff,
  loading,
  error,
  kpiLoading,
  statusFilter,
  onStatusFilter,
  search,
  onSearchChange,
  onCreate,
  onOpenDetail,
  onToggleStatus,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,

  attendance,
  attendanceLoading,
  attendanceFilter,
  onAttendanceFilterChange,
  onAttendanceReload,
}) {
  const { t } = useLang();
  const [qrModalData, setQrModalData] = useState(null);
  const { user } = useContext(AuthContext);

  const canCreate = hasPermission(user, "cleaning_staff", "create");
  const canEdit = hasPermission(user, "cleaning_staff", "edit");
  const canStatus = hasPermission(user, "cleaning_staff", "status");
  const canCorrectAttendance = hasPermission(user, "cleaning_staff", "edit_attendance");

  const today = todayIST();

  /* Status tabs are applied locally, NOT via the API.
     GET /cleaning-staff accepts `status`, but sending it would make the KPI
     cards describe only the filtered subset ("Total Staff: 3" while on the
     Inactive tab). `search` IS pushed to the server, since the backend supports
     it and matching on name/phone/designation is the expensive part. */
  const statusRows = useMemo(() => {
    if (statusFilter === "ALL") return staff;
    return staff.filter((s) => s.status === statusFilter);
  }, [staff, statusFilter]);

  const kpi = useMemo(() => buildKpiSummary({ staff, today }), [staff, today]);

  /* Client paging — GET /cleaning-staff returns the whole society list with no
     paging params, so the page window is computed here. */
  const paged = useMemo(() => paginate(statusRows, page, pageSize), [statusRows, page, pageSize]);

  /* Pass + assignment summary for the rows actually on screen. */
  const { decorate } = useStaffEnrichment(paged.rows);
  const visibleRows = useMemo(() => paged.rows.map(decorate), [paged.rows, decorate]);

  const views = [
    { id: "staff", label: t("csViewStaff", "Staff"), icon: <MdPeople size={15} /> },
    {
      id: "attendance",
      label: t("csViewAttendance", "Attendance"),
      icon: <MdHistory size={15} />,
      badge: attendance.length || false,
    },
  ];

  const statusTabs = [
    { id: "ALL", label: t("csFilterAll", "All"), badge: staff.length || false },
    {
      id: STAFF_STATUS.ACTIVE,
      label: t("csFilterActive", "Active"),
      badge: staff.filter((s) => s.status === STAFF_STATUS.ACTIVE).length || false,
    },
    {
      id: STAFF_STATUS.INACTIVE,
      label: t("csFilterInactive", "Inactive"),
      badge: staff.filter((s) => s.status === STAFF_STATUS.INACTIVE).length || false,
    },
  ];

  /* ── Staff columns ────────────────────────────────────────────────────── */

  const staffColumns = [
    {
      key: "photo",
      header: t("csPhoto", "Photo"),
      width: 64,
      render: (row) => (
        <span className="cs-photo">
          <UserAvatar name={row.name} src={row.profile_picture} size={38} radius={10} />
        </span>
      ),
    },
    {
      key: "name",
      header: t("csFieldName", "Name"),
      render: (row) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--text-primary)",
              overflowWrap: "anywhere",
            }}
          >
            {row.name}
          </div>
          {row.designation && (
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{row.designation}</div>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: t("csFieldPhone", "Phone"),
      render: (row) => (
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {formatPhone(row.phone)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("csStatus", "Status"),
      render: (row) => (
        <GlobalBadge status={row.status} size="sm" dot>
          {STAFF_STATUS_LABEL[row.status] || row.status}
        </GlobalBadge>
      ),
    },
    {
      key: "pass",
      header: t("csCurrentPass", "Current Pass"),
      render: (row) => (
        <CurrentPass
          pass={row.active_pass}
          onOpenQr={
            row.active_pass ? () => setQrModalData({ pass: row.active_pass, staff: row }) : null
          }
        />
      ),
    },
    {
      key: "actions",
      header: t("csActions", "Actions"),
      align: "right",
      render: (row) => (
        <div
          style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}
          onClick={(e) => e.stopPropagation()}
        >
          {canEdit && (
            <GlobalButton variant="info" icon={MdSearch} onClick={() => onOpenDetail?.(row)}>
              {t("csView", "View")}
            </GlobalButton>
          )}
          {canStatus && (
            <GlobalButton
              variant={row.status === STAFF_STATUS.ACTIVE ? "warning" : "success"}
              onClick={() => onToggleStatus?.(row)}
            >
              {row.status === STAFF_STATUS.ACTIVE
                ? t("csDeactivate", "Deactivate")
                : t("csActivate", "Activate")}
            </GlobalButton>
          )}
        </div>
      ),
    },
  ].filter((c) => {
    /* Drop the Actions column entirely when nobody may act on a row. */
    if (c.key === "actions") return canEdit || canStatus;
    return true;
  });

  /* ── Attendance filter summary ────────────────────────────────────────── */

  const attStats = useMemo(() => {
    const rows = Array.isArray(attendance) ? attendance : [];
    return {
      total: rows.length,
      present: rows.filter((r) => deriveAttendanceState(r) === ATTENDANCE_STATE.PRESENT).length,
      incomplete: rows.filter((r) => deriveAttendanceState(r) === ATTENDANCE_STATE.INCOMPLETE).length,
      manual: rows.filter((r) => deriveAttendanceState(r) === ATTENDANCE_STATE.MANUAL).length,
    };
  }, [attendance]);

  return (
    <div className="cs-root">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="cs-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              color: "#ffffff",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            }}
          >
            <MdCleaningServices size={22} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
            >
              {t("csTitle", "Cleaning Staff")}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
              {kpiLoading
                ? "—"
                : t("csSubtitle", "{active} active · {inactive} inactive", {
                    active: kpi.active,
                    inactive: kpi.inactive,
                  })}
            </p>
          </div>
        </div>

        <div className="cs-toolbar__actions">
          {canCreate && view === "staff" && (
            <>
              <ExpandableSearch
                value={search}
                onChange={(val) => onSearchChange?.(val)}
                placeholder={t("csSearchPlaceholder", "Search name, phone, designation")}
                fetching={loading}
              />
              <GlobalButton variant="add" icon={MdAdd} onClick={onCreate}>
                {t("csAddStaff", "Add Staff")}
              </GlobalButton>
            </>
          )}
        </div>
      </div>

      <SlidingTabs items={views} value={view} onChange={onViewChange} />

      <div style={{ marginTop: 16, minWidth: 0 }}>
        {/* ══ STAFF VIEW ══════════════════════════════════════════════════ */}
        {view === "staff" && (
          <>
            {/* KPI cards */}
            <div className="cs-kpi-grid" style={{ marginBottom: 16 }}>
              <KpiCard
                icon={MdPeople}
                label={t("csKpiTotal", "Total Staff")}
                value={kpi.total}
                desc={t("csKpiTotalDesc", "All staff on record")}
                accent="var(--accent)"
                loading={kpiLoading}
              />
              <KpiCard
                icon={MdCheckCircle}
                label={t("csKpiActive", "Active")}
                value={kpi.active}
                desc={t("csKpiActiveDesc", "Eligible for new passes")}
                accent="var(--success, #10b981)"
                loading={kpiLoading}
              />
              <KpiCard
                icon={MdPauseCircle}
                label={t("csKpiInactive", "Inactive")}
                value={kpi.inactive}
                desc={t("csKpiInactiveDesc", "History preserved")}
                accent="var(--warning, #f59e0b)"
                loading={kpiLoading}
              />
              <KpiCard
                icon={MdConfirmationNumber}
                label={t("csKpiOnPass", "On Pass Today")}
                value={kpi.onPass}
                desc={t("csKpiOnPassDesc", "{n} scans/day per pass", { n: MAX_SCANS_PER_DAY })}
                accent="var(--info, #3b82f6)"
                loading={kpiLoading}
              />
            </div>

            {error && <p className="cs-error" style={{ marginBottom: 10 }}>{error}</p>}

            <div className="cs-toolbar" style={{ marginBottom: 12 }}>
              <SlidingTabs items={statusTabs} value={statusFilter} onChange={onStatusFilter} />
            </div>

            <div className="cs-table-scroll">
              <GlobalTable
                columns={staffColumns}
                data={visibleRows}
                loading={loading}
                rowKey="id"
                onRowClick={(row) => onOpenDetail?.(row)}
                emptyIcon={MdCleaningServices}
                emptyMessage={
                  search
                    ? t("csNoMatches", "No staff match your search")
                    : t("csNoStaff", "No cleaning staff yet")
                }
                emptySubtext={
                  search
                    ? t("csNoMatchesSub", "Try a different name, phone or designation.")
                    : t("csNoStaffSub", "Add your first cleaning staff member to get started.")
                }
                emptyAction={
                  canCreate && !search ? (
                    <GlobalButton variant="add" icon={MdAdd} onClick={onCreate}>
                      {t("csAddStaff", "Add Staff")}
                    </GlobalButton>
                  ) : null
                }
                page={paged.page}
                totalPages={paged.totalPages}
                totalItems={paged.totalItems}
                onPageChange={onPageChange}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          </>
        )}

        {/* ══ ATTENDANCE VIEW ════════════════════════════════════════════ */}
        {view === "attendance" && (
          <>
            <div className="cs-toolbar" style={{ marginBottom: 12 }}>
              <div className="cs-toolbar__actions">
                <span className="cs-inline-stat">
                  <MdCalendarMonth size={13} />
                  {t("csFrom", "From")}
                  <input
                    className="input"
                    type="date"
                    value={attendanceFilter.from || ""}
                    onChange={(e) =>
                      onAttendanceFilterChange?.({ ...attendanceFilter, from: e.target.value })
                    }
                    style={{ width: 150, height: 32, fontSize: 12.5 }}
                  />
                </span>
                <span className="cs-inline-stat">
                  {t("csTo", "To")}
                  <input
                    className="input"
                    type="date"
                    value={attendanceFilter.to || ""}
                    onChange={(e) =>
                      onAttendanceFilterChange?.({ ...attendanceFilter, to: e.target.value })
                    }
                    style={{ width: 150, height: 32, fontSize: 12.5 }}
                  />
                </span>
                <GlobalButton
                  variant="secondary"
                  icon={MdEventAvailable}
                  onClick={() => onAttendanceFilterChange?.({ ...attendanceFilter, from: today, to: today })}
                >
                  {t("csToday", "Today")}
                </GlobalButton>
                <GlobalButton
                  variant="secondary"
                  icon={MdEventBusy}
                  onClick={() =>
                    onAttendanceFilterChange?.({
                      ...attendanceFilter,
                      from: addDaysIST(today, -6),
                      to: today,
                    })
                  }
                >
                  {t("csLast7", "Last 7 days")}
                </GlobalButton>
              </div>
            </div>

            <div className="cs-inline-stats">
              <span className="cs-inline-stat">
                <strong>{attStats.total}</strong> {t("csRows", "records")}
              </span>
              <span className="cs-inline-stat">
                <strong>{attStats.present}</strong> {t("csPresent", "present")}
              </span>
              <span className="cs-inline-stat">
                <strong>{attStats.incomplete}</strong> {t("csIncomplete", "incomplete")}
              </span>
              <span className="cs-inline-stat">
                <strong>{attStats.manual}</strong> {t("csManual", "manual")}
              </span>
            </div>

            {attendanceFilter.from && attendanceFilter.to && (
              <p className="cs-hint" style={{ marginBottom: 10 }}>
                {formatDateOnly(attendanceFilter.from)}
                {attendanceFilter.from !== attendanceFilter.to
                  ? ` → ${formatDateOnly(attendanceFilter.to)}`
                  : ""}
              </p>
            )}

            {canCorrectAttendance ? (
              <AttendancePanel
                rows={attendance}
                loading={attendanceLoading}
                showStaffColumn
                emptyMessage={t("csNoAttendance", "No attendance for this period")}
                onUpdated={onAttendanceReload}
              />
            ) : (
              <p className="cs-hint">
                {t("csNoAttendanceAccess", "You do not have permission to view attendance.")}
              </p>
            )}
          </>
        )}
      </div>

      {/* QR Code Modal */}
      <PassQrModal
        isOpen={Boolean(qrModalData)}
        onClose={() => setQrModalData(null)}
        pass={qrModalData?.pass}
        staff={qrModalData?.staff}
      />
    </div>
  );
}