import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdDelete, MdDirectionsCarFilled,
  MdTwoWheeler, MdClose, MdCheckCircle,
  MdLocalParking, MdApartment, MdHome,
  MdSend, MdWarning, MdInfo, MdHourglassEmpty,
  MdDirectionsCar, MdSearch,
} from "react-icons/md";
import { FaParking } from "react-icons/fa";
import SlidingTabs from "../../components/common/SlidingTabs";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
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
  CAR:  <MdDirectionsCarFilled style={{ fontSize: 20, color: "var(--accent)" }} />,
  BIKE: <MdTwoWheeler          style={{ fontSize: 20, color: "var(--acct-violet, var(--accent))" }} />,
};
const TYPE_LABEL = { CAR: "Car 🚗", BIKE: "Bike 🏍️" };

/* ── Allocated Slot Card ── */
function AllocatedSlotCard({ slot }) {
  const isCAR = slot.vehicle_type === "CAR";
  const ac    = isCAR ? "var(--accent)" : "var(--acct-violet)";
  const abg   = isCAR ? "var(--accent-soft)"  : "rgba(var(--acct-violet-rgb),0.12)";
  const abdr  = isCAR ? "rgba(var(--acct-purple-rgb),0.28)"  : "rgba(var(--acct-violet-rgb),0.28)";

  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", overflow: "hidden" }}>
      {slot.flat && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderBottom:"1px solid var(--glass-border)", background:"var(--card-inner-bg)" }}>
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
      color: "var(--accent)",
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
              <p style={{ margin:"4px 0 0", fontSize:11, color:"var(--accent)", fontWeight:600 }}>
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
            background: slot.parking_type === "DEFAULT" ? "var(--approve-bg)" : "var(--approval-bg)",
            color: slot.parking_type === "DEFAULT" ? "var(--approve-color)" : "var(--approval-color)",
            border: `1px solid ${slot.parking_type === "DEFAULT" ? "var(--approve-border)" : "var(--approval-border)"}`,
          }}>
            {slot.parking_type === "DEFAULT" ? "Default" : "Extra"}
          </span>
          {/* Occupancy badge */}
          <span style={{
            padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
            background: slot.linked_vehicle ? "var(--accent-soft)" : "var(--card-inner-bg)",
            color: slot.linked_vehicle ? "var(--accent)" : "var(--text-secondary)",
            border: `1px solid ${slot.linked_vehicle ? "rgba(var(--acct-purple-rgb),0.28)" : "var(--glass-border)"}`,
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
    PENDING:   { label:"Pending",   color:"var(--approval-color)", bg:"var(--approval-bg)",  border:"var(--approval-border)"  },
    APPROVED:  { label:"Approved",  color:"var(--approve-color)", bg:"var(--approve-bg)",  border:"var(--approve-border)"  },
    REJECTED:  { label:"Rejected",  color:"var(--reject-color)", bg:"var(--reject-bg)", border:"var(--reject-border)" },
    COMPLETED: { label:"Completed", color:"var(--accent)", bg:"var(--accent-soft)", border:"rgba(var(--acct-purple-rgb),0.28)" },
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
            ? "var(--accent)"
            : isOccupied
            ? "var(--glass-border)"
            : "var(--glass-border)"
        }`,
        background: isSelected
          ? "var(--accent-soft)"
          : isOccupied
          ? "var(--card-inner-bg)"
          : "var(--card-inner-bg)",
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
          border: `2px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}`,
          background: isSelected ? "var(--accent)" : "transparent",
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
          background: isDefault ? "var(--approve-bg)" : "var(--approval-bg)",
          color: isDefault ? "var(--approve-color)" : "var(--approval-color)",
          border: `1px solid ${isDefault ? "var(--approve-border)" : "var(--approval-border)"}`,
        }}>
          {isDefault ? "Default" : "Extra"}
        </span>

        {/* Available / Occupied */}
        <span style={{
          padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: isOccupied ? "var(--reject-bg)" : "var(--approve-bg)",
          color: isOccupied ? "var(--reject-color)" : "var(--approve-color)",
          border: `1px solid ${isOccupied ? "var(--reject-border)" : "var(--approve-border)"}`,
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
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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
  const [search,     setSearch]     = useState("");

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
    const targetId = id || deleteConfirmId;
    if (!targetId) return;
    setDeleteLoadingId(targetId);
    try {
      await API.delete(`/vehicles/${targetId}`);
      setSuccessMsg("Vehicle removed successfully!");
      setDeleteConfirmId(null);
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

  const pendingCount = parkingRequests.filter(r => r.status === "PENDING").length;
  const q = search.trim().toLowerCase();
  const includesQ = (...vals) => !q || vals.some((v) => String(v || "").toLowerCase().includes(q));
  const visibleVehicles = vehicles.filter((v) =>
    includesQ(v.vehicle_name, v.vehicle_number, v.vehicle_type, v.slot?.slot_number)
  );
  const visibleSlots = allocatedSlots.filter((s) =>
    includesQ(s.slot_number, s.vehicle_type, s.linked_vehicle?.vehicle_number, s.linked_vehicle?.vehicle_name, s.flat?.flat_number)
  );
  const visibleRequests = parkingRequests.filter((r) =>
    includesQ(r.vehicle_number, r.vehicle_type, r.assigned_spot, r.status)
  );

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="ge-root mv-page animate-fadeIn">

      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdDirectionsCarFilled size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("vehTitle")}</h2>
            <p className="page-subtitle">Manage your vehicles and parking slots</p>
          </div>
        </div>
        {activeTab === "vehicles" && (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => { setShowForm(p => !p); setErrorMsg(""); }}
          >
            {showForm ? <MdClose size={18} /> : <MdAdd size={18} />}
            {showForm ? "Close" : (t("vehAddBtn") || "Add Vehicle")}
          </button>
        )}
      </div>

      <div className="ge-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{vehicles.length}</span>
          <span className="complaint-stat-label">{t("vehTitle")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-pending">
          <span className="complaint-stat-val">{allocatedSlots.length}</span>
          <span className="complaint-stat-label">Parking Slots</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{pendingCount}</span>
          <span className="complaint-stat-label">Pending Requests</span>
        </div>
      </div>

      {residentProfile && declaredVehicleCount > 0 && (
        <div className={`mv-banner ${overDeclared ? "mv-banner--warn" : "mv-banner--ok"}`}>
          <MdDirectionsCar size={15} />
          <span>
            {actualVehicleCount} of {declaredVehicleCount} declared vehicle{declaredVehicleCount !== 1 ? "s" : ""} registered.
            {overDeclared
              ? " You've reached your declared count — you can still add more and the admin will be notified."
              : " You can register more vehicles up to your declared count."}
          </span>
        </div>
      )}

      <div className="ge-toolbar">
        <div className="ge-search-wrap">
          <MdSearch className="ge-search-icon" size={17} />
          <input
            className="ge-search-input"
            placeholder="Search vehicles, slots or requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} className="ge-search-clear" aria-label="Clear search">
              <MdClose size={13} />
            </button>
          ) : null}
        </div>

        <SlidingTabs
          className="ge-filter-tabs"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: "vehicles", label: t("vehTitle"), icon: <MdDirectionsCarFilled size={15} />, badge: vehicles.length },
            { id: "slots", label: "Parking Slots", icon: <MdLocalParking size={15} />, badge: allocatedSlots.length },
            { id: "requests", label: "Slot Requests", icon: <FaParking size={14} />, badge: parkingRequests.length, alert: pendingCount },
          ]}
        />
      </div>

      {/* FEEDBACK */}
      {successMsg && (
        <div className="mv-banner mv-banner--ok">
          <span className="mv-banner-row"><MdCheckCircle size={16} /> {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg("")} className="mv-banner-close"><MdClose size={14} /></button>
        </div>
      )}
      {errorMsg && (
        <div className="mv-banner mv-banner--err">
          <span className="mv-banner-row"><MdWarning size={16} /> {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg("")} className="mv-banner-close"><MdClose size={14} /></button>
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
                      Which Flat? <span style={{ color:"var(--reject-color)" }}>*</span>
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
                                background: isSel ? "var(--accent-soft)" : "var(--card-inner-bg)",
                                border:`2px solid ${isSel ? "var(--accent)" : "var(--glass-border)"}`,
                                transition:"all 0.15s",
                              }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: isSel ? "var(--accent-soft)" : "var(--card-inner-bg)" }}>
                                  <MdHome size={17} style={{ color: isSel ? "var(--accent)" : "var(--text-secondary)" }} />
                                </div>
                                <div>
                                  <p style={{ margin:0, fontSize:13, fontWeight:700, color: isSel ? "var(--accent)" : "var(--text-primary)" }}>Flat {flat.flat_number}</p>
                                  {flat.floor_id && <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--text-secondary)" }}>Floor {flat.floor_id}</p>}
                                </div>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                {form.vehicle_type && flatSlots.length > 0 && (
                                  <span style={{
                                    display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                                    background: freeCount > 0 ? "var(--approve-bg)" : "var(--reject-bg)",
                                    color:      freeCount > 0 ? "var(--approve-color)"              : "var(--reject-color)",
                                    border:    `1px solid ${freeCount > 0 ? "var(--approve-border)" : "var(--reject-border)"}`,
                                  }}>
                                    <MdLocalParking size={12} />
                                    {freeCount > 0 ? `${freeCount} slot${freeCount > 1 ? "s" : ""} free` : "All occupied"}
                                  </span>
                                )}
                                {form.vehicle_type && flatSlots.length === 0 && (
                                  <span style={{ fontSize:10, color:"var(--text-secondary)", fontWeight:600, padding:"3px 8px", borderRadius:999, background:"var(--card-inner-bg)", border:"1px solid var(--glass-border)" }}>
                                    No {form.vehicle_type} slot assigned
                                  </span>
                                )}
                                {isSel && <MdCheckCircle size={16} style={{ color:"var(--accent)", flexShrink:0 }} />}
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
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:"1px solid var(--glass-border)", background:"var(--card-inner-bg)" }}>
                      <FaParking style={{ color:"var(--accent)", fontSize:14 }} />
                      <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Select Parking Slot
                      </span>
                    </div>

                    <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>

                      {availableSlots.length === 0 ? (
                        /* No slots assigned to this flat for this vehicle type */
                        <div className="mv-info">
                          <MdInfo size={16} />
                          <div>
                            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--accent)" }}>
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
                              border:`2px solid ${selectedSlotId === null ? "var(--accent)" : "var(--glass-border)"}`,
                              background: selectedSlotId === null ? "var(--approval-bg)" : "var(--card-inner-bg)",
                              cursor:"pointer", textAlign:"left", transition:"all 0.15s",
                            }}
                          >
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              {/* Radio circle */}
                              <div style={{
                                width:20, height:20, borderRadius:"50%", flexShrink:0,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                border:`2px solid ${selectedSlotId === null ? "var(--accent)" : "var(--glass-border)"}`,
                                background: selectedSlotId === null ? "var(--accent)" : "transparent",
                                transition:"all 0.15s",
                              }}>
                                {selectedSlotId === null && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                              </div>
                              <div>
                                <p style={{ margin:0, fontSize:13, fontWeight:700, color: selectedSlotId === null ? "var(--accent)" : "var(--text-primary)" }}>
                                  Request New Extra Slot
                                </p>
                                <p style={{ margin:"3px 0 0", fontSize:11, color:"var(--text-secondary)", lineHeight:1.5 }}>
                                  Skip all pre-assigned slots and ask the admin to allocate a new one.
                                </p>
                              </div>
                            </div>
                            <span style={{
                              padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                              background:"var(--approval-bg)", color:"var(--approval-color)",
                              border:"1px solid var(--approval-border)", flexShrink:0,
                            }}>
                              Admin assigns
                            </span>
                          </button>

                          {/* Context hint */}
                          {selectedSlotId !== null && (
                            <div className="mv-hint mv-hint--ok">
                              <MdCheckCircle size={13} />
                              Slot {availableSlots.find(s => s.id === selectedSlotId)?.slot_number} will be linked to this vehicle immediately — no admin action needed.
                            </div>
                          )}
                          {selectedSlotId === null && hasAnyFreeSlot && (
                            <div className="mv-hint mv-hint--warn">
                              <MdInfo size={13} />
                              Free slots are available above. A new extra slot request will still go to your admin if you proceed.
                            </div>
                          )}
                          {selectedSlotId === null && !hasAnyFreeSlot && (
                            <div className="mv-info">
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
              <div className="mv-empty">
                <MdDirectionsCarFilled size={40} style={{ opacity:0.2 }} />
                <p style={{ fontSize:14 }}>{t("vehEmpty")}</p>
                <button type="button" onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2" style={{ marginTop:4 }}>
                  <MdAdd /> {t("vehAddBtn")}
                </button>
              </div>
            ) : visibleVehicles.length === 0 ? (
              <div className="mv-empty">
                <MdSearch size={36} style={{ opacity:0.2 }} />
                <p style={{ fontSize:14 }}>No vehicles match “{search.trim()}”</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {visibleVehicles.map(v => (
                    <div key={v.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:14, background:"var(--card-inner-bg)", border:"1px solid var(--glass-border)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", background: v.vehicle_type==="BIKE" ? "rgba(var(--acct-violet-rgb),0.12)" : "var(--accent-soft)", border: v.vehicle_type==="BIKE" ? "1px solid rgba(var(--acct-violet-rgb),0.28)" : "1px solid rgba(var(--acct-purple-rgb),0.28)" }}>
                          {VEHICLE_ICON[v.vehicle_type] || <MdDirectionsCarFilled style={{ fontSize:20, color:"var(--accent)" }} />}
                        </div>
                        <div>
                          <p style={{ fontWeight:700, fontSize:14, margin:0, color:"var(--text-primary)" }}>{v.vehicle_name}</p>
                          <p style={{ fontSize:12, color:"var(--text-secondary)", margin:"3px 0 0", fontWeight:600, letterSpacing:"0.04em" }}>
                            {v.vehicle_number} · {TYPE_LABEL[v.vehicle_type] || v.vehicle_type}
                          </p>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3, flexWrap:"wrap" }}>
                            {v.parking_slot_id ? (
                              <span style={{ fontSize:11, color:"var(--approve-color)", display:"flex", alignItems:"center", gap:3 }}>
                                <MdLocalParking size={11} />
                                {v.slot?.slot_number || "Slot linked"}
                                {v.slot?.parking_floor && ` · ${v.slot.parking_floor}`}
                              </span>
                            ) : (
                              <span style={{ fontSize:11, color:"var(--accent)", display:"flex", alignItems:"center", gap:3 }}>
                                <MdHourglassEmpty size={11} /> Awaiting slot from admin
                              </span>
                            )}
                            <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:999, background: v.parking_type==="DEFAULT" ? "var(--approve-bg)" : "var(--approval-bg)", color: v.parking_type==="DEFAULT" ? "var(--approve-color)" : "var(--approval-color)", border:`1px solid ${v.parking_type==="DEFAULT" ? "var(--approve-border)" : "var(--approval-border)"}` }}>
                              {v.parking_type === "DEFAULT" ? "Default" : "Extra"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <GlobalButton
                        variant="delete"
                        size="sm"
                        icon={MdDelete}
                        onClick={() => setDeleteConfirmId(v.id)}
                      />
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
                      {visibleVehicles.map((v, i) => (
                        <tr key={v.id} className="mv-row" style={{ borderBottom:"1px solid var(--glass-border)" }}>
                          <td className="p-3 text-xs text-secondary">{i + 1}</td>
                          <td className="p-3">
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background: v.vehicle_type==="BIKE" ? "rgba(var(--acct-violet-rgb),0.12)" : "var(--accent-soft)", border: v.vehicle_type==="BIKE" ? "1px solid rgba(var(--acct-violet-rgb),0.28)" : "1px solid rgba(var(--acct-purple-rgb),0.28)" }}>
                                {VEHICLE_ICON[v.vehicle_type] || <MdDirectionsCarFilled style={{ color:"var(--accent)", fontSize:18 }} />}
                              </div>
                              <span style={{ fontWeight:700, color:"var(--text-primary)" }}>{v.vehicle_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span style={{ fontWeight:700, letterSpacing:"0.06em", fontSize:13, color:"var(--text-primary)", fontFamily:"monospace" }}>{v.vehicle_number}</span>
                          </td>
                          <td className="p-3">
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color: v.vehicle_type==="BIKE" ? "var(--acct-violet)" : "var(--accent)", background: v.vehicle_type==="BIKE" ? "rgba(var(--acct-violet-rgb),0.12)" : "var(--accent-soft)", border:`1px solid ${v.vehicle_type==="BIKE" ? "rgba(var(--acct-violet-rgb),0.28)" : "rgba(var(--acct-purple-rgb),0.28)"}` }}>
                              {TYPE_LABEL[v.vehicle_type] || v.vehicle_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {v.parking_slot_id ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"var(--approve-color)", background:"var(--approve-bg)", border:"1px solid var(--approve-border)" }}>
                                  <MdLocalParking size={11} /> {v.slot?.slot_number || "Linked"}
                                </span>
                                {v.slot?.parking_floor && (
                                  <span style={{ fontSize:10, color:"var(--text-secondary)" }}>Level {v.slot.parking_floor}</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"var(--approval-color)", background:"var(--approval-bg)", border:"1px solid var(--approval-border)" }}>
                                <MdHourglassEmpty size={11} /> Awaiting admin
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, background: v.parking_type==="DEFAULT" ? "var(--approve-bg)" : "var(--approval-bg)", color: v.parking_type==="DEFAULT" ? "var(--approve-color)" : "var(--approval-color)", border:`1px solid ${v.parking_type==="DEFAULT" ? "var(--approve-border)" : "var(--approval-border)"}` }}>
                              {v.parking_type === "DEFAULT" ? "Default" : "Extra"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <GlobalButton
                              variant="delete"
                              size="sm"
                              icon={MdDelete}
                              onClick={() => setDeleteConfirmId(v.id)}
                            >
                              Delete
                            </GlobalButton>
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
              <div className="mv-empty">
                <MdLocalParking size={44} style={{ opacity:0.18 }} />
                <p style={{ fontSize:14, fontWeight:600 }}>No parking slots assigned to your flat yet</p>
                <p style={{ fontSize:12, maxWidth:320, lineHeight:1.5 }}>
                  Your admin will assign parking slots to your flat when registering you.
                  Once assigned, add a vehicle from "My Vehicles" to link to that slot automatically.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mv-info">
                <MdInfo size={15} />
                <span>
                  These slots were <strong>pre-assigned to your flat</strong> by the admin.
                  Add a vehicle from the "My Vehicles" tab and manually choose which slot to link it to.
                  If all your slots are occupied and you add another vehicle, a request will go to the admin for an extra slot.
                </span>
              </div>

              {allocatedSlots.length > 1 && (
                <div className="mv-info">
                  <MdApartment size={15} />
                  <span>
                    You have <strong>{allocatedSlots.length}</strong> parking slots across{" "}
                    {new Set(allocatedSlots.map(s => s.flat_id)).size} flat(s).
                  </span>
                </div>
              )}

              {visibleSlots.length === 0 ? (
                <div className="bg-card rounded-xl">
                  <div className="mv-empty">
                    <MdSearch size={36} style={{ opacity:0.2 }} />
                    <p style={{ fontSize:14 }}>No parking slots match “{search.trim()}”</p>
                  </div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                  {visibleSlots.map(slot => <AllocatedSlotCard key={slot.id} slot={slot} />)}
                </div>
              )}

              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:4 }}>
                {[
                  { label:"Total Slots",     value: allocatedSlots.length },
                  { label:"Car Slots",       value: allocatedSlots.filter(s => s.vehicle_type==="CAR").length },
                  { label:"Bike Slots",      value: allocatedSlots.filter(s => s.vehicle_type==="BIKE").length },
                  { label:"In Use",          value: allocatedSlots.filter(s => s.linked_vehicle).length },
                  { label:"Free / Unlinked", value: allocatedSlots.filter(s => !s.linked_vehicle).length },
                ].map(stat => (
                  <div key={stat.label} style={{ flex:"1 1 90px", padding:"12px 16px", borderRadius:12, background:"var(--card-inner-bg)", border:"1px solid var(--glass-border)", textAlign:"center" }}>
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
          <div className="mv-info">
            <MdInfo size={15} />
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
              <div className="mv-empty">
                <MdHourglassEmpty size={44} style={{ opacity:0.18 }} />
                <p style={{ fontSize:14, fontWeight:600 }}>No extra slot requests</p>
                <p style={{ fontSize:12, maxWidth:300, lineHeight:1.5 }}>
                  When you add a vehicle and no pre-assigned slot is free (or you choose to request a new one),
                  an extra slot request will appear here.
                </p>
              </div>
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="bg-card rounded-xl">
              <div className="mv-empty">
                <MdSearch size={36} style={{ opacity:0.2 }} />
                <p style={{ fontSize:14 }}>No slot requests match “{search.trim()}”</p>
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
                    {visibleRequests.map((r, i) => (
                      <tr key={r.id} className="mv-row" style={{ borderBottom:"1px solid var(--divider)" }}>
                        <td className="px-5 py-3 text-xs text-secondary">{i + 1}</td>
                        <td className="px-5 py-3 font-mono font-bold text-sm">{r.vehicle_number}</td>
                        <td className="px-5 py-3">
                          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color: r.vehicle_type==="BIKE" ? "var(--acct-violet)" : "var(--accent)", background: r.vehicle_type==="BIKE" ? "rgba(var(--acct-violet-rgb),0.12)" : "var(--accent-soft)", border:`1px solid ${r.vehicle_type==="BIKE" ? "rgba(var(--acct-violet-rgb),0.28)" : "rgba(var(--acct-purple-rgb),0.28)"}` }}>
                            {TYPE_LABEL[r.vehicle_type] || r.vehicle_type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {r.assigned_spot ? (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"var(--approve-color)", background:"var(--approve-bg)", border:"1px solid var(--approve-border)" }}>
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
                {visibleRequests.map(r => (
                  <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"14px", borderRadius:14, background:"var(--card-inner-bg)", border:"1px solid var(--glass-border)" }}>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, fontFamily:"monospace" }}>{r.vehicle_number}</p>
                      <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--text-secondary)" }}>
                        {TYPE_LABEL[r.vehicle_type] || r.vehicle_type}
                        {r.assigned_spot && <> · <span style={{ color:"var(--approve-color)" }}>{r.assigned_spot}</span></>}
                      </p>
                      {!r.assigned_spot && (
                        <span style={{ display:"inline-flex", marginTop:4, alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, background:"var(--approval-bg)", color:"var(--approval-color)", border:"1px solid var(--approval-border)" }}>
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

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => handleDelete(deleteConfirmId)}
        title="Remove Vehicle"
        message="Are you sure you want to remove this vehicle? Your flat's parking slot will be freed for reuse."
        confirmText="Remove Vehicle"
        variant="danger"
        loading={Boolean(deleteLoadingId)}
      />
    </div>
  );
}                                  