import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdAccountBalance, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdCheckCircle, MdSchedule, MdClose,
  MdPerson, MdApartment,
  MdArrowBack, MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import Select from "../../../components/common/Select";
import CustomDatePicker from "../../../components/common/CustomDatePicker";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => { const fn = () => setM(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);
  return m;
}

function Spinner({ small = false }) {
  const s = small ? 14 : 20;
  return (
    <svg style={{ color: "var(--accent,#6B46C1)", margin: "0 auto", width: s, height: s }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn"><MdChevronLeft size={14} /> Prev</button>
      {pages.map((p, i) => p === "..." ? <span key={`e${i}`} className="pagination-ellipsis">…</span> : (
        <button key={p} onClick={() => onPageChange(p)} className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">Next <MdChevronRight size={14} /></button>
    </div>
  );
}

const STATUS_CFG = {
  PAID: { label: "Paid", Icon: MdCheckCircle, color: "var(--success)", bg: "var(--badge-paid-bg)", border: "var(--badge-paid-border)" },
  PENDING: { label: "Pending", Icon: MdSchedule, color: "var(--accent-light)", bg: "var(--accent-soft)", border: "var(--approval-border)" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
}

const fmtINR = n => `₹${Number(n).toLocaleString("en-IN")}`;

function FilterBar({ status, setStatus, fromDate, setFromDate, toDate, setToDate, onApply, onClear, applied, isMobile }) {
  return (
    <div className="data-table-wrap rpt-filter-bar animate-fadeIn">
      <div className="rpt-filter-row">
        <span className="rpt-filter-label">
          <MdFilterList size={15} />
          Filters
        </span>
        <div className="rpt-filter-field rpt-filter-field--status">
          <Select
            className="input"
            value={status}
            onChange={e => setStatus(e.target.value)}
            rootStyle={{ width: "100%" }}
            style={{ width: "100%", boxSizing: "border-box" }}
          >
            <option value="">All Status</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
          </Select>
        </div>
        <CustomDatePicker
          className="rpt-filter-date"
          value={fromDate}
          placeholder="From date"
          onChange={(iso) => {
            setFromDate(iso);
            if (toDate && iso > toDate) setToDate("");
          }}
        />
        <CustomDatePicker
          className="rpt-filter-date"
          value={toDate}
          placeholder="To date"
          min={fromDate}
          onChange={setToDate}
        />
        <div className="rpt-filter-actions">
          <button type="button" onClick={onApply} className="btn-primary">
            {isMobile ? "Apply" : "Apply Filter"}
          </button>
          {applied && (
            <button type="button" onClick={onClear} className="btn-muted">
              <MdClose size={14} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const LIMIT = 15;

export default function FinancialReport() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [counts, setCounts] = useState({ total: 0, paid: 0, pending: 0, collected: 0, due: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);

  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  const fetchBills = useCallback(async (pg, s, fd, td, isInit = false) => {
    isInit ? setLoading(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (s) params.set("status", s);
      if (fd && td) { params.set("fromDate", fd); params.set("toDate", td); }
      const res = await API.get(`/reports/financial?${params}`);
      const data = res.data;
      setBills(data.data || []);
      setCounts(data.counts || { total: 0, paid: 0, pending: 0, collected: 0, due: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setFetching(false); }
  }, []);

  useEffect(() => { fetchBills(1, "", "", "", true); }, []);

  const applyFilter = () => {
    setStatus(pendingStatus); setFromDate(pendingFrom); setToDate(pendingTo);
    setApplied(!!(pendingStatus || (pendingFrom && pendingTo)));
    fetchBills(1, pendingStatus, pendingFrom, pendingTo);
  };

  const clearFilter = () => {
    setStatus(""); setFromDate(""); setToDate("");
    setPendingStatus(""); setPendingFrom(""); setPendingTo("");
    setApplied(false);
    fetchBills(1, "", "", "");
  };

  const handlePageChange = p => fetchBills(p, status, fromDate, toDate);

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({ page: 1, limit: 1000 });
    if (status) params.set("status", status);
    if (fromDate && toDate) { params.set("fromDate", fromDate); params.set("toDate", toDate); }
    const res = await API.get(`/reports/financial?${params}`);
    return res.data.data || [];
  };

  const handleExcelExport = async () => {
    const all = await fetchAllForExport();
    exportToExcel({ fileName: "Financial_Report", sheetName: "Finance", data: all.map((b, i) => ({ "Sr No": i + 1, Resident: b.Flat?.User?.name || "-", Flat: b.Flat?.flat_number || "-", Block: b.Flat?.Block?.name || "-", "Bill Type": b.title || "-", Amount: b.amount, Status: b.status })) });
  };
  const handlePDFExport = async () => {
    const all = await fetchAllForExport();
    exportToPDF({ title: "Financial Report", fileName: "Financial_Report", columns: ["#", "Resident", "Flat", "Block", "Bill Type", "Amount", "Status"], rows: all.map((b, i) => [i + 1, b.Flat?.User?.name || "-", b.Flat?.flat_number || "-", b.Flat?.Block?.name || "-", b.title || "-", fmtINR(b.amount), b.status]) });
  };

  const statCards = [
    { label: "Total Bills", val: counts.total, color: "purple" },
    { label: "Paid", val: counts.paid, color: "green" },
    { label: "Pending", val: counts.pending, color: "amber" },
    { label: "Collected", val: fmtINR(counts.collected), color: "green" },
    { label: "Due", val: fmtINR(counts.due), color: "amber" },
  ];

  return (
    <div className="page-root fin-rpt-page animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="fin-rpt-header">
        <div className="fin-rpt-header__title">
          <button type="button" onClick={() => navigate(-1)} className="fin-rpt-back" aria-label="Back">
            <MdArrowBack size={18} />
          </button>
          <div className="ad-page-icon">
            <MdAccountBalance size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="page-title">Financial Report</h2>
            <p className="page-subtitle">{loading ? "—" : `${counts.total} bills · Collected ${fmtINR(counts.collected)}`}</p>
          </div>
        </div>
        <div className="fin-rpt-header__actions">
          <button type="button" onClick={handleExcelExport} className="btn-export"><MdTableChart size={14} /> Excel</button>
          <button type="button" onClick={handlePDFExport} className="btn-export"><MdPictureAsPdf size={14} /> PDF</button>
        </div>
      </div>

      {/* ── STATS ── */}
      {!loading && counts.total > 0 && (
        <div className="fin-rpt-stats">
          {statCards.map((s, i) => (
            <div key={i} className={`stat-card${isMobile ? " stat-card--mobile" : ""} stat-card--${s.color}${isMobile && i === 4 ? " fin-rpt-stats__wide" : ""}`}>
              <div>
                <div className="stat-card__val">{s.val}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FilterBar
        isMobile={isMobile}
        status={pendingStatus} setStatus={setPendingStatus}
        fromDate={pendingFrom} setFromDate={setPendingFrom}
        toDate={pendingTo} setToDate={setPendingTo}
        onApply={applyFilter} onClear={clearFilter} applied={applied} />

      {/* ── TABLE CARD ── */}
      <div className="data-table-wrap">
        <div className="fin-rpt-table-head">
          <span className="fin-rpt-table-head__title">
            All Bills
            {!loading && <span className="fin-rpt-table-head__count">— {totalItems} records{applied ? " (filtered)" : ""}</span>}
          </span>
          {fetching && <Spinner small />}
          {applied && !fetching && <span className="fin-rpt-filtered">Filtered</span>}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><Spinner /><p style={{ fontSize: 13, margin: 0 }}>Loading financial data…</p></div>
        ) : bills.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><MdOutlineInbox size={48} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13, margin: 0 }}>No data found for the selected filters.</p>{applied && <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear filters</button>}</div>
        ) : isMobile ? (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {bills.map((b, i) => {
              const isPaid = b.status === "PAID"; const ac = isPaid ? "var(--success)" : "var(--accent)";
              return (
                <div key={b.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms`, background: "var(--chip-bg,rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ height: 3, background: ac }} />
                  <div style={{ padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{b.title || "Maintenance Bill"}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, marginBottom: 8, background: isPaid ? "var(--badge-paid-bg)" : "var(--accent-soft)", border: `1px solid ${isPaid ? "var(--badge-paid-border)" : "var(--glass-border)"}` }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: ac, letterSpacing: "-0.02em" }}>{fmtINR(b.amount)}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdPerson size={12} style={{ color: "var(--accent,#6B46C1)", flexShrink: 0 }} />{b.Flat?.User?.name || "—"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}><MdApartment size={12} style={{ color: "var(--accent,#6B46C1)", flexShrink: 0 }} />{b.Flat?.flat_number || "—"}{b.Flat?.Block?.name ? ` · ${b.Flat.Block.name}` : ""}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>{["#", "Resident", "Flat", "Block", "Bill Type", "Amount", "Status"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {bills.map((b, i) => (
                <tr key={b.id} className="animate-fadeIn" style={{ animationDelay: `${i * 15}ms` }}>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(page - 1) * LIMIT + i + 1}</span></td>
                  <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{b.Flat?.User?.name || "—"}</span></td>
                  <td><span className="info-chip">{b.Flat?.flat_number || "—"}</span></td>
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{b.Flat?.Block?.name || "—"}</span></td>
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{b.title || "—"}</span></td>
                  <td><span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: b.status === "PAID" ? "var(--success)" : "var(--accent)" }}>{fmtINR(b.amount)}</span></td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && bills.length > 0 && (
          <div className="table-footer fin-rpt-footer">
            <span className="fin-rpt-footer__range">
              Showing <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong> of <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> records
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}