
import { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { isCommitteeMember } from "../../utils/permissions";
import {
  MdAdd, MdDelete, MdClose, MdEdit,
  MdDirectionsCar, MdTwoWheeler,
  MdOutlineInbox, MdCheckCircle,
  MdBlock, MdFilterList, MdSearch,
  MdLocalParking, MdWarning, MdPersonSearch,
  MdPendingActions, MdDone, MdRefresh, MdPersonRemove,
} from "react-icons/md";
import { FaParking } from "react-icons/fa";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";

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
    PENDING: { label: "Pending", color: "#60A5FA", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.28)" },
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
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.vehicles)
        ? res.data.vehicles
        : [];
      setVehicles(list);
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
                        color: isExpanded ? "#60A5FA" : "var(--text-secondary)",
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
    { key: "PENDING", label: "Pending", color: "#60A5FA" },
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
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "#60A5FA", border: "1px solid rgba(251,191,36,0.22)" }}>
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
  const { user } = useContext(AuthContext);
  const isCommittee = isCommitteeMember(user);

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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  /* Create form */
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ prefix: "", start_number: "", count: "", vehicle_type: "CAR", parking_floor: "P1" });

  /* Edit slot */
  const [editSlot, setEditSlot] = useState(null);
  const [editForm, setEditForm] = useState({ slot_number: "", parking_floor: "", vehicle_type: "CAR", parking_type: "DEFAULT" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const searchInputRef = useRef(null);

  /* ── Keyboard shortcut: Ctrl+K/Cmd+K to focus search & Esc to close modals ── */
  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowForm(false);
        setConfirmDel(null);
        setEditSlot(null);
        setReleaseConfirm(null);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  /* ── Live preview of slots to be generated ── */
  const generatedPreview = useMemo(() => {
    if (!form.count || !form.start_number) return null;
    const start = parseInt(form.start_number, 10);
    const cnt = parseInt(form.count, 10);
    if (isNaN(start) || isNaN(cnt) || cnt <= 0) return null;
    const pfx = (form.prefix || "").trim();
    const firstSlot = `${pfx}${start}`;
    const lastSlot = `${pfx}${start + cnt - 1}`;
    return {
      firstSlot,
      lastSlot,
      cnt,
      floor: form.parking_floor || "P1",
      type: form.vehicle_type === "CAR" ? "Car" : "Bike",
    };
  }, [form]);

  /* Delete */
  const [deleting, setDeleting] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  /* Release occupant */
  const [releaseConfirm, setReleaseConfirm] = useState(null);
  const [releasing, setReleasing] = useState(null);

  /* All slots for sub-panel pickers */
  const [allSlots, setAllSlots] = useState([]);
  const [flats, setFlats] = useState([]);

  /* Pending extra request count for badge */
  const [pendingResidentCount, setPendingResidentCount] = useState(0);

  /* Slot Ownership tab */
  const [ownerSlots, setOwnerSlots] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerStatus, setOwnerStatus] = useState("ALL");
  const [ownerType, setOwnerType] = useState("ALL");
  const [ownerAlloc, setOwnerAlloc] = useState("ALL");
  const debouncedOwnerSearch = useDebounce(ownerSearch, 400);

  /* ────────────────────────────
     LOADERS
  ──────────────────────────── */
  const loadFlats = useCallback(async () => {
    try {
      const res = await API.get("/flats");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setFlats(list);
    } catch (e) { console.error(e); }
  }, []);

  const loadAllSlots = useCallback(async () => {
    try {
      const res = await API.get("/parking-slots?limit=200");
      const d = res.data;
      setAllSlots(Array.isArray(d) ? d : d?.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadSlots = useCallback(async (pageNum, vFilter, currentSearch, statusF = "ALL", isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: LIMIT,
        ...(vFilter !== "ALL" ? { vehicle_type: vFilter } : {}),
        ...(statusF !== "ALL" ? { status: statusF } : {}),
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

  const loadOwnerSlots = useCallback(async (showLoader = false) => {
    if (showLoader) setOwnerLoading(true);
    try {
      const res = await API.get("/parking-slots", { params: { limit: 1000 } });
      setOwnerSlots(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) { console.error(e); setOwnerSlots([]); }
    finally { setOwnerLoading(false); }
  }, []);

  useEffect(() => { loadOwnerSlots(true); }, [loadOwnerSlots]);

  useEffect(() => {
    loadSlots(1, "ALL", "", "ALL", true);
    loadAllSlots();
    loadFlats();
    loadPendingResidentCount();
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadSlots(1, vehicleFilter, debouncedSearch, statusFilter);
  }, [debouncedSearch, vehicleFilter, statusFilter]);

  const handlePageChange = (p) => loadSlots(p, vehicleFilter, debouncedSearch, statusFilter);
  const handleFilterChange = (key) => {
    if (key === "AVAILABLE") {
      setStatusFilter("AVAILABLE");
      setVehicleFilter("ALL");
    } else {
      setStatusFilter("ALL");
      setVehicleFilter(key);
    }
  };

  const refreshAll = () => {
    loadAllSlots();
    loadFlats();
    loadSlots(page, vehicleFilter, debouncedSearch, statusFilter);
    loadPendingResidentCount();
    loadOwnerSlots();
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
      loadSlots(1, vehicleFilter, debouncedSearch, statusFilter);
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
      loadSlots(newPage, vehicleFilter, debouncedSearch, statusFilter);
      loadAllSlots();
      loadOwnerSlots();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  /* ────────────────────────────
     EDIT SLOT
  ──────────────────────────── */
  const openEdit = (slot) => {
    setEditSlot(slot);
    setEditForm({
      slot_number: slot.slot_number || "",
      parking_floor: slot.parking_floor || "",
      vehicle_type: slot.vehicle_type || "CAR",
      parking_type: slot.parking_type || "DEFAULT",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editSlot) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      await API.put(`/parking-slots/${editSlot.id}`, editForm);
      setEditSlot(null);
      refreshAll();
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to update parking slot");
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ────────────────────────────
     RELEASE SLOT (REVOKE)
  ──────────────────────────── */
  const handleReleaseSlot = async (slot) => {
    if (!slot) return;
    setReleasing(slot.id);
    try {
      await API.post("/parking-slots/revoke", { slot_id: slot.id });
      setReleaseConfirm(null);
      refreshAll();
    } catch (err) {
      console.error("Failed to release slot:", err);
    } finally {
      setReleasing(null);
    }
  };

  const filterTabs = [
    { key: "ALL", label: t("parkTabAll") || "All", icon: <FaParking size={12} />, count: stats.total },
    { key: "CAR", label: t("parkTabCars") || "Cars", icon: <MdDirectionsCar size={14} />, count: stats.cars },
    { key: "BIKE", label: t("parkTabBikes") || "Bikes", icon: <MdTwoWheeler size={14} />, count: stats.bikes },
    { key: "AVAILABLE", label: t("parkTabAvailable") || "Available", icon: <MdCheckCircle size={13} />, count: stats.available },
  ];

  const activeFilter = statusFilter === "AVAILABLE" ? "AVAILABLE" : vehicleFilter;

  const mainTabs = [
    { key: "slots", label: "Parking Slots", icon: <FaParking size={13} /> },
    { key: "ownership", label: "Slot Owners", icon: <MdPersonSearch size={15} /> },
    { key: "resident-entry", label: "Resident Entry", icon: <span style={{ fontSize: 14 }}>🏠</span> },
    { key: "resident-requests", label: "Extra Slot Requests", icon: <MdPendingActions size={14} /> },
  ];

  /* ── Slot Ownership: filtered view ── */
  const ownerQ = debouncedOwnerSearch.toLowerCase().trim();
  const ownerFiltered = ownerSlots.filter(s => {
    if (ownerType !== "ALL" && s.vehicle_type !== ownerType) return false;
    if (ownerStatus === "AVAILABLE" && s.status !== "AVAILABLE") return false;
    if (ownerStatus === "ASSIGNED" && s.status === "AVAILABLE") return false;
    if (ownerAlloc === "WITH_VEHICLE" && !s.vehicle) return false;
    if (ownerAlloc === "NO_VEHICLE" && s.vehicle) return false;
    if (ownerAlloc === "ALLOCATED" && !s.resident && !s.flat_number) return false;
    if (ownerAlloc === "FREE" && s.status !== "AVAILABLE") return false;
    if (ownerQ) {
      const hay = [s.slot_number, s.parking_floor, s.flat_number, s.resident?.name, s.resident?.email, s.resident?.phone, s.vehicle?.vehicle_number, s.vehicle?.vehicle_name]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(ownerQ)) return false;
    }
    return true;
  });

  const ownerSegment = (opts, value, setValue) => (
    <div className="flex gap-1 p-1 rounded-xl flex-wrap"
      style={{ background: "var(--card-inner-bg,rgba(0,0,0,0.05))", border: "1px solid var(--card-inner-border,rgba(255,255,255,0.08))" }}>
      {opts.map(o => (
        <button key={o.value} onClick={() => setValue(o.value)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
          style={value === o.value
            ? { background: "rgba(91,141,239,0.15)", color: "#94B5F5", border: "1px solid rgba(91,141,239,0.35)" }
            : { background: "transparent", color: "var(--text-secondary)", border: "1px solid transparent" }}>
          {o.label}
        </button>
      ))}
    </div>
  );

  /* ────────────────────────────
     RENDER
  ──────────────────────────── */
  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Header */}
      <div className="ps-page-header">
        <div className="ps-header-left">
          <div className="ps-header-icon-box">
            <FaParking size={20} />
          </div>
          <div>
            <div className="ps-header-title-row">
              <h2 className="ps-header-title">{t("parkTitle") || "Parking Management"}</h2>
              {!initialLoad && stats.total > 0 && (
                <span className="ps-badge-pill">
                  {stats.total} {t("parkSlotCount") || "Slots"}
                </span>
              )}
            </div>
            <p className="ps-header-subtitle">{t("parkSubtitle") || "Manage society parking spaces, allocations, and requests"}</p>
          </div>
        </div>
        {!isCommittee && mainTab === "slots" && (
          <GlobalButton
            variant="add"
            onClick={() => { setShowForm(true); setConfirmDel(null); }}
          >
            {t("parkCreateBtn") || "Create Slots"}
          </GlobalButton>
        )}
      </div>

      {/* Main Tab Switcher */}
      <div className="ps-tab-bar">
        {mainTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setMainTab(tab.key); setShowForm(false); }}
            className={`ps-tab-item ${mainTab === tab.key ? "ps-tab-item--active" : ""}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.key === "resident-requests" && pendingResidentCount > 0 && (
              <span className="ps-tab-count-badge">
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

      {/* TAB: SLOT OWNERS */}
      {mainTab === "ownership" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters & Summary Bar */}
          <div className="ps-slots-container">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {ownerSegment(
                  [
                    { value: "ALL", label: "All" },
                    { value: "CAR", label: "Cars" },
                    { value: "BIKE", label: "Bikes" },
                  ],
                  ownerType,
                  setOwnerType
                )}
                {ownerSegment(
                  [
                    { value: "ALL", label: "All Status" },
                    { value: "AVAILABLE", label: "Available" },
                    { value: "ASSIGNED", label: "Assigned" },
                  ],
                  ownerStatus,
                  setOwnerStatus
                )}
                {ownerSegment(
                  [
                    { value: "ALL", label: "All" },
                    { value: "FREE", label: "Free Only" },
                    { value: "ALLOCATED", label: "Allocated" },
                    { value: "WITH_VEHICLE", label: "With Vehicle" },
                    { value: "NO_VEHICLE", label: "No Vehicle" },
                  ],
                  ownerAlloc,
                  setOwnerAlloc
                )}
              </div>
              <div className="relative grow max-w-sm">
                <MdSearch
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
                />
                <input
                  className="input h-10 text-xs w-full"
                  style={{ paddingLeft: 34, paddingRight: 28 }}
                  placeholder="Search slot, flat, resident, vehicle…"
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                />
                {ownerSearch && (
                  <button
                    type="button"
                    onClick={() => setOwnerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary"
                  >
                    <MdClose size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {ownerLoading && (
            <div className="ps-slots-container flex flex-col items-center gap-3 py-14 text-secondary">
              <Spinner />
              <p className="text-sm">{t("parkLoading") || "Loading slot allocations..."}</p>
            </div>
          )}

          {/* Empty State */}
          {!ownerLoading && ownerFiltered.length === 0 && (
            <div className="ps-slots-container flex flex-col items-center gap-2 py-16 text-secondary animate-fadeIn">
              <MdOutlineInbox size={46} className="opacity-25" />
              <p className="text-sm">
                {ownerSlots.length === 0
                  ? t("parkEmpty") || "No parking slots registered"
                  : "No parking slots match your current filter selection"}
              </p>
            </div>
          )}

          {/* Modern Card Grid */}
          {!ownerLoading && ownerFiltered.length > 0 && (
            <div className="ps-slots-container space-y-4">
              <div className="ps-card-grid">
                {ownerFiltered.map((s, i) => {
                  const isCar = s.vehicle_type === "CAR";
                  const isAvail = s.status === "AVAILABLE";
                  return (
                    <div
                      key={s.id}
                      className={`ps-slot-card ${
                        isAvail ? "ps-slot-card--available" : "ps-slot-card--occupied"
                      }`}
                      style={{ animationDelay: `${i * 15}ms` }}
                    >
                      {/* Top Header */}
                      <div className="ps-card-top">
                        <div className="ps-card-left-header">
                          <div
                            className={`ps-type-icon ${
                              isCar ? "ps-type-icon--car" : "ps-type-icon--bike"
                            }`}
                          >
                            {isCar ? <MdDirectionsCar size={15} /> : <MdTwoWheeler size={15} />}
                          </div>
                          <div>
                            <div className="ps-slot-number-row">
                              <span className="ps-slot-label">Slot</span>
                              <h4 className="ps-slot-number">{s.slot_number}</h4>
                            </div>
                            <span className="ps-slot-meta">
                              {s.parking_floor ? `Floor ${s.parking_floor}` : "Ground Floor"} ·{" "}
                              {isCar ? "Car" : "Bike"}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={s.status} t={t} />
                      </div>

                      {/* Middle Details */}
                      <div className="ps-card-middle">
                        {isAvail ? (
                          <div className="ps-avail-bay">
                            <span className="ps-avail-dot" />
                            <span className="ps-avail-bay-text">
                              Unallocated · Available for assignment
                            </span>
                          </div>
                        ) : (
                          <div className="ps-occupied-details">
                            <div className="ps-resident-name-row">
                              {s.flat_number && (
                                <span className="ps-flat-badge">Flat {s.flat_number}</span>
                              )}
                              <span className="ps-resident-name">
                                {s.resident?.name || "Occupied"}
                              </span>
                            </div>
                            {s.resident?.email && (
                              <p className="text-[11px] text-secondary mt-0.5 truncate">
                                {s.resident.email}
                              </p>
                            )}
                            {s.vehicle ? (
                              <div className="ps-vehicle-tag">
                                <span className="ps-vehicle-plate">
                                  {s.vehicle.vehicle_number}
                                </span>
                                {s.vehicle.vehicle_name && (
                                  <span className="ps-vehicle-model">
                                    ({s.vehicle.vehicle_name})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-secondary mt-1 italic">
                                {s.resident ? "No vehicle linked" : "—"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="ps-card-footer ps-card-actions">
                        {!isAvail && (
                          <GlobalButton
                            variant="warning"
                            size="xs"
                            icon={MdPersonRemove}
                            onClick={() => setReleaseConfirm(s)}
                            title="Release Slot (Unlink resident/vehicle)"
                            style={{ flex: 1 }}
                          >
                            Release
                          </GlobalButton>
                        )}
                        {!isCommittee && (
                          <GlobalButton
                            variant="edit"
                            size="xs"
                            icon={MdEdit}
                            onClick={() => openEdit(s)}
                            title="Edit Slot"
                            style={{ flex: 1 }}
                          >
                            Edit
                          </GlobalButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Counter Footer */}
              <div
                className="flex justify-between items-center px-1 pt-3"
                style={{ borderTop: "1px solid var(--divider, rgba(255,255,255,0.08))" }}
              >
                <p className="text-xs text-secondary">
                  Showing <strong>{ownerFiltered.length}</strong> of{" "}
                  <strong>{ownerSlots.length}</strong> total slots
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PARKING SLOTS */}
      {mainTab === "slots" && (
        <>
          {/* Main Slots Container */}
          <div className="ps-slots-container">
            {/* Filter and Search Bar */}
            <div className="ps-filter-bar">
              <div className="ps-filter-tabs">
                <MdFilterList size={16} className="text-secondary shrink-0" />
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => handleFilterChange(tab.key)}
                    className={`ps-filter-tab ${activeFilter === tab.key ? "ps-filter-tab--active" : ""}`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span className="ps-filter-count">{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="ps-search-box-wrap">
                {!initialLoad && (
                  <span className="ps-total-indicator">
                    {totalItems} {t("parkSlotCount") || "Slots"}
                  </span>
                )}
                <div className="ps-search-input-wrapper">
                  <MdSearch size={15} className="ps-search-icon" />
                  <input
                    ref={searchInputRef}
                    className="ps-search-input"
                    placeholder={`${t("parkColSlot") || "Search slot, level"}... (Ctrl+K)`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <div className="ps-search-actions">
                    {fetching ? (
                      <Spinner small />
                    ) : search ? (
                      <button onClick={() => setSearch("")} className="ps-search-clear" title="Clear">
                        <MdClose size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {initialLoad && (
              <div className="ps-loading-state">
                <Spinner />
                <p>{t("parkLoading") || "Loading parking slots..."}</p>
              </div>
            )}

            {/* Empty state: No slots at all */}
            {!initialLoad && stats.total === 0 && (
              <div className="ps-empty-state">
                <div className="ps-empty-icon">
                  <MdOutlineInbox size={42} />
                </div>
                <h4>{t("parkEmpty") || "No parking slots found"}</h4>
                <p>Create your society parking slots to begin assigning them to residents.</p>
                <GlobalButton
                  variant="add"
                  onClick={() => setShowForm(true)}
                  className="mt-2"
                >
                  {t("parkFirstSlot") || "Add the first slot"}
                </GlobalButton>
              </div>
            )}

            {/* Empty state: No search matches */}
            {!initialLoad && stats.total > 0 && slots.length === 0 && !fetching && (
              <div className="ps-empty-state">
                <div className="ps-empty-icon">
                  <MdSearch size={40} />
                </div>
                <h4>{search ? `No slots match "${search}"` : "No slots found for this type"}</h4>
                <p>Try adjusting your search criteria or vehicle type filter.</p>
                <button
                  type="button"
                  onClick={() => { setSearch(""); setVehicleFilter("ALL"); setStatusFilter("ALL"); }}
                  className="ps-btn-secondary mt-2"
                >
                  {t("parkShowAll") || "Reset Filters"}
                </button>
              </div>
            )}

            {/* Card Grid */}
            {!initialLoad && slots.length > 0 && (
              <>
                <div className="ps-card-grid">
                  {slots.map((slot, i) => {
                    const isCar = slot.vehicle_type === "CAR";
                    const isAvail = slot.status === "AVAILABLE";
                    return (
                      <div
                        key={slot.id}
                        className={`ps-slot-card ${isAvail ? "ps-slot-card--available" : "ps-slot-card--occupied"}`}
                        style={{ animationDelay: `${i * 20}ms` }}
                      >
                        {/* Top Card Bar */}
                        <div className="ps-card-top">
                          <div className="ps-card-left-header">
                            <div className={`ps-type-icon ${isCar ? "ps-type-icon--car" : "ps-type-icon--bike"}`}>
                              {isCar ? <MdDirectionsCar size={15} /> : <MdTwoWheeler size={15} />}
                            </div>
                            <div>
                              <div className="ps-slot-number-row">
                                <span className="ps-slot-label">Slot</span>
                                <h4 className="ps-slot-number">{slot.slot_number}</h4>
                              </div>
                              <span className="ps-slot-meta">
                                {slot.parking_floor ? `Floor ${slot.parking_floor}` : "Ground"} · {isCar ? "Car" : "Bike"}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={slot.status} t={t} />
                        </div>

                        {/* Middle Allocation Details */}
                        <div className="ps-card-middle">
                          {isAvail ? (
                            <div className="ps-avail-bay">
                              <span className="ps-avail-dot" />
                              <span className="ps-avail-bay-text">Bay empty & ready for allocation</span>
                            </div>
                          ) : (
                            <div className="ps-occupied-details">
                              {slot.resident || slot.flat_number ? (
                                <div className="ps-resident-info">
                                  <div className="ps-resident-name-row">
                                    {slot.flat_number && (
                                      <span className="ps-flat-badge">
                                        Flat {slot.flat_number}
                                      </span>
                                    )}
                                    <span className="ps-resident-name">
                                      {slot.resident?.name || "Resident"}
                                    </span>
                                  </div>
                                  {slot.vehicle?.vehicle_number && (
                                    <div className="ps-vehicle-tag">
                                      <span className="ps-vehicle-plate">{slot.vehicle.vehicle_number}</span>
                                      {slot.vehicle.vehicle_name && (
                                        <span className="ps-vehicle-model">({slot.vehicle.vehicle_name})</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="ps-no-resident-tag">
                                  <span>Occupied (Allocated)</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions Footer */}
                        <div className="ps-card-footer ps-card-actions">
                          {!isCommittee && (
                            <GlobalButton
                              variant="edit"
                              size="xs"
                              icon={MdEdit}
                              onClick={() => openEdit(slot)}
                              title="Edit Slot"
                              style={{ flex: 1 }}
                            >
                              Edit
                            </GlobalButton>
                          )}
                          {!isAvail && (
                            <GlobalButton
                              variant="warning"
                              size="xs"
                              icon={MdPersonRemove}
                              onClick={() => setReleaseConfirm(slot)}
                              title="Release Slot (Unlink resident/vehicle)"
                              style={{ flex: 1 }}
                            >
                              Release
                            </GlobalButton>
                          )}
                          {!isCommittee && (
                            <GlobalButton
                              variant="delete"
                              size="xs"
                              onClick={() => setConfirmDel(slot)}
                              title="Delete Slot"
                              style={{ flex: 1 }}
                            >
                              Delete
                            </GlobalButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Footer */}
                <div className="ps-pagination-container">
                  <p className="ps-pagination-info">
                    {t("billShowing") || "Showing"} <strong>{slots.length}</strong> {t("billOf") || "of"} <strong>{totalItems}</strong> {t("parkSlotCount") || "Slots"}
                  </p>
                  <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Flat History Style Pop-up Modal: Create Slots */}
      {showForm &&
        createPortal(
          <div
            className="fh-modal-overlay"
            onClick={() => setShowForm(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              overflowY: "auto",
            }}
          >
            <div
              className="fh-modal-box"
              style={{
                width: "min(520px, 94vw)",
                maxHeight: "min(620px, 92vh)",
                margin: "auto",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Glowing top accent line */}
              <div className="fh-modal-top-accent" />

              {/* Modal Header */}
              <div className="fh-modal-header">
                <div className="fh-modal-header-left">
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.28)",
                      color: "#60A5FA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FaParking size={20} />
                  </div>
                  <div>
                    <h3
                      className="fh-modal-title"
                      style={{ fontSize: "1.15rem", margin: 0, fontWeight: 700 }}
                    >
                      {t("parkFormTitle") || "Create Parking Slots"}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        margin: "2px 0 0",
                      }}
                    >
                      Configure batch slot creation with automated numbering
                    </p>
                  </div>
                </div>

                <div className="fh-modal-header-actions">
                  <button
                    type="button"
                    className="fh-modal-close-btn"
                    onClick={() => setShowForm(false)}
                    title="Close Popup (Esc)"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Form */}
              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {/* Scrollable Body */}
                <div
                  className="fh-modal-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "18px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {/* Vehicle Type Toggle */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      {t("parkVehicleType") || "Vehicle Type"}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, vehicle_type: "CAR" })}
                        className={`ps-vehicle-mode-btn ${
                          form.vehicle_type === "CAR" ? "ps-vehicle-mode-btn--active-car" : ""
                        }`}
                      >
                        <MdDirectionsCar size={16} />
                        <span>{t("parkCar") || "Car Space"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, vehicle_type: "BIKE" })}
                        className={`ps-vehicle-mode-btn ${
                          form.vehicle_type === "BIKE" ? "ps-vehicle-mode-btn--active-bike" : ""
                        }`}
                      >
                        <MdTwoWheeler size={16} />
                        <span>{t("parkBike") || "Bike Space"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Floor & Prefix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-secondary">
                        Floor / Level <span className="text-red-400">*</span>
                      </label>
                      <input
                        className="input h-10 w-full text-xs font-medium"
                        placeholder="e.g. P1, B1, Ground"
                        required
                        value={form.parking_floor}
                        onChange={(e) => setForm({ ...form, parking_floor: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-secondary">
                        {t("parkPrefix") || "Slot Prefix"}
                      </label>
                      <input
                        className="input h-10 w-full text-xs font-medium"
                        placeholder="e.g. A, B, P"
                        value={form.prefix}
                        onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Start Number & Count */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-secondary">
                        {t("parkStartNumber") || "Start Number"} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="input h-10 w-full text-xs font-medium"
                        placeholder="101"
                        required
                        value={form.start_number}
                        onChange={(e) => setForm({ ...form, start_number: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-secondary">
                        {t("parkCount") || "How Many Slots?"} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        className="input h-10 w-full text-xs font-medium"
                        placeholder="10"
                        required
                        value={form.count}
                        onChange={(e) => setForm({ ...form, count: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Live Preview Banner */}
                  {generatedPreview && (
                    <div
                      className="rounded-xl p-3 text-xs flex items-center justify-between gap-3 animate-fadeIn"
                      style={{
                        background: "rgba(59, 130, 246, 0.08)",
                        border: "1px solid rgba(59, 130, 246, 0.25)",
                        color: "#93C5FD",
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="px-2 py-0.5 rounded font-bold uppercase text-[10px] shrink-0"
                          style={{ background: "rgba(59, 130, 246, 0.25)", color: "#93C5FD" }}
                        >
                          Preview
                        </span>
                        <span className="truncate">
                          Slots <strong>{generatedPreview.firstSlot}</strong> → <strong>{generatedPreview.lastSlot}</strong>
                        </span>
                      </div>
                      <span className="font-semibold shrink-0 text-blue-300">
                        {generatedPreview.cnt} {generatedPreview.type} {generatedPreview.cnt === 1 ? "slot" : "slots"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Fixed Footer: Always visible, never cut off */}
                <div className="fh-modal-footer">
                  <button
                    type="button"
                    className="fh-confirm-btn--cancel"
                    onClick={() => setShowForm(false)}
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl"
                  >
                    {submitting ? (
                      <>
                        <Spinner small /> {t("parkCreating") || "Creating..."}
                      </>
                    ) : (
                      <>
                        <MdAdd size={16} /> {t("parkCreateBtn") || "Create Slots"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Flat History Style Move-Out/Delete Confirmation Popup */}
      {confirmDel &&
        createPortal(
          <div
            className="fh-confirm-overlay"
            onClick={() => setConfirmDel(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              overflowY: "auto",
            }}
          >
            <div
              className="fh-confirm-box"
              style={{ margin: "auto" }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <div className="fh-confirm-accent" />
              <div className="fh-confirm-icon">⚠️</div>
              <h3 className="fh-confirm-title">Delete Parking Slot?</h3>
              <p className="fh-confirm-text">
                Are you sure you want to delete slot{" "}
                <strong>
                  "{typeof confirmDel === "object" ? confirmDel.slot_number : confirmDel}"
                </strong>
                ? This action cannot be undone.
              </p>
              <div className="fh-confirm-actions">
                <button
                  type="button"
                  className="fh-confirm-btn--cancel"
                  onClick={() => setConfirmDel(null)}
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  type="button"
                  className="fh-confirm-btn--danger"
                  disabled={deleting === (confirmDel?.id || confirmDel)}
                  onClick={() => deleteSlot(confirmDel?.id || confirmDel)}
                >
                  {deleting === (confirmDel?.id || confirmDel) ? (
                    <>
                      <Spinner small /> Deleting...
                    </>
                  ) : (
                    <>
                      <MdDelete size={15} /> Delete Slot
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Slot Modal */}
      {editSlot &&
        createPortal(
          <div
            className="fh-modal-overlay"
            onClick={() => setEditSlot(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              overflowY: "auto",
            }}
          >
            <div
              className="fh-modal-box"
              style={{
                width: "min(500px, 94vw)",
                maxHeight: "min(620px, 92vh)",
                margin: "auto",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Glowing top accent line */}
              <div className="fh-modal-top-accent" style={{ background: "linear-gradient(90deg, #10b981, #3b82f6)" }} />

              {/* Modal Header */}
              <div className="fh-modal-header">
                <div className="fh-modal-header-left">
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.28)",
                      color: "#34d399",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MdEdit size={20} />
                  </div>
                  <div>
                    <h3
                      className="fh-modal-title"
                      style={{ fontSize: "1.15rem", margin: 0, fontWeight: 700 }}
                    >
                      Edit Parking Slot
                    </h3>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        margin: "2px 0 0",
                      }}
                    >
                      Update slot number, floor level, vehicle type, or parking type
                    </p>
                  </div>
                </div>

                <div className="fh-modal-header-actions">
                  <button
                    type="button"
                    className="fh-modal-close-btn"
                    onClick={() => setEditSlot(null)}
                    title="Close Popup (Esc)"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Form */}
              <form
                onSubmit={handleEditSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {/* Scrollable Body */}
                <div
                  className="fh-modal-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "18px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {/* Error banner */}
                  {editError && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold animate-fadeIn"
                      style={{
                        background: "rgba(248, 113, 113, 0.12)",
                        border: "1px solid rgba(248, 113, 113, 0.28)",
                        color: "#f87171",
                      }}
                    >
                      <MdWarning size={16} className="shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {/* Vehicle Type Toggle */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      {t("parkVehicleType") || "Vehicle Type"}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, vehicle_type: "CAR" })}
                        className={`ps-vehicle-mode-btn ${
                          editForm.vehicle_type === "CAR" ? "ps-vehicle-mode-btn--active-car" : ""
                        }`}
                      >
                        <MdDirectionsCar size={16} />
                        <span>{t("parkCar") || "Car Space"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, vehicle_type: "BIKE" })}
                        className={`ps-vehicle-mode-btn ${
                          editForm.vehicle_type === "BIKE" ? "ps-vehicle-mode-btn--active-bike" : ""
                        }`}
                      >
                        <MdTwoWheeler size={16} />
                        <span>{t("parkBike") || "Bike Space"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Slot Number & Floor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-secondary">
                        Slot Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        className="input h-10 w-full text-xs font-medium"
                        placeholder="e.g. A-101, B2-12"
                        required
                        value={editForm.slot_number}
                        onChange={(e) => setEditForm({ ...editForm, slot_number: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-secondary">
                        Floor / Level
                      </label>
                      <input
                        className="input h-10 w-full text-xs font-medium"
                        placeholder="e.g. P1, B1, Ground"
                        value={editForm.parking_floor}
                        onChange={(e) => setEditForm({ ...editForm, parking_floor: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Allocated Flat Dropdown / Viewer */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
                      <span>Allocated Flat</span>
                      {editSlot.flat_number && (
                        <span className="text-[11px] font-bold text-emerald-400">
                          Current: Flat {editSlot.flat_number}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Select
                        className="input h-10 w-full text-xs font-medium"
                        value={editForm.flat_id || ""}
                        onChange={(e) => setEditForm({ ...editForm, flat_id: e.target.value })}
                      >
                        <option value="">-- No Flat Allocated (Unassigned / General) --</option>
                        {flats.map((f) => {
                          const blockName = f.Floor?.Block?.name || f.Block?.name;
                          return (
                            <option key={f.id} value={f.id}>
                              Flat {f.flat_number}{blockName ? ` (${blockName})` : ""}{f.resident?.name ? ` · ${f.resident.name}` : ""}
                            </option>
                          );
                        })}
                      </Select>
                    </div>
                    {editSlot.resident && (
                      <div className="text-[11px] text-secondary flex items-center gap-1.5 mt-0.5">
                        <span>Resident: <strong>{editSlot.resident.name}</strong></span>
                        {editSlot.vehicle && (
                          <span>· Vehicle: <strong style={{ fontFamily: "monospace" }}>{editSlot.vehicle.vehicle_number}</strong></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Parking Type (DEFAULT vs EXTRA) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
                      Parking Type / Category
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, parking_type: "DEFAULT" })}
                        className={`ps-vehicle-mode-btn ${
                          editForm.parking_type === "DEFAULT" ? "ps-vehicle-mode-btn--active-car" : ""
                        }`}
                        style={editForm.parking_type === "DEFAULT" ? { borderColor: "rgba(59,130,246,0.4)" } : {}}
                      >
                        <FaParking size={14} />
                        <span>Standard (Default)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, parking_type: "EXTRA" })}
                        className={`ps-vehicle-mode-btn ${
                          editForm.parking_type === "EXTRA" ? "ps-vehicle-mode-btn--active-car" : ""
                        }`}
                        style={editForm.parking_type === "EXTRA" ? { borderColor: "rgba(251,191,36,0.5)", color: "#60A5FA" } : {}}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800 }}>⚡</span>
                        <span>Extra Space</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="fh-modal-footer">
                  <button
                    type="button"
                    className="fh-confirm-btn--cancel"
                    onClick={() => setEditSlot(null)}
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="btn-primary flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                  >
                    {editSubmitting ? (
                      <>
                        <Spinner small /> Saving...
                      </>
                    ) : (
                      <>
                        <MdDone size={16} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Release Slot Confirmation Popup */}
      {releaseConfirm &&
        createPortal(
          <div
            className="fh-confirm-overlay"
            onClick={() => setReleaseConfirm(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              overflowY: "auto",
            }}
          >
            <div
              className="fh-confirm-box"
              style={{ margin: "auto" }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <div className="fh-confirm-accent" style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
              <div className="fh-confirm-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
                <MdPersonRemove size={26} />
              </div>
              <h3 className="fh-confirm-title">Release Parking Slot?</h3>
              <p className="fh-confirm-text">
                Are you sure you want to release slot{" "}
                <strong>"{releaseConfirm.slot_number}"</strong>?
                <br />
                {releaseConfirm.resident?.name || releaseConfirm.flat_number ? (
                  <span className="block mt-2 text-xs text-secondary">
                    This will unassign resident{" "}
                    <strong>{releaseConfirm.resident?.name || "assigned"}</strong>
                    {releaseConfirm.flat_number ? ` (Flat ${releaseConfirm.flat_number})` : ""} and clear any registered vehicles from this spot.
                  </span>
                ) : (
                  <span className="block mt-2 text-xs text-secondary">
                    This will reset the slot status back to <strong>AVAILABLE</strong>.
                  </span>
                )}
              </p>
              <div className="fh-confirm-actions">
                <button
                  type="button"
                  className="fh-confirm-btn--cancel"
                  onClick={() => setReleaseConfirm(null)}
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  type="button"
                  className="fh-confirm-btn--danger"
                  style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                  disabled={releasing === releaseConfirm.id}
                  onClick={() => handleReleaseSlot(releaseConfirm)}
                >
                  {releasing === releaseConfirm.id ? (
                    <>
                      <Spinner small /> Releasing...
                    </>
                  ) : (
                    <>
                      <MdPersonRemove size={15} /> Release Slot
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}



