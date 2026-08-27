import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  MdCheck, MdClose, MdBadge, MdCreditCard, MdAccessTime,
  MdOpenInNew, MdWarning, MdSearch, MdFilterList,
  MdPerson, MdHome, MdCalendarToday, MdDirectionsCar,
  MdGroup, MdRefresh, MdVisibility, MdPeople
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

function StatusBadge({ label }) {
  const map = {
    PENDING:    { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" },
    APPROVED:   { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", border: "rgba(34,197,94,0.25)" },
    REJECTED:   { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", border: "rgba(239,68,68,0.25)" },
    LIVING:     { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" },
    EXPIRED:    { bg: "rgba(168,85,247,0.12)", color: "#a855f7", border: "rgba(168,85,247,0.25)" },
    REMOVED:    { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", border: "rgba(239,68,68,0.25)" },
    UNKNOWN:    { bg: "var(--card-inner-bg)",  color: "var(--text-secondary)", border: "var(--glass-border)" },
  };
  const s = map[label] || map.UNKNOWN;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {label}
    </span>
  );
}

function LeaseChip({ date }) {
  if (!date) return <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: 12 }}>No end date</span>;
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  let color = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (diff <= 0) color = "text-red-400 bg-red-400/10 border-red-400/20";
  else if (diff <= 30) color = "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${color}`}>
      {diff <= 0 ? "Expired" : diff <= 30 ? `${diff}d left` : formatDate(date)}
    </span>
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
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
   DETAIL MODAL (centered, for history view)
───────────────────────────────────────────── */
function DetailModal({ tenant, onClose, onApprove, onReject, isPending }) {
  if (!tenant) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 9998 }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 sticky top-0 z-10"
          style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--divider)" }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-lg">
            {tenant.tenant_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate" style={{ color: "var(--text-primary)" }}>{tenant.tenant_name}</h3>
            <p className="truncate" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{tenant.tenant_email}</p>
          </div>
          <StatusBadge label={tenant.status_label} />
          <button onClick={onClose} className="hover:text-red-400 transition bg-white/5 p-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>
            <MdClose size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Personal */}
          <Section title="Personal Info" icon={<MdPerson size={14} />}>
            <Row label="Full Name" value={tenant.tenant_name} />
            <Row label="Email" value={tenant.tenant_email} />
            <Row label="Phone" value={tenant.tenant_phone || "—"} />
            <Row label="Type" value={tenant.resident_type || "TENANT"} chip />
          </Section>

          {/* Flat */}
          <Section title="Flat Assignment" icon={<MdHome size={14} />}>
            <Row label="Flat No." value={tenant.flat_number ? `Flat ${tenant.flat_number}` : "—"} />
            <Row label="Block" value={tenant.block_name || "—"} />
            <Row label="Owner" value={tenant.owner_name || "—"} />
            <Row label="Occupancy" value={tenant.occupancy_status || "—"} chip />
          </Section>

          {/* Lease */}
          <Section title="Lease Period" icon={<MdCalendarToday size={14} />}>
            <Row label="Move-in" value={formatDate(tenant.move_in_date)} />
            <Row label="Move-out">
              <LeaseChip date={tenant.move_out_date} />
            </Row>
          </Section>

          {/* Status */}
          <Section title="Status Details" icon={<MdBadge size={14} />}>
            <Row label="Approval" value={tenant.approval_status || "—"} chip />
            <Row label="User Status" value={tenant.user_status || "—"} chip />
            <Row label="Currently Staying" value={tenant.is_staying ? "Yes" : "No"} />
            <Row label="Current Membership" value={tenant.is_current ? "Yes" : "No"} />
          </Section>
        </div>

        {/* Action buttons (only for pending) */}
        {isPending && (
          <div className="sticky bottom-0 p-4 grid grid-cols-2 gap-3"
            style={{ background: "var(--card-bg)", borderTop: "1px solid var(--divider)" }}>
            <button
              onClick={() => onReject(tenant.tenant_id)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition"
            >
              <MdClose size={16} /> Reject
            </button>
            <button
              onClick={() => onApprove(tenant.tenant_id)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm hover:bg-emerald-500/20 transition"
            >
              <MdCheck size={16} /> Approve
            </button>
          </div>
        )}
      </div>
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
   STATUS TABS CONFIG
───────────────────────────────────────────── */
const STATUS_TABS = [
  { key: "ALL",       label: "All",         color: "var(--text-primary)",    icon: <MdPeople size={14} /> },
  { key: "PENDING",   label: "Pending",     color: "#fbbf24",               icon: <MdAccessTime size={14} /> },
  { key: "APPROVED",  label: "Approved",    color: "#22c55e",               icon: <MdCheck size={14} /> },
  { key: "LIVING",    label: "Living",      color: "#3b82f6",               icon: <MdPerson size={14} /> },
  { key: "REJECTED",  label: "Rejected",    color: "#ef4444",               icon: <MdClose size={14} /> },
  { key: "EXPIRED",   label: "Expired",     color: "#a855f7",               icon: <MdCalendarToday size={14} /> },
  { key: "REMOVED",   label: "Removed",     color: "#ef4444",               icon: <MdClose size={14} /> },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TenantManagement() {
  const [tenants, setTenants]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("ALL");

  // Filters
  const [search, setSearch]             = useState("");
  const [filterBlock, setFilterBlock]   = useState("ALL");

  // Modals
  const [detailTenant, setDetailTenant] = useState(null);
  const [rejectModal, setRejectModal]   = useState({ open: false, userId: null });
  const [rejectLoading, setRejectLoading] = useState(false);

  /* ── Load from new endpoint ── */
  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/tenant-history`);
      const payload = res.data;
      setTenants(Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
    } catch {
      toast.error("Failed to load tenant data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ── Derived filter options ── */
  const blocks = useMemo(() => {
    const set = new Set();
    tenants.forEach(t => { if (t.block_name) set.add(t.block_name); });
    return [...set].sort();
  }, [tenants]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return tenants.filter(t => {
      if (activeTab !== "ALL" && t.status_label !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          t.tenant_name?.toLowerCase().includes(q) ||
          t.tenant_email?.toLowerCase().includes(q) ||
          t.tenant_phone?.includes(q) ||
          t.flat_number?.toString().includes(q);
        if (!matches) return false;
      }
      if (filterBlock !== "ALL" && t.block_name !== filterBlock) return false;
      return true;
    });
  }, [tenants, activeTab, search, filterBlock]);

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => {
    const counts = { ALL: tenants.length };
    STATUS_TABS.forEach(tab => {
      if (tab.key !== "ALL") {
        counts[tab.key] = tenants.filter(t => t.status_label === tab.key).length;
      }
    });
    return counts;
  }, [tenants]);

  /* ── Actions ── */
  const handleApprove = async (userId) => {
    try {
      await API.put(`/admin/approve-resident/${userId}`);
      toast.success("Tenant approved!");
      setDetailTenant(null);
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
      setDetailTenant(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    } finally {
      setRejectLoading(false);
    }
  };

  /* ── Render ── */
  if (loading) return (
    <div className="flex items-center justify-center p-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>Loading tenants…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Tenant Management</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>View and manage all tenants across your society</p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition"
          style={{ color: "var(--text-secondary)", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
        >
          <MdRefresh size={15} /> Refresh
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {STATUS_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border"
              style={{
                background: isActive ? `${tab.color}15` : "var(--card-inner-bg)",
                color: isActive ? tab.color : "var(--text-secondary)",
                borderColor: isActive ? `${tab.color}30` : "var(--glass-border)",
              }}
            >
              {tab.icon}
              {tab.label}
              <span
                className="ml-1 px-1.5 py-0 rounded-full text-[10px] font-black"
                style={{ background: isActive ? `${tab.color}20` : "var(--glass-border)", color: isActive ? tab.color : "var(--text-secondary)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
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
        <FilterSelect
          icon={<MdHome size={13} />}
          value={filterBlock}
          onChange={setFilterBlock}
          options={[{ value: "ALL", label: "All Blocks" }, ...blocks.map(b => ({ value: b, label: `Block ${b}` }))]}
        />
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"
          style={{ background: "var(--card-inner-bg)", borderRadius: "20px", border: "1px solid var(--glass-border)" }}>
          <MdPeople size={40} className="text-blue-400/40" />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {activeTab === "ALL" ? "No tenants found" : `No ${activeTab.toLowerCase()} tenants`}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile Cards ── */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((t, i) => (
              <div
                key={t.tenant_id}
                className="animate-fadeIn rounded-2xl overflow-hidden cursor-pointer"
                style={{ animationDelay: `${i * 30}ms`, border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}
                onClick={() => setDetailTenant(t)}
              >
                <div className="p-4 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-base shrink-0">
                    {t.tenant_name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{t.tenant_name}</p>
                    <p className="truncate" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.tenant_email}</p>
                  </div>
                  <StatusBadge label={t.status_label} />
                </div>
                <div className="px-4 pb-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.flat_number ? `Flat ${t.flat_number}` : "—"}</span>
                    {t.block_name && <span> · Block {t.block_name}</span>}
                  </span>
                  {t.move_in_date && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>In: {formatDate(t.move_in_date)}</span>}
                  {t.move_out_date && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Out: {formatDate(t.move_out_date)}</span>}
                </div>
                {t.status_label === "PENDING" && (
                  <div className="p-4 pt-2.5 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailTenant(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl hover:bg-white/10 text-xs font-bold transition"
                      style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      <MdVisibility size={14} /> View
                    </button>
                    <button
                      onClick={() => setRejectModal({ open: true, userId: t.tenant_id })}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      <MdClose size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(t.tenant_id)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition"
                    >
                      <MdCheck size={14} /> Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
            <div
              className="grid font-black uppercase tracking-widest px-4 py-3"
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                background: "var(--card-inner-bg)",
                borderBottom: "1px solid var(--divider)",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr auto",
                gap: "12px",
              }}
            >
              <span>Tenant</span>
              <span>Flat / Block</span>
              <span>Status</span>
              <span>Move-In</span>
              <span>Lease End</span>
              <span>Approval</span>
              <span>Actions</span>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
              {filtered.map((t, i) => (
                <div
                  key={t.tenant_id}
                  className="grid items-center px-4 py-3 hover:bg-white/2 transition group cursor-pointer"
                  style={{
                    gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr auto",
                    gap: "12px",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--divider)" : "none",
                    background: i % 2 === 0 ? "var(--card-inner-bg)" : "transparent",
                  }}
                  onClick={() => setDetailTenant(t)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                      {t.tenant_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{t.tenant_name}</p>
                      <p className="truncate" style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.tenant_email}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t.flat_number ? `Flat ${t.flat_number}` : "—"}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.block_name ? `Block ${t.block_name}` : "—"}</p>
                  </div>

                  <StatusBadge label={t.status_label} />

                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatDate(t.move_in_date)}</p>

                  <div><LeaseChip date={t.move_out_date} /></div>

                  <StatusBadge label={t.approval_status || "—"} />

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      title="View Details"
                      onClick={() => setDetailTenant(t)}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
                      style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      <MdVisibility size={14} />
                    </button>
                    {t.status_label === "PENDING" && (
                      <>
                        <button
                          title="Reject"
                          onClick={() => setRejectModal({ open: true, userId: t.tenant_id })}
                          className="w-8 h-8 rounded-lg bg-red-500/8 text-red-400/60 hover:text-red-400 hover:bg-red-500/15 border border-red-500/10 flex items-center justify-center transition"
                        >
                          <MdClose size={14} />
                        </button>
                        <button
                          title="Approve"
                          onClick={() => handleApprove(t.tenant_id)}
                          className="w-8 h-8 rounded-lg bg-emerald-500/8 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 flex items-center justify-center transition"
                        >
                          <MdCheck size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 flex justify-between items-center"
              style={{ background: "var(--card-inner-bg)", borderTop: "1px solid var(--divider)" }}>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                Showing <span className="font-bold" style={{ color: "var(--text-primary)" }}>{filtered.length}</span> of{" "}
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{tenants.length}</span> tenants
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Click any row to view full details</p>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      <DetailModal
        tenant={detailTenant}
        onClose={() => setDetailTenant(null)}
        onApprove={handleApprove}
        onReject={(id) => { setRejectModal({ open: true, userId: id }); }}
        isPending={detailTenant?.status_label === "PENDING"}
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
