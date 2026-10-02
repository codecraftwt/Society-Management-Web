import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { AuthContext } from "../../../context/AuthContext";
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdAccountBalance, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdCheckCircle, MdSchedule, MdClose, MdErrorOutline, MdBlock,
  MdPerson, MdCalendarToday, MdArrowBack,
  MdBusiness, MdAttachMoney, MdCategory, MdPayments,
} from "react-icons/md";
import Select from "../../../components/common/Select";
import ReportFilterSheet from "../../../components/common/ReportFilterSheet";
import Pagination from "../../../components/common/Pagination";

const ENDPOINT = "/reports/payments";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

function Spinner({ small = false }) {
  const s = small ? 14 : 20;
  return (
    <svg style={{ color: "var(--accent)", margin: "0 auto", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

const STATUS_TONE = {
  SUCCESS:   { c: "#4ade80", bg: "rgba(74,222,128,0.12)",  bd: "rgba(74,222,128,0.25)",  Icon: MdCheckCircle },
  PENDING:   { c: "#fbbf24", bg: "rgba(251,191,36,0.12)",  bd: "rgba(251,191,36,0.25)",  Icon: MdSchedule },
  FAILED:    { c: "#f87171", bg: "rgba(248,113,113,0.12)", bd: "rgba(248,113,113,0.25)", Icon: MdClose },
  CANCELLED: { c: "#a1a1aa", bg: "rgba(161,161,170,0.12)", bd: "rgba(161,161,170,0.25)", Icon: MdBlock },
};

function StatusBadge({ status, label }) {
  const tone = STATUS_TONE[status] || { c: "#a1a1aa", bg: "rgba(161,161,170,0.12)", bd: "rgba(161,161,170,0.25)", Icon: MdSchedule };
  const { Icon } = tone;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: tone.c, background: tone.bg, border: `1px solid ${tone.bd}`, whiteSpace: "nowrap",
    }}>
      <Icon size={11} /> {label || status || "—"}
    </span>
  );
}

const formatDate = d => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inr = v => `₹${Number(v || 0).toLocaleString()}`;

/* A payment hangs off either a bill or an amenity booking. */
const flatOf = p => p?.Bill?.Flat || p?.booking?.Flat || null;
const flatLabel = p => {
  const f = flatOf(p);
  return f ? `${f.Block?.name || "-"} / ${f.flat_number || "-"}` : "—";
};

export default function SuperAdminFinancialReport() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN";

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ total: 0, success: 0, pending: 0, failed: 0, cancelled: 0, collected: 0, pendingAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [societies, setSocieties] = useState([]);

  /* applied filters */
  const [societyId, setSocietyId] = useState("ALL");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [mode, setMode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  /* pending (uncommitted) filter values */
  const [pSociety, setPSociety] = useState("ALL");
  const [pStatus, setPStatus] = useState("");
  const [pSource, setPSource] = useState("");
  const [pMode, setPMode] = useState("");
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");

  const buildParams = useCallback((pg, lim) => {
    const params = new URLSearchParams({ page: pg, limit: lim });
    if (societyId && societyId !== "ALL") params.set("society_id", societyId);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (mode) params.set("payment_mode", mode);
    if (fromDate && toDate) { params.set("fromDate", fromDate); params.set("toDate", toDate); }
    return params;
  }, [societyId, status, source, mode, fromDate, toDate]);

  const fetchPayments = useCallback(async (pg, filters, isInit = false) => {
    isInit ? setLoading(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: limitRef.current });
      if (filters.societyId && filters.societyId !== "ALL") params.set("society_id", filters.societyId);
      if (filters.status) params.set("status", filters.status);
      if (filters.source) params.set("source", filters.source);
      if (filters.mode) params.set("payment_mode", filters.mode);
      if (filters.fromDate && filters.toDate) { params.set("fromDate", filters.fromDate); params.set("toDate", filters.toDate); }

      const res = await API.get(`${ENDPOINT}?${params}`);
      const data = res.data || {};
      setRows(data.data || []);
      setCounts(data.counts || counts);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error("Failed to load payment report", err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emptyFilters = { societyId: "ALL", status: "", source: "", mode: "", fromDate: "", toDate: "" };

  useEffect(() => { fetchPayments(1, emptyFilters, true); }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies").then(res => setSocieties(res.data || [])).catch(err => console.error("Failed to fetch societies", err));
  }, [isSuperAdmin]);

  const applyFilter = () => {
    const f = { societyId: pSociety, status: pStatus, source: pSource, mode: pMode, fromDate: pFrom, toDate: pTo };
    setSocietyId(f.societyId); setStatus(f.status); setSource(f.source); setMode(f.mode);
    setFromDate(f.fromDate); setToDate(f.toDate);
    setApplied(pSociety !== "ALL" || !!(pStatus || pSource || pMode || (pFrom && pTo)));
    setShowFilters(false);
    fetchPayments(1, f);
  };

  const clearFilter = () => {
    setSocietyId("ALL"); setPSociety("ALL");
    setStatus(""); setPStatus("");
    setSource(""); setPSource("");
    setMode(""); setPMode("");
    setFromDate(""); setPFrom("");
    setToDate(""); setPTo("");
    setApplied(false);
    fetchPayments(1, emptyFilters);
  };

  const handlePageChange = p => {
    fetchPayments(p, { societyId, status, source, mode, fromDate, toDate });
  };

  const fetchAllForExport = async () => {
    const res = await API.get(`${ENDPOINT}?${buildParams(1, 1000)}`);
    return res.data?.data || [];
  };

  const sourceLabel = s => ({
    BILL:        t("paySrcBill")        || "Bill",
    MAINTENANCE: t("paySrcMaintenance") || "Maintenance",
    AMENITY:     t("paySrcAmenity")     || "Amenity",
  }[s] || s || "—");

  const exportRows = all => all.map((p, i) => ({
    Sr:       i + 1,
    Society:  p.society?.name || "—",
    Resident: p.resident?.name || "—",
    Flat:     flatLabel(p),
    Amount:   Number(p.amount) || 0,
    Source:   p.source || "—",
    Mode:     p.payment_mode || "—",
    Status:   p.status || "—",
    Date:     formatDate(p.payment_date),
  }));
  const exportHeader = ["Sr No", "Society", "Resident", "Block / Flat", "Amount", "Source", "Mode", "Status", "Date"];

  const handleExcelExport = async () => {
    const all = await fetchAllForExport();
    exportToExcel({ fileName: isSuperAdmin ? "System_Payment_Report" : "Society_Payment_Report", sheetName: "Payments", data: exportRows(all) });
  };

  const handlePDFExport = async () => {
    const all = await fetchAllForExport();
    const r = exportRows(all);
    exportToPDF({
      title: isSuperAdmin ? "System Payment Report" : "Society Payment Report",
      fileName: isSuperAdmin ? "System_Payment_Report" : "Society_Payment_Report",
      columns: exportHeader,
      rows: r.map(x => [x.Sr, x.Society, x.Resident, x.Flat, inr(x.Amount), x.Source, x.Mode, x.Status, x.Date]),
    });
  };

  const filterLabels = {
    title:        t("rptFilters")     || "Filters",
    statusLabel:  t("rptColStatus")   || "Status",
    allStatus:    t("rptAllStatus")   || "All Status",
    fromDateLbl:  t("rptFromDate")    || "From Date",
    toDateLbl:    t("rptToDate")      || "To Date",
    applyBtn:     t("rptApplyFilter") || "Apply",
    clearBtn:     t("rptClear")       || "Clear",
  };

  const statusOptions = [
    { value: "SUCCESS",   label: t("payStatusSuccess")   || "Success" },
    { value: "PENDING",   label: t("payStatusPending")   || "Pending" },
    { value: "FAILED",    label: t("payStatusFailed")    || "Failed" },
    { value: "CANCELLED", label: t("payStatusCancelled") || "Cancelled" },
  ];

  /* Extra filter fields — only the super admin can change the society scope. */
  const extraFields = (
    <>
      {isSuperAdmin && (
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            {t("rptColSociety") || "Society"}
          </label>
          <Select className="input" value={pSociety} onChange={e => setPSociety(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
            <option value="ALL">{t("rptAllSocieties") || "All Societies"}</option>
            {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      )}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
          {t("payColSource") || "Source"}
        </label>
        <Select className="input" value={pSource} onChange={e => setPSource(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{t("rptAllSources") || "All Sources"}</option>
          <option value="BILL">{t("paySrcBill") || "Bill"}</option>
          <option value="MAINTENANCE">{t("paySrcMaintenance") || "Maintenance"}</option>
          <option value="AMENITY">{t("paySrcAmenity") || "Amenity"}</option>
        </Select>
      </div>
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
          {t("payColMode") || "Mode"}
        </label>
        <Select className="input" value={pMode} onChange={e => setPMode(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{t("rptAllModes") || "All Modes"}</option>
          {["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "NETBANKING", "OTHER"].map(m => (
            <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </div>
    </>
  );

  const bleed = isMobile
    ? { marginLeft: "calc(-1 * var(--page-padding,16px))", marginRight: "calc(-1 * var(--page-padding,16px))", width: "calc(100% + 2 * var(--page-padding,16px))", borderRadius: 0, boxSizing: "border-box" }
    : { boxSizing: "border-box" };

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
            <MdArrowBack size={18} />
          </button>
          <div className="er-icon er-icon--finance"><MdPayments size={22} /></div>
          <div>
            <h2 className="page-title">{t("payReportTitle") || "Payment Report"}</h2>
            <p className="page-subtitle">
              {loading ? "—" : (t("payReportSubtitle") || "Every payment recorded across the system")}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcelExport} className="btn-export" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><MdTableChart size={14} /> {t("rptExportExcel") || "Excel"}</button>
          <button onClick={handlePDFExport} className="btn-export" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}><MdPictureAsPdf size={14} /> {t("rptExportPDF") || "PDF"}</button>
          <button onClick={() => setShowFilters(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: applied ? "rgba(107,70,193,0.15)" : "var(--card-inner-bg)", color: applied ? "#9F87D7" : "var(--text-secondary)", border: applied ? "1px solid rgba(107,70,193,0.35)" : "1px solid var(--glass-border)", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}><MdFilterList size={14} /> Filters{applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#6B46C1", boxShadow: "0 0 6px rgba(107,70,193,0.6)" }} />}</button>
        </div>
      </div>

      {/* ── STATS ── */}
      {!loading && counts.total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
          {[
            { label: t("rptCollected") || "Total Collected", val: inr(counts.collected), color: "green" },
            { label: t("payStatPendingAmt") || "Pending Amount", val: inr(counts.pendingAmount), color: "amber" },
            { label: t("payStatSuccess") || "Successful", val: counts.success, color: "green" },
            { label: t("payStatPending") || "Pending", val: counts.pending, color: "purple" },
          ].map((s, i) => (
            <div key={i} className={`stat-card stat-card--${s.color}`} style={{ borderRadius: isMobile ? 14 : 18, padding: isMobile ? "12px 14px" : "16px 18px" }}>
              <div><div className="stat-card__val" style={{ fontSize: isMobile ? 18 : 22 }}>{s.val}</div><div className="stat-card__label">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      <ReportFilterSheet
        show={showFilters} onClose={() => setShowFilters(false)} isMobile={isMobile}
        statusValue={pStatus} onStatusChange={setPStatus}
        statusOptions={statusOptions}
        extraFields={extraFields}
        fromDate={pFrom} onFromDateChange={setPFrom}
        toDate={pTo} onToDateChange={setPTo}
        onApply={applyFilter} onClear={clearFilter} applied={applied}
        labels={filterLabels}
      />

      {/* ── TABLE CARD ── */}
      <div className="data-table-wrap" style={bleed}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
            {t("payRecordsTitle") || "Payment Records"}
            {!loading && (
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)", marginLeft: 8 }}>
                {t("finRecordsSubtitle", { total: totalItems })}{applied ? ` (${t("finFiltered") || "filtered"})` : ""}
              </span>
            )}
          </span>
          {fetching && <Spinner small />}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("payLoading") || "Loading payments..."}</p></div>
        ) : rows.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><MdOutlineInbox size={48} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13, margin: 0 }}>{t("finNoRecords") || "No records found"}</p></div>
        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((p, i) => (
              <div key={p.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms`, background: "var(--chip-bg,rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{inr(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {isSuperAdmin && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdBusiness size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />{p.society?.name || "—"}</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdPerson size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />{p.resident?.name || "—"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdCategory size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />{sourceLabel(p.source)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}><MdCalendarToday size={11} style={{ flexShrink: 0 }} />{formatDate(p.payment_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {(isSuperAdmin
                  ? [t("rptColSrNo") || "Sr No", t("rptColSociety") || "Society"]
                  : [t("rptColSrNo") || "Sr No"]
                ).concat([
                  t("rptColResident") || "Resident",
                  t("rptColFlat") || "Block / Flat",
                  t("rptColAmount") || "Amount",
                  t("payColSource") || "Source",
                  t("payColMode") || "Mode",
                  t("rptColStatus") || "Status",
                  t("payColDate") || "Payment Date",
                ]).map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id} className="animate-fadeIn" style={{ animationDelay: `${i * 15}ms` }}>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(page - 1) * limit + i + 1}</span></td>
                  {isSuperAdmin && <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.society?.name || "—"}</span></td>}
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.resident?.name || "—"}</span></td>
                  <td><span className="info-chip">{flatLabel(p)}</span></td>
                  <td><span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{inr(p.amount)}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sourceLabel(p.source)}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(p.payment_mode || "—").replace(/_/g, " ")}</span></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(p.payment_date)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && rows.length > 0 && (
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Showing <strong>{(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}</strong> of <strong>{totalItems}</strong> records
            </span>
            <Pagination
              page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit}
              onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
