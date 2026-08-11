
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
} from "react-icons/md";
import { FaParking } from "react-icons/fa";
import Select from "../../components/common/Select";

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
  }[status] || { label: status, color: "#A39EB2", bg: "rgba(163,158,178,0.10)", border: "rgba(163,158,178,0.22)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Resident Entry Panel
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   Resident Entry Panel  (no lookup — shows all unassigned vehicles)
═══════════════════════════════════════════ */
function ResidentEntryPanel({ slots, onCreated, t }) {
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

  /* ── Reject: cancel pending request + delete the vehicle ── */
  const handleReject = async (vehicle) => {
    setRejecting(vehicle.vehicle_id);
    setSubmitError(prev => ({ ...prev, [vehicle.vehicle_id]: "" }));
    try {
      /* 1. Cancel the PENDING parking request for this vehicle */
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

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Info banner */}
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

      {/* Feedback */}
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

      {/* Search + refresh */}
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

      {/* Body */}
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

                {/* Card header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={vehicle.vehicle_type === "CAR"
                        ? { background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.22)" }
                        : { background: "rgba(107,70,193,0.12)", border: "1px solid rgba(107,70,193,0.22)" }}>
                      {vehicle.vehicle_type === "CAR"
                        ? <MdDirectionsCar size={18} style={{ color: "#94B5F5" }} />
                        : <MdTwoWheeler size={18} style={{ color: "#9F87D7" }} />}
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
                          style={{ color: vehicle.vehicle_type === "CAR" ? "#94B5F5" : "#9F87D7" }}>
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

                {/* Expanded action panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 animate-fadeIn">
                    <div className="p-3.5 rounded-xl space-y-3"
                      style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", border: "1px solid var(--glass-border)" }}>

                      {/* Slot selector */}
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
                            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: "var(--text-secondary)" }} />
                          <Select
                            className="input h-10 w-full"
                            style={{ paddingLeft: 32, fontSize: 13, fontWeight: 600 }}
                            value={chosenSlot}
                            onChange={e => setSelectedSlot(prev => ({ ...prev, [vehicle.vehicle_id]: e.target.value }))}
                            disabled={availSlots.length === 0}>
                            <option value="">Select slot…</option>
                            {availSlots.map(s => (
                              <option key={s.id} value={s.slot_number}>
                                {s.slot_number}{s.parking_floor ? ` · Level ${s.parking_floor}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {/* Confirmation hint */}
                      {chosenSlot && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 11, color: "#4ade80" }}>
                          ✓ Slot <strong>{chosenSlot}</strong> will be assigned to{" "}
                          <strong>{vehicle.vehicle_number}</strong> (Flat {vehicle.flat_number}).
                        </div>
                      )}

                      {/* Error */}
                      {errMsg && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.28)", color: "#f87171" }}>
                          <MdWarning size={13} /> {errMsg}
                        </div>
                      )}

                      {/* Reject info note */}
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", fontSize: 11, color: "#f87171" }}>
                        ⚠️ Rejecting will cancel the parking request and remove this vehicle registration.
                        The resident will be notified.
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {/* Assign */}
                        <button
                          onClick={() => handleCreate(vehicle)}
                          disabled={!chosenSlot || isSubmitting || isRejecting}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", boxShadow: "0 3px 12px rgba(22,163,74,0.25)" }}>
                          {isSubmitting ? <Spinner small /> : <MdAdd size={15} />}
                          {isSubmitting ? "Assigning…" : "Assign Slot"}
                        </button>

                        {/* Reject */}
                        <button
                          onClick={() => handleReject(vehicle)}
                          disabled={isRejecting || isSubmitting}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                          {isRejecting ? <Spinner small /> : <MdBlock size={14} />}
                          {isRejecting ? "Rejecting…" : "Reject"}
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
   Shows only RESIDENT parking_type requests — these are overflow/extra
   slot requests from residents who had no free pre-assigned slot.
   Slots assigned at creation time go directly to ParkingSlot.flat_id
   and never create a ParkingRequest, so they never appear here.
═══════════════════════════════════════════ */
function ResidentRequestsPanel({ allSlots, onSlotAssigned }) {
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
      setSuccessMsg(`Slot ${slot} assigned! Resident has been notified and their vehicle is now linked.`);
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
      // Change this one line in handleReject:
      await API.put(`/parking/${reqId}/admin-reject`);  // was: /parking/${reqId}/reject;
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
    { key: "ALL", label: "All", color: "#A39EB2" },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(107,70,193,0.08)", border: "1.5px solid rgba(107,70,193,0.22)" }}>
        <MdPendingActions style={{ color: "#9F87D7", fontSize: 20, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)", margin: 0 }}>Extra Parking Slot Requests</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            These requests come from residents who added a vehicle but had <strong>no free pre-assigned slot</strong> available
            for their flat — either all slots were occupied, or no slot was assigned for that vehicle type.
            Assign a free available slot to approve. The slot will be permanently linked to the resident's flat and vehicle.
          </p>
          <p className="text-xs mt-1.5" style={{ color: "#9F87D7", margin: 0, fontWeight: 600 }}>
            ℹ️ Slots assigned at resident creation go directly to the flat and do NOT appear here.
          </p>
        </div>
      </div>

      {/* Feedback */}
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

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterTab === tab.key
              ? { background: `${tab.color}22`, color: tab.color, border: `1px solid ${tab.color}55` }
              : { background: "var(--card-inner-bg,rgba(0,0,0,0.04))", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
            {tab.label}
            <span style={{ opacity: 0.7 }}>({counts[tab.key]})</span>
          </button>
        ))}
        <button onClick={loadRequests} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ml-auto"
          style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
          <MdRefresh size={13} /> Refresh
        </button>
      </div>

      {/* Request list */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14 text-secondary">
          <Spinner /> <p className="text-sm">Loading extra slot requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdOutlineInbox size={44} className="opacity-20" />
          <p className="text-sm font-semibold">
            {filterTab === "PENDING" ? "No pending extra slot requests 🎉" : `No ${filterTab.toLowerCase()} requests`}
          </p>
          {filterTab === "PENDING" && (
            <p className="text-xs text-secondary text-center" style={{ maxWidth: 300, lineHeight: 1.5 }}>
              Requests appear here only when a resident adds a vehicle but their flat has no free pre-assigned slot.
            </p>
          )}
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

                {/* Card header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={req.vehicle_type === "CAR"
                        ? { background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.22)" }
                        : { background: "rgba(107,70,193,0.12)", border: "1px solid rgba(107,70,193,0.22)" }}>
                      {req.vehicle_type === "CAR"
                        ? <MdDirectionsCar size={18} style={{ color: "#94B5F5" }} />
                        : <MdTwoWheeler size={18} style={{ color: "#9F87D7" }} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p className="font-bold text-sm" style={{ fontFamily: "monospace", letterSpacing: "0.05em", margin: 0 }}>
                          {req.vehicle_number}
                        </p>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.22)" }}>
                          EXTRA
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {req.guest_name}
                        {req.Flat?.flat_number && <> · Flat {req.Flat.flat_number}</>}
                        {req.resident?.name && <> · {req.resident.name}</>}
                        <span className="ml-1.5 font-bold" style={{ color: req.vehicle_type === "CAR" ? "#94B5F5" : "#9F87D7" }}>
                          {req.vehicle_type}
                        </span>
                      </p>
                      <p className="text-xs text-secondary" style={{ marginTop: 2, opacity: 0.55 }}>
                        Requested {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ReqBadge status={req.status} />
                    {req.assigned_spot && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                        <MdLocalParking size={11} /> {req.assigned_spot}
                      </span>
                    )}
                    {isPending && (
                      <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                        style={{ background: isExpanded ? "rgba(107,70,193,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: isExpanded ? "#9F87D7" : "var(--text-secondary)", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                        {isExpanded ? "−" : "+"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Assign panel */}
                {isPending && isExpanded && (
                  <div className="px-4 pb-4 pt-0 animate-fadeIn">
                    <div className="p-3.5 rounded-xl space-y-3"
                      style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.04))", border: "1px solid var(--glass-border)" }}>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
                          style={{ color: "var(--text-secondary)" }}>
                          Assign a Free {req.vehicle_type} Slot
                          {availSlots.length === 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ color: "#f87171", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.22)" }}>
                              <MdWarning size={11} /> No {req.vehicle_type} slots available
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <MdLocalParking size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
                          <Select className="input h-10 w-full" style={{ paddingLeft: 32, fontSize: 13, fontWeight: 600 }}
                            value={selectedSlot[req.id] || ""}
                            onChange={e => setSelectedSlot(prev => ({ ...prev, [req.id]: e.target.value }))}
                            disabled={availSlots.length === 0}>
                            <option value="">Select slot…</option>
                            {availSlots.map(s => (
                              <option key={s.id} value={s.slot_number}>
                                {s.slot_number}{s.parking_floor ? ` · Level ${s.parking_floor}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {selectedSlot[req.id] && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 11, color: "#4ade80" }}>
                          ✓ Slot <strong>{selectedSlot[req.id]}</strong> will be permanently assigned to this flat
                          and linked to vehicle <strong>{req.vehicle_number}</strong>.
                          The resident will see it immediately in their parking dashboard.
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => handleAssign(req.id)}
                          disabled={!selectedSlot[req.id] || assigning === req.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", boxShadow: "0 3px 12px rgba(22,163,74,0.25)" }}>
                          {assigning === req.id ? <Spinner small /> : <MdDone size={15} />}
                          {assigning === req.id ? "Assigning…" : "Assign Slot & Notify Resident"}
                        </button>
                        <button onClick={() => handleReject(req.id)}
                          disabled={rejecting === req.id}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
                          {rejecting === req.id ? <Spinner small /> : <MdBlock size={14} />}
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approved footer */}
                {req.status === "APPROVED" && req.assigned_spot && (
                  <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold"
                    style={{ borderTop: "1px solid rgba(74,222,128,0.15)", color: "#4ade80", background: "rgba(74,222,128,0.04)" }}>
                    <MdCheckCircle size={13} />
                    Slot {req.assigned_spot} permanently assigned — vehicle {req.vehicle_number} is now linked.
                  </div>
                )}

                {/* Rejected footer */}
                {req.status === "REJECTED" && (
                  <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold"
                    style={{ borderTop: "1px solid rgba(248,113,113,0.15)", color: "#f87171", background: "rgba(248,113,113,0.04)" }}>
                    <MdBlock size={13} /> Request rejected. Resident was notified.
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

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function AssignParkingSlot() {
  const { t } = useLang();

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

  /* ────────────────────────────
     LOADERS
  ──────────────────────────── */
  const loadAllSlots = useCallback(async () => {
    try {
      const res = await API.get("/parking-slots?limit=200");
      const d = res.data;
      setAllSlots(Array.isArray(d) ? d : d?.data || []);
    } catch (e) { console.error(e); }
  }, []);

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
      const res = await API.get(`/parking-slots?${params}`);
      setSlots(res.data.data || []);
      setStats(res.data.stats || { total: 0, cars: 0, bikes: 0, available: 0, occupied: 0 });
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setInitialLoad(false); setFetching(false); }
  }, []);

  const loadPendingResidentCount = useCallback(async () => {
    try {
      const res = await API.get("/parking?parking_type=RESIDENT&filter=PENDING&limit=1");
      setPendingResidentCount(res.data?.counts?.PENDING || 0);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    loadSlots(1, "ALL", "", true);
    loadAllSlots();
    loadPendingResidentCount();
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadSlots(1, vehicleFilter, debouncedSearch);
  }, [debouncedSearch, vehicleFilter]);

  const handlePageChange = (p) => loadSlots(p, vehicleFilter, debouncedSearch);
  const handleFilterChange = (key) => setVehicleFilter(key);

  const refreshAll = () => {
    loadAllSlots();
    loadSlots(page, vehicleFilter, debouncedSearch);
    loadPendingResidentCount();
  };

  /* ────────────────────────────
     CREATE SLOTS
  ──────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/parking-slots", form);
      setForm({ prefix: "", start_number: "", count: "", vehicle_type: "CAR", parking_floor: "P1" });
      setShowForm(false);
      loadSlots(1, vehicleFilter, debouncedSearch);
      loadAllSlots();
      loadPendingResidentCount();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  /* ────────────────────────────
     DELETE SLOT
  ──────────────────────────── */
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

  /* ────────────────────────────
     RENDER
  ──────────────────────────── */
  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.25)" }}>
            <FaParking size={18} style={{ color: "#94B5F5" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("parkTitle") || "Parking Slots"}</h2>
            <p className="text-secondary text-xs mt-0.5">{t("parkSubtitle") || "Manage society parking areas"}</p>
          </div>
        </div>
        {mainTab === "slots" && (
          <button onClick={() => { setShowForm(p => !p); setConfirmDel(null); }} className="btn-primary shrink-0 flex items-center gap-2">
            {showForm ? <MdClose size={17} /> : <MdAdd size={17} />}
            {showForm ? (t("parkCloseBtn") || "Close") : (t("parkCreateBtn") || "Create Slots")}
          </button>
        )}
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-1.5 p-1.5 rounded-xl w-fit flex-wrap"
        style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.05))", border: "1.5px solid var(--glass-border,rgba(255,255,255,0.08))" }}>
        {mainTabs.map(tab => (
          <button key={tab.key} onClick={() => { setMainTab(tab.key); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative"
            style={mainTab === tab.key
              ? tab.key === "resident-entry"
                ? { background: "linear-gradient(135deg,#92400e,#d97706)", color: "#fff", boxShadow: "0 3px 12px rgba(217,119,6,0.30)", border: "none" }
                : tab.key === "resident-requests"
                  ? { background: "linear-gradient(135deg,#493083,#6B46C1)", color: "#fff", boxShadow: "0 3px 12px rgba(107,70,193,0.30)", border: "none" }
                  : { background: "rgba(91,141,239,0.15)", color: "#94B5F5", border: "1px solid rgba(91,141,239,0.35)" }
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

      {/* TAB: RESIDENT ENTRY */}
      {mainTab === "resident-entry" && (
        <ResidentEntryPanel
          slots={allSlots}
          onCreated={refreshAll}
          t={t}
        />
      )}

      {/* TAB: EXTRA SLOT REQUESTS */}
      {mainTab === "resident-requests" && (
        <ResidentRequestsPanel
          allSlots={allSlots}
          onSlotAssigned={refreshAll}
        />
      )}

      {/* TAB: PARKING SLOTS */}
      {mainTab === "slots" && (
        <>
          {/* Stats strip */}
          {!initialLoad && stats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
              {[
                { label: t("parkStatAll") || "Total Slots", val: stats.total, color: "text-pink-500", bg: "bg-pink-500/5 border-pink-500/10" },
                { label: t("parkTabCars") || "Car Spots", val: stats.cars, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: t("parkTabBikes") || "Bike Spots", val: stats.bikes, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                { label: t("parkAvailable") || "Available", val: stats.available, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3.5 animate-scaleIn flex flex-col justify-between min-h-18 ${s.bg}`}>
                  <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.val}</p>
                  <p className="text-[11px] text-secondary mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <div className="bg-card p-4 sm:p-5 rounded-2xl animate-scaleIn">
              <div className="flex items-center gap-2 mb-4">
                <MdAdd size={16} className="text-accent" />
                <h3 className="font-semibold text-sm">{t("parkFormTitle") || "Generate Multiple Slots"}</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">Floor / Level</label>
                    <input className="input h-10 w-full" placeholder="e.g. P1, Basement" required
                      value={form.parking_floor} onChange={e => setForm({ ...form, parking_floor: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">{t("parkPrefix") || "Prefix"}</label>
                    <input className="input h-10 w-full" placeholder="e.g. A" required
                      value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">{t("parkStartNumber") || "Start Number"}</label>
                    <input type="number" className="input h-10 w-full" placeholder="101" required
                      value={form.start_number} onChange={e => setForm({ ...form, start_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">{t("parkCount") || "How Many?"}</label>
                    <input type="number" className="input h-10 w-full" placeholder="10" required
                      value={form.count} onChange={e => setForm({ ...form, count: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1.5 block">{t("parkVehicleType") || "Vehicle Type"}</label>
                    <Select className="input h-11 w-full" value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}>
                      <option value="CAR">{t("parkCar") || "Car"}</option>
                      <option value="BIKE">{t("parkBike") || "Bike"}</option>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {submitting ? <><Spinner small /> {t("parkCreating") || "Creating..."}</> : <><MdAdd size={16} /> {t("parkCreateBtn") || "Create"}</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Slot list card */}
          <div className="bg-card rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid var(--divider)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <MdFilterList size={16} className="text-secondary shrink-0" />
                {filterTabs.map(tab => (
                  <button key={tab.key} onClick={() => handleFilterChange(tab.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={vehicleFilter === tab.key
                      ? { background: "rgba(91,141,239,0.15)", color: "#94B5F5", border: "1px solid rgba(91,141,239,0.35)" }
                      : { background: "var(--bg-soft,rgba(0,0,0,0.04))", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                    {tab.icon} {tab.label} <span className="opacity-55">({tab.count})</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!initialLoad && <p className="text-xs text-secondary hidden sm:block whitespace-nowrap">{totalItems} {t("parkSlotCount") || "Slots"}</p>}
                <div className="relative" style={{ width: 200 }}>
                  <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                  <input className="input h-9 text-xs w-full"
                    style={{ paddingLeft: 32, paddingRight: 26 }}
                    placeholder={`${t("parkColSlot") || "Search Slot"}…`}
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    {fetching ? <Spinner small /> : search ? (
                      <button onClick={() => setSearch("")} className="text-secondary"><MdClose size={13} /></button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {initialLoad && (
              <div className="flex flex-col items-center gap-3 py-14 text-secondary">
                <Spinner /><p className="text-sm">{t("parkLoading") || "Loading..."}</p>
              </div>
            )}

            {!initialLoad && stats.total === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-secondary animate-fadeIn">
                <MdOutlineInbox size={48} className="opacity-25" />
                <p className="text-sm">{t("parkEmpty") || "No parking slots"}</p>
                <button onClick={() => setShowForm(true)} className="text-xs text-accent hover:underline mt-1">
                  {t("parkFirstSlot") || "Add the first slot"}
                </button>
              </div>
            )}

            {!initialLoad && stats.total > 0 && slots.length === 0 && !fetching && (
              <div className="flex flex-col items-center gap-2 py-16 text-secondary animate-fadeIn">
                <MdOutlineInbox size={48} className="opacity-25" />
                <p className="text-sm">{search ? `No slots match "${search}"` : "No slots found for this type"}</p>
                <button onClick={() => { setSearch(""); setVehicleFilter("ALL"); }} className="text-xs text-accent hover:underline mt-1">
                  {t("parkShowAll") || "Show all slots"}
                </button>
              </div>
            )}

            {!initialLoad && slots.length > 0 && (
              <>
                {/* Mobile cards */}
                <div className="space-y-2 md:hidden p-4">
                  {slots.map((slot, i) => (
                    <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl p-3.5 animate-fadeIn"
                      style={{ background: "var(--card-inner-bg)", border: "1px solid var(--card-inner-border)", animationDelay: `${i * 15}ms` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={slot.vehicle_type === "CAR" ? { background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.22)" } : { background: "rgba(107,70,193,0.12)", border: "1px solid rgba(107,70,193,0.22)" }}>
                          {slot.vehicle_type === "CAR"
                            ? <MdDirectionsCar size={18} style={{ color: "#94B5F5" }} />
                            : <MdTwoWheeler size={18} style={{ color: "#9F87D7" }} />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{slot.slot_number}</p>
                          <p className="text-xs text-secondary">{slot.vehicle_type === "CAR" ? (t("parkCar") || "Car") : (t("parkBike") || "Bike")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={slot.status} t={t} />
                        {confirmDel === slot.id ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => deleteSlot(slot.id)} disabled={deleting === slot.id}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                              {deleting === slot.id ? <Spinner small /> : (t("billYesDelete") || "Yes")}
                            </button>
                            <button onClick={() => setConfirmDel(null)} className="text-xs text-secondary" style={{ background: "none", border: "none", cursor: "pointer" }}>
                              {t("cancel") || "Cancel"}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDel(slot.id)} className="p-2 rounded-xl transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                            <MdDelete size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--card-inner-bg)", borderBottom: "1px solid var(--divider)" }}>
                        {["#", "Slot Number", "Type", "Floor/Level", "Status", "Actions"].map((h, i) => (
                          <th key={h} className={`px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot, i) => (
                        <tr key={slot.id} className="transition-colors animate-fadeIn"
                          style={{ borderBottom: "1px solid var(--divider)", animationDelay: `${i * 15}ms` }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}>
                          <td className="px-5 py-3 text-xs text-secondary">{(page - 1) * LIMIT + i + 1}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={slot.vehicle_type === "CAR" ? { background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.22)" } : { background: "rgba(107,70,193,0.12)", border: "1px solid rgba(107,70,193,0.22)" }}>
                                {slot.vehicle_type === "CAR"
                                  ? <MdDirectionsCar size={16} style={{ color: "#94B5F5" }} />
                                  : <MdTwoWheeler size={16} style={{ color: "#9F87D7" }} />}
                              </div>
                              <span className="font-semibold">{slot.slot_number}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-secondary">{slot.vehicle_type === "CAR" ? (t("parkCar") || "Car") : (t("parkBike") || "Bike")}</td>
                          <td className="px-5 py-3 text-secondary">{slot.parking_floor || "—"}</td>
                          <td className="px-5 py-3"><StatusBadge status={slot.status} t={t} /></td>
                          <td className="px-5 py-3 text-right">
                            {confirmDel === slot.id ? (
                              <span className="inline-flex items-center gap-2 justify-end">
                                <span className="text-xs text-secondary">{t("billSure") || "Sure?"}</span>
                                <button onClick={() => deleteSlot(slot.id)} disabled={deleting === slot.id}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                                  style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                                  {deleting === slot.id ? <Spinner small /> : (t("billYesDelete") || "Yes")}
                                </button>
                                <button onClick={() => setConfirmDel(null)} className="text-xs text-secondary" style={{ background: "none", border: "none", cursor: "pointer" }}>
                                  {t("cancel") || "Cancel"}
                                </button>
                              </span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setConfirmDel(slot.id)}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                                  <MdDelete size={14} /> {t("billDelete") || "Delete"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--divider)" }}>
                  <p className="text-xs text-secondary">
                    {t("billShowing") || "Showing"} {slots.length} {t("billOf") || "of"} {totalItems} {t("parkSlotCount") || "Slots"}
                  </p>
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



