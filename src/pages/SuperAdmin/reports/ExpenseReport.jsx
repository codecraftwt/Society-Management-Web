import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { AuthContext } from "../../../context/AuthContext";
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdOutlineInbox, MdFilterList, MdTableChart, MdPictureAsPdf,
  MdCalendarToday, MdArrowBack,
  MdBusiness, MdTrendingDown, MdPerson, MdAccountBalanceWallet,
} from "react-icons/md";
import Select from "../../../components/common/Select";
import ReportFilterSheet from "../../../components/common/ReportFilterSheet";
import Pagination from "../../../components/common/Pagination";

const ENDPOINT = "/reports/expenses";

const PAID_BY_OPTIONS = ["SOCIETY_ADMIN", "ACCOUNTANT", "COMMITTEE_MEMBER", "SUPER_ADMIN"];
const MODE_OPTIONS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"];

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


const formatDate = d => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inr = v => `₹${Number(v || 0).toLocaleString()}`;
const humanise = v => (v || "—").toString().replace(/_/g, " ");

export default function SuperAdminExpenseReport() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN";

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ total: 0, posted: 0, voided: 0, totalExpense: 0, voidAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [societies, setSocieties] = useState([]);

  const [societyId, setSocietyId] = useState("ALL");
  const [status, setStatus] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [mode, setMode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [pSociety, setPSociety] = useState("ALL");
  const [pStatus, setPStatus] = useState("");
  const [pPaidBy, setPPaidBy] = useState("");
  const [pMode, setPMode] = useState("");
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");

  const emptyFilters = { societyId: "ALL", status: "", paidBy: "", mode: "", fromDate: "", toDate: "" };

  const fetchExpenses = useCallback(async (pg, filters, isInit = false) => {
    isInit ? setLoading(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: limitRef.current });
      if (filters.societyId && filters.societyId !== "ALL") params.set("society_id", filters.societyId);
      if (filters.status) params.set("status", filters.status);
      if (filters.paidBy) params.set("paid_by", filters.paidBy);
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
      console.error("Failed to load expense report", err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchExpenses(1, emptyFilters, true); }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies").then(res => setSocieties(res.data || [])).catch(err => console.error("Failed to fetch societies", err));
  }, [isSuperAdmin]);

  const applyFilter = () => {
    const f = { societyId: pSociety, status: pStatus, paidBy: pPaidBy, mode: pMode, fromDate: pFrom, toDate: pTo };
    setSocietyId(f.societyId); setStatus(f.status); setPaidBy(f.paidBy); setMode(f.mode);
    setFromDate(f.fromDate); setToDate(f.toDate);
    setApplied(pSociety !== "ALL" || !!(pStatus || pPaidBy || pMode || (pFrom && pTo)));
    setShowFilters(false);
    fetchExpenses(1, f);
  };

  const clearFilter = () => {
    setSocietyId("ALL"); setPSociety("ALL");
    setStatus(""); setPStatus("");
    setPaidBy(""); setPPaidBy("");
    setMode(""); setPMode("");
    setFromDate(""); setPFrom("");
    setToDate(""); setPTo("");
    setApplied(false);
    fetchExpenses(1, emptyFilters);
  };

  const handlePageChange = p => fetchExpenses(p, { societyId, status, paidBy, mode, fromDate, toDate });

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({ page: 1, limit: 1000 });
    if (societyId && societyId !== "ALL") params.set("society_id", societyId);
    if (status) params.set("status", status);
    if (paidBy) params.set("paid_by", paidBy);
    if (mode) params.set("payment_mode", mode);
    if (fromDate && toDate) { params.set("fromDate", fromDate); params.set("toDate", toDate); }
    const res = await API.get(`${ENDPOINT}?${params}`);
    return res.data?.data || [];
  };

  const exportRows = all => all.map((e, i) => ({
    Sr:       i + 1,
    Society:  e.society?.name || "—",
    PayTo:    e.pay_to || "—",
    Reason:   e.reason || "—",
    Amount:   Number(e.amount) || 0,
    PaidBy:   humanise(e.paid_by),
    Mode:     humanise(e.payment_mode),
    Status:   e.status || "—",
    Date:     formatDate(e.payment_date),
  }));

  const handleExcelExport = async () => {
    const all = await fetchAllForExport();
    exportToExcel({ fileName: isSuperAdmin ? "System_Expense_Report" : "Society_Expense_Report", sheetName: "Expenses", data: exportRows(all) });
  };

  const handlePDFExport = async () => {
    const all = await fetchAllForExport();
    const r = exportRows(all);
    exportToPDF({
      title: isSuperAdmin ? "System Expense Report" : "Society Expense Report",
      fileName: isSuperAdmin ? "System_Expense_Report" : "Society_Expense_Report",
      columns: ["Sr No", "Society", "Paid To", "Reason", "Amount", "Paid By", "Mode", "Status", "Date"],
      rows: r.map(x => [x.Sr, x.Society, x.PayTo, x.Reason, inr(x.Amount), x.PaidBy, x.Mode, x.Status, x.Date]),
    });
  };

  const filterLabels = {
    title:       t("rptFilters")   || "Filters",
    statusLabel: t("rptColStatus") || "Status",
    allStatus:   t("rptAllStatus") || "All Status",
    fromDateLbl: t("rptFromDate")  || "From Date",
    toDateLbl:   t("rptToDate")    || "To Date",
    applyBtn:    t("rptApplyFilter") || "Apply",
    clearBtn:    t("rptClear")     || "Clear",
  };

  const statusOptions = [
    { value: "POSTED", label: t("expStatusPosted") || "Posted" },
    { value: "VOID",   label: t("expStatusVoid")   || "Void" },
  ];

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
          {t("expColPaidBy") || "Paid By"}
        </label>
        <Select className="input" value={pPaidBy} onChange={e => setPPaidBy(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{t("rptAllPaidBy") || "All Roles"}</option>
          {PAID_BY_OPTIONS.map(r => <option key={r} value={r}>{humanise(r)}</option>)}
        </Select>
      </div>
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
          {t("payColMode") || "Mode"}
        </label>
        <Select className="input" value={pMode} onChange={e => setPMode(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{t("rptAllModes") || "All Modes"}</option>
          {MODE_OPTIONS.map(m => <option key={m} value={m}>{humanise(m)}</option>)}
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
          <div className="er-icon er-icon--finance"><MdTrendingDown size={22} /></div>
          <div>
            <h2 className="page-title">{t("expReportTitle") || "Expense Report"}</h2>
            <p className="page-subtitle">
              {loading ? "—" : (t("expReportSubtitle") || "Every expense recorded across the system")}
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
            { label: t("expStatTotal") || "Total Expenses", val: inr(counts.totalExpense), color: "amber" },
            { label: t("expStatVoided") || "Voided Amount", val: inr(counts.voidAmount), color: "purple" },
            { label: t("expStatPosted") || "Posted", val: counts.posted, color: "green" },
            { label: t("expStatVoidCount") || "Voided", val: counts.voided, color: "purple" },
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
            {t("expRecordsTitle") || "Expense Records"}
            {!loading && (
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)", marginLeft: 8 }}>
                {t("finRecordsSubtitle", { total: totalItems })}{applied ? ` (${t("finFiltered") || "filtered"})` : ""}
              </span>
            )}
          </span>
          {fetching && <Spinner small />}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><Spinner /><p style={{ fontSize: 13, margin: 0 }}>{t("expLoading") || "Loading expenses..."}</p></div>
        ) : rows.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><MdOutlineInbox size={48} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13, margin: 0 }}>{t("finNoRecords") || "No records found"}</p></div>
        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((e, i) => (
              <div key={e.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms`, background: "var(--chip-bg,rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{inr(e.amount)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600, marginBottom: 6 }}>{e.reason || "—"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {isSuperAdmin && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdBusiness size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />{e.society?.name || "—"}</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdAccountBalanceWallet size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />{e.pay_to || "—"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdPerson size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />{humanise(e.paid_by)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}><MdCalendarToday size={11} style={{ flexShrink: 0 }} />{formatDate(e.payment_date)}</span>
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
                  t("expColPayTo")    || "Paid To",
                  t("expColReason")   || "Reason",
                  t("rptColAmount")   || "Amount",
                  t("expColPaidBy")   || "Paid By",
                  t("payColMode")     || "Mode",
                  t("expColDate")     || "Expense Date",
                ]).map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} className="animate-fadeIn" style={{ animationDelay: `${i * 15}ms` }}>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(page - 1) * limit + i + 1}</span></td>
                  {isSuperAdmin && <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{e.society?.name || "—"}</span></td>}
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{e.pay_to || "—"}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.reason || "—"}</span></td>
                  <td><span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{inr(e.amount)}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{humanise(e.paid_by)}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{humanise(e.payment_mode)}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(e.payment_date)}</span></td>
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
