
import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdDelete, MdClose,
  MdDirectionsCar, MdTwoWheeler,
  MdOutlineInbox, MdCheckCircle,
  MdBlock, MdFilterList, MdSearch,
  MdLocalParking, MdWarning, MdPersonSearch,
  MdPendingActions, MdDone, MdRefresh,
  MdBusiness
} from "react-icons/md";
import { FaParking } from "react-icons/fa";

/* ── Debounce hook ── */
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Spinner ── */
function Spinner({ small = false }) {
  const s = small ? 13 : 20;
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
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">‹ Prev</button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`e-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">Next ›</button>
    </div>
  );
}

/* ── Status Badge (slot) ── */
function StatusBadge({ status, t }) {
  if (status === "AVAILABLE")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
        style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
        <MdCheckCircle size={11} /> {t("parkAvailable")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.22)" }}>
      <MdBlock size={11} /> {t("parkOccupied")}
    </span>
  );
}

/* ── Request Status Badge ── */
function ReqBadge({ status }) {
  const cfg = {
    PENDING: { label: "Pending", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.28)" },
    APPROVED: { label: "Approved", color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.28)" },
    REJECTED: { label: "Rejected", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.28)" },
  }[status] || { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.22)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Resident Entry Panel
═══════════════════════════════════════════ */
function ResidentEntryPanel({ slots, onCreated, t, societyId }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSlot, setSelectedSlot] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [submitError, setSubmitError] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/parking/unassigned-resident-vehicles");
      setVehicles(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handleCreate = async (vehicle) => {
    const slot = selectedSlot[vehicle.vehicle_id];
    if (!slot) return;
    setSubmitting(vehicle.vehicle_id);
    setSubmitError(prev => ({ ...prev, [vehicle.vehicle_id]: "" }));
    try {
      await API.post("/parking/resident-entry", {
        vehicle_id: vehicle.vehicle_id,
        vehicle_number: vehicle.vehicle_number,
        vehicle_type: vehicle.vehicle_type,
        resident_id: vehicle.resident_id,
        flat_id: vehicle.flat_id,
        assigned_spot: slot,
      });
      setSuccessMsg(`Slot ${slot} assigned to ${vehicle.vehicle_number} ✓`);
      setSelectedSlot(prev => ({ ...prev, [vehicle.vehicle_id]: "" }));
      setExpandedId(null);
      loadVehicles();
      onCreated();
    } catch (err) {
      setSubmitError(prev => ({
        ...prev,
        [vehicle.vehicle_id]: err?.response?.data?.message || "Failed to create entry",
      }));
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (vehicle) => {
    setRejecting(vehicle.vehicle_id);
    setSubmitError(prev => ({ ...prev, [vehicle.vehicle_id]: "" }));
    try {
      await API.post("/parking/admin-cancel-vehicle-request", {
        vehicle_number: vehicle.vehicle_number,
        vehicle_id: vehicle.vehicle_id,
      });
      setSuccessMsg(`Vehicle ${vehicle.vehicle_number} rejected and removed.`);
      setExpandedId(null);
      loadVehicles();
      onCreated();
    } catch (err) {
      setSubmitError(prev => ({
        ...prev,
        [vehicle.vehicle_id]: err?.response?.data?.message || "Failed to reject vehicle",
      }));
    } finally {
      setRejecting(null);
    }
  };

  const debouncedSearch = search.trim().toLowerCase();
  const filtered = vehicles.filter(v =>
    !debouncedSearch ||
    v.vehicle_number?.toLowerCase().includes(debouncedSearch) ||
    v.resident_name?.toLowerCase().includes(debouncedSearch) ||
    v.flat_number?.toLowerCase().includes(debouncedSearch)
  );

      {societyId === "ALL" && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl text-xs font-bold bg-amber-500/5 text-amber-500/80 border border-amber-500/20">
          <MdWarning size={14} /> You are in View-Only mode. Select a specific society to assign slots.
        </div>
      )}

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.22)" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🏠</span>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)", margin: 0 }}>
            Resident Vehicle Entry
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", margin: 0 }}>
            All resident vehicles without an assigned parking slot are listed below.
            Assign a slot or reject the vehicle registration.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
          <MdCheckCircle size={15} /> {successMsg}
          <button onClick={() => setSuccessMsg("")}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            <MdClose size={13} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <input
            className="input h-10 w-full text-sm"
            style={{ paddingLeft: 34 }}
            placeholder="Search by vehicle number, resident, or flat…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              <MdClose size={13} />
            </button>
          )}
        </div>
        <button onClick={loadVehicles}
          className="flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold shrink-0"
          style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>
          <MdRefresh size={14} /> Refresh
        </button>
      </div>

      {!loading && (
        <p className="text-xs text-secondary">
          {filtered.length} unassigned vehicle{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14 text-secondary">
          <Spinner />
          <p className="text-sm">Loading unassigned vehicles…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdOutlineInbox size={44} className="opacity-20" />
          <p className="text-sm font-semibold">
            {search ? `No vehicles match "${search}"` : "All resident vehicles have a slot assigned 🎉"}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-accent hover:underline mt-1">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(vehicle => {
            const isExpanded = expandedId === vehicle.vehicle_id;
            const availSlots = slots.filter(s => s.status === "AVAILABLE" && s.vehicle_type === vehicle.vehicle_type);
            const chosenSlot = selectedSlot[vehicle.vehicle_id] || "";
            const isSubmitting = submitting === vehicle.vehicle_id;
            const isRejecting = rejecting === vehicle.vehicle_id;
            const errMsg = submitError[vehicle.vehicle_id];

            return (
              <div key={vehicle.vehicle_id}
                className="bg-card rounded-2xl overflow-hidden transition-all"
                style={{ border: isExpanded ? "1.5px solid rgba(251,191,36,0.30)" : "1.5px solid var(--glass-border)" }}>

                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={vehicle.vehicle_type === "CAR"
                        ? { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)" }
                        : { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)" }}>
                      {vehicle.vehicle_type === "CAR"
                        ? <MdDirectionsCar size={18} style={{ color: "#60a5fa" }} />
                        : <MdTwoWheeler size={18} style={{ color: "#a78bfa" }} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm"
                        style={{ fontFamily: "monospace", letterSpacing: "0.05em", margin: 0 }}>
                        {vehicle.vehicle_number}
                        {vehicle.vehicle_name && vehicle.vehicle_name !== vehicle.vehicle_number && (
                          <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-secondary)", fontFamily: "inherit" }}>
                            {vehicle.vehicle_name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">
                        {vehicle.resident_name}
                        {vehicle.flat_number && <> · Flat {vehicle.flat_number}</>}
                        <span className="ml-1.5 font-bold"
                          style={{ color: vehicle.vehicle_type === "CAR" ? "#60a5fa" : "#a78bfa" }}>
                          {vehicle.vehicle_type}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(248,113,113,0.10)", color: "#f87171", border: "1px solid rgba(248,113,113,0.22)" }}>
                      <MdWarning size={11} /> No slot
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : vehicle.vehicle_id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{
                        background: isExpanded ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                        border: "1px solid var(--glass-border)",
                        color: isExpanded ? "#fbbf24" : "var(--text-secondary)",
                        fontWeight: 700, fontSize: 16, cursor: "pointer",
                      }}>
                      {isExpanded ? "−" : "+"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 animate-fadeIn">
                    <div className="p-3.5 rounded-xl space-y-3"
                      style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", border: "1px solid var(--glass-border)" }}>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
                          style={{ color: "var(--text-secondary)" }}>
                          Assign a Free {vehicle.vehicle_type} Slot
                          {availSlots.length === 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ color: "#f87171", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.22)" }}>
                              <MdWarning size={11} /> No {vehicle.vehicle_type} slots available
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <MdLocalParking size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
                          <select
                            className="input h-10 w-full text-sm font-semibold"
                            style={{ paddingLeft: 32 }}
                            value={chosenSlot}
                            onChange={e => setSelectedSlot(prev => ({ ...prev, [vehicle.vehicle_id]: e.target.value }))}
                            disabled={availSlots.length === 0}>
                            <option value="">Select slot…</option>
                            {availSlots.map(s => (
                              <option key={s.id} value={s.slot_number}>
                                {s.slot_number}{s.parking_floor ? ` · Level ${s.parking_floor}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {chosenSlot && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 11, color: "#4ade80" }}>
                          ✓ Slot <strong>{chosenSlot}</strong> will be assigned to{" "}
                          <strong>{vehicle.vehicle_number}</strong> (Flat {vehicle.flat_number}).
                        </div>
                      )}

                      {errMsg && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.28)", color: "#f87171" }}>
                          <MdWarning size={13} /> {errMsg}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreate(vehicle)}
                          disabled={!chosenSlot || isSubmitting || isRejecting}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", boxShadow: "0 3px 12px rgba(22,163,74,0.25)" }}>
                          {isSubmitting ? <Spinner small /> : <MdAdd size={15} />}
                          {isSubmitting ? "Assigning…" : "Assign Slot"}
                        </button>
                        <button
                          onClick={() => handleReject(vehicle)}
                          disabled={isRejecting || isSubmitting}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                          {isRejecting ? <Spinner small /> : <MdBlock size={14} />}
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Extra Slot Requests Panel
═══════════════════════════════════════════ */
function ResidentRequestsPanel({ allSlots, onSlotAssigned, societyId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("PENDING");
  const [assigning, setAssigning] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/parking?parking_type=RESIDENT&limit=100&filter=ALL");
      setRequests(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handleAssign = async (reqId) => {
    const slot = selectedSlot[reqId];
    if (!slot) return;
    setAssigning(reqId);
    setErrorMsg("");
    try {
      await API.put(`/parking/${reqId}/admin-assign`, { assigned_spot: slot });
      setSuccessMsg(`Slot ${slot} assigned! Resident notified.`);
      setSelectedSlot(prev => ({ ...prev, [reqId]: "" }));
      setExpandedId(null);
      loadRequests();
      onSlotAssigned();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to assign slot");
    } finally {
      setAssigning(null);
    }
  };

  const handleReject = async (reqId) => {
    setRejecting(reqId);
    setErrorMsg("");
    try {
      await API.put(`/parking/${reqId}/admin-reject`);
      setSuccessMsg("Request rejected.");
      loadRequests();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to reject");
    } finally {
      setRejecting(null);
    }
  };

  const filtered = requests.filter(r => filterTab === "ALL" ? true : r.status === filterTab);
  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
  };

  const TABS = [
    { key: "PENDING", label: "Pending", color: "#fbbf24" },
    { key: "APPROVED", label: "Approved", color: "#4ade80" },
    { key: "REJECTED", label: "Rejected", color: "#f87171" },
    { key: "ALL", label: "All", color: "#94a3b8" },
  ];

      {societyId === "ALL" && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl text-xs font-bold bg-amber-500/5 text-amber-500/80 border border-amber-500/20">
          <MdWarning size={14} /> You are in View-Only mode. Select a specific society to approve/reject requests.
        </div>
      )}

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(99,102,241,0.08)", border: "1.5px solid rgba(99,102,241,0.22)" }}>
        <MdPendingActions style={{ color: "#818cf8", fontSize: 20, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)", margin: 0 }}>Extra Parking Slot Requests</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            Residents who had no pre-assigned slots can request extra spots here.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
          <MdCheckCircle size={15} /> {successMsg}
          <button onClick={() => setSuccessMsg("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><MdClose size={13} /></button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.28)", color: "#f87171" }}>
          <MdWarning size={15} /> {errorMsg}
          <button onClick={() => setErrorMsg("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><MdClose size={13} /></button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterTab === tab.key
              ? { background: `${tab.color}22`, color: tab.color, border: `1px solid ${tab.color}55` }
              : { background: "var(--card-inner-bg,rgba(0,0,0,0.04))", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
            {tab.label} <span style={{ opacity: 0.7 }}>({counts[tab.key]})</span>
          </button>
        ))}
        <button onClick={loadRequests} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ml-auto"
          style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
          <MdRefresh size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14 text-secondary">
          <Spinner /> <p className="text-sm">Loading extra slot requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdOutlineInbox size={44} className="opacity-20" />
          <p className="text-sm font-semibold">No {filterTab.toLowerCase()} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isExpanded = expandedId === req.id;
            const isPending = req.status === "PENDING";
            const availSlots = allSlots.filter(s => s.status === "AVAILABLE" && s.vehicle_type === req.vehicle_type);

            return (
              <div key={req.id} className="bg-card rounded-2xl overflow-hidden transition-all"
                style={{ border: isPending ? "1.5px solid rgba(251,191,36,0.25)" : "1.5px solid var(--glass-border)" }}>

                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={req.vehicle_type === "CAR"
                        ? { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)" }
                        : { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)" }}>
                      {req.vehicle_type === "CAR"
                        ? <MdDirectionsCar size={18} style={{ color: "#60a5fa" }} />
                        : <MdTwoWheeler size={18} style={{ color: "#a78bfa" }} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm" style={{ fontFamily: "monospace", letterSpacing: "0.05em", margin: 0 }}>
                          {req.vehicle_number}
                        </p>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">EXTRA</span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {req.guest_name} {req.Flat?.flat_number && <>· Flat {req.Flat.flat_number}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ReqBadge status={req.status} />
                    {isPending && (
                      <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                        style={{ background: isExpanded ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: isExpanded ? "#818cf8" : "var(--text-secondary)", fontWeight: 700, fontSize: 16 }}>
                        {isExpanded ? "−" : "+"}
                      </button>
                    )}
                  </div>
                </div>

                {isPending && isExpanded && (
                  <div className="px-4 pb-4 pt-0 animate-fadeIn">
                    <div className="p-3.5 rounded-xl space-y-3"
                      style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", border: "1px solid var(--glass-border)" }}>
                      <div>
                        <label className="text-xs font-bold uppercase mb-1.5 block text-secondary">Assign a Free {req.vehicle_type} Slot</label>
                        <select className="input h-10 w-full text-sm font-semibold"
                          value={selectedSlot[req.id] || ""}
                          onChange={e => setSelectedSlot(prev => ({ ...prev, [req.id]: e.target.value }))}
                          disabled={availSlots.length === 0}>
                          <option value="">Select slot…</option>
                          {availSlots.map(s => (
                            <option key={s.id} value={s.slot_number}>{s.slot_number}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAssign(req.id)}
                          disabled={!selectedSlot[req.id] || assigning === req.id}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none" }}>
                          {assigning === req.id ? <Spinner small /> : "Assign & Notify"}
                        </button>
                        <button onClick={() => handleReject(req.id)}
                          disabled={rejecting === req.id}
                          className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20 disabled:opacity-40">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const LIMIT = 10;

export default function SuperAdminParking() {
  const { t } = useLang();
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(() => {
    return localStorage.getItem("superadmin_society_filter") || "ALL";
  });

  const [mainTab, setMainTab] = useState("slots");

  /* Slots list */
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState({ total: 0, cars: 0, bikes: 0, available: 0, occupied: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* Filters */
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  /* Create form */
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ prefix: "", start_number: "", count: "", vehicle_type: "CAR", parking_floor: "P1" });

  /* Delete */
  const [deleting, setDeleting] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  /* All slots for sub-panel pickers */
  const [allSlots, setAllSlots] = useState([]);

  /* Pending extra request count for badge */
  const [pendingResidentCount, setPendingResidentCount] = useState(0);

  const loadSocieties = useCallback(async () => {
    try {
      const res = await API.get("/societies");
      setSocieties(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadAllSlots = useCallback(async () => {
    if (!selectedSocietyId || selectedSocietyId === "ALL") {
      setAllSlots([]);
      return;
    }
    try {
      const res = await API.get("/parking-slots?limit=200");
      const d = res.data;
      setAllSlots(Array.isArray(d) ? d : d?.data || []);
    } catch (e) { console.error(e); }
  }, [selectedSocietyId]);

  const loadSlots = useCallback(async (pageNum, vFilter, currentSearch, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: LIMIT,
        ...(vFilter !== "ALL" ? { vehicle_type: vFilter } : {}),
        ...(currentSearch ? { search: currentSearch } : {}),
      });
      // Headers will be added by API interceptor based on selectedSocietyId in localStorage
      const res = await API.get(`/parking-slots?${params}`);
      setSlots(res.data.data || []);
      setStats(res.data.stats || { total: 0, cars: 0, bikes: 0, available: 0, occupied: 0 });
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);
      setPage(pageNum);
    } catch (e) { 
      console.error(e);
      setSlots([]);
      setStats({ total: 0, cars: 0, bikes: 0, available: 0, occupied: 0 });
    }
    finally { setInitialLoad(false); setFetching(false); }
  }, []);

  const loadPendingResidentCount = useCallback(async () => {
    if (!selectedSocietyId || selectedSocietyId === "ALL") {
      setPendingResidentCount(0);
      return;
    }
    try {
      const res = await API.get("/parking?parking_type=RESIDENT&filter=PENDING&limit=1");
      setPendingResidentCount(res.data?.counts?.PENDING || 0);
    } catch (e) { /* silent */ }
  }, [selectedSocietyId]);

  useEffect(() => {
    loadSocieties();
  }, [loadSocieties]);

  useEffect(() => {
    loadSlots(1, "ALL", "", true);
    loadAllSlots();
    loadPendingResidentCount();
  }, [selectedSocietyId, loadSlots, loadAllSlots, loadPendingResidentCount]);

  useEffect(() => {
    if (initialLoad) return;
    loadSlots(1, vehicleFilter, debouncedSearch);
  }, [debouncedSearch, vehicleFilter]);

  const handleSocietyChange = (e) => {
    const id = e.target.value;
    setSelectedSocietyId(id);
    localStorage.setItem("superadmin_society_filter", id);
    // Reload data will be triggered by useEffect
  };

  const handlePageChange = (p) => loadSlots(p, vehicleFilter, debouncedSearch);
  const handleFilterChange = (key) => setVehicleFilter(key);

  const refreshAll = () => {
    loadAllSlots();
    loadSlots(page, vehicleFilter, debouncedSearch);
    loadPendingResidentCount();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSocietyId === "ALL") return;
    setSubmitting(true);
    try {
      await API.post("/parking-slots", form);
      setForm({ prefix: "", start_number: "", count: "", vehicle_type: "CAR", parking_floor: "P1" });
      setShowForm(false);
      refreshAll();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const deleteSlot = async (id) => {
    setDeleting(id);
    try {
      await API.delete(`/parking-slots/${id}`);
      setConfirmDel(null);
      const newPage = slots.length === 1 && page > 1 ? page - 1 : page;
      loadSlots(newPage, vehicleFilter, debouncedSearch);
      loadAllSlots();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const filterTabs = [
    { key: "ALL", label: t("parkTabAll") || "All", icon: <FaParking size={12} />, count: stats.total },
    { key: "CAR", label: t("parkTabCars") || "Cars", icon: <MdDirectionsCar size={14} />, count: stats.cars },
    { key: "BIKE", label: t("parkTabBikes") || "Bikes", icon: <MdTwoWheeler size={14} />, count: stats.bikes },
  ];

  const mainTabs = [
    { key: "slots", label: "Parking Slots", icon: <FaParking size={13} /> },
    { key: "resident-entry", label: "Resident Entry", icon: <span style={{ fontSize: 14 }}>🏠</span> },
    { key: "resident-requests", label: "Extra Slot Requests", icon: <MdPendingActions size={14} /> },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <FaParking size={18} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Global Parking Management</h2>
            <p className="text-secondary text-xs mt-0.5">Manage parking across all societies</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sectional Society Filter */}
          <div className="relative min-w-48">
            <MdBusiness size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select
              className="input h-10 w-full pl-9 pr-8 text-xs font-bold appearance-none bg-card"
              value={selectedSocietyId}
              onChange={handleSocietyChange}
              style={{ border: "1.5px solid var(--accent-alpha,rgba(99,102,241,0.25))" }}>
              <option value="ALL">All Societies (View Only)</option>
              {societies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {mainTab === "slots" && selectedSocietyId !== "ALL" && (
            <button onClick={() => { setShowForm(p => !p); setConfirmDel(null); }} className="btn-primary shrink-0 flex items-center gap-2">
              {showForm ? <MdClose size={17} /> : <MdAdd size={17} />}
              {showForm ? "Close" : "Create Slots"}
            </button>
          )}
        </div>
      </div>

      {/* Warning if no society selected */}
      {selectedSocietyId === "ALL" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500/80 animate-fadeIn">
          <MdWarning size={20} className="shrink-0" />
          <p className="text-sm font-medium">Viewing global stats. Select a specific society to enable management actions like creating slots or assigning resident entries.</p>
        </div>
      )}

      {/* Main Tab Switcher */}
      <div className="flex gap-1.5 p-1.5 rounded-xl w-fit flex-wrap"
        style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.05))", border: "1.5px solid var(--glass-border,rgba(255,255,255,0.08))" }}>
        {mainTabs.map(tab => (
          <button key={tab.key} onClick={() => { setMainTab(tab.key); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative"
            style={mainTab === tab.key
              ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.35)" }
              : { background: "transparent", color: "var(--text-secondary)", border: "1px solid transparent" }}>
            {tab.icon}
            {tab.label}
            {tab.key === "resident-requests" && pendingResidentCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 flex items-center justify-center rounded-full text-[10px] font-black text-white"
                style={{ background: "#ef4444", padding: "0 4px" }}>
                {pendingResidentCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === "resident-entry" && (
        <ResidentEntryPanel
          slots={allSlots}
          onCreated={refreshAll}
          t={t}
          societyId={selectedSocietyId}
        />
      )}

      {mainTab === "resident-requests" && (
        <ResidentRequestsPanel
          allSlots={allSlots}
          onSlotAssigned={refreshAll}
          societyId={selectedSocietyId}
        />
      )}

      {mainTab === "slots" && (
        <>
          {!initialLoad && stats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
              {[
                { label: "Total Slots", val: stats.total, color: "text-pink-500", bg: "bg-pink-500/5 border-pink-500/10" },
                { label: "Car Spots", val: stats.cars, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: "Bike Spots", val: stats.bikes, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                { label: "Available", val: stats.available, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3.5 animate-scaleIn flex flex-col justify-between min-h-18 ${s.bg}`}>
                  <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.val}</p>
                  <p className="text-[11px] text-secondary mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {showForm && selectedSocietyId !== "ALL" && (
            <div className="bg-card p-5 rounded-2xl animate-scaleIn border border-accent/20">
              <div className="flex items-center gap-2 mb-4">
                <MdAdd size={16} className="text-accent" />
                <h3 className="font-semibold text-sm">Generate Multiple Slots</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">Floor / Level</label>
                    <input className="input h-10 w-full" placeholder="e.g. P1" required
                      value={form.parking_floor} onChange={e => setForm({ ...form, parking_floor: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">Prefix</label>
                    <input className="input h-10 w-full" placeholder="e.g. A" required
                      value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">Start Number</label>
                    <input type="number" className="input h-10 w-full" placeholder="101" required
                      value={form.start_number} onChange={e => setForm({ ...form, start_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">Count</label>
                    <input type="number" className="input h-10 w-full" placeholder="10" required
                      value={form.count} onChange={e => setForm({ ...form, count: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">Type</label>
                    <select className="input h-11 w-full" value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}>
                      <option value="CAR">Car</option>
                      <option value="BIKE">Bike</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? <Spinner small /> : "Create Slots"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-card rounded-2xl overflow-hidden border border-glass-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-divider">
              <div className="flex items-center gap-2 flex-wrap">
                <MdFilterList size={16} className="text-secondary shrink-0" />
                {filterTabs.map(tab => (
                  <button key={tab.key} onClick={() => handleFilterChange(tab.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={vehicleFilter === tab.key
                      ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.35)" }
                      : { background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
                    {tab.icon} {tab.label} <span className="opacity-55">({tab.count})</span>
                  </button>
                ))}
              </div>
              <div className="relative" style={{ width: 220 }}>
                <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                <input className="input h-9 pl-9 pr-8 text-xs w-full"
                  placeholder="Search slot number…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {fetching ? <Spinner small /> : search ? <button onClick={() => setSearch("")}><MdClose size={13} /></button> : null}
                </div>
              </div>
            </div>

            {initialLoad ? (
              <div className="py-20 flex flex-col items-center gap-3 text-secondary"><Spinner /><p className="text-sm">Loading slots…</p></div>
            ) : slots.length === 0 ? (
              <div className="py-24 flex flex-col items-center gap-2 text-secondary opacity-50">
                <MdOutlineInbox size={48} />
                <p className="text-sm">No parking slots found.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-black/5 text-secondary text-[11px] uppercase tracking-wider font-bold">
                        <th className="px-6 py-4">Slot Number</th>
                        <th className="px-6 py-4">Vehicle Type</th>
                        <th className="px-6 py-4">Floor/Level</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {slots.map(slot => (
                        <tr key={slot.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold">{slot.slot_number}</td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-2">
                              {slot.vehicle_type === "CAR" ? <MdDirectionsCar className="text-blue-400" /> : <MdTwoWheeler className="text-purple-400" />}
                              {slot.vehicle_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-secondary">{slot.parking_floor || "—"}</td>
                          <td className="px-6 py-4"><StatusBadge status={slot.status} t={t} /></td>
                          <td className="px-6 py-4 text-right">
                            {selectedSocietyId !== "ALL" && (
                              confirmDel === slot.id ? (
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => deleteSlot(slot.id)} className="text-red-400 font-bold px-2 py-1 bg-red-500/10 rounded">Delete</button>
                                  <button onClick={() => setConfirmDel(null)} className="text-secondary px-2 py-1">Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setConfirmDel(slot.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><MdDelete size={18} /></button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-divider flex flex-col items-center gap-3">
                  <p className="text-xs text-secondary">Showing {slots.length} of {totalItems} slots</p>
                  <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
