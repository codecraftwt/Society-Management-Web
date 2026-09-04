import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  MdCheck, MdClose, MdBadge, MdCreditCard, MdAccessTime,
  MdOpenInNew, MdWarning, MdSearch, MdFilterList,
  MdPerson, MdHome, MdCalendarToday, MdDirectionsCar,
  MdGroup, MdRefresh, MdVisibility
} from "react-icons/md";
import Select from "../../components/common/Select";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function LeaseChip({ date }) {
  if (!date) return <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: 12 }}>No end date</span>;
  const days = daysUntil(date);
  let color = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (days <= 0)  color = "text-red-400 bg-red-400/10 border-red-400/20";
  else if (days <= 5)  color = "text-red-400 bg-red-400/10 border-red-400/20";
  else if (days <= 30) color = "text-blue-400 bg-blue-400/10 border-blue-400/20";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${color}`}>
      {days <= 0 ? "Expired" : days <= 30 ? `${days}d left` : formatDate(date)}
    </span>
  );
}

/* ─────────────────────────────────────────────
   DOCUMENT VIEWER MODAL
───────────────────────────────────────────── */
function DocViewerModal({ doc, onClose }) {
  if (!doc) return null;
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)", zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          maxHeight: "92vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{doc.title}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(doc.url, "_blank")}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg hover:bg-blue-500/20 transition"
            >
              <MdOpenInNew size={15} /> New Tab
            </button>
            <button
              onClick={onClose}
              className="hover:text-red-400 transition bg-white/5 p-2 rounded-lg"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-2xl" style={{ background: "var(--card-inner-bg)", minHeight: "70vh" }}>
          {doc.type === "image" ? (
            <div className="w-full h-full flex items-center justify-center p-6">
              <img src={doc.url} alt={doc.title} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
          ) : (
            <object data={doc.url} type="application/pdf" className="w-full h-full" style={{ minHeight: "70vh" }}>
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(doc.url)}&embedded=true`}
                className="w-full border-0" style={{ minHeight: "70vh" }} title={doc.title}
              />
            </object>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────
   REJECTION MODAL
───────────────────────────────────────────── */
function RejectModal({ open, onClose, onSubmit, loading }) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  if (!open) return null;

  const inputStyle = {
    background: "var(--card-inner-bg)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)", padding: "10px 12px",
    borderRadius: "10px", outline: "none",
    width: "100%", fontSize: "13px",
    resize: "vertical", minHeight: "100px",
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)", zIndex: 10000 }}
      onClick={() => !loading && onClose()}
    >
      <div
        className="rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: "var(--card-bg)", border: "1px solid rgba(239,68,68,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", color: "#60A5FA" }}>
            <MdWarning size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Reject Tenant Application</h3>
            <p className="mt-0.5" style={{ fontSize: 11, color: "var(--text-secondary)" }}>Provide a clear reason — tenant will be notified</p>
          </div>
          <button disabled={loading} onClick={onClose} style={{ color: "var(--text-secondary)", cursor: "pointer", background: "none", border: "none", padding: 4 }}>
            <MdClose size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 flex gap-2 text-sm text-red-400">
            <MdWarning size={16} className="shrink-0 mt-0.5" />
            <span>The tenant will receive an email with the reason you provide below.</span>
          </div>
          <div>
            <label className="font-bold uppercase tracking-widest block mb-2" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              Reason for Rejection *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Blurred Aadhar card, Incomplete PAN details…"
              rows={4}
              disabled={loading}
              style={inputStyle}
            />
          </div>
        </div>
        <div className="p-5 flex gap-3" style={{ borderTop: "1px solid var(--divider)" }}>
          <button
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition disabled:opacity-40"
            style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          >
            Cancel
          </button>
          <button
            disabled={loading || !reason.trim()}
            onClick={() => onSubmit(reason)}
            className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <><MdAccessTime size={16} className="animate-spin" /> Rejecting…</> : <><MdClose size={16} /> Confirm</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────
   DETAIL DRAWER (slide-in from right)
───────────────────────────────────────────── */
function DetailDrawer({ resident, onClose, onApprove, onReject, onViewDoc }) {
  if (!resident) return null;
  const membership = resident.FlatMemberships?.[0];
  const flat = membership?.Flat;
  const docs = resident.UserDocument || resident.UserDocuments;

  const getFileType = (url) => {
    if (!url) return null;
    const l = url.toLowerCase();
    if (l.includes(".pdf") || l.includes("pdf")) return "pdf";
    if (l.match(/\.(jpg|jpeg|png|gif|webp|bmp)/)) return "image";
    return "iframe";
  };

  return createPortal(
    <div
      className="fixed inset-0 flex justify-end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9998 }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto flex flex-col"
        style={{
          background: "var(--card-bg)",
          borderLeft: "1px solid var(--glass-border)",
          animation: "slideInRight 0.22s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4"
          style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--divider)" }}>
          <div className="w-10 h-10 rounded-xl bg-blue-500/12 text-blue-400 flex items-center justify-center font-black text-lg">
            {resident.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate" style={{ color: "var(--text-primary)" }}>{resident.name}</h3>
            <p className="truncate" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{resident.email}</p>
          </div>
          <button onClick={onClose} className="hover:text-red-400 transition bg-white/5 p-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>
            <MdClose size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Status badge */}
          <div className="flex justify-center">
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              ⏳ Pending Verification
            </span>
          </div>

          {/* Personal */}
          <Section title="Personal Info" icon={<MdPerson size={14} />}>
            <Row label="Full Name"  value={resident.name} />
            <Row label="Email"      value={resident.email} />
            <Row label="Phone"      value={resident.phone || "—"} />
            <Row label="Type"       value={resident.resident_type || "TENANT"} chip />
          </Section>

          {/* Flat */}
          <Section title="Flat Assignment" icon={<MdHome size={14} />}>
            <Row label="Flat No."   value={flat?.flat_number ? `Flat ${flat.flat_number}` : "—"} />
            <Row label="Block"      value={flat?.Block?.name || flat?.Floor?.Block?.name || "—"} />
            <Row label="Floor"      value={flat?.Floor?.floor_number != null ? `Floor ${flat.Floor.floor_number}` : "—"} />
            <Row label="Status"     value={flat?.occupancy_status || "—"} chip />
          </Section>

          {/* Lease */}
          <Section title="Lease Period" icon={<MdCalendarToday size={14} />}>
            <Row label="Move-in"    value={formatDate(membership?.move_in_date)} />
            <Row label="Move-out">
              <LeaseChip date={membership?.move_out_date} />
            </Row>
          </Section>

          {/* Occupancy */}
          <Section title="Occupancy" icon={<MdGroup size={14} />}>
            <Row label="Members"   value={`${resident.occupant_count ?? "—"} occupants`} />
            <Row label="Vehicles"  value={`${resident.vehicle_count ?? 0} vehicle(s)`} icon={<MdDirectionsCar size={12} />} />
          </Section>

          {/* KYC */}
          <Section title="KYC Documents" icon={<MdBadge size={14} />}>
            <div className="flex gap-2 mt-1">
              {docs?.aadhar_url ? (
                <button
                  onClick={() => onViewDoc({ url: docs.aadhar_url, title: `${resident.name} — Aadhar`, type: getFileType(docs.aadhar_url) })}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition"
                >
                  <MdBadge size={14} /> Aadhar
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/5 text-red-400/40 border border-red-500/10 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed">
                  No Aadhar
                </div>
              )}
              {docs?.pan_url ? (
                <button
                  onClick={() => onViewDoc({ url: docs.pan_url, title: `${resident.name} — PAN`, type: getFileType(docs.pan_url) })}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition"
                >
                  <MdCreditCard size={14} /> PAN
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/5 text-red-400/40 border border-red-500/10 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed">
                  No PAN
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Action buttons */}
        <div className="sticky bottom-0 p-4 grid grid-cols-2 gap-3"
          style={{ background: "var(--card-bg)", borderTop: "1px solid var(--divider)" }}>
          <button
            onClick={() => onReject(resident.id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition"
          >
            <MdClose size={16} /> Reject
          </button>
          <button
            onClick={() => onApprove(resident.id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm hover:bg-emerald-500/20 transition"
          >
            <MdCheck size={16} /> Approve
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 font-black uppercase tracking-widest mb-2" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
        {icon}{title}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, chip, icon, children }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--divider)" }}>
      <span className="font-medium" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
      {children ? children : (
        chip ? (
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: "var(--card-inner-bg)", color: "var(--text-primary)" }}>
            {icon}{value}
          </span>
        ) : (
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-primary)" }}>{icon}{value}</span>
        )
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TenantApprovals() {
  const [residents, setResidents]       = useState([]);
  const [loading, setLoading]           = useState(true);

  // Filters
  const [search, setSearch]             = useState("");
  const [filterBlock, setFilterBlock]   = useState("ALL");
  const [filterFloor, setFilterFloor]   = useState("ALL");
  const [filterLease, setFilterLease]   = useState("ALL"); // ALL | EXPIRING | EXPIRED

  // Modals
  const [selectedDoc, setSelectedDoc]   = useState(null);
  const [drawerResident, setDrawer]     = useState(null);
  const [rejectModal, setRejectModal]   = useState({ open: false, userId: null });
  const [rejectLoading, setRejectLoading] = useState(false);

  /* ── Load ── */
  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/users/resident/pending");
      setResidents(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load pending approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Derived filter options ── */
  const blocks = useMemo(() => {
    const set = new Set();
    residents.forEach(r => {
      const flat = r.FlatMemberships?.[0]?.Flat;
      const b = flat?.Block?.name || flat?.Floor?.Block?.name;
      if (b) set.add(b);
    });
    return [...set].sort();
  }, [residents]);

  const floors = useMemo(() => {
    const set = new Set();
    residents.forEach(r => {
      const flat = r.FlatMemberships?.[0]?.Flat;
      if (filterBlock !== "ALL") {
        const b = flat?.Block?.name || flat?.Floor?.Block?.name;
        if (b !== filterBlock) return;
      }
      const f = flat?.Floor?.floor_number;
      if (f != null) set.add(f);
    });
    return [...set].sort((a, b) => a - b);
  }, [residents, filterBlock]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return residents.filter(r => {
      const flat       = r.FlatMemberships?.[0]?.Flat;
      const membership = r.FlatMemberships?.[0];
      const blockName  = flat?.Block?.name || flat?.Floor?.Block?.name || "";
      const floorNum   = flat?.Floor?.floor_number;

      if (search) {
        const q = search.toLowerCase();
        const matches =
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.includes(q) ||
          flat?.flat_number?.toString().includes(q);
        if (!matches) return false;
      }
      if (filterBlock !== "ALL" && blockName !== filterBlock) return false;
      if (filterFloor !== "ALL" && String(floorNum) !== filterFloor) return false;
      if (filterLease !== "ALL") {
        const days = daysUntil(membership?.move_out_date);
        if (filterLease === "EXPIRING" && (days === null || days > 30 || days < 0)) return false;
        if (filterLease === "EXPIRED"  && (days === null || days >= 0)) return false;
      }
      return true;
    });
  }, [residents, search, filterBlock, filterFloor, filterLease]);

  /* ── Actions ── */
  const handleApprove = async (id) => {
    try {
      await API.put(`/admin/approve-resident/${id}`);
      toast.success("Tenant approved!");
      setDrawer(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    }
  };

  const handleRejectSubmit = async (reason) => {
    setRejectLoading(true);
    try {
      await API.put(`/admin/reject-resident/${rejectModal.userId}`, { reason });
      toast.info("Tenant rejected.");
      setRejectModal({ open: false, userId: null });
      setDrawer(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    } finally {
      setRejectLoading(false);
    }
  };

  const getFileType = (url) => {
    if (!url) return null;
    const l = url.toLowerCase();
    if (l.includes(".pdf") || l.includes("pdf")) return "pdf";
    if (l.match(/\.(jpg|jpeg|png|gif|webp|bmp)/)) return "image";
    return "iframe";
  };

  /* ── Stats ── */
  const expiringCount = residents.filter(r => {
    const d = daysUntil(r.FlatMemberships?.[0]?.move_out_date);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const expiredCount = residents.filter(r => {
    const d = daysUntil(r.FlatMemberships?.[0]?.move_out_date);
    return d !== null && d < 0;
  }).length;

  /* ── Render ── */
  if (loading) return (
    <div className="flex items-center justify-center p-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>Loading approvals…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Tenant Approvals</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Review KYC documents and verify new tenant registrations</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition"
          style={{ color: "var(--text-secondary)", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
        >
          <MdRefresh size={15} /> Refresh
        </button>
      </div>

      {/* ── Stat Pills ── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Pending", value: residents.length, color: "text-blue-400 bg-blue-400/8 border-blue-400/20" },
          { label: "Expiring ≤30d",  value: expiringCount,   color: "text-blue-300 bg-blue-300/10 border-blue-300/25" },
          { label: "Lease Expired",  value: expiredCount,    color: "text-red-400 bg-red-400/8 border-red-400/20" },
          { label: "Filtered",       value: filtered.length, color: "text-blue-400 bg-blue-400/8 border-blue-400/20" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${s.color}`}>
            <span className="text-base font-black">{s.value}</span>
            <span className="opacity-70">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, flat…"
            style={{
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)", padding: "9px 12px 9px 34px",
              borderRadius: "12px", outline: "none",
              width: "100%", fontSize: "13px",
            }}
          />
        </div>

        {/* Block filter */}
        <FilterSelect
          icon={<MdHome size={13} />}
          value={filterBlock}
          onChange={v => { setFilterBlock(v); setFilterFloor("ALL"); }}
          options={[{ value: "ALL", label: "All Blocks" }, ...blocks.map(b => ({ value: b, label: `Block ${b}` }))]}
        />

        {/* Floor filter */}
        <FilterSelect
          icon={<MdFilterList size={13} />}
          value={filterFloor}
          onChange={setFilterFloor}
          options={[{ value: "ALL", label: "All Floors" }, ...floors.map(f => ({ value: String(f), label: `Floor ${f}` }))]}
        />

        {/* Lease filter */}
        <FilterSelect
          icon={<MdCalendarToday size={13} />}
          value={filterLease}
          onChange={setFilterLease}
          options={[
            { value: "ALL",      label: "All Leases" },
            { value: "EXPIRING", label: "Expiring ≤30d" },
            { value: "EXPIRED",  label: "Expired" },
          ]}
        />
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"
          style={{ background: "var(--card-inner-bg)", borderRadius: "20px", border: "1px solid var(--glass-border)" }}>
          <MdCheck size={40} className="text-emerald-400/40" />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No pending approvals match your filters</p>
        </div>
      ) : (
        <>
          {/* ── Mobile Cards ── */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((r, i) => {
              const membership = r.FlatMemberships?.[0];
              const flat       = membership?.Flat;
              const docs       = r.UserDocument || r.UserDocuments;
              const blockName  = flat?.Block?.name || flat?.Floor?.Block?.name || "—";
              const floorNum   = flat?.Floor?.floor_number;
              const hasAadhar  = !!docs?.aadhar_url;
              const hasPan     = !!docs?.pan_url;

              return (
                <div
                  key={r.id}
                  className="animate-fadeIn rounded-2xl overflow-hidden cursor-pointer"
                  style={{ animationDelay: `${i * 30}ms`, border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}
                  onClick={() => setDrawer(r)}
                >
                  <div className="p-4 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/12 text-blue-400 flex items-center justify-center font-black text-base shrink-0">
                      {r.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                      <p className="truncate" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{r.email}</p>
                    </div>
                    <LeaseChip date={membership?.move_out_date} />
                  </div>
                  <div className="px-4 pb-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{flat?.flat_number ? `Flat ${flat.flat_number}` : "—"}</span>
                      {blockName !== "—" && <span> · Block {blockName}</span>}
                      {floorNum != null && <span> · Floor {floorNum}</span>}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Move-in {formatDate(membership?.move_in_date)}</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        title="Aadhar"
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${hasAadhar ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/50"}`}
                      >
                        A
                      </span>
                      <span
                        title="PAN"
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${hasPan ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/50"}`}
                      >
                        P
                      </span>
                    </span>
                  </div>
                  <div className="p-4 pt-2.5 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDrawer(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl hover:bg-white/10 text-xs font-bold transition"
                      style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      <MdVisibility size={14} /> View
                    </button>
                    <button
                      onClick={() => setRejectModal({ open: true, userId: r.id })}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      <MdClose size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(r.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition"
                    >
                      <MdCheck size={14} /> Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
            {/* Table header */}
            <div
              className="grid font-black uppercase tracking-widest px-4 py-3"
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                background: "var(--card-inner-bg)",
                borderBottom: "1px solid var(--divider)",
                gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1fr 1fr auto",
                gap: "12px",
              }}
            >
              <span>Tenant</span>
              <span>Flat / Block</span>
              <span>Floor</span>
              <span>Move-In</span>
              <span>Lease End</span>
              <span>KYC</span>
              <span>Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
              {filtered.map((r, i) => {
                const membership = r.FlatMemberships?.[0];
                const flat       = membership?.Flat;
                const docs       = r.UserDocument || r.UserDocuments;
                const blockName  = flat?.Block?.name || flat?.Floor?.Block?.name || "—";
                const floorNum   = flat?.Floor?.floor_number;
                const hasAadhar  = !!docs?.aadhar_url;
                const hasPan     = !!docs?.pan_url;

                return (
                  <div
                    key={r.id}
                    className="grid items-center px-4 py-3 hover:bg-white/2 transition group cursor-pointer"
                    style={{
                      gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1fr 1fr auto",
                      gap: "12px",
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--divider)" : "none",
                      background: i % 2 === 0 ? "var(--card-inner-bg)" : "transparent",
                    }}
                    onClick={() => setDrawer(r)}
                  >
                    {/* Tenant */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/12 text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                        {r.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                        <p className="truncate" style={{ fontSize: 10, color: "var(--text-secondary)" }}>{r.email}</p>
                      </div>
                    </div>

                    {/* Flat / Block */}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {flat?.flat_number ? `Flat ${flat.flat_number}` : "—"}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>{blockName !== "—" ? `Block ${blockName}` : "—"}</p>
                    </div>

                    {/* Floor */}
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      {floorNum != null ? `Floor ${floorNum}` : "—"}
                    </p>

                    {/* Move-In */}
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatDate(membership?.move_in_date)}</p>

                    {/* Lease End */}
                    <div><LeaseChip date={membership?.move_out_date} /></div>

                    {/* KYC Status */}
                    <div className="flex items-center gap-1.5">
                      <span
                        title="Aadhar"
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${hasAadhar ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/50"}`}
                      >
                        A
                      </span>
                      <span
                        title="PAN"
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${hasPan ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/50"}`}
                      >
                        P
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        title="View Details"
                        onClick={() => setDrawer(r)}
                        className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
                        style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                      >
                        <MdVisibility size={14} />
                      </button>
                      <button
                        title="Reject"
                        onClick={() => setRejectModal({ open: true, userId: r.id })}
                        className="w-8 h-8 rounded-lg bg-red-500/8 text-red-400/60 hover:text-red-400 hover:bg-red-500/15 border border-red-500/10 flex items-center justify-center transition"
                      >
                        <MdClose size={14} />
                      </button>
                      <button
                        title="Approve"
                        onClick={() => handleApprove(r.id)}
                        className="w-8 h-8 rounded-lg bg-emerald-500/8 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 flex items-center justify-center transition"
                      >
                        <MdCheck size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 flex justify-between items-center"
              style={{ background: "var(--card-inner-bg)", borderTop: "1px solid var(--divider)" }}>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                Showing <span className="font-bold" style={{ color: "var(--text-primary)" }}>{filtered.length}</span> of{" "}
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{residents.length}</span> pending approvals
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Click any row to view full details</p>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      <DocViewerModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />

      <DetailDrawer
        resident={drawerResident}
        onClose={() => setDrawer(null)}
        onApprove={handleApprove}
        onReject={(id) => { setRejectModal({ open: true, userId: id }); }}
        onViewDoc={setSelectedDoc}
      />

      <RejectModal
        open={rejectModal.open}
        loading={rejectLoading}
        onClose={() => setRejectModal({ open: false, userId: null })}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILTER SELECT
───────────────────────────────────────────── */
function FilterSelect({ icon, value, onChange, options }) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 pointer-events-none" style={{ color: "var(--text-secondary)" }}>{icon}</span>
      <Select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "var(--card-inner-bg)",
          border: "1px solid var(--glass-border)",
          color: value === "ALL" ? "var(--text-secondary)" : "var(--text-primary)",
          padding: "9px 32px 9px 28px",
          borderRadius: "12px", outline: "none",
          fontSize: "12px", fontWeight: "700",
          appearance: "none", cursor: "pointer",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>{o.label}</option>
        ))}
      </Select>
      <span className="absolute right-2 pointer-events-none" style={{ fontSize: 10, color: "var(--text-secondary)" }}>▾</span>
    </div>
  );
}
