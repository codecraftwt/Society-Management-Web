import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdDelete, MdDirectionsCarFilled,
  MdTwoWheeler, MdClose, MdCheckCircle,
  MdLocalParking, MdApartment, MdHome,
  MdSend, MdWarning, MdInfo, MdHourglassEmpty,
  MdDirectionsCar,
} from "react-icons/md";
import { FaParking } from "react-icons/fa";
import Select from "../../components/common/Select";

function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size, animation: "spin 0.8s linear infinite", display: "inline-block" }}
      viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

const VEHICLE_ICON = {
  CAR:  <MdDirectionsCarFilled style={{ fontSize: 20, color: "#94B5F5" }} />,
  BIKE: <MdTwoWheeler          style={{ fontSize: 20, color: "#9F87D7" }} />,
};
const TYPE_LABEL = { CAR: "Car 🚗", BIKE: "Bike 🏍️" };

/* ── Allocated Slot Card ── */
function AllocatedSlotCard({ slot }) {
  const isCAR = slot.vehicle_type === "CAR";
  const ac    = isCAR ? "#94B5F5" : "#9F87D7";
  const abg   = isCAR ? "rgba(148,181,245,0.10)"  : "rgba(159,135,215,0.10)";
  const abdr  = isCAR ? "rgba(148,181,245,0.22)"  : "rgba(159,135,215,0.22)";

  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg,rgba(255,255,255,0.04))", overflow: "hidden" }}>
      {slot.flat && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderBottom:"1px solid var(--glass-border)", background:"rgba(255,255,255,0.03)" }}>
          <MdApartment style={{ color:"var(--text-secondary)", fontSize:15 }} />
          <span style={{ fontSize:12, color:"var(--text-secondary)", fontWeight:700, letterSpacing:"0.04em" }}>
            Flat {slot.flat.flat_number}{slot.flat.floor_id != null && ` · Floor ${slot.flat.floor_id}`}
          </span>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", background:abg, border:`1px solid ${abdr}` }}>
            {isCAR
              ? <MdDirectionsCarFilled style={{ fontSize:22, color:ac }} />
              : <MdTwoWheeler          style={{ fontSize:22, color:ac }} />}
          </div>
          <div>
            <p style={{ margin:0, fontWeight:800, fontSize:18, letterSpacing:"0.04em", color:"var(--text-primary)", fontFamily:"monospace" }}>
              {slot.slot_number}
            </p>
            <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--text-secondary)", fontWeight:600 }}>
              {TYPE_LABEL[slot.vehicle_type] || slot.vehicle_type}
              {slot.parking_floor && <> &nbsp;·&nbsp; Level {slot.parking_floor}</>}
            </p>
            {slot.linked_vehicle ? (
  <p
    style={{
      margin: "4px 0 0",
      fontSize: 11,
      color: "#C0B0E5",
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontWeight: 700,
    }}
  >
    <MdDirectionsCarFilled size={11} />

    {slot.linked_vehicle.vehicle_number}

    {slot.linked_vehicle.vehicle_name && (
      <span
        style={{
          color: "var(--text-secondary)",
          fontWeight: 500,
        }}
      >
        · {slot.linked_vehicle.vehicle_name}
      </span>
    )}
  </p>
) : (
              <p style={{ margin:"4px 0 0", fontSize:11, color:"#60A5FA", fontWeight:600 }}>
                No vehicle linked yet — add a vehicle to claim this slot
              </p>
            )}
          </div>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}>
          {/* DEFAULT / EXTRA badge */}
          <span style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: slot.parking_type === "DEFAULT" ? "rgba(74,222,128,0.10)" : "rgba(251,191,36,0.10)",
            color: slot.parking_type === "DEFAULT" ? "#4ade80" : "#60A5FA",
            border: `1px solid ${slot.parking_type === "DEFAULT" ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
          }}>
            {slot.parking_type === "DEFAULT" ? "Default" : "Extra"}
          </span>
          {/* Occupancy badge */}
          <span style={{
            padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
            background: slot.linked_vehicle ? "rgba(148,181,245,0.10)" : "rgba(255,255,255,0.05)",
            color: slot.linked_vehicle ? "#94B5F5" : "var(--text-secondary)",
            border: `1px solid ${slot.linked_vehicle ? "rgba(148,181,245,0.25)" : "rgba(255,255,255,0.08)"}`,
          }}>
            {slot.linked_vehicle ? "Occupied" : "Unlinked"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Status badge for parking requests ── */
function ReqStatusBadge({ status }) {
  const cfg = {
    PENDING:   { label:"Pending",   color:"#60A5FA", bg:"rgba(251,191,36,0.12)",  border:"rgba(251,191,36,0.28)"  },
    APPROVED:  { label:"Approved",  color:"#4ade80", bg:"rgba(74,222,128,0.12)",  border:"rgba(74,222,128,0.28)"  },
    REJECTED:  { label:"Rejected",  color:"#f87171", bg:"rgba(248,113,113,0.12)", border:"rgba(248,113,113,0.28)" },
    COMPLETED: { label:"Completed", color:"#9F87D7", bg:"rgba(129,140,248,0.12)", border:"rgba(129,140,248,0.28)" },
  }[status] || { label:status, color:"#A39EB2", bg:"rgba(163,158,178,0.10)", border:"rgba(163,158,178,0.22)" };

  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

/* ── Slot Picker Option ── */
function SlotPickerOption({ slot, isSelected, isOccupied, onSelect }) {
  const isDefault = slot.parking_type === "DEFAULT";

  return (
    <button
      type="button"
      disabled={isOccupied}
      onClick={() => !isOccupied && onSelect(slot.id)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "13px 16px",
        borderRadius: 12,
        border: `2px solid ${
          isSelected
            ? "#6B46C1"
            : isOccupied
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.09)"
        }`,
        background: isSelected
          ? "rgba(107,70,193,0.10)"
          : isOccupied
          ? "rgba(255,255,255,0.02)"
          : "rgba(255,255,255,0.04)",
        cursor: isOccupied ? "not-allowed" : "pointer",
        opacity: isOccupied ? 0.55 : 1,
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      {/* Left: radio + slot info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Radio circle */}
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `2px solid ${isSelected ? "#6B46C1" : isOccupied ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)"}`,
          background: isSelected ? "#6B46C1" : "transparent",
          transition: "all 0.15s",
        }}>
          {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
        </div>

        {/* Slot details */}
        <div>
          <p style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            color: isOccupied ? "var(--text-secondary)" : "var(--text-primary)",
          }}>
            {slot.slot_number}
          </p>
          {slot.parking_floor != null && (
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
              Level {slot.parking_floor}
            </p>
          )}
        </div>
      </div>

      {/* Right: badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* DEFAULT / EXTRA */}
        <span style={{
          padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: isDefault ? "rgba(74,222,128,0.10)" : "rgba(251,191,36,0.10)",
          color: isDefault ? "#4ade80" : "#60A5FA",
          border: `1px solid ${isDefault ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
        }}>
          {isDefault ? "Default" : "Extra"}
        </span>

        {/* Available / Occupied */}
        <span style={{
          padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: isOccupied ? "rgba(248,113,113,0.10)" : "rgba(74,222,128,0.10)",
          color: isOccupied ? "#f87171" : "#4ade80",
          border: `1px solid ${isOccupied ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
        }}>
          {isOccupied ? "Occupied" : "Available"}
        </span>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function MyVehicles() {
  const { t } = useLang();

  const [activeTab, setActiveTab] = useState("vehicles");

  /* vehicles */
  const [vehicles,        setVehicles]        = useState([]);
  const [showForm,        setShowForm]        = useState(false);
  const [submitLoading,   setSubmitLoading]   = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  /* allocated slots */
  const [allocatedSlots, setAllocatedSlots] = useState([]);
  const [slotsLoading,   setSlotsLoading]   = useState(false);

  /* extra slot requests sent to admin */
  const [parkingRequests, setParkingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  /* multi-flat */
  const [myFlats,      setMyFlats]      = useState([]);
  const [flatsLoading, setFlatsLoading] = useState(false);

  /* resident profile for vehicle_count */
  const [residentProfile, setResidentProfile] = useState(null);

  /* manual slot selection */
  const [selectedSlotId, setSelectedSlotId] = useState(null); // null = request new extra slot

  /* feedback */
  const [errorMsg,   setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  /* form */
  const [form, setForm] = useState({
    vehicle_number: "",
    vehicle_type:   "",
    vehicle_name:   "",
    flat_id:        "",
  });

  /* ────────────────────────────
     LOADERS
  ──────────────────────────── */
  const loadVehicles = useCallback(async () => {
    try {
      const res = await API.get("/vehicles/my");
      setVehicles(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadAllocatedSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res   = await API.get("/parking-slots/my-slots");
      const slots = res.data?.slots || [];
      const flats = res.data?.flats || [];
      setAllocatedSlots(slots);
      setMyFlats(flats);
      if (flats.length === 1) setForm(f => ({ ...f, flat_id: String(flats[0].id) }));
    } catch (e) { console.error(e); }
    finally { setSlotsLoading(false); setFlatsLoading(false); }
  }, []);

  const loadParkingRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await API.get("/parking?parking_type=RESIDENT&limit=50");
      setParkingRequests(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setRequestsLoading(false); }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await API.get("/users/me");
      setResidentProfile(res.data);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    setFlatsLoading(true);
    loadVehicles();
    loadAllocatedSlots();
    loadParkingRequests();
    loadProfile();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(timer);
  }, [successMsg]);

  /* ────────────────────────────
     RESET SLOT SELECTION when flat or vehicle type changes
  ──────────────────────────── */
  useEffect(() => {
    setSelectedSlotId(null);
  }, [form.flat_id, form.vehicle_type]);

  /* ────────────────────────────
     DERIVED STATE
  ──────────────────────────── */

  // All slots belonging to the selected flat + vehicle type (regardless of occupancy)
  const availableSlots = allocatedSlots.filter(slot => {
    if (String(slot.flat_id) !== String(form.flat_id)) return false;
    if (slot.vehicle_type !== form.vehicle_type) return false;
    return true;
  });

  // Whether a given slot is already linked to a vehicle
  const isSlotOccupied = (slot) =>
    vehicles.some(v => v.parking_slot_id === slot.id);

  const hasAnyFreeSlot = availableSlots.some(s => !isSlotOccupied(s));

  const declaredVehicleCount = residentProfile?.vehicle_count ?? 0;
  const actualVehicleCount   = vehicles.length;
  const overDeclared         = declaredVehicleCount > 0 && actualVehicleCount >= declaredVehicleCount;

  /* ────────────────────────────
     ADD VEHICLE
  ──────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (myFlats.length > 1 && !form.flat_id) {
      setErrorMsg("Please select which flat this vehicle belongs to.");
      return;
    }

    // If free slots exist the resident must make an explicit choice —
    // either pick one or deliberately choose "Request New Extra Slot".
    if (availableSlots.length > 0 && selectedSlotId === null && hasAnyFreeSlot) {
      setErrorMsg("Please select a parking slot, or choose 'Request New Extra Slot' to ask the admin.");
      return;
    }

    // ── Capture into a local const BEFORE any async work ──────────────────
    // selectedSlotId is a number when the resident picked a slot, null otherwise.
    // We use this local variable exclusively below — never re-read the state.
    const slotIdToLink = selectedSlotId; // number | null

    // Debug: verify exactly what is being sent to the backend
    console.log("[MyVehicles] handleSubmit →", {
      vehicle_number:  form.vehicle_number.toUpperCase(),
      vehicle_type:    form.vehicle_type,
      flat_id:         form.flat_id ? Number(form.flat_id) : undefined,
      parking_slot_id: slotIdToLink,   // should be a number when slot was selected
    });

    setSubmitLoading(true);
    try {
      // ── POST /vehicles ────────────────────────────────────────────────────
      // Backend must:
      //   • if parking_slot_id is a number → save it on the vehicle row
      //     and set ParkingSlot.status = "ASSIGNED"
      //   • if parking_slot_id is null     → leave vehicle unlinked
      await API.post("/vehicles", {
        vehicle_name:    form.vehicle_name,
        vehicle_number:  form.vehicle_number.toUpperCase(),
        vehicle_type:    form.vehicle_type,
        flat_id:         form.flat_id ? Number(form.flat_id) : undefined,
        parking_slot_id: slotIdToLink,   // number → link now; null → admin assigns later
        // REMOVED: link_to_assigned_slot, parking_type  (old fields — do not send)
      });

      // ── Branch purely on what the FRONTEND decided ────────────────────────
      // Do NOT rely on vehicleRes.data.slot_linked — backend may not return that flag.
      if (slotIdToLink !== null) {
        // Resident chose a specific slot → it is linked immediately, no admin request.
        const linkedSlot = availableSlots.find(s => s.id === slotIdToLink);
        setSuccessMsg(
          `Vehicle added and linked to slot ${linkedSlot?.slot_number ?? slotIdToLink}!`
        );
      } else {
        // Resident chose "Request New Extra Slot" (or no slots assigned at all) →
        // create the admin request now.
        try {
          await API.post("/parking/request-resident-slot", {
            vehicle_number: form.vehicle_number.toUpperCase(),
            vehicle_type:   form.vehicle_type,
            flat_id:        form.flat_id ? Number(form.flat_id) : undefined,
          });
          setSuccessMsg("Vehicle added! A parking slot request has been sent to the admin.");
        } catch (reqErr) {
          const msg = reqErr?.response?.data?.message || "";
          if (msg.includes("pending slot request already exists")) {
            setSuccessMsg("Vehicle added! (A slot request was already pending for this vehicle.)");
          } else {
            setSuccessMsg("Vehicle added! Note: slot request could not be sent — please contact admin.");
          }
        }
      }

      // Reset form state
      setForm({
        vehicle_number: "",
        vehicle_type:   "",
        vehicle_name:   "",
        flat_id:        myFlats.length === 1 ? String(myFlats[0].id) : "",
      });
      setSelectedSlotId(null);
      setShowForm(false);
      loadVehicles();
      loadAllocatedSlots();
      loadParkingRequests();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to add vehicle. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ────────────────────────────
     DELETE VEHICLE
  ──────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this vehicle? Your flat's parking slot will be freed for reuse.")) return;
    setDeleteLoadingId(id);
    try {
      await API.delete(`/vehicles/${id}`);
      setSuccessMsg("Vehicle removed successfully!");
      loadVehicles();
      loadAllocatedSlots();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to delete vehicle.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setErrorMsg("");
    setSelectedSlotId(null);
    setForm({
      vehicle_number: "",
      vehicle_type:   "",
      vehicle_name:   "",
      flat_id:        myFlats.length === 1 ? String(myFlats[0].id) : "",
    });
  };

  /* ────────────────────────────
     TAB STYLES
  ──────────────────────────── */
  const tabStyle = (key) => ({
    padding:"8px 18px", borderRadius:10, border:"none", cursor:"pointer",
    fontSize:13, fontWeight:700, transition:"all 0.15s", background:"transparent",
    color:        activeTab === key ? "var(--primary-text,#9F87D7)" : "var(--text-secondary)",
    borderBottom: activeTab === key ? "2px solid var(--primary-text,#9F87D7)" : "2px solid transparent",
  });

  const countBadge = (val, active) => ({
    marginLeft:6, fontSize:11, fontWeight:800, padding:"1px 7px", borderRadius:999,
    background: active ? "rgba(107,70,193,0.18)" : "rgba(255,255,255,0.06)",
    color:      active ? "#9F87D7"               : "var(--text-secondary)",
  });

  const pendingCount = parkingRequests.filter(r => r.status === "PENDING").length;

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t("vehTitle")}</h2>
          <p className="text-secondary text-xs mt-0.5">Manage your vehicles and parking slots</p>
        </div>
        {activeTab === "vehicles" && (
          <button onClick={() => { setShowForm(p => !p); setErrorMsg(""); }} className="btn-primary flex items-center gap-2">
            {showForm ? <MdClose size={16} /> : <MdAdd size={16} />}
            {showForm ? "Close" : t("vehAddBtn")}
          </button>
        )}
      </div>

      {/* Vehicle count awareness banner */}
      {residentProfile && declaredVehicleCount > 0 && (
        <div style={{
          display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:12,
          background: overDeclared ? "rgba(251,191,36,0.08)" : "rgba(74,222,128,0.06)",
          border:    `1px solid ${overDeclared ? "rgba(251,191,36,0.25)" : "rgba(74,222,128,0.20)"}`,
          fontSize:12, fontWeight:600,
          color: overDeclared ? "#60A5FA" : "#4ade80",
        }}>
          <MdDirectionsCar size={15} style={{ flexShrink:0 }} />
          <span>
            {actualVehicleCount} of {declaredVehicleCount} declared vehicle{declaredVehicleCount !== 1 ? "s" : ""} registered.
            {overDeclared
              ? " You've reached your declared count — you can still add more and the admin will be notified."
              : " You can register more vehicles up to your declared count."}
          </span>
        </div>
      )}

      {/* TABS */}
      <div style={{ display:"flex", gap:4, borderBottom:"1px solid var(--glass-border)" }}>
        <button style={tabStyle("vehicles")} onClick={() => setActiveTab("vehicles")}>
          🚗 My Vehicles
          <span style={countBadge(vehicles.length, activeTab === "vehicles")}>{vehicles.length}</span>
        </button>
        <button style={tabStyle("slots")} onClick={() => setActiveTab("slots")}>
          🅿️ My Parking Slots
          {allocatedSlots.length > 0 && (
            <span style={countBadge(allocatedSlots.length, activeTab === "slots")}>{allocatedSlots.length}</span>
          )}
        </button>
        <button style={tabStyle("requests")} onClick={() => setActiveTab("requests")}>
          📋 Slot Requests
          {pendingCount > 0 && (
            <span style={{ marginLeft:6, fontSize:11, fontWeight:800, padding:"1px 7px", borderRadius:999, background:"rgba(251,191,36,0.18)", color:"#60A5FA" }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* FEEDBACK */}
      {successMsg && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(74,222,128,0.10)", border:"1px solid rgba(74,222,128,0.30)", color:"#4ade80", fontSize:13, fontWeight:600 }}>
          <span style={{ display:"flex", alignItems:"center", gap:8 }}><MdCheckCircle size={16} /> {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", display:"flex" }}><MdClose size={14} /></button>
        </div>
      )}
      {errorMsg && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(248,113,113,0.10)", border:"1px solid rgba(248,113,113,0.30)", color:"#f87171", fontSize:13, fontWeight:600 }}>
          <span style={{ display:"flex", alignItems:"center", gap:8 }}><MdWarning size={16} /> {errorMsg}</span>
          <button onClick={() => setErrorMsg("")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", display:"flex" }}><MdClose size={14} /></button>
        </div>
      )}

      {/* ══════════════════════════════
          TAB: MY VEHICLES
      ══════════════════════════════ */}
      {activeTab === "vehicles" && (
        <>
          {/* ADD VEHICLE FORM */}
          {showForm && (
            <div className="bg-card p-5 rounded-2xl max-w-2xl animate-fadeIn">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MdAdd size={16} className="text-accent" /> {t("vehFormTitle")}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Vehicle nickname */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {t("vehFieldName")}
                  </label>
                  <input className="input w-full mt-1" placeholder="e.g. My Car, Office Bike" required
                    value={form.vehicle_name}
                    onChange={e => setForm({ ...form, vehicle_name: e.target.value })} />
                </div>

                {/* Vehicle number */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {t("vehFieldNumber")}
                  </label>
                  <input className="input w-full mt-1" placeholder="e.g. TN01AB1234" required
                    value={form.vehicle_number}
                    onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
                    style={{ textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }} />
                </div>

                {/* Vehicle type */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {t("vehSelectType")}
                  </label>
                  <Select className="input w-full mt-1" required value={form.vehicle_type}
                    onChange={e => setForm({ ...form, vehicle_type: e.target.value, flat_id: myFlats.length === 1 ? String(myFlats[0].id) : "" })}>
                    <option value="">{t("vehSelectType")}</option>
                    <option value="CAR">{t("vehTypeCar")} 🚗</option>
                    <option value="BIKE">{t("vehTypeBike")} 🏍️</option>
                  </Select>
                </div>

                {/* Multi-flat selector */}
                {myFlats.length > 1 && (
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                      Which Flat? <span style={{ color:"#f87171" }}>*</span>
                    </label>
                    {flatsLoading ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 0", color:"var(--text-secondary)", fontSize:13 }}>
                        <Spinner size={13} /> Loading flats…
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                        {myFlats.map(flat => {
                          const isSel = String(form.flat_id) === String(flat.id);
                          // Count free slots for this flat + vehicle type for display hint
                          const flatSlots = form.vehicle_type
                            ? allocatedSlots.filter(s => String(s.flat_id) === String(flat.id) && s.vehicle_type === form.vehicle_type)
                            : [];
                          const freeCount = flatSlots.filter(s => !vehicles.some(v => v.parking_slot_id === s.id)).length;

                          return (
                            <button key={flat.id} type="button"
                              onClick={() => setForm(f => ({ ...f, flat_id: String(flat.id) }))}
                              style={{
                                display:"flex", alignItems:"center", justifyContent:"space-between",
                                padding:"12px 14px", borderRadius:12, cursor:"pointer", textAlign:"left",
                                background: isSel ? "rgba(107,70,193,0.10)" : "rgba(255,255,255,0.03)",
                                border:`2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}`,
                                transition:"all 0.15s",
                              }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: isSel ? "rgba(107,70,193,0.15)" : "rgba(255,255,255,0.05)" }}>
                                  <MdHome size={17} style={{ color: isSel ? "#9F87D7" : "var(--text-secondary)" }} />
                                </div>
                                <div>
                                  <p style={{ margin:0, fontSize:13, fontWeight:700, color: isSel ? "#9F87D7" : "var(--text-primary)" }}>Flat {flat.flat_number}</p>
                                  {flat.floor_id && <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--text-secondary)" }}>Floor {flat.floor_id}</p>}
                                </div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                {form.vehicle_type && flatSlots.length > 0 && (
                                  <span style={{
                                    display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                                    background: freeCount > 0 ? "rgba(74,222,128,0.10)" : "rgba(248,113,113,0.10)",
                                    color:      freeCount > 0 ? "#4ade80"              : "#f87171",
                                    border:    `1px solid ${freeCount > 0 ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                                  }}>
                                    <MdLocalParking size={12} />
                                    {freeCount > 0 ? `${freeCount} slot${freeCount > 1 ? "s" : ""} free` : "All occupied"}
                                  </span>
                                )}
                                {form.vehicle_type && flatSlots.length === 0 && (
                                  <span style={{ fontSize:10, color:"var(--text-secondary)", fontWeight:600, padding:"3px 8px", borderRadius:999, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                                    No {form.vehicle_type} slot assigned
                                  </span>
                                )}
                                {isSel && <MdCheckCircle size={16} style={{ color:"#9F87D7", flexShrink:0 }} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════
                    SLOT SELECTION PANEL (manual picker)
                ══════════════════════════════════════════ */}
                {form.vehicle_type && (form.flat_id || myFlats.length === 1) && (
                  <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid var(--glass-border)" }}>

                    {/* Panel header */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:"1px solid var(--glass-border)", background:"rgba(255,255,255,0.03)" }}>
                      <FaParking style={{ color:"#9F87D7", fontSize:14 }} />
                      <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Select Parking Slot
                      </span>
                    </div>

                    <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>

                      {availableSlots.length === 0 ? (
                        /* No slots assigned to this flat for this vehicle type */
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"14px", borderRadius:12, background:"rgba(148,181,245,0.06)", border:"1px solid rgba(148,181,245,0.18)" }}>
                          <MdInfo style={{ color:"#94B5F5", fontSize:16, flexShrink:0, marginTop:1 }} />
                          <div>
                            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#94B5F5" }}>
                              No {form.vehicle_type} slot pre-assigned to your flat
                            </p>
                            <p style={{ margin:"4px 0 0", fontSize:11, color:"var(--text-secondary)", lineHeight:1.5 }}>
                              This vehicle will be registered as <strong>Extra</strong> and a slot request
                              will be sent to the admin automatically. They'll assign an available slot.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Render each assigned slot as a selectable card */}
                          {availableSlots.map(slot => {
                            const occupied = isSlotOccupied(slot);
                            return (
                              <SlotPickerOption
                                key={slot.id}
                                slot={slot}
                                isSelected={selectedSlotId === slot.id}
                                isOccupied={occupied}
                                onSelect={(id) => setSelectedSlotId(id)}
                              />
                            );
                          })}

                          {/* Divider */}
                          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0 2px" }}>
                            <div style={{ flex:1, height:1, background:"var(--glass-border)" }} />
                            <span style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:600 }}>or</span>
                            <div style={{ flex:1, height:1, background:"var(--glass-border)" }} />
                          </div>

                          {/* "Request New Extra Slot" option */}
                          <button
                            type="button"
                            onClick={() => setSelectedSlotId(null)}
                            style={{
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              width:"100%", padding:"13px 16px", borderRadius:12,
                              border:`2px solid ${selectedSlotId === null ? "#2563EB" : "rgba(255,255,255,0.09)"}`,
                              background: selectedSlotId === null ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.03)",
                              cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                            }}
                          >
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              {/* Radio circle */}
                              <div style={{
                                width:20, height:20, borderRadius:"50%", flexShrink:0,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                border:`2px solid ${selectedSlotId === null ? "#2563EB" : "rgba(255,255,255,0.25)"}`,
                                background: selectedSlotId === null ? "#2563EB" : "transparent",
                                transition:"all 0.15s",
                              }}>
                                {selectedSlotId === null && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                              </div>
                              <div>
                                <p style={{ margin:0, fontSize:13, fontWeight:700, color: selectedSlotId === null ? "#60A5FA" : "var(--text-primary)" }}>
                                  Request New Extra Slot
                                </p>
                                <p style={{ margin:"3px 0 0", fontSize:11, color:"var(--text-secondary)", lineHeight:1.5 }}>
                                  Skip all pre-assigned slots and ask the admin to allocate a new one.
                                </p>
                              </div>
                            </div>
                            <span style={{
                              padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                              background:"rgba(251,191,36,0.10)", color:"#60A5FA",
                              border:"1px solid rgba(251,191,36,0.25)", flexShrink:0,
                            }}>
                              Admin assigns
                            </span>
                          </button>

                          {/* Context hint */}
                          {selectedSlotId !== null && (
                            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:10, background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.18)", fontSize:11, color:"#4ade80", fontWeight:600 }}>
                              <MdCheckCircle size={13} />
                              Slot {availableSlots.find(s => s.id === selectedSlotId)?.slot_number} will be linked to this vehicle immediately — no admin action needed.
                            </div>
                          )}
                          {selectedSlotId === null && hasAnyFreeSlot && (
                            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:10, background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.18)", fontSize:11, color:"#60A5FA", fontWeight:600 }}>
                              <MdInfo size={13} />
                              Free slots are available above. A new extra slot request will still go to your admin if you proceed.
                            </div>
                          )}
                          {selectedSlotId === null && !hasAnyFreeSlot && (
                            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:10, background:"rgba(148,181,245,0.06)", border:"1px solid rgba(148,181,245,0.18)", fontSize:11, color:"#B9CFF8", fontWeight:600 }}>
                              <MdInfo size={13} />
                              All your assigned slots are occupied. A new extra slot request will be sent to the admin.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitLoading}>
                    {submitLoading ? (
                      <><Spinner size={14} /> Saving...</>
                    ) : selectedSlotId !== null ? (
                      <><MdCheckCircle size={14} /> Add Vehicle &amp; Link Slot</>
                    ) : (
                      <><MdSend size={14} /> Add Vehicle &amp; Request Slot</>
                    )}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-muted">{t("cancel")}</button>
                </div>
              </form>
            </div>
          )}

          {/* VEHICLE LIST */}
          <div className="bg-card p-5 rounded-xl">
            {vehicles.length === 0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"40px 20px", color:"var(--text-secondary)" }}>
                <MdDirectionsCarFilled size={40} style={{ opacity:0.2 }} />
                <p style={{ fontSize:14, margin:0 }}>{t("vehEmpty")}</p>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2" style={{ marginTop:4 }}>
                  <MdAdd /> {t("vehAddBtn")}
                </button>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {vehicles.map(v => (
                    <div key={v.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:14, background:"var(--card-inner-bg,rgba(255,255,255,0.05))", border:"1px solid var(--glass-border)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", background: v.vehicle_type==="BIKE" ? "rgba(159,135,215,0.12)" : "rgba(148,181,245,0.12)", border: v.vehicle_type==="BIKE" ? "1px solid rgba(159,135,215,0.25)" : "1px solid rgba(148,181,245,0.25)" }}>
                          {VEHICLE_ICON[v.vehicle_type] || <MdDirectionsCarFilled style={{ fontSize:20, color:"#94B5F5" }} />}
                        </div>
                        <div>
                          <p style={{ fontWeight:700, fontSize:14, margin:0, color:"var(--text-primary)" }}>{v.vehicle_name}</p>
                          <p style={{ fontSize:12, color:"var(--text-secondary)", margin:"3px 0 0", fontWeight:600, letterSpacing:"0.04em" }}>
                            {v.vehicle_number} · {TYPE_LABEL[v.vehicle_type] || v.vehicle_type}
                          </p>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3, flexWrap:"wrap" }}>
                            {v.parking_slot_id ? (
                              <span style={{ fontSize:11, color:"#4ade80", display:"flex", alignItems:"center", gap:3 }}>
                                <MdLocalParking size={11} />
                                {v.slot?.slot_number || "Slot linked"}
                                {v.slot?.parking_floor && ` · ${v.slot.parking_floor}`}
                              </span>
                            ) : (
                              <span style={{ fontSize:11, color:"#60A5FA", display:"flex", alignItems:"center", gap:3 }}>
                                <MdHourglassEmpty size={11} /> Awaiting slot from admin
                              </span>
                            )}
                            <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:999, background: v.parking_type==="DEFAULT" ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)", color: v.parking_type==="DEFAULT" ? "#4ade80" : "#60A5FA", border:`1px solid ${v.parking_type==="DEFAULT" ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}` }}>
                              {v.parking_type === "DEFAULT" ? "Default" : "Extra"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(v.id)} disabled={deleteLoadingId === v.id}
                        style={{ width:34, height:34, borderRadius:10, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(248,113,113,0.10)", color:"#f87171", opacity: deleteLoadingId===v.id ? 0.5 : 1 }}>
                        {deleteLoadingId === v.id ? <Spinner size={14} /> : <MdDelete size={17} />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom:"1px solid var(--glass-border)" }}>
                        {["#","Vehicle","Number","Type","Parking Slot","Slot Type","Action"].map((h, i) => (
                          <th key={h} className={`p-3 text-xs font-semibold uppercase tracking-wider text-secondary ${i===6?"text-right":"text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v, i) => (
                        <tr key={v.id} style={{ borderBottom:"1px solid var(--glass-border)", transition:"background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <td className="p-3 text-xs text-secondary">{i + 1}</td>
                          <td className="p-3">
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background: v.vehicle_type==="BIKE" ? "rgba(159,135,215,0.12)" : "rgba(148,181,245,0.12)", border: v.vehicle_type==="BIKE" ? "1px solid rgba(159,135,215,0.25)" : "1px solid rgba(148,181,245,0.25)" }}>
                                {VEHICLE_ICON[v.vehicle_type] || <MdDirectionsCarFilled style={{ color:"#94B5F5", fontSize:18 }} />}
                              </div>
                              <span style={{ fontWeight:700, color:"var(--text-primary)" }}>{v.vehicle_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span style={{ fontWeight:700, letterSpacing:"0.06em", fontSize:13, color:"var(--text-primary)", fontFamily:"monospace" }}>{v.vehicle_number}</span>
                          </td>
                          <td className="p-3">
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color: v.vehicle_type==="BIKE" ? "#9F87D7" : "#94B5F5", background: v.vehicle_type==="BIKE" ? "rgba(159,135,215,0.10)" : "rgba(148,181,245,0.10)", border:`1px solid ${v.vehicle_type==="BIKE" ? "rgba(159,135,215,0.22)" : "rgba(148,181,245,0.22)"}` }}>
                              {TYPE_LABEL[v.vehicle_type] || v.vehicle_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {v.parking_slot_id ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"#4ade80", background:"rgba(74,222,128,0.10)", border:"1px solid rgba(74,222,128,0.22)" }}>
                                  <MdLocalParking size={11} /> {v.slot?.slot_number || "Linked"}
                                </span>
                                {v.slot?.parking_floor && (
                                  <span style={{ fontSize:10, color:"var(--text-secondary)" }}>Level {v.slot.parking_floor}</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"#60A5FA", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.20)" }}>
                                <MdHourglassEmpty size={11} /> Awaiting admin
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, background: v.parking_type==="DEFAULT" ? "rgba(74,222,128,0.10)" : "rgba(251,191,36,0.10)", color: v.parking_type==="DEFAULT" ? "#4ade80" : "#60A5FA", border:`1px solid ${v.parking_type==="DEFAULT" ? "rgba(74,222,128,0.22)" : "rgba(251,191,36,0.22)"}` }}>
                              {v.parking_type === "DEFAULT" ? "Default" : "Extra"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDelete(v.id)} disabled={deleteLoadingId === v.id}
                              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.20)", color:"#f87171", fontSize:12, fontWeight:700, cursor:"pointer", opacity: deleteLoadingId===v.id ? 0.5 : 1 }}>
                              {deleteLoadingId === v.id ? <Spinner size={12} /> : <MdDelete size={14} />}
                              {deleteLoadingId === v.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════
          TAB: MY PARKING SLOTS
      ══════════════════════════════ */}
      {activeTab === "slots" && (
        <div className="space-y-4">
          {slotsLoading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 20px", color:"var(--text-secondary)", gap:10 }}>
              <Spinner size={18} /> Loading your parking slots...
            </div>
          ) : allocatedSlots.length === 0 ? (
            <div className="bg-card rounded-xl">
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"48px 20px", color:"var(--text-secondary)" }}>
                <MdLocalParking size={44} style={{ opacity:0.18 }} />
                <p style={{ fontSize:14, margin:0, fontWeight:600 }}>No parking slots assigned to your flat yet</p>
                <p style={{ fontSize:12, margin:0, textAlign:"center", maxWidth:320, lineHeight:1.5 }}>
                  Your admin will assign parking slots to your flat when registering you.
                  Once assigned, add a vehicle from "My Vehicles" to link to that slot automatically.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(148,181,245,0.08)", border:"1px solid rgba(148,181,245,0.20)", color:"#B9CFF8", fontSize:12, fontWeight:600 }}>
                <MdInfo size={15} style={{ marginTop:1, flexShrink:0 }} />
                <span>
                  These slots were <strong>pre-assigned to your flat</strong> by the admin.
                  Add a vehicle from the "My Vehicles" tab and manually choose which slot to link it to.
                  If all your slots are occupied and you add another vehicle, a request will go to the admin for an extra slot.
                </span>
              </div>

              {allocatedSlots.length > 1 && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(148,181,245,0.08)", border:"1px solid rgba(148,181,245,0.20)", color:"#B9CFF8", fontSize:12, fontWeight:600 }}>
                  <MdApartment size={15} style={{ marginTop:1, flexShrink:0 }} />
                  <span>
                    You have <strong>{allocatedSlots.length}</strong> parking slots across{" "}
                    {new Set(allocatedSlots.map(s => s.flat_id)).size} flat(s).
                  </span>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                {allocatedSlots.map(slot => <AllocatedSlotCard key={slot.id} slot={slot} />)}
              </div>

              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:4 }}>
                {[
                  { label:"Total Slots",     value: allocatedSlots.length },
                  { label:"Car Slots",       value: allocatedSlots.filter(s => s.vehicle_type==="CAR").length },
                  { label:"Bike Slots",      value: allocatedSlots.filter(s => s.vehicle_type==="BIKE").length },
                  { label:"In Use",          value: allocatedSlots.filter(s => s.linked_vehicle).length },
                  { label:"Free / Unlinked", value: allocatedSlots.filter(s => !s.linked_vehicle).length },
                ].map(stat => (
                  <div key={stat.label} style={{ flex:"1 1 90px", padding:"12px 16px", borderRadius:12, background:"var(--card-inner-bg,rgba(255,255,255,0.04))", border:"1px solid var(--glass-border)", textAlign:"center" }}>
                    <p style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--text-primary)" }}>{stat.value}</p>
                    <p style={{ margin:"3px 0 0", fontSize:11, color:"var(--text-secondary)", fontWeight:600 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          TAB: SLOT REQUESTS (extra slots sent to admin)
      ══════════════════════════════ */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(148,181,245,0.08)", border:"1px solid rgba(148,181,245,0.20)", color:"#B9CFF8", fontSize:12, fontWeight:600 }}>
            <MdInfo size={15} style={{ marginTop:1, flexShrink:0 }} />
            <span>
              These are <strong>extra slot requests</strong> sent to your admin when you added a vehicle
              and either had no free pre-assigned slot or chose to request a new one manually.
              Your admin will assign a free slot and you'll be notified.
            </span>
          </div>

          {requestsLoading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 20px", color:"var(--text-secondary)", gap:10 }}>
              <Spinner size={18} /> Loading requests...
            </div>
          ) : parkingRequests.length === 0 ? (
            <div className="bg-card rounded-xl">
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"48px 20px", color:"var(--text-secondary)" }}>
                <MdHourglassEmpty size={44} style={{ opacity:0.18 }} />
                <p style={{ fontSize:14, margin:0, fontWeight:600 }}>No extra slot requests</p>
                <p style={{ fontSize:12, margin:0, textAlign:"center", maxWidth:300, lineHeight:1.5 }}>
                  When you add a vehicle and no pre-assigned slot is free (or you choose to request a new one),
                  an extra slot request will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl overflow-hidden">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background:"var(--card-inner-bg)", borderBottom:"1px solid var(--divider)" }}>
                      {["#","Vehicle","Type","Slot Assigned","Status","Requested On"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parkingRequests.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom:"1px solid var(--divider)", transition:"background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background="var(--row-hover)"}
                        onMouseLeave={e => e.currentTarget.style.background=""}>
                        <td className="px-5 py-3 text-xs text-secondary">{i + 1}</td>
                        <td className="px-5 py-3 font-mono font-bold text-sm">{r.vehicle_number}</td>
                        <td className="px-5 py-3">
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color: r.vehicle_type==="BIKE" ? "#9F87D7" : "#94B5F5", background: r.vehicle_type==="BIKE" ? "rgba(159,135,215,0.10)" : "rgba(148,181,245,0.10)", border:`1px solid ${r.vehicle_type==="BIKE" ? "rgba(159,135,215,0.22)" : "rgba(148,181,245,0.22)"}` }}>
                            {TYPE_LABEL[r.vehicle_type] || r.vehicle_type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {r.assigned_spot ? (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"#4ade80", background:"rgba(74,222,128,0.10)", border:"1px solid rgba(74,222,128,0.22)" }}>
                              <MdLocalParking size={11} /> {r.assigned_spot}
                            </span>
                          ) : (
                            <span style={{ fontSize:12, color:"var(--text-secondary)", opacity:0.5 }}>Awaiting admin</span>
                          )}
                        </td>
                        <td className="px-5 py-3"><ReqStatusBadge status={r.status} /></td>
                        <td className="px-5 py-3 text-xs text-secondary">
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2 p-4">
                {parkingRequests.map(r => (
                  <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"14px", borderRadius:14, background:"var(--card-inner-bg)", border:"1px solid var(--glass-border)" }}>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.vehicle_number}</p>
                      <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--text-secondary)" }}>
                        {TYPE_LABEL[r.vehicle_type] || r.vehicle_type}
                        {r.assigned_spot && <> · <span style={{ color:"#4ade80" }}>{r.assigned_spot}</span></>}
                      </p>
                      {!r.assigned_spot && (
                        <span style={{ display:"inline-flex", marginTop:4, alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, background:"rgba(251,191,36,0.10)", color:"#60A5FA", border:"1px solid rgba(251,191,36,0.22)" }}>
                          Awaiting slot assignment
                        </span>
                      )}
                    </div>
                    <ReqStatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}                                  