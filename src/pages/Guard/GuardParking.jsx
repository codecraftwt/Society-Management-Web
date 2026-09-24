import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import {
  MdDirectionsCar, MdCheckCircle, MdCancel,
  MdLocalParking, MdRefresh, MdExitToApp,
  MdWarning, MdExpandMore, MdExpandLess,
  MdDone, MdChevronLeft, MdChevronRight,
  MdSearch, MdClose, MdPersonSearch, MdAdd,
} from "react-icons/md";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ToggleSearchBar from "../../components/common/ToggleSearchBar";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function Spinner({ size = 22 }) {
  return (
    <svg style={{ color: "var(--accent)", margin: "0 auto", width: size, height: size, animation: "spin 0.8s linear infinite" }}
      viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }} />
      <path fill="currentColor" style={{ opacity: 0.85 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function StatusBadge({ status, t }) {
  const cfg = {
    PENDING:   { label: t("gpPending") || "Pending",   Icon: MdWarning,      color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.28)"  },
    APPROVED:  { label: t("gpApproved") || "Approved", Icon: MdCheckCircle, color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.28)"  },
    REJECTED:  { label: t("gpRejected") || "Rejected", Icon: MdCancel,      color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.28)" },
    COMPLETED: { label: t("gpCompleted") || "Exited",  Icon: MdDone,        color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.28)" },
  }[status] || { label: status, Icon: MdCheckCircle, color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.28)" };

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <cfg.Icon size={13} /> {cfg.label}
    </span>
  );
}

const VEHICLE_CFG = {
  CAR:  { emoji: "🚗", label: "Car",  color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.28)"  },
  BIKE: { emoji: "🏍️", label: "Bike", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.28)" },
};

function VehicleTypeBadge({ type }) {
  const cfg = VEHICLE_CFG[type?.toUpperCase()] || {
    emoji: "🚘", label: type, color: "#6b7280",
    bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)",
  };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, whiteSpace:"nowrap", color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      <span style={{ fontSize:13 }}>{cfg.emoji}</span> {cfg.label}
    </span>
  );
}

function ParkingTypePill({ type }) {
  const isResident = type === "RESIDENT";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:800,
      textTransform:"uppercase", letterSpacing:"0.05em",
      color: isResident ? "var(--accent)" : "#06b6d4",
      background: isResident ? "rgba(160,90,255,0.12)" : "rgba(6,182,212,0.12)",
      border: `1px solid ${isResident ? "rgba(160,90,255,0.28)" : "rgba(6,182,212,0.28)"}`,
    }}>
      {isResident ? "🏠 Resident" : "👤 Visitor"}
    </span>
  );
}

function RequestCard({ r, slots, selectedSlot, setSelectedSlot, onAssign, onReject, onExit, isMobile, t }) {
  const [expanded, setExpanded] = useState(false);

  const availableSlots = slots.filter(
    slot => slot.status === "AVAILABLE" && slot.vehicle_type === r.vehicle_type
  );

  const isPending  = r.status === "PENDING";
  const isApproved = r.status === "APPROVED";
  const hasSlot    = !!r.assigned_spot;

  const stripColor = {
    PENDING:   "#f59e0b",
    APPROVED:  "#10b981",
    REJECTED:  "#ef4444",
    COMPLETED: "#8b5cf6",
  }[r.status] || "#10b981";

  return (
    <div className="gp-card animate-fadeIn shadow-xs hover:shadow-md transition-all">
      <div className="gp-card-strip" style={{ background: stripColor }} />
      <div className="gp-card-inner">
        <div className="gp-card-top">
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div className="gp-avatar" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#6366F1", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
              <MdDirectionsCar size={22} />
            </div>
            <div>
              <p className="gp-guest-name text-primary font-black text-sm">{r.guest_name}</p>
              <p className="gp-vehicle-num text-xs font-mono font-extrabold text-secondary tracking-wider">{r.vehicle_number}</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <StatusBadge status={r.status} t={t} />
            {isMobile && (isPending || isApproved) && (
              <button onClick={() => setExpanded(e => !e)} className="gp-expand-btn">
                {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
              </button>
            )}
          </div>
        </div>

        <div className="gp-meta-row">
          <VehicleTypeBadge type={r.vehicle_type} />
          <ParkingTypePill type={r.parking_type} />
          {r.assigned_spot && (
            <span className="gp-assigned-chip font-bold">
              <MdLocalParking size={13} /> {t("gpSlotLabel") || "Slot"} {r.assigned_spot}
            </span>
          )}
        </div>

        {(isPending || isApproved) && (!isMobile || expanded) && (
          <div className="gp-actions-panel animate-fadeIn">
            {isPending && (
              <>
                <div>
                  <label className="gp-select-label">
                    {t("gpAssignSlot") || "Assign Parking Slot"}
                    {availableSlots.length === 0 && (
                      <span className="gp-no-slots-hint">
                        <MdWarning size={12} /> {t("gpNoSlots") || "No slots available"}
                      </span>
                    )}
                  </label>
                  <div style={{ position:"relative" }}>
                    <MdLocalParking size={16} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-secondary)", pointerEvents:"none" }} />
                    <Select
                      className="input gp-slot-select"
                      value={selectedSlot[r.id] || ""}
                      onChange={e => setSelectedSlot({ ...selectedSlot, [r.id]: e.target.value })}
                      disabled={availableSlots.length === 0}
                    >
                      <option value="">{t("gpSelectSlot") || "-- Select Parking Slot --"}</option>
                      {availableSlots.map(slot => (
                        <option key={slot.id} value={slot.slot_number}>Slot {slot.slot_number} (Available)</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="gp-btn-row">
                  <button onClick={() => onAssign(r.id)} className="gp-btn-approve font-black" disabled={!selectedSlot[r.id]}>
                    <MdCheckCircle size={16} /> {t("gpAssignBtn") || "Approve & Assign"}
                  </button>
                  <button onClick={() => onReject(r.id)} className="gp-btn-reject font-black">
                    <MdCancel size={16} /> {t("gpRejectBtn") || "Reject"}
                  </button>
                </div>
              </>
            )}

            {isApproved && hasSlot && (
              <div className="gp-btn-row">
                <button onClick={() => onExit(r.id)} className="gp-btn-exit font-black">
                  <MdExitToApp size={16} /> {t("gpMarkExit") || "Mark Vehicle Exit"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   RESIDENT VEHICLE ENTRY MODAL
═══════════════════════════════════════════════════ */
function ResidentEntryModal({ isOpen, onClose, slots, onCreated, t }) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedSlot,  setSelectedSlot]  = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError,   setSubmitError]   = useState("");

  const availableSlots = lookupResult
    ? slots.filter((s) => s.status === "AVAILABLE" && s.vehicle_type === lookupResult.vehicle_type)
    : [];

  const handleLookup = async () => {
    if (!vehicleNumber.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError("");
    setSelectedSlot("");
    setSubmitError("");
    try {
      const res = await API.get(`/parking/lookup-vehicle?vehicle_number=${vehicleNumber.trim().toUpperCase()}`);
      setLookupResult(res.data);
    } catch (err) {
      setLookupError(err?.response?.data?.message || "Vehicle not registered in this society");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedSlot) {
      setSubmitError("Please select an available parking slot");
      return;
    }
    setSubmitLoading(true);
    setSubmitError("");
    try {
      await API.post("/parking/resident-entry", {
        vehicle_id:     lookupResult.vehicle_id,
        vehicle_number: lookupResult.vehicle_number,
        vehicle_type:   lookupResult.vehicle_type,
        resident_id:    lookupResult.resident_id,
        flat_id:        lookupResult.flat_id,
        assigned_spot:  selectedSlot,
      });
      toast.success(`🚗 Vehicle ${lookupResult.vehicle_number} assigned to slot ${selectedSlot}`);
      setVehicleNumber("");
      setLookupResult(null);
      setSelectedSlot("");
      onClose();
      onCreated();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Failed to create resident parking entry");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleModalClose = () => {
    if (!submitLoading) {
      setVehicleNumber("");
      setLookupResult(null);
      setLookupError("");
      setSelectedSlot("");
      setSubmitError("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Resident Vehicle Lookup & Entry"
      subtitle="Search registered vehicles by license plate and assign a parking slot"
      icon={MdDirectionsCar}
      size="md"
    >
      <div className="space-y-4 pt-1">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="flex items-center rounded-xl bg-card-inner-bg border border-glass-border focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/25 transition-all flex-1 px-3.5 py-1 gap-2.5 shadow-inner">
            <div className="text-cyan-400 shrink-0 flex items-center justify-center pointer-events-none">
              <MdDirectionsCar size={20} />
            </div>
            <input
              type="text"
              className="w-full py-2 text-sm sm:text-base font-extrabold uppercase font-mono tracking-wider text-primary placeholder:text-secondary/50 bg-transparent border-0 outline-none ring-0"
              placeholder="Enter license plate (e.g. TN01AB1234)"
              value={vehicleNumber}
              onChange={(e) => {
                setVehicleNumber(e.target.value.toUpperCase());
                setLookupResult(null);
                setLookupError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              autoFocus
            />
            {vehicleNumber && (
              <button
                type="button"
                onClick={() => {
                  setVehicleNumber("");
                  setLookupResult(null);
                  setLookupError("");
                }}
                className="text-secondary/60 hover:text-primary transition-colors text-xs font-bold px-1 py-1 rounded cursor-pointer shrink-0 border-0 outline-none"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleLookup}
            disabled={lookupLoading || !vehicleNumber.trim()}
            className="py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-md shadow-cyan-600/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shrink-0 border-0 outline-none"
          >
            {lookupLoading ? <Spinner size={15} /> : <MdPersonSearch size={18} />}
            <span>{lookupLoading ? "Searching..." : "Lookup"}</span>
          </button>
        </div>

        {/* Error Message */}
        {lookupError && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <MdWarning size={16} className="shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {/* Vehicle Found HUD Result Card */}
        {lookupResult && (
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 via-card-inner-bg to-card-inner-bg border border-cyan-500/25 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-glass-border/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-black text-sm border border-cyan-500/30 shrink-0">
                  {lookupResult.vehicle_number}
                </span>
                <span className="text-xs font-bold text-primary capitalize truncate">
                  {lookupResult.vehicle_name || "Resident Vehicle"}
                </span>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  Vehicle Type
                </span>
                <span className="font-extrabold text-primary mt-0.5 block capitalize">
                  {lookupResult.vehicle_type === "CAR" ? "🚗 Car / SUV" : lookupResult.vehicle_type === "BIKE" ? "🏍️ Bike" : lookupResult.vehicle_type}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  Resident Owner
                </span>
                <span className="font-bold text-primary mt-0.5 block truncate">
                  {lookupResult.resident_name || "Resident"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  Destination Unit
                </span>
                <span className="font-bold text-accent mt-0.5 block truncate">
                  Flat {lookupResult.flat_number || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  Available Slots
                </span>
                <span className="font-extrabold text-emerald-400 mt-0.5 block">
                  {availableSlots.length} available
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-primary">
                Assign Parking Spot <span className="text-cyan-400">*</span>
              </label>

              <div>
                <Select
                  className="w-full text-xs sm:text-sm font-bold bg-card-inner-bg border-glass-border rounded-xl cursor-pointer"
                  icon={<MdLocalParking size={18} className="text-cyan-400" />}
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  disabled={availableSlots.length === 0}
                >
                  <option value="">
                    {availableSlots.length === 0
                      ? `No available slots for ${lookupResult.vehicle_type}`
                      : `-- Select an available ${lookupResult.vehicle_type} slot --`}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.slot_number}>
                      Slot {slot.slot_number} (Available)
                    </option>
                  ))}
                </Select>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  <MdWarning size={15} /> {submitError}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-glass-border bg-card-inner-bg hover:bg-white/10 text-secondary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={submitLoading || !selectedSlot}
                  className="flex-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-0 outline-none"
                >
                  {submitLoading ? (
                    <>
                      <Spinner size={16} />
                      <span>Authorizing Entry...</span>
                    </>
                  ) : (
                    <>
                      <MdCheckCircle size={18} />
                      <span>Authorize & Assign Slot</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */

export default function GuardParking() {
  const [limit, setLimit] = useState(5);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const isMobile = useIsMobile();
  const { t }    = useLang();

  const [viewMode,     setViewMode]     = useState("visitor");
  const [requests,     setRequests]     = useState([]);
  const [slots,        setSlots]        = useState([]);
  const [counts,       setCounts]       = useState({ ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, COMPLETED: 0 });
  const [initialLoad,  setInitialLoad]  = useState(true);
  const [fetching,     setFetching]     = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({});
  const [showResidentModal, setShowResidentModal] = useState(false);

  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search,    setSearch]    = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  const viewModeRef  = useRef(viewMode);
  const activeTabRef = useRef(activeTab);
  const debSearchRef = useRef(debSearch);
  const pageRef      = useRef(page);

  useEffect(() => { viewModeRef.current  = viewMode;  }, [viewMode]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { debSearchRef.current = debSearch; }, [debSearch]);
  useEffect(() => { pageRef.current      = page;      }, [page]);

  const loadSlots = async () => {
    try {
      const res = await API.get("/parking-slots");
      const d = res.data;
      setSlots(Array.isArray(d) ? d : d?.data || []);
    } catch (err) {
      console.error("Slot fetch error:", err);
    }
  };

  const loadRequests = useCallback(async (pg, q, f, mode, isInit = false, isRefresh = false) => {
    if (isInit) setInitialLoad(true);
    else if (isRefresh) setRefreshing(true);
    else setFetching(true);

    try {
      const params = new URLSearchParams({
        page:         pg,
        limit: limitRef.current,
        filter:       f,
        parking_type: mode === "resident" ? "RESIDENT" : "VISITOR",
        ...(q ? { search: q } : {}),
      });

      const res  = await API.get(`/parking?${params}`);
      const data = res.data;

      setRequests(Array.isArray(data) ? data : data?.data || []);
      setCounts(data?.counts || { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, COMPLETED: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
    loadRequests(1, "", "ALL", "visitor", true);
  }, [loadRequests]);

  useEffect(() => {
    if (initialLoad) return;
    loadRequests(1, debSearch, activeTab, viewMode);
  }, [debSearch]);

  useEffect(() => {
    const onNewRequest = (newRequest) => {
      const currentMode = viewModeRef.current;
      if (currentMode !== "visitor") return;

      const currentTab = activeTabRef.current;
      if (pageRef.current === 1 && (currentTab === "ALL" || currentTab === "PENDING")) {
        setRequests((prev) => {
          if (prev.find((r) => r.id === newRequest.id)) return prev;
          const updated = [newRequest, ...prev];
          return updated.slice(0, limit);
        });
        setCounts((prev) => ({
          ...prev,
          ALL:     prev.ALL     + 1,
          PENDING: prev.PENDING + 1,
        }));
        setTotalItems((prev) => prev + 1);
      } else {
        loadRequests(pageRef.current, debSearchRef.current, currentTab, currentMode);
      }
    };

    const onUpdated = (updated) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );

      const currentTab = activeTabRef.current;
      if (currentTab !== "ALL") {
        loadRequests(pageRef.current, debSearchRef.current, currentTab, viewModeRef.current);
      } else {
        loadSlots();
        loadRequests(pageRef.current, debSearchRef.current, "ALL", viewModeRef.current);
      }
    };

    socket.on("parking_request_new",     onNewRequest);
    socket.on("parking_request_updated", onUpdated);

    return () => {
      socket.off("parking_request_new",     onNewRequest);
      socket.off("parking_request_updated", onUpdated);
    };
  }, [loadRequests]);

  const handleTabChange = (f) => {
    setActiveTab(f);
    loadRequests(1, debSearch, f, viewMode);
  };

  const handlePageChange = (p) => loadRequests(p, debSearch, activeTab, viewMode);

  const handleRefresh = () => {
    loadRequests(page, debSearch, activeTab, viewMode, false, true);
    loadSlots();
  };

  const handleViewMode = (mode) => {
    setViewMode(mode);
    setSearch("");
    setActiveTab("ALL");
    loadRequests(1, "", "ALL", mode, false, true);
  };

  const handleAssign = async (id) => {
    const slot = selectedSlot[id];
    if (!slot) { toast.error(t("gpErrSelectSlot") || "Please select a slot"); return; }
    try {
      await API.put(`/parking/${id}/assign`, { assigned_spot: slot });
      setSelectedSlot({ ...selectedSlot, [id]: "" });
      toast.success("Parking slot assigned successfully!");
      loadSlots();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign slot");
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/parking/${id}/reject`);
      toast.info("Request rejected");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject");
    }
  };

  const handleExit = async (id) => {
    try {
      await API.put(`/parking/${id}/exit`);
      toast.success("Exit recorded successfully!");
      loadSlots();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark exit");
    }
  };

  const tabs = [
    { key: "ALL",       label: t("gpTabAll") || "All Logs", count: counts.ALL },
    { key: "PENDING",   label: t("gpPending") || "Pending", count: counts.PENDING },
    { key: "APPROVED",  label: t("gpApproved") || "Approved", count: counts.APPROVED },
    { key: "REJECTED",  label: t("gpRejected") || "Rejected", count: counts.REJECTED },
    { key: "COMPLETED", label: t("gpCompleted") || "Exited", count: counts.COMPLETED },
  ];

  return (
    <div className="ge-root space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="ge-er flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="ge-er-left flex items-center gap-3">
          <div
            className="ad-page-icon shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.08))",
              color: "#6366F1",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
            }}
          >
            <MdLocalParking size={24} />
          </div>
          <div>
            <h2 className="page-title text-xl font-black text-primary">
              {t("gpTitle") || "Gate Security Parking"}
            </h2>
            <p className="page-subtitle text-xs text-secondary font-medium">
              {counts.ALL} {t("gpSubtitle") || "Visitor & Resident Vehicle Gate Logs"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowResidentModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer border-0 outline-none"
          >
            <MdAdd size={18} />
            <span>+ Resident Vehicle Entry</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border-0 outline-none"
          >
            <MdRefresh size={18} className={refreshing ? "animate-spin text-accent" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── VIEW MODE SWITCHER ── */}
      <div className="flex justify-start">
        <SlidingTabs
          className="gp-mode-tabs"
          value={viewMode}
          onChange={handleViewMode}
          items={[
            { id: "visitor",  label: "Visitor Parking" },
            { id: "resident", label: "Resident Parking" },
          ]}
        />
      </div>

      {/* ── RESIDENT ENTRY MODAL POPUP ── */}
      <ResidentEntryModal
        isOpen={showResidentModal}
        onClose={() => setShowResidentModal(false)}
        slots={slots}
        onCreated={() => {
          loadRequests(1, "", "ALL", viewMode, false, true);
          loadSlots();
        }}
        t={t}
      />

      {/* ── KPI STAT CARDS ── */}
      {!initialLoad && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => handleTabChange("ALL")}
            className={`complaint-stat-card complaint-stat-total cursor-pointer transition-all ${
              activeTab === "ALL" ? "ring-2 ring-indigo-500 shadow-md scale-101" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="complaint-stat-val text-indigo-600">{counts.ALL}</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <MdLocalParking size={18} />
              </div>
            </div>
            <span className="complaint-stat-label">Total Parking Logs</span>
          </div>

          <div
            onClick={() => handleTabChange("PENDING")}
            className={`complaint-stat-card complaint-stat-inprogress cursor-pointer transition-all ${
              activeTab === "PENDING" ? "ring-2 ring-amber-500 shadow-md scale-101" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="complaint-stat-val text-amber-500">{counts.PENDING}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <MdWarning size={18} />
              </div>
            </div>
            <span className="complaint-stat-label">Pending Approval</span>
          </div>

          <div
            onClick={() => handleTabChange("APPROVED")}
            className={`complaint-stat-card complaint-stat-resolved cursor-pointer transition-all ${
              activeTab === "APPROVED" ? "ring-2 ring-emerald-500 shadow-md scale-101" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="complaint-stat-val text-emerald-600">{counts.APPROVED}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <MdCheckCircle size={18} />
              </div>
            </div>
            <span className="complaint-stat-label">Currently Parked</span>
          </div>

          <div
            onClick={() => handleTabChange("COMPLETED")}
            className={`complaint-stat-card complaint-stat-resolved cursor-pointer transition-all ${
              activeTab === "COMPLETED" ? "ring-2 ring-purple-500 shadow-md scale-101" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="complaint-stat-val text-purple-600">{counts.COMPLETED}</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <MdDone size={18} />
              </div>
            </div>
            <span className="complaint-stat-label">Exited / Completed</span>
          </div>
        </div>
      )}

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      {!initialLoad && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-2 rounded-2xl border border-glass-border shadow-xs">
          <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
            <SlidingTabs
              value={activeTab}
              onChange={handleTabChange}
              items={tabs.map(({ key, label, count }) => ({
                id: key,
                label: `${label} (${count})`,
              }))}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ToggleSearchBar
              value={search}
              onChange={setSearch}
              placeholder={t("gpSearchPlaceholder") || "Search guest, vehicle..."}
            />
          </div>
        </div>
      )}

      {/* ── PARKING LIST ── */}
      {initialLoad ? (
        <div className="p-12 text-center text-secondary bg-card rounded-2xl border border-glass-border">
          <Spinner size={24} />
          <p className="mt-2 text-xs font-bold">{t("gpLoading") || "Loading parking entries..."}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-glass-border space-y-2">
          <div className="text-3xl">{viewMode === "resident" ? "🏠" : "🅿️"}</div>
          <p className="text-sm font-extrabold text-primary">
            {viewMode === "resident"
              ? "No Resident Parking Entries Yet"
              : activeTab === "ALL" ? t("gpEmptyAll") || "No Parking Entries Recorded" : `No ${activeTab.toLowerCase()} requests`}
          </p>
          <p className="text-xs text-secondary">
            {viewMode === "resident"
              ? "Use the '+ Resident Vehicle Entry' button above to assign a slot to a registered resident vehicle."
              : t("gpEmptySub") || "Gate parking entries will appear here."}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs font-bold text-accent cursor-pointer border-0 bg-transparent mt-2"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map(r => (
              <RequestCard
                key={r.id}
                r={r}
                slots={slots}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                onAssign={handleAssign}
                onReject={handleReject}
                onExit={handleExit}
                isMobile={isMobile}
                t={t}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-secondary font-medium">
              Showing <strong>{(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}</strong> of <strong>{totalItems}</strong> parking entries
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
          </div>
        </>
      )}
    </div>
  );
}