import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import {
  MdAdd, MdDelete, MdEdit, MdDirectionsCarFilled,
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
const vehTypeLabel = (t, type) => {
  const base = type === "CAR" ? t("vehTypeCar") : type === "BIKE" ? t("vehTypeBike") : type;
  const emoji = type === "CAR" ? " 🚗" : type === "BIKE" ? " 🏍️" : "";
  return `${base}${emoji}`;
};

/* ── Allocated Slot Card ── */
function AllocatedSlotCard({ slot, t }) {
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
            {t("rdFlat")} {slot.flat.flat_number}{slot.flat.floor_id != null && <> · {t("vehFloor", { floor: slot.flat.floor_id })}</>}
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
              {vehTypeLabel(t, slot.vehicle_type)}
              {slot.parking_floor && <> &nbsp;·&nbsp; {t("vehLevel", { level: slot.parking_floor })}</>}
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
                {t("vehNoLinkedYet")}
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
            {slot.parking_type === "DEFAULT" ? t("vehDefault") : t("vehExtra")}
          </span>
          {/* Occupancy badge */}
          <span style={{
            padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
            background: slot.linked_vehicle ? "var(--accent-soft)" : "var(--card-inner-bg)",
            color: slot.linked_vehicle ? "var(--accent)" : "var(--text-secondary)",
            border: `1px solid ${slot.linked_vehicle ? "rgba(var(--acct-purple-rgb),0.28)" : "var(--glass-border)"}`,
          }}>
            {slot.linked_vehicle ? t("vehOccupied") : t("vehUnlinked")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Status badge for parking requests ── */
function ReqStatusBadge({ status, t }) {
  const cfg = {
    PENDING:   { label:t("parkStatusPending"),   color:"var(--approval-color)", bg:"var(--approval-bg)",  border:"var(--approval-border)"  },
    APPROVED:  { label:t("parkStatusApproved"),  color:"var(--approve-color)", bg:"var(--approve-bg)",  border:"var(--approve-border)"  },
    REJECTED:  { label:t("parkStatusRejected"),  color:"var(--reject-color)", bg:"var(--reject-bg)", border:"var(--reject-border)" },
    COMPLETED: { label:t("parkStatusCompleted"), color:"var(--accent)", bg:"var(--accent-soft)", border:"rgba(var(--acct-purple-rgb),0.28)" },
  }[status] || { label:status, color:"#A39EB2", bg:"rgba(163,158,178,0.10)", border:"rgba(163,158,178,0.22)" };

  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

/* ── Slot Picker Option ── */
function SlotPickerOption({ slot, isSelected, isOccupied, onSelect, t }) {
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
              {t("vehLevel", { level: slot.parking_floor })}
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
          {isDefault ? t("vehDefault") : t("vehExtra")}
        </span>

        {/* Available / Occupied */}
        <span style={{
          padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: isOccupied ? "var(--reject-bg)" : "var(--approve-bg)",
          color: isOccupied ? "var(--reject-color)" : "var(--approve-color)",
          border: `1px solid ${isOccupied ? "var(--reject-border)" : "var(--approve-border)"}`,
        }}>
          {isOccupied ? t("vehOccupied") : t("vehAvailable")}
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
  const [editVehicleId,   setEditVehicleId]   = useState(null);

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

  /* unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showForm);

  /* ────────────────────────────
     LOADERS
  ──────────────────────────── */
  const loadVehicles = useCallback(async () => {
    try {
      const res = await API.get("/vehicles/my");
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setVehicles(list);
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
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setParkingRequests(list);
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
     KEEP slot selection when flat or vehicle type changes,
     but only if that slot is still valid for the new
     flat + type. Otherwise reset to "Request New Extra Slot".
  ──────────────────────────── */
  useEffect(() => {
    setSelectedSlotId(prev => {
      if (!prev) return prev;
      const s = allocatedSlots.find(x => x.id === prev);
      const stillValid = s &&
        String(s.flat_id) === String(form.flat_id) &&
        s.vehicle_type === form.vehicle_type;
      return stillValid ? prev : null;
    });
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

  // Whether a given slot is already linked to another vehicle (excluding the one being edited)
  const isSlotOccupied = (slot) =>
    vehicles.some(v => v.parking_slot_id === slot.id && v.id !== editVehicleId);

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
      setErrorMsg(t("vehErrSelectFlat"));
      return;
    }

    // If free slots exist the resident must make an explicit choice —
    // either pick one or deliberately choose "Request New Extra Slot".
    if (availableSlots.length > 0 && selectedSlotId === null && hasAnyFreeSlot) {
      setErrorMsg(t("vehErrSelectSlot"));
      return;
    }

    // ── Capture into a local const BEFORE any async work ──────────────────
    // selectedSlotId is a number when the resident picked a slot, null otherwise.
    // We use this local variable exclusively below — never re-read the state.
    const slotIdToLink = selectedSlotId; // number | null

    // ── Debug: verify exactly what is being sent to the backend ───────────
    console.log(`[MyVehicles] ${editVehicleId ? "handleEdit" : "handleSubmit"} →`, {
      vehicle_number:  form.vehicle_number.toUpperCase(),
      vehicle_type:    form.vehicle_type,
      flat_id:         form.flat_id ? Number(form.flat_id) : undefined,
      parking_slot_id: slotIdToLink,   // should be a number when slot was selected
    });

    setSubmitLoading(true);
    try {
      // ── POST /vehicles or PUT /vehicles/:id ───────────────────────────────
      const payload = {
        vehicle_name:    form.vehicle_name,
        vehicle_number:  form.vehicle_number.toUpperCase(),
        vehicle_type:    form.vehicle_type,
        flat_id:         form.flat_id ? Number(form.flat_id) : undefined,
        parking_slot_id: slotIdToLink,   // number → link now; null → admin assigns later
      };

      const vehicleRes = editVehicleId
        ? await API.put(`/vehicles/${editVehicleId}`, payload)
        : await API.post("/vehicles", payload);

      // ── Branch purely on what the FRONTEND decided + backend signals ───────
      const baseVerb = editVehicleId ? "Vehicle updated" : "Vehicle added";

      if (slotIdToLink !== null) {
        // Resident chose a specific slot → it is linked immediately, no admin request.
        const linkedSlot = availableSlots.find(s => s.id === slotIdToLink);
        setSuccessMsg(t("parkSuccessLinked", { slot: linkedSlot?.slot_number ?? slotIdToLink }));
      } else if (vehicleRes.data?.free_slot) {
        // Backend found an unlinked free pre-assigned slot — surface it.
        setSuccessMsg(t("parkSuccessFreeSlot", { slot: vehicleRes.data.free_slot }));
      } else if (vehicleRes.data?.request_id) {
        // Backend auto-created (or found) the RESIDENT slot request.
        setSuccessMsg(t("parkSuccessWithRequest"));
      } else {
        setSuccessMsg(t("parkSuccessNoRequest"));
      }

      // Reset form state
      setForm({
        vehicle_number: "",
        vehicle_type:   "",
        vehicle_name:   "",
        flat_id:        myFlats.length === 1 ? String(myFlats[0].id) : "",
      });
      setSelectedSlotId(null);
      setEditVehicleId(null);
      setShowForm(false);
      loadVehicles();
      loadAllocatedSlots();
      loadParkingRequests();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("parkErrorAdd"));
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
      setSuccessMsg(t("vehDeleted"));
      setDeleteConfirmId(null);
      loadVehicles();
      loadAllocatedSlots();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("vehDeleteFailed"));
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setErrorMsg("");
    setSelectedSlotId(null);
    setEditVehicleId(null);
    setForm({
      vehicle_number: "",
      vehicle_type:   "",
      vehicle_name:   "",
      flat_id:        myFlats.length === 1 ? String(myFlats[0].id) : "",
    });
  };

  /* ────────────────────────────
     OPEN EDIT MODE (prefill the form from an existing vehicle)
  ──────────────────────────── */
  const openEdit = (v) => {
    setForm({
      vehicle_number: v.vehicle_number,
      vehicle_type:   v.vehicle_type,
      vehicle_name:   v.vehicle_name,
      flat_id:        v.flat_id ? String(v.flat_id) : (myFlats.length === 1 ? String(myFlats[0].id) : ""),
    });
    setSelectedSlotId(v.parking_slot_id ?? null);
    setEditVehicleId(v.id);
    setErrorMsg("");
    setShowForm(true);
  };

  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else resetForm();
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
            <p className="page-subtitle">{t("vehSubtitle")}</p>
          </div>
        </div>
        {activeTab === "vehicles" && (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => { setShowForm(true); setErrorMsg(""); }}
          >
            <MdAdd size={18} />
            {t("vehAddBtn") || "Add Vehicle"}
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
          <span className="complaint-stat-label">{t("vehStatSlots")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{pendingCount}</span>
          <span className="complaint-stat-label">{t("vehStatPending")}</span>
        </div>
      </div>

      {residentProfile && declaredVehicleCount > 0 && (
        <div className={`mv-banner ${overDeclared ? "mv-banner--warn" : "mv-banner--ok"}`}>
          <MdDirectionsCar size={15} />
          <span>
            {t("vehDeclaredOf", { count: actualVehicleCount, total: declaredVehicleCount, s: declaredVehicleCount !== 1 ? "s" : "" })}
            {overDeclared
              ? " " + t("vehDeclaredReached")
              : " " + t("vehDeclaredCanAdd")}
          </span>
        </div>
      )}

      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "vehicles", label: t("vehTitle"), icon: <MdDirectionsCarFilled size={15} />, badge: vehicles.length },
              { id: "slots", label: t("vehTabSlots"), icon: <MdLocalParking size={15} />, badge: allocatedSlots.length },
              { id: "requests", label: t("vehTabRequests"), icon: <FaParking size={14} />, badge: parkingRequests.length, alert: pendingCount },
            ]}
          />
        </div>

        <div className="ml-auto">
          <ExpandableSearch
            placeholder={t("vehSearch")}
            value={search}
            onChange={setSearch}
          />
        </div>
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
      {/* ── ADD VEHICLE POPUP MODAL ── */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "var(--overlay-bg, rgba(0,0,0,0.72))", backdropFilter: "blur(8px)", zIndex: 9999 }}
          onClick={requestClose}
        >
          <div
            className="rounded-3xl w-full max-w-2xl overflow-hidden animate-scaleIn border border-glass-border shadow-2xl flex flex-col max-h-[90vh]"
            style={{ background: "var(--card-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-glass-border shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <MdDirectionsCarFilled size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {editVehicleId ? "Edit Vehicle" : (t("vehFormTitle") || "Add New Vehicle")}
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    {t("vehFormSubtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-white/10 transition cursor-pointer"
                title={t("close")}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {errorMsg && (
                  <div className="mv-banner mv-banner--err">
                    <span className="mv-banner-row"><MdWarning size={16} /> {errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg("")} className="mv-banner-close"><MdClose size={14} /></button>
                  </div>
                )}

                {/* Vehicle nickname */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {t("vehFieldName")}
                  </label>
                  <input className="input w-full mt-1" placeholder={t("vehPhName")} required
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
                      {t("parkWhichFlat")} <span style={{ color:"var(--reject-color)" }}>*</span>
                    </label>
                    {flatsLoading ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 0", color:"var(--text-secondary)", fontSize:13 }}>
                        <Spinner size={13} /> {t("vehLoadingFlats")}
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
                                  <p style={{ margin:0, fontSize:13, fontWeight:700, color: isSel ? "var(--accent)" : "var(--text-primary)" }}>{t("rdFlat")} {flat.flat_number}</p>
                                  {flat.floor_id && <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--text-secondary)" }}>{t("vehFloor", { floor: flat.floor_id })}</p>}
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
                                    {freeCount > 0 ? t("vehXSlotsFree", { count: freeCount, s: freeCount > 1 ? "s" : "" }) : t("vehAllOccupied")}
                                  </span>
                                )}
                                {form.vehicle_type && flatSlots.length === 0 && (
                                  <span style={{ fontSize:10, color:"var(--text-secondary)", fontWeight:600, padding:"3px 8px", borderRadius:999, background:"var(--card-inner-bg)", border:"1px solid var(--glass-border)" }}>
                                    {t("vehNoSlotAssigned", { type: form.vehicle_type })}
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
                        {t("parkSelfSlotTitle")}
                      </span>
                    </div>

                    <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>

                      {availableSlots.length === 0 ? (
                        /* No slots assigned to this flat for this vehicle type */
                        <div className="mv-info">
                          <MdInfo size={16} />
                          <div>
                            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--accent)" }}>
                              {t("parkNoSlotPreassigned", { type: form.vehicle_type })}
                            </p>
                            <p style={{ margin:"4px 0 0", fontSize:11, color:"var(--text-secondary)", lineHeight:1.5 }}>
                              {t("parkExtraReg1")} <strong>Extra</strong> {t("parkExtraReg2")}
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
                                t={t}
                              />
                            );
                          })}

                          {/* Divider */}
                          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0 2px" }}>
                            <div style={{ flex:1, height:1, background:"var(--glass-border)" }} />
                            <span style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:600 }}>{t("vehOr")}</span>
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
                                  {t("vehRequestExtraSlot")}
                                </p>
                                <p style={{ margin:"3px 0 0", fontSize:11, color:"var(--text-secondary)", lineHeight:1.5 }}>
                                  {t("vehRequestExtraHint")}
                                </p>
                              </div>
                            </div>
                            <span style={{
                              padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                              background:"var(--approval-bg)", color:"var(--approval-color)",
                              border:"1px solid var(--approval-border)", flexShrink:0,
                            }}>
                              {t("vehAdminAssigns")}
                            </span>
                          </button>

                          {/* Context hint */}
                          {selectedSlotId !== null && (
                            <div className="mv-hint mv-hint--ok">
                              <MdCheckCircle size={13} />
                              {t("parkLinkedImmediate", { slot: availableSlots.find(s => s.id === selectedSlotId)?.slot_number })}
                            </div>
                          )}
                          {selectedSlotId === null && hasAnyFreeSlot && (
                            <div className="mv-hint mv-hint--warn">
                              <MdInfo size={13} />
                              {t("parkHintFreeSlots")}
                            </div>
                          )}
                          {selectedSlotId === null && !hasAnyFreeSlot && (
                            <div className="mv-info">
                              <MdInfo size={13} />
                              {t("parkHintAllOccupied")}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-glass-border flex justify-end gap-3 bg-[var(--card-bg)] shrink-0">
                <button type="button" onClick={requestClose} className="btn-muted">
                  {t("cancel") || "Cancel"}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitLoading}>
                  {submitLoading ? (
                    <><Spinner size={14} /> {t("compSubmitting")}</>
                  ) : selectedSlotId !== null ? (
                    <><MdCheckCircle size={14} /> {t("parkBtnLinkSlot")}</>
                  ) : (
                    <><MdSend size={14} /> {t("parkBtnRequestSlot")}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); resetForm(); }}
      />

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
                <p style={{ fontSize:14 }}>{t("vehNoMatch", { query: search.trim() })}</p>
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
                            {v.vehicle_number} · {vehTypeLabel(t, v.vehicle_type)}
                          </p>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3, flexWrap:"wrap" }}>
                            {v.parking_slot_id ? (
                              <span style={{ fontSize:11, color:"var(--approve-color)", display:"flex", alignItems:"center", gap:3 }}>
                                <MdLocalParking size={11} />
                                {v.slot?.slot_number || t("vehSlotLinked")}
                                {v.slot?.parking_floor && ` · ${v.slot.parking_floor}`}
                              </span>
                            ) : (
                              <span style={{ fontSize:11, color:"var(--accent)", display:"flex", alignItems:"center", gap:3 }}>
                                <MdHourglassEmpty size={11} /> {t("vehAwaitingSlot")}
                              </span>
                            )}
<span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:999, background: v.parking_type==="DEFAULT" ? "var(--approve-bg)" : "var(--approval-bg)", color: v.parking_type==="DEFAULT" ? "var(--approve-color)" : "var(--approval-color)", border:`1px solid ${v.parking_type==="DEFAULT" ? "var(--approve-border)" : "var(--approval-border)"}` }}>
                              {v.parking_type === "DEFAULT" ? t("vehDefault") : t("vehExtra")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <GlobalButton
                          variant="edit"
                          size="sm"
                          icon={MdEdit}
                          onClick={() => openEdit(v)}
                          title="Edit vehicle"
                        />
                        <GlobalButton
                          variant="delete"
                          size="sm"
                          icon={MdDelete}
                          onClick={() => setDeleteConfirmId(v.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom:"1px solid var(--glass-border)" }}>
                        {["#", t("vehColVehicle"), t("vehColNumber"), t("vehColType"), t("vehColParkingSlot"), t("vehColSlotType"), t("vehColAction")].map((h, i) => (
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
                              {vehTypeLabel(t, v.vehicle_type)}
                            </span>
                          </td>
                          <td className="p-3">
                            {v.parking_slot_id ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"var(--approve-color)", background:"var(--approve-bg)", border:"1px solid var(--approve-border)" }}>
                                  <MdLocalParking size={11} /> {v.slot?.slot_number || t("vehLinked")}
                                </span>
                                {v.slot?.parking_floor && (
                                  <span style={{ fontSize:10, color:"var(--text-secondary)" }}>{t("vehLevel", { level: v.slot.parking_floor })}</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"var(--approval-color)", background:"var(--approval-bg)", border:"1px solid var(--approval-border)" }}>
                                <MdHourglassEmpty size={11} /> {t("vehAwaitingAdmin")}
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
                            >{t("vehDelete")}</GlobalButton>
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
              <Spinner size={18} /> {t("vehLoadingSlots")}
            </div>
          ) : allocatedSlots.length === 0 ? (
            <div className="bg-card rounded-xl">
              <div className="mv-empty">
                <MdLocalParking size={44} style={{ opacity:0.18 }} />
                <p style={{ fontSize:14, fontWeight:600 }}>{t("vehNoSlotsTitle")}</p>
                <p style={{ fontSize:12, maxWidth:320, lineHeight:1.5 }}>
                  {t("vehNoSlotsHint1")}
                  {t("vehNoSlotsHint2")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mv-info">
                <MdInfo size={15} />
                <span>
                  {t("vehPreAssignedA")} <strong>{t("vehPreAssignedStrong")}</strong>{t("vehPreAssignedB")}
                </span>
              </div>

              {allocatedSlots.length > 1 && (
                <div className="mv-info">
                  <MdApartment size={15} />
                  <span>
                    {t("vehSlotsAcrossA")} <strong>{allocatedSlots.length}</strong> {t("vehSlotsAcrossB", { flats: new Set(allocatedSlots.map(s => s.flat_id)).size })}
                  </span>
                </div>
              )}

              {visibleSlots.length === 0 ? (
                <div className="bg-card rounded-xl">
                  <div className="mv-empty">
                    <MdSearch size={36} style={{ opacity:0.2 }} />
                    <p style={{ fontSize:14 }}>{t("vehSlotsNoMatch", { query: search.trim() })}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                  {visibleSlots.map(slot => <AllocatedSlotCard key={slot.id} slot={slot} t={t} />)}
                </div>
              )}

              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:4 }}>
                {[
                  { label:t("vehStatTotalSlots"), value: allocatedSlots.length },
                  { label:t("vehStatCarSlots"),   value: allocatedSlots.filter(s => s.vehicle_type==="CAR").length },
                  { label:t("vehStatBikeSlots"),  value: allocatedSlots.filter(s => s.vehicle_type==="BIKE").length },
                  { label:t("vehStatInUse"),      value: allocatedSlots.filter(s => s.linked_vehicle).length },
                  { label:t("vehStatFree"),       value: allocatedSlots.filter(s => !s.linked_vehicle).length },
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
              {t("vehReqInfoA")} <strong>{t("vehReqInfoStrong")}</strong>{t("vehReqInfoB")}
            </span>
          </div>

          {requestsLoading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 20px", color:"var(--text-secondary)", gap:10 }}>
              <Spinner size={18} /> {t("vehLoadingRequests")}
            </div>
          ) : parkingRequests.length === 0 ? (
            <div className="bg-card rounded-xl">
              <div className="mv-empty">
                <MdHourglassEmpty size={44} style={{ opacity:0.18 }} />
                <p style={{ fontSize:14, fontWeight:600 }}>{t("vehNoRequestsTitle")}</p>
                <p style={{ fontSize:12, maxWidth:300, lineHeight:1.5 }}>
                  {t("vehNoRequestsHint")}
                </p>
              </div>
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="bg-card rounded-xl">
              <div className="mv-empty">
                <MdSearch size={36} style={{ opacity:0.2 }} />
                <p style={{ fontSize:14 }}>{t("vehReqNoMatch", { query: search.trim() })}</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl overflow-hidden">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background:"var(--card-inner-bg)", borderBottom:"1px solid var(--divider)" }}>
                      {["#", t("vehColVehicle"), t("vehColType"), t("vehColSlotAssigned"), t("vehColStatus"), t("vehColRequested")].map(h => (
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
                            {vehTypeLabel(t, r.vehicle_type)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {r.assigned_spot ? (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700, color:"var(--approve-color)", background:"var(--approve-bg)", border:"1px solid var(--approve-border)" }}>
                              <MdLocalParking size={11} /> {r.assigned_spot}
                            </span>
                          ) : (
                            <span style={{ fontSize:12, color:"var(--text-secondary)", opacity:0.5 }}>{t("vehAwaitingAdmin")}</span>
                          )}
                        </td>
                        <td className="px-5 py-3"><ReqStatusBadge status={r.status} t={t} /></td>
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
                        {vehTypeLabel(t, r.vehicle_type)}
                        {r.assigned_spot && <> · <span style={{ color:"var(--approve-color)" }}>{r.assigned_spot}</span></>}
                      </p>
                      {!r.assigned_spot && (
                        <span style={{ display:"inline-flex", marginTop:4, alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, background:"var(--approval-bg)", color:"var(--approval-color)", border:"1px solid var(--approval-border)" }}>
                          {t("vehAwaitingSlotAssign")}
                        </span>
                      )}
                    </div>
                    <ReqStatusBadge status={r.status} t={t} />
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
        title={t("vehRemoveTitle")}
        message={t("vehRemoveMsg")}
        confirmText={t("vehRemoveConfirm")}
        variant="danger"
        loading={Boolean(deleteLoadingId)}
      />
    </div>
  );
}                                  