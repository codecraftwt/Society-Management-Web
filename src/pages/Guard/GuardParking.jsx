
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
    <svg style={{ color: "var(--accent,#5B8DEF)", margin: "0 auto", width: size, height: size, animation: "spin 0.8s linear infinite" }}
      viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }} />
      <path fill="currentColor" style={{ opacity: 0.85 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const cfg = {
    PENDING:   { label: t("gpPending") || "Pending",   Icon: MdWarning,      color: "#60A5FA", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.28)"  },
    APPROVED:  { label: t("gpApproved"),                Icon: MdCheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.28)"  },
    REJECTED:  { label: t("gpRejected"),                Icon: MdCancel,      color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.28)" },
    COMPLETED: { label: t("gpCompleted"),               Icon: MdDone,        color: "#9F87D7", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.28)" },
  }[status] || { label: status, Icon: MdCheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.28)" };

  return (
    <span className="gp-status-badge" style={{ color: cfg.color, background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
      <cfg.Icon size={12} /> {cfg.label}
    </span>
  );
}

const VEHICLE_CFG = {
  CAR:  { emoji: "🚗", label: "Car",  color: "#94B5F5", bg: "rgba(148,181,245,0.10)",  border: "rgba(148,181,245,0.22)"  },
  BIKE: { emoji: "🏍️", label: "Bike", color: "#9F87D7", bg: "rgba(159,135,215,0.10)", border: "rgba(159,135,215,0.22)" },
};

function VehicleTypeBadge({ type }) {
  const cfg = VEHICLE_CFG[type?.toUpperCase()] || {
    emoji: "🚘", label: type, color: "#A39EB2",
    bg: "rgba(163,158,178,0.10)", border: "rgba(163,158,178,0.22)",
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
      color: isResident ? "#60A5FA" : "#94B5F5",
      background: isResident ? "rgba(251,191,36,0.10)" : "rgba(148,181,245,0.10)",
      border: `1px solid ${isResident ? "rgba(251,191,36,0.25)" : "rgba(148,181,245,0.22)"}`,
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
    PENDING:   "#60A5FA",
    APPROVED:  "#4ade80",
    REJECTED:  "#f87171",
    COMPLETED: "#9F87D7",
  }[r.status] || "#4ade80";

  return (
    <div className="gp-card animate-fadeIn">
      <div className="gp-card-strip" style={{ background: stripColor }} />
      <div className="gp-card-inner">
        <div className="gp-card-top">
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div className="gp-avatar"><MdDirectionsCar size={20} /></div>
            <div>
              <p className="gp-guest-name">{r.guest_name}</p>
              <p className="gp-vehicle-num">{r.vehicle_number}</p>
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
            <span className="gp-assigned-chip">
              <MdLocalParking size={12} /> {t("gpSlotLabel")} {r.assigned_spot}
            </span>
          )}
        </div>

        {(isPending || isApproved) && (!isMobile || expanded) && (
          <div className="gp-actions-panel animate-fadeIn">
            {isPending && (
              <>
                <div>
                  <label className="gp-select-label">
                    {t("gpAssignSlot")}
                    {availableSlots.length === 0 && (
                      <span className="gp-no-slots-hint">
                        <MdWarning size={12} /> {t("gpNoSlots")}
                      </span>
                    )}
                  </label>
                  <div style={{ position:"relative" }}>
                    <MdLocalParking size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-secondary)", pointerEvents:"none" }} />
                    <Select
                      className="input gp-slot-select"
                      value={selectedSlot[r.id] || ""}
                      onChange={e => setSelectedSlot({ ...selectedSlot, [r.id]: e.target.value })}
                      disabled={availableSlots.length === 0}
                    >
                      <option value="">{t("gpSelectSlot")}</option>
                      {availableSlots.map(slot => (
                        <option key={slot.id} value={slot.slot_number}>{slot.slot_number}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="gp-btn-row">
                  <button onClick={() => onAssign(r.id)} className="gp-btn-approve" disabled={!selectedSlot[r.id]}>
                    <MdCheckCircle size={15} /> {t("gpAssignBtn")}
                  </button>
                  <button onClick={() => onReject(r.id)} className="gp-btn-reject">
                    <MdCancel size={15} /> {t("gpRejectBtn")}
                  </button>
                </div>
              </>
            )}

            {isApproved && hasSlot && (
              <div className="gp-btn-row">
                <button onClick={() => onExit(r.id)} className="gp-btn-exit">
                  <MdExitToApp size={15} /> {t("gpMarkExit")}
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
   RESIDENT VEHICLE ENTRY PANEL
═══════════════════════════════════════════════════ */
function ResidentEntryPanel({ slots, onCreated, t }) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedSlot,  setSelectedSlot]  = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError,   setSubmitError]   = useState("");

  const availableSlots = lookupResult
    ? slots.filter(s => s.status === "AVAILABLE" && s.vehicle_type === lookupResult.vehicle_type)
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
      setLookupError(err?.response?.data?.message || "Vehicle not found");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedSlot) { setSubmitError("Please select a parking slot"); return; }
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
      setVehicleNumber("");
      setLookupResult(null);
      setSelectedSlot("");
      onCreated();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Failed to create entry");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{
      background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
      border: "1.5px solid rgba(251,191,36,0.25)",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>🏠</span>
        <div>
          <p style={{ margin:0, fontWeight:800, fontSize:14, color:"var(--text-primary)" }}>Resident Vehicle Entry</p>
          <p style={{ margin:0, fontSize:12, color:"var(--text-secondary)" }}>Look up a registered vehicle and assign a slot directly</p>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <MdDirectionsCar size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-secondary)", pointerEvents:"none" }} />
          <input
            className="input"
            style={{ paddingLeft:34, height:42, fontSize:13, fontWeight:600, textTransform:"uppercase" }}
            placeholder="Enter vehicle number (e.g. TN01AB1234)"
            value={vehicleNumber}
            onChange={e => { setVehicleNumber(e.target.value.toUpperCase()); setLookupResult(null); setLookupError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
          />
        </div>
        <button
          onClick={handleLookup}
          disabled={lookupLoading || !vehicleNumber.trim()}
          style={{
            display:"flex", alignItems:"center", gap:7,
            padding:"0 18px", height:42, borderRadius:11,
            fontSize:13, fontWeight:700,
            background:"linear-gradient(135deg,#2563EB,#3B82F6)",
            color:"#fff", border:"none", cursor:"pointer",
            opacity: (!vehicleNumber.trim() || lookupLoading) ? 0.5 : 1,
            boxShadow:"0 4px 14px rgba(217,119,6,0.30)",
          }}
        >
          {lookupLoading ? <Spinner size={14} /> : <MdPersonSearch size={16} />}
          Lookup
        </button>
      </div>

      {lookupError && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,0.10)", border:"1px solid rgba(248,113,113,0.28)", color:"#f87171", fontSize:13, fontWeight:600 }}>
          <MdWarning size={15} /> {lookupError}
        </div>
      )}

      {lookupResult && (
        <div style={{ display:"flex", flexDirection:"column", gap:14, padding:16, borderRadius:14, background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.20)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
            {[
              { label:"Vehicle",  value: lookupResult.vehicle_name || lookupResult.vehicle_number },
              { label:"Number",   value: lookupResult.vehicle_number },
              { label:"Type",     value: lookupResult.vehicle_type },
              { label:"Resident", value: lookupResult.resident_name },
              { label:"Flat",     value: lookupResult.flat_number },
            ].map(({ label, value }) => (
              <div key={label} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-secondary)" }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)" }}>{value}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="gp-select-label">
              Assign Parking Slot
              {availableSlots.length === 0 && (
                <span className="gp-no-slots-hint"><MdWarning size={12} /> No slots available for {lookupResult.vehicle_type}</span>
              )}
            </label>
            <div style={{ position:"relative" }}>
              <MdLocalParking size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-secondary)", pointerEvents:"none" }} />
              <Select
                className="input gp-slot-select"
                value={selectedSlot}
                onChange={e => setSelectedSlot(e.target.value)}
                disabled={availableSlots.length === 0}
              >
                <option value="">Select a slot</option>
                {availableSlots.map(slot => (
                  <option key={slot.id} value={slot.slot_number}>{slot.slot_number}</option>
                ))}
              </Select>
            </div>
          </div>

          {submitError && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,0.10)", border:"1px solid rgba(248,113,113,0.28)", color:"#f87171", fontSize:13, fontWeight:600 }}>
              <MdWarning size={15} /> {submitError}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={submitLoading || !selectedSlot}
            style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              padding:"11px 0", borderRadius:11, fontSize:13, fontWeight:700,
              background:"linear-gradient(135deg,#16a34a,#22c55e)",
              color:"#fff", border:"none", cursor:"pointer",
              opacity: (!selectedSlot || submitLoading) ? 0.5 : 1,
              boxShadow:"0 4px 14px rgba(22,163,74,0.30)",
            }}
          >
            {submitLoading ? <Spinner size={15} /> : <MdAdd size={16} />}
            {submitLoading ? "Creating entry..." : "Create Resident Parking Entry"}
          </button>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const LIMIT = 5;

export default function GuardParking() {
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

  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search,    setSearch]    = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  // ✅ Refs so socket handlers always see current values without re-registering
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
        limit:        LIMIT,
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

  /* ── Initial load ── */
  useEffect(() => {
    loadSlots();
    loadRequests(1, "", "ALL", "visitor", true);
  }, [loadRequests]);

  /* ── Re-fetch on debounced search ── */
  useEffect(() => {
    if (initialLoad) return;
    loadRequests(1, debSearch, activeTab, viewMode);
  }, [debSearch]); // eslint-disable-line

  /* ── Socket listeners for real-time updates ── */
  useEffect(() => {
    const onNewRequest = (newRequest) => {
      const currentMode = viewModeRef.current;

      // ✅ Only react if guard is viewing visitor parking
      if (currentMode !== "visitor") return;

      // ✅ Add new request to top of list if on page 1 and ALL/PENDING tab
      const currentTab = activeTabRef.current;
      if (pageRef.current === 1 && (currentTab === "ALL" || currentTab === "PENDING")) {
        setRequests((prev) => {
          // Don't add if already exists
          if (prev.find((r) => r.id === newRequest.id)) return prev;
          const updated = [newRequest, ...prev];
          return updated.slice(0, LIMIT); // keep page size
        });
        setCounts((prev) => ({
          ...prev,
          ALL:     prev.ALL     + 1,
          PENDING: prev.PENDING + 1,
        }));
        setTotalItems((prev) => prev + 1);
      } else {
        // On other pages/tabs, just refresh to keep counts accurate
        loadRequests(pageRef.current, debSearchRef.current, currentTab, currentMode);
      }
    };

    const onUpdated = (updated) => {
      // ✅ Update the card in-place — no full reload needed
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );

      // ✅ Recount: easiest way is a silent background refresh of counts only
      // We do a full reload but only if the status change affects current tab visibility
      const currentTab = activeTabRef.current;
      if (currentTab !== "ALL") {
        // If filtered tab, the card may need to disappear — reload
        loadRequests(pageRef.current, debSearchRef.current, currentTab, viewModeRef.current);
      } else {
        // On ALL tab: update counts by refreshing slots + doing a background count refresh
        loadSlots();
        // Refresh counts silently by reloading (setFetching won't flash because it's fast)
        loadRequests(pageRef.current, debSearchRef.current, "ALL", viewModeRef.current);
      }
    };

    socket.on("parking_request_new",     onNewRequest);
    socket.on("parking_request_updated", onUpdated);

    return () => {
      socket.off("parking_request_new",     onNewRequest);
      socket.off("parking_request_updated", onUpdated);
    };
  }, [loadRequests]); // ✅ stable — loadRequests is memoized, refs handle the rest

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
    if (!slot) { alert(t("gpErrSelectSlot")); return; }
    try {
      await API.put(`/parking/${id}/assign`, { assigned_spot: slot });
      setSelectedSlot({ ...selectedSlot, [id]: "" });
      // ✅ Socket will handle the UI update — no need to reload here
      // But reload slots since one was just assigned
      loadSlots();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to assign slot");
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/parking/${id}/reject`);
      // ✅ Socket will handle the UI update
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reject");
    }
  };

  const handleExit = async (id) => {
    try {
      await API.put(`/parking/${id}/exit`);
      // ✅ Socket will handle the UI update
      loadSlots();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to mark exit");
    }
  };

  const tabs = [
    { key: "ALL",       label: t("gpTabAll"),    count: counts.ALL       },
    { key: "PENDING",   label: t("gpPending") || "Pending", count: counts.PENDING  },
    { key: "APPROVED",  label: t("gpApproved"),  count: counts.APPROVED  },
    { key: "REJECTED",  label: t("gpRejected"),  count: counts.REJECTED  },
    { key: "COMPLETED", label: t("gpCompleted"), count: counts.COMPLETED },
  ];

  const statCards = [
    { key: "total",     label: t("gpStatTotal"),          val: counts.ALL       },
    { key: "pending",   label: t("gpPending") || "Pending", val: counts.PENDING },
    { key: "approved",  label: t("gpApproved"),            val: counts.APPROVED  },
    { key: "completed", label: t("gpCompleted"),           val: counts.COMPLETED },
  ];

  return (
    <>
      <style>{`
        .gp-root{display:flex;flex-direction:column;gap:20px;padding-bottom:24px;}
        .gp-er{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
        .gp-er-left{display:flex;align-items:center;gap:14px;}
        .gp-er-icon{width:48px;height:48px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(91,141,239,0.15),rgba(107,70,193,0.12));border:1.5px solid rgba(91,141,239,0.25);color:#94B5F5;}
        .gp-er-title{font-size:20px;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em;margin:0;}
        .gp-er-sub{font-size:12px;color:var(--text-secondary);margin-top:2px;}
        .gp-refresh-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;background:var(--card-inner-bg,rgba(255,255,255,0.06));border:1px solid var(--glass-border);color:var(--text-secondary);cursor:pointer;transition:all 0.2s;}
        .gp-refresh-btn:hover{color:var(--text-primary);}
        .gp-refresh-btn svg{transition:transform 0.6s;}
        .gp-refresh-btn.spinning svg{animation:spin 0.8s linear infinite;}
        .gp-mode-switcher{display:flex;gap:8px;padding:5px;background:var(--card-inner-bg,rgba(255,255,255,0.05));border:1.5px solid var(--glass-border);border-radius:14px;width:fit-content;}
        .gp-mode-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:all 0.18s;background:transparent;color:var(--text-secondary);}
        .gp-mode-btn:hover{color:var(--text-primary);}
        .gp-mode-btn--visitor.active{background:linear-gradient(135deg,#3E60A3,#5B8DEF);color:#fff;box-shadow:0 3px 12px rgba(91,141,239,0.35);}
        .gp-mode-btn--resident.active{background:linear-gradient(135deg,#1E40AF,#2563EB);color:#fff;box-shadow:0 3px 12px rgba(217,119,6,0.35);}
        .gp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
        .gp-stat{border-radius:16px;padding:14px 16px;border:1.5px solid;display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden;transition:transform 0.2s;}
        .gp-stat::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;border-radius:16px 16px 0 0;}
        .gp-stat:hover{transform:translateY(-2px);}
        .gp-stat__val{font-size:26px;font-weight:800;letter-spacing:-0.04em;line-height:1;}
        .gp-stat__label{font-size:10px;font-weight:600;opacity:0.75;letter-spacing:0.03em;text-transform:uppercase;}
        .gp-stat--total{background:linear-gradient(135deg,rgba(107,70,193,0.12),rgba(91,141,239,0.08));border-color:rgba(107,70,193,0.28);}
        .gp-stat--total::before{background:linear-gradient(90deg,#6B46C1,#5B8DEF);}
        .gp-stat--total .gp-stat__val,.gp-stat--total .gp-stat__label{color:#C0B0E5;}
        .gp-stat--pending{background:rgba(37,99,235,0.10);border-color:rgba(37,99,235,0.28);}
        .gp-stat--pending::before{background:linear-gradient(90deg,#2563EB,#60A5FA);}
        .gp-stat--pending .gp-stat__val,.gp-stat--pending .gp-stat__label{color:#93C5FD;}
        .gp-stat--approved{background:rgba(74,222,128,0.10);border-color:rgba(74,222,128,0.28);}
        .gp-stat--approved::before{background:linear-gradient(90deg,#22c55e,#4ade80);}
        .gp-stat--approved .gp-stat__val,.gp-stat--approved .gp-stat__label{color:#86efac;}
        .gp-stat--completed{background:rgba(129,140,248,0.10);border-color:rgba(129,140,248,0.28);}
        .gp-stat--completed::before{background:linear-gradient(90deg,#6B46C1,#9F87D7);}
        .gp-stat--completed .gp-stat__val,.gp-stat--completed .gp-stat__label{color:#DAD1F0;}
        .gp-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .gp-search-wrap{position:relative;flex:1;min-width:180px;max-width:320px;}
        .gp-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-secondary);pointer-events:none;}
        .gp-search-input{width:100%;padding:9px 36px 9px 36px;border-radius:10px;font-size:13px;font-weight:500;background:var(--card-inner-bg,rgba(255,255,255,0.06));border:1.5px solid var(--glass-border);color:var(--text-primary);outline:none;transition:border-color 0.2s;}
        .gp-search-input:focus{border-color:var(--accent,#5B8DEF);}
        .gp-search-input::placeholder{color:var(--text-secondary);}
        .gp-tabs{display:flex;gap:6px;flex-wrap:wrap;background:var(--card-inner-bg,rgba(255,255,255,0.05));border:1.5px solid var(--glass-border);border-radius:14px;padding:5px;}
        .gp-tab{flex:1;min-width:70px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all 0.18s;background:transparent;color:var(--text-secondary);white-space:nowrap;}
        .gp-tab:hover{color:var(--text-primary);}
        .gp-tab--active-all{background:linear-gradient(135deg,#5A3BA2,#6B46C1);color:#fff;box-shadow:0 3px 10px rgba(90,59,162,0.35);}
        .gp-tab--active-pending{background:linear-gradient(135deg,#2563EB,#60A5FA);color:#fff;box-shadow:0 3px 10px rgba(37,99,235,0.35);}
        .gp-tab--active-approved{background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;box-shadow:0 3px 10px rgba(22,163,74,0.35);}
        .gp-tab--active-rejected{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 3px 10px rgba(239,68,68,0.35);}
        .gp-tab--active-completed{background:linear-gradient(135deg,#493083,#6B46C1);color:#fff;box-shadow:0 3px 10px rgba(107,70,193,0.35);}
        .gp-tab-count{background:rgba(255,255,255,0.15);color:inherit;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;line-height:1.6;}
        .gp-tab:not([class*="active"]) .gp-tab-count{background:var(--glass-border);color:var(--text-secondary);}
        @media(max-width:767px){.gp-tab-count{display:none;}}
        .gp-card{display:flex;background:var(--card-bg,rgba(15,23,42,0.7));border:1.5px solid var(--glass-border);border-radius:18px;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;}
        .gp-card:hover{border-color:rgba(107,70,193,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.18);}
        .gp-card-strip{width:4px;flex-shrink:0;}
        .gp-card-inner{flex:1;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0;}
        .gp-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
        .gp-avatar{width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(91,141,239,0.14),rgba(107,70,193,0.10));border:1px solid rgba(91,141,239,0.2);color:#94B5F5;}
        .gp-guest-name{font-size:14px;font-weight:700;color:var(--text-primary);margin:0;line-height:1.2;}
        .gp-vehicle-num{font-size:12px;color:var(--text-secondary);margin:3px 0 0;font-weight:600;letter-spacing:0.04em;}
        .gp-status-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;}
        .gp-meta-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;}
        .gp-assigned-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(91,141,239,0.10);color:#94B5F5;border:1px solid rgba(91,141,239,0.22);}
        .gp-actions-panel{background:var(--card-inner-bg,rgba(255,255,255,0.04));border:1px solid var(--glass-border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;}
        .gp-select-label{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:6px;}
        .gp-no-slots-hint{display:flex;align-items:center;gap:3px;font-size:10px;color:#f87171;background:rgba(248,113,113,0.10);border:1px solid rgba(248,113,113,0.22);padding:2px 7px;border-radius:999px;font-weight:700;}
        .gp-slot-select{padding-left:34px !important;height:42px;font-size:13px;font-weight:600;}
        .gp-slot-select:disabled{opacity:0.5;cursor:not-allowed;}
        .gp-btn-row{display:flex;gap:10px;}
        .gp-btn-approve{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 0;border-radius:11px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.30);transition:all 0.2s;}
        .gp-btn-approve:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,0.45);}
        .gp-btn-approve:disabled{opacity:0.45;cursor:not-allowed;transform:none;box-shadow:none;}
        .gp-btn-reject{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 0;border-radius:11px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(239,68,68,0.28);transition:all 0.2s;}
        .gp-btn-reject:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(239,68,68,0.42);}
        .gp-btn-exit{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 0;border-radius:11px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#493083,#6B46C1);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(107,70,193,0.30);transition:all 0.2s;}
        .gp-btn-exit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(107,70,193,0.45);}
        .gp-expand-btn{width:30px;height:30px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--card-inner-bg,rgba(255,255,255,0.06));border:1px solid var(--glass-border);cursor:pointer;color:var(--text-secondary);transition:all 0.18s;}
        .gp-expand-btn:hover{color:var(--text-primary);}
        .gp-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:60px 20px;color:var(--text-secondary);}
        .gp-empty-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:var(--card-inner-bg,rgba(255,255,255,0.06));border:1.5px solid var(--glass-border);font-size:24px;}
        .gp-list{display:flex;flex-direction:column;gap:12px;}
        .gp-footer{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:4px;}
        .gp-footer-text{font-size:12px;color:var(--text-secondary);}
        .gp-footer-text strong{color:var(--text-primary);}
        @keyframes spin{to{transform:rotate(360deg);}}
        @media(max-width:640px){
          .gp-stats{grid-template-columns:repeat(2,1fr);gap:8px;}
          .gp-stat{padding:12px 14px;border-radius:14px;}
          .gp-stat__val{font-size:22px;}
          .gp-tabs{border-radius:12px;padding:4px;gap:4px;}
          .gp-tab{font-size:11px;padding:7px 8px;}
          .gp-card-inner{padding:13px 14px;}
          .gp-actions-panel{padding:12px;}
          .gp-search-wrap{max-width:100%;}
          .gp-mode-switcher{width:100%;}
          .gp-mode-btn{flex:1;justify-content:center;}
        }
      `}</style>

      <div className="page-root gp-root">

        {/* ── HEADER ── */}
        <div className="gp-er">
          <div className="gp-er-left">
            <div className="gp-er-icon"><MdLocalParking size={24} /></div>
            <div>
              <h2 className="gp-er-title">{t("gpTitle")}</h2>
              <p className="gp-er-sub">{counts.ALL} {t("gpSubtitle")}</p>
            </div>
          </div>
          <button onClick={handleRefresh} className={`gp-refresh-btn ${refreshing ? "spinning" : ""}`}>
            <MdRefresh size={15} />
            {refreshing ? t("gpRefreshing") : t("gpRefresh")}
          </button>
        </div>

        {/* ── VIEW MODE SWITCHER ── */}
        <div className="gp-mode-switcher">
          <button
            onClick={() => handleViewMode("visitor")}
            className={`gp-mode-btn gp-mode-btn--visitor ${viewMode === "visitor" ? "active" : ""}`}
          >
            👤 Visitor Parking
          </button>
          <button
            onClick={() => handleViewMode("resident")}
            className={`gp-mode-btn gp-mode-btn--resident ${viewMode === "resident" ? "active" : ""}`}
          >
            🏠 Resident Parking
          </button>
        </div>

        {/* ── RESIDENT ENTRY PANEL ── */}
        {viewMode === "resident" && (
          <ResidentEntryPanel
            slots={slots}
            onCreated={() => {
              loadRequests(1, "", "ALL", "resident", false, true);
              loadSlots();
            }}
            t={t}
          />
        )}

        {/* ── STAT CARDS ── */}
        {!initialLoad && counts.ALL > 0 && (
          <div className="gp-stats">
            {statCards.map(s => (
              <div key={s.key} className={`gp-stat gp-stat--${s.key}`}>
                <div className="gp-stat__val">{s.val}</div>
                <div className="gp-stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SEARCH + TABS ── */}
        {!initialLoad && counts.ALL > 0 && (
          <>
            <div className="gp-toolbar">
              <div className="gp-search-wrap">
                <MdSearch className="gp-search-icon" size={17} />
                <input
                  className="gp-search-input"
                  placeholder={t("gpSearchPlaceholder") || "Search guest, vehicle..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingRight: search || fetching ? 36 : 12 }}
                />
                {fetching && !initialLoad ? (
                  <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)" }}>
                    <Spinner size={13} />
                  </div>
                ) : search ? (
                  <button
                    onClick={() => setSearch("")}
                    style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-secondary)", display:"flex", alignItems:"center" }}
                  >
                    <MdClose size={13} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="gp-tabs">
              {tabs.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                    className={`gp-tab ${isActive ? `gp-tab--active-${tab.key.toLowerCase()}` : ""}`}>
                    {tab.label}
                    <span className="gp-tab-count">{tab.count}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── LIST ── */}
        {initialLoad ? (
          <div className="gp-empty">
            <Spinner size={24} />
            <p style={{ fontSize:13, margin:0 }}>{t("gpLoading")}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="gp-empty">
            <div className="gp-empty-icon">{viewMode === "resident" ? "🏠" : "🅿️"}</div>
            <p style={{ fontSize:14, fontWeight:700, margin:0, color:"var(--text-primary)" }}>
              {viewMode === "resident"
                ? "No resident parking entries yet"
                : activeTab === "ALL" ? t("gpEmptyAll") : `${t("gpEmptyStatus")} ${activeTab.toLowerCase()}`}
            </p>
            <p style={{ fontSize:12, margin:0 }}>
              {viewMode === "resident"
                ? "Use the lookup panel above to add a resident vehicle entry"
                : t("gpEmptySub")}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ fontSize:12, fontWeight:600, color:"var(--accent)", background:"none", border:"none", cursor:"pointer", marginTop:4 }}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="gp-list">
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

            <div className="gp-footer">
              <span className="gp-footer-text">
                Showing{" "}
                <strong>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong>{" "}
                of <strong>{totalItems}</strong> requests
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}

      </div>
    </>
  );
}