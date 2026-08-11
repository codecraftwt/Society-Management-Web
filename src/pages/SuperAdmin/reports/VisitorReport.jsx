
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { exportToExcel } from "../../../utils/exportExcel";
import { exportToPDF } from "../../../utils/exportPDF";
import {
  MdGroups, MdOutlineInbox, MdFilterList,
  MdTableChart, MdPictureAsPdf,
  MdLogin, MdLogout, MdClose,
  MdPerson, MdPhone, MdApartment, MdAccessTime,
  MdArrowBack, MdChevronLeft, MdChevronRight,
  MdBusiness
} from "react-icons/md";
import Select from "../../../components/common/Select";

/* ─────────────────────────────────────────────
   Resolve flat label from visitor's Flat object
───────────────────────────────────────────── */
function resolveFlatLabel(flat) {
  if (!flat) return "—";
  const block = flat.Floor?.Block?.name || flat.Block?.name || null;
  const floor = flat.Floor?.floor_number ?? null;
  const flatNo = flat.flat_number || "—";
  const society = flat.Block?.Society?.name || flat.Floor?.Block?.Society?.name || "—";
  
  return [
    society,
    block,
    floor != null ? `Floor ${floor}` : null,
    flatNo,
  ].filter(Boolean).join(" / ") || "—";
}

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
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p); return acc;
    }, []);
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

function EntryExitBadge({ exit, inLabel, outLabel }) {
  const cfg = {
    IN: { label: inLabel, Icon: MdLogin, color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" },
    OUT: { label: outLabel, Icon: MdLogout, color: "#A39EB2", bg: "rgba(163,158,178,0.10)", border: "rgba(163,158,178,0.20)" },
  };
  const c = exit ? cfg.OUT : cfg.IN;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
      <c.Icon size={11} /> {c.label}
    </span>
  );
}

const formatDate = d => { if (!d) return "—"; const dt = new Date(d); return isNaN(dt) ? "—" : dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }); };
const formatDateShort = d => { if (!d) return "—"; const dt = new Date(d); return isNaN(dt) ? "—" : dt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }); };

function FilterSheet({
  show, onClose, isMobile, societies, societyId, setSocietyId,
  blocks, blockId, setBlockId,
  floors, floorId, setFloorId,
  flats, flatId, setFlatId,
  statusFilter, setStatusFilter, fromDate, setFromDate, toDate, setToDate, onApply, onClear, applied, labels
}) {
  const formBody = (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Society</label>
        <Select className="input" value={societyId} onChange={e => setSocietyId(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="ALL">All Societies</option>
          {societies.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{labels.statusLabel}</label>
        <Select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
          <option value="">{labels.allStatus}</option>
          <option value="IN">{labels.inside}</option>
          <option value="OUT">{labels.exited}</option>
        </Select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[{ label: labels.fromDate, val: fromDate, set: setFromDate }, { label: labels.toDate, val: toDate, set: setToDate }].map(({ label, val, set }) => (
          <div key={label}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{label}</label>
            <input type="date" className="input" value={val} onChange={e => set(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {applied && <button onClick={() => { onClear(); onClose?.(); }} className="btn-muted" style={{ flex: 1, justifyContent: "center" }}>{labels.clear}</button>}
        <button onClick={onApply} className="btn-primary" style={{ flex: applied ? 1 : undefined, width: applied ? undefined : "100%", justifyContent: "center" }}>{labels.applyFilter}</button>
      </div>
      {isMobile && <div style={{ height: "max(env(safe-area-inset-bottom),8px)" }} />}
    </div>
  );

  if (!isMobile) return (
    <div className="data-table-wrap animate-fadeIn">
      <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <MdFilterList size={15} style={{ color: "var(--accent,#6B46C1)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{labels.filtersTitle}</span>
        {applied && <button onClick={onClear} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer" }}><MdClose size={13} /> {labels.clearFilters}</button>}
      </div>
      {formBody}
    </div>
  );

  if (!show) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "var(--modal-bg,var(--card-bg,#2E2A36))", borderTop: "1.5px solid var(--glass-border)", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.45)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}><div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--glass-border)" }} /></div>
        <div style={{ padding: "8px 18px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--glass-border)" }}>
          <MdFilterList size={16} style={{ color: "var(--accent,#6B46C1)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{labels.filtersTitle}</span>
          {applied && <button onClick={() => { onClear(); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer" }}><MdClose size={13} /> {labels.clear}</button>}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--card-inner-bg,rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}><MdClose size={15} /></button>
        </div>
        {formBody}
      </div>
    </div>,
    document.body
  );
}

const LIMIT = 15;

export default function SuperAdminVisitorReport() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const navigate = useNavigate();

  const [visitors, setVisitors] = useState([]);
  const [counts, setCounts] = useState({ total: 0, inside: 0, exited: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [societies, setSocieties] = useState([]);
  const [societyId, setSocietyId] = useState("ALL");
  const [blockId, setBlockId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [flatId, setFlatId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [pendingSocietyId, setPendingSocietyId] = useState("ALL");
  const [pendingBlockId, setPendingBlockId] = useState("");
  const [pendingFloorId, setPendingFloorId] = useState("");
  const [pendingFlatId, setPendingFlatId] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [floors, setFloors] = useState([]);
  const [flats, setFlats] = useState([]);

  useEffect(() => {
    API.get("/societies")
      .then(res => setSocieties(res.data || []))
      .catch(err => console.error("Failed to fetch societies", err));
  }, []);

  const fetchVisitors = useCallback(async (pg, sid, bid, fdid, flid, sf, fd, td, isInit = false) => {
    isInit ? setLoading(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (sid && sid !== "ALL") params.set("society_id", sid);
      if (bid) params.set("block_id", bid);
      if (fdid) params.set("floor_id", fdid);
      if (flid) params.set("flat_id", flid);
      if (sf) params.set("status", sf);
      if (fd && td) { params.set("fromDate", fd); params.set("toDate", td); }
      const res = await API.get(`/reports/visitors?${params}`);
      const data = res.data;
      setVisitors(data.data || []);
      setCounts(data.counts || { total: 0, inside: 0, exited: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setFetching(false); }
  }, []);

  useEffect(() => { fetchVisitors(1, "ALL", "", "", "", "", "", "", true); }, []);

  // --- Cascading Filter Logic ---
  useEffect(() => {
    if (pendingSocietyId && pendingSocietyId !== "ALL") {
      API.get(`/blocks?society_id=${pendingSocietyId}`).then(res => setBlocks(res.data || [])).catch(console.error);
    } else {
      setBlocks([]);
      setPendingBlockId("");
    }
    setPendingFloorId("");
    setPendingFlatId("");
  }, [pendingSocietyId]);

  useEffect(() => {
    if (pendingBlockId) {
      API.get(`/floors?block_id=${pendingBlockId}`).then(res => setFloors(res.data || [])).catch(console.error);
      API.get(`/flats?block_id=${pendingBlockId}`).then(res => setFlats(res.data || [])).catch(console.error);
    } else {
      setFloors([]);
      setFlats([]);
      setPendingFloorId("");
      setPendingFlatId("");
    }
  }, [pendingBlockId]);

  useEffect(() => {
    if (pendingFloorId) {
      API.get(`/flats?floor_id=${pendingFloorId}`).then(res => setFlats(res.data || [])).catch(console.error);
    } else if (pendingBlockId) {
      API.get(`/flats?block_id=${pendingBlockId}`).then(res => setFlats(res.data || [])).catch(console.error);
    }
    setPendingFlatId("");
  }, [pendingFloorId]);

  const applyFilter = () => {
    setSocietyId(pendingSocietyId);
    setBlockId(pendingBlockId);
    setFloorId(pendingFloorId);
    setFlatId(pendingFlatId);
    setStatusFilter(pendingStatus);
    setFromDate(pendingFrom);
    setToDate(pendingTo);
    setApplied(pendingSocietyId !== "ALL" || !!(pendingBlockId || pendingFloorId || pendingFlatId || pendingStatus || (pendingFrom && pendingTo)));
    setShowFilters(false);
    fetchVisitors(1, pendingSocietyId, pendingBlockId, pendingFloorId, pendingFlatId, pendingStatus, pendingFrom, pendingTo);
  };

  const clearFilter = () => {
    setSocietyId("ALL");
    setPendingSocietyId("ALL");
    setBlockId("");
    setPendingBlockId("");
    setFloorId("");
    setPendingFloorId("");
    setFlatId("");
    setPendingFlatId("");
    setStatusFilter("");
    setPendingStatus("");
    setFromDate("");
    setPendingFrom("");
    setToDate("");
    setPendingTo("");
    setApplied(false);
    fetchVisitors(1, "ALL", "", "", "", "", "", "");
  };

  const handlePageChange = p => fetchVisitors(p, societyId, blockId, floorId, flatId, statusFilter, fromDate, toDate);

  const badgeLabels = { inLabel: t("rptInside") || "In", outLabel: t("rptExited") || "Out" };
  const filterLabels = { 
    filtersTitle: t("rptFilters") || "Filters", 
    clear: t("rptClear") || "Clear", 
    clearFilters: t("rptClearFilters") || "Clear Filters", 
    applyFilter: t("rptApplyFilter") || "Apply",
    statusLabel: t("billStatusCol") || "Status",
    allStatus: t("rptAllStatus") || "All Status",
    inside: t("rptInside") || "Inside",
    exited: t("rptExited") || "Exited",
    fromDate: t("rptFromDate") || "From Date",
    toDate: t("rptToDate") || "To Date",
    allBlocks: t("allBlocks") || "All Blocks",
    allFloors: t("allFloors") || "All Floors",
    allFlats: t("allFlats") || "All Flats",
  };

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({ page: 1, limit: 1000 });
    if (societyId && societyId !== "ALL") params.set("society_id", societyId);
    if (blockId) params.set("block_id", blockId);
    if (floorId) params.set("floor_id", floorId);
    if (flatId) params.set("flat_id", flatId);
    if (statusFilter) params.set("status", statusFilter);
    if (fromDate && toDate) { params.set("fromDate", fromDate); params.set("toDate", toDate); }
    const res = await API.get(`/reports/visitors?${params}`);
    return res.data.data || [];
  };

  const handleExcelExport = async () => {
    const all = await fetchAllForExport();
    exportToExcel({
      fileName: "System_Visitor_Report", sheetName: "Visitors",
      data: all.map((v, i) => ({
        "Sr No": i + 1,
        "Visitor": v.visitor_name,
        "Mobile": v.mobile,
        "Purpose": v.purpose,
        "Society / Block / Flat": resolveFlatLabel(v.Flat),
        "Entry": formatDate(v.entry_time),
        "Exit": v.exit_time ? formatDate(v.exit_time) : "IN",
      })),
    });
  };

  const handlePDFExport = async () => {
    const all = await fetchAllForExport();
    exportToPDF({
      title: "System Visitor Report", fileName: "System_Visitor_Report",
      columns: ["Sr No", "Visitor", "Mobile", "Purpose", "Society / Block / Flat", "Entry", "Status"],
      rows: all.map((v, i) => [
        i + 1, v.visitor_name, v.mobile, v.purpose,
        resolveFlatLabel(v.Flat),
        formatDate(v.entry_time),
        v.exit_time ? formatDate(v.exit_time) : "IN",
      ]),
    });
  };

  const bleed = isMobile
    ? { marginLeft: "calc(-1 * var(--page-padding,16px))", marginRight: "calc(-1 * var(--page-padding,16px))", width: "calc(100% + 2 * var(--page-padding,16px))", borderRadius: 0, boxSizing: "border-box" }
    : { boxSizing: "border-box" };

  return (
    <div className="page-root animate-fadeIn" style={{ overflowX: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-inner-bg,rgba(255,255,255,0.06))", border: "1px solid var(--glass-border)", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
            <MdArrowBack size={18} />
          </button>
          <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(148,181,245,0.15),rgba(91,141,239,0.10))", border: "1.5px solid rgba(148,181,245,0.25)", color: "#94B5F5" }}><MdGroups size={22} /></div>
          <div><h2 className="page-title">Global Visitor Report</h2><p className="page-subtitle">{loading ? "—" : `${counts.total} total logs`}</p></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcelExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer", whiteSpace: "nowrap" }}><MdTableChart size={14} /> Excel</button>
          <button onClick={handlePDFExport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", cursor: "pointer", whiteSpace: "nowrap" }}><MdPictureAsPdf size={14} /> PDF</button>
          {isMobile && <button onClick={() => setShowFilters(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: applied ? "rgba(107,70,193,0.15)" : "var(--card-inner-bg,rgba(255,255,255,0.06))", color: applied ? "#9F87D7" : "var(--text-secondary)", border: applied ? "1px solid rgba(107,70,193,0.35)" : "1px solid var(--glass-border)", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}><MdFilterList size={14} /> Filters{applied && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#6B46C1", boxShadow: "0 0 6px rgba(107,70,193,0.6)" }} />}</button>}
        </div>
      </div>

      {/* ── STATS ── */}
      {!loading && counts.total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
          {[
            { label: t("rptTotalVisitors") || "Total Visitors", val: counts.total, color: "purple" },
            { label: t("rptInside") || "Currently Inside", val: counts.inside, color: "green" },
            { label: t("rptExited") || "Exited", val: counts.exited, color: "amber" },
          ].map((s, i) => (
            <div key={i} className={`stat-card stat-card--${s.color}`} style={{ borderRadius: isMobile ? 14 : 18, padding: isMobile ? "12px 14px" : "16px 18px" }}>
              <div><div className="stat-card__val">{s.val}</div><div className="stat-card__label">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      <FilterSheet show={showFilters} onClose={() => setShowFilters(false)} isMobile={isMobile}
        societies={societies} societyId={pendingSocietyId} setSocietyId={setPendingSocietyId}
        blocks={blocks} blockId={pendingBlockId} setBlockId={setPendingBlockId}
        floors={floors} floorId={pendingFloorId} setFloorId={setPendingFloorId}
        flats={flats} flatId={pendingFlatId} setFlatId={setPendingFlatId}
        statusFilter={pendingStatus} setStatusFilter={setPendingStatus}
        fromDate={pendingFrom} setFromDate={setPendingFrom}
        toDate={pendingTo} setToDate={setPendingTo}
        onApply={applyFilter} onClear={clearFilter} applied={applied} labels={filterLabels} />

      {/* ── TABLE CARD ── */}
      <div className="data-table-wrap" style={bleed}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            All Visitor Logs
            {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-secondary)", marginLeft: 8 }}>— {totalItems} records{applied ? " (filtered)" : ""}</span>}
          </span>
          {fetching && <Spinner small />}
          {applied && !fetching && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(107,70,193,0.1)", color: "#9F87D7", border: "1px solid rgba(107,70,193,0.2)", whiteSpace: "nowrap" }}>Filtered</span>}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><Spinner /><p style={{ fontSize: 13, margin: 0 }}>Loading logs...</p></div>
        ) : visitors.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px", color: "var(--text-secondary)" }}><MdOutlineInbox size={48} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13, margin: 0 }}>No logs found</p>{applied && <button onClick={clearFilter} style={{ fontSize: 12, color: "var(--accent,#6B46C1)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear Filters</button>}</div>

        ) : isMobile ? (
          /* ── MOBILE CARDS ── */
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {visitors.map((v, i) => (
              <div key={v.id} className="animate-fadeIn" style={{ animationDelay: `${i * 25}ms`, background: "var(--chip-bg,rgba(255,255,255,0.04))", border: "1px solid var(--glass-border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ height: 3, background: !v.exit_time ? "#4ade80" : "#A39EB2" }} />
                <div style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{v.visitor_name || "—"}</p>
                    <EntryExitBadge exit={v.exit_time} {...badgeLabels} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                      <MdBusiness size={12} style={{ color: "var(--accent,#6B46C1)", flexShrink: 0 }} />
                      {resolveFlatLabel(v.Flat)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", opacity: 0.75 }}>
                      <MdAccessTime size={11} style={{ flexShrink: 0 }} />{formatDateShort(v.entry_time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        ) : (
          /* ── DESKTOP TABLE ── */
          <table className="data-table">
            <thead>
              <tr>
                {[t("rptColSrNo") || "Sr No", t("rptVisitor") || "Visitor", t("rptMobile") || "Mobile", t("rptPurpose") || "Purpose", t("profileTileSociety") || "Society / Block / Flat", t("rptEntry") || "Entry", t("billStatusCol") || "Status"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visitors.map((v, i) => (
                <tr key={v.id} className="animate-fadeIn" style={{ animationDelay: `${i * 15}ms` }}>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(page - 1) * LIMIT + i + 1}</span></td>
                  <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v.visitor_name}</span></td>
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{v.mobile}</span></td>
                  <td><span style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{v.purpose}</span></td>
                  <td><span className="info-chip">{resolveFlatLabel(v.Flat)}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(v.entry_time)}</span></td>
                  <td><EntryExitBadge exit={v.exit_time} {...badgeLabels} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {!loading && visitors.length > 0 && (
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Showing <strong>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong> of <strong>{totalItems}</strong> records
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
