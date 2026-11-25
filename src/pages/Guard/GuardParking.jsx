import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import {
  MdDirectionsCar, MdCheckCircle, MdCancel,
  MdLocalParking, MdRefresh, MdExitToApp,
  MdWarning, MdExpandMore, MdExpandLess,
  MdDone, MdPersonSearch, MdAdd,
  MdTwoWheeler, MdAccessTime, MdArrowForward,
} from "react-icons/md";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";
import StatCard from "../../components/common/StatCard";

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

function formatTime(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function StatusBadge({ status, t }) {
  const cfg = {
    PENDING:   { label: t("gpPending", "Pending"),   color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40", dot: "bg-amber-500 animate-pulse" },
    APPROVED:  { label: t("gpApproved", "Parked"),  color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40", dot: "bg-emerald-500 animate-pulse" },
    REJECTED:  { label: t("gpRejected", "Rejected"), color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40", dot: "bg-rose-500" },
    COMPLETED: { label: t("gpCompleted", "Exited"),  color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40", dot: "bg-indigo-500" },
  }[status] || { label: status, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40", dot: "bg-emerald-500" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}

function VehicleTypeBadge({ type, t }) {
  const ut = (type || "").toUpperCase();
  const label = ut === "CAR" ? (t ? t("gpCar", "Car") : "Car") : ut === "BIKE" ? (t ? t("gpBike", "Bike") : "Bike") : type || "Vehicle";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-800/50 uppercase tracking-wide">
      {label}
    </span>
  );
}

function RequestCard({ r, slots, selectedSlot, setSelectedSlot, onAssign, onReject, onExit, isMobile, t }) {
  const [expanded, setExpanded] = useState(false);

  const availableSlots = slots.filter(
    slot => slot.status === "AVAILABLE" && slot.vehicle_type === r.vehicle_type
  );

  const isPending   = r.status === "PENDING";
  const isApproved  = r.status === "APPROVED";
  const isCompleted = r.status === "COMPLETED";
  const hasSlot     = !!r.assigned_spot;

  const typeLabel =
    r.vehicle_type === "CAR" ? t("gpCar", "Car")
    : r.vehicle_type === "BIKE" ? t("gpBike", "Bike")
    : r.vehicle_type || t("gpVehicle", "Vehicle");

  const isCar = (r.vehicle_type || "").toUpperCase() === "CAR";
  const timeStr = formatTime(r.createdAt);

  return (
    <div className="rounded-2xl bg-card border border-glass-border/70 hover:border-glass-border shadow-xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between group">
      <div>
        {/* TOP SECTION: Vehicle & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar icon */}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
              isCar
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40"
                : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800/40"
            }`}>
              {isCar ? <MdDirectionsCar size={22} /> : <MdTwoWheeler size={22} />}
            </div>

            {/* Vehicle Plate & Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-black text-base text-primary tracking-wide truncate">
                  <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mr-1 select-none">IND</span>
                  {r.vehicle_number}
                </h3>
                <VehicleTypeBadge type={r.vehicle_type} t={t} />
              </div>

              <div className="text-xs font-medium text-secondary flex items-center gap-1.5 mt-1 truncate">
                {r.assigned_spot ? (
                  <span className="font-bold text-primary flex items-center gap-1">
                    <MdLocalParking size={13} className="text-accent" />
                    Slot {r.assigned_spot}
                  </span>
                ) : (
                  <span className="text-amber-500 font-semibold">Unassigned Slot</span>
                )}
                {r.Flat?.flat_number && (
                  <>
                    <span className="text-secondary/50">•</span>
                    <span className="truncate">Flat Block {r.Flat.flat_number}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top Right Status Badge */}
          <div className="shrink-0 flex items-center gap-1.5">
            <StatusBadge status={r.status} t={t} />
            {isMobile && isPending && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-8 h-8 rounded-xl border border-glass-border bg-card-inner-bg text-secondary flex items-center justify-center cursor-pointer"
              >
                {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* PENDING Slot Assignment Panel */}
        {isPending && (!isMobile || expanded) && (
          <div className="rounded-xl p-3 bg-card-inner-bg/80 border border-glass-border/60 space-y-2.5 mt-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-primary">
                  {t("gpAssignSlot", "Assign Parking Slot")}
                </label>
                {availableSlots.length === 0 && (
                  <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                    <MdWarning size={12} /> {t("gpNoSlots", "No slots available")}
                  </span>
                )}
              </div>

              {availableSlots.length === 0 ? (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium flex items-center gap-2">
                  <MdWarning size={15} className="shrink-0" />
                  <span>{t("gpNoSlotsDetail", { type: typeLabel }, "All {type} slots are currently occupied.")}</span>
                </div>
              ) : (
                <Select
                  className="w-full text-xs font-bold bg-card border-glass-border rounded-xl cursor-pointer"
                  icon={<MdLocalParking size={16} className="text-accent" />}
                  value={selectedSlot[r.id] || ""}
                  onChange={e => setSelectedSlot({ ...selectedSlot, [r.id]: e.target.value })}
                >
                  <option value="">{t("gpSelectSlot", "-- Select Parking Slot --")}</option>
                  {availableSlots.map(slot => (
                    <option key={slot.id} value={slot.slot_number}>
                      {t("gpSlotOption", { slot: slot.slot_number }, "Slot {slot} (Available)")}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => onAssign(r.id)}
                disabled={!selectedSlot[r.id]}
                className="flex-1 py-1.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
              >
                <MdCheckCircle size={14} />
                <span>{t("gpAssignBtn", "Approve & Assign")}</span>
              </button>
              <button
                onClick={() => onReject(r.id)}
                className="py-1.5 px-3 rounded-xl font-bold text-xs text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <MdCancel size={14} />
                <span>{t("gpRejectBtn", "Reject")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HAIRLINE DIVIDER - Exactly like reference */}
      <div className="border-t border-glass-border/60 my-3.5" />

      {/* BOTTOM SECTION: Occupant & Action Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-primary truncate">
            {r.guest_name}
          </h4>
          <p className="text-xs text-secondary font-medium mt-0.5 truncate">
            {r.parking_type === "RESIDENT" ? (
              <span>🏠 Primary Resident</span>
            ) : (
              <span>👤 Guest Visitor{timeStr ? ` • In at ${timeStr}` : ""}</span>
            )}
          </p>
        </div>

        <div className="shrink-0">
          {isApproved && hasSlot && r.parking_type === "VISITOR" && (
            <button
              onClick={() => onExit(r.id)}
              className="py-2 px-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-0"
            >
              <MdExitToApp size={15} />
              <span>{t("gpMarkExit", "Mark Exit")}</span>
            </button>
          )}

          {isApproved && hasSlot && r.parking_type === "RESIDENT" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 text-xs font-bold">
              <MdLocalParking size={14} />
              <span>Dedicated Space</span>
            </span>
          )}

          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-glass-border/40 text-xs font-semibold">
              <MdDone size={14} className="text-emerald-500" />
              <span>Slot Released</span>
            </span>
          )}

          {r.status === "REJECTED" && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/50 dark:border-rose-800/40 text-xs font-semibold">
              <MdCancel size={14} />
              <span>Rejected</span>
            </span>
          )}
        </div>
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
    ? lookupResult.has_valid_assignment
      ? [{ id: lookupResult.assigned_slot_id, slot_number: lookupResult.assigned_spot, vehicle_type: lookupResult.vehicle_type, status: "ASSIGNED" }]
      : slots.filter((s) => s.status === "AVAILABLE" && s.vehicle_type === lookupResult.vehicle_type)
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
      if (res.data?.has_valid_assignment) setSelectedSlot(res.data.assigned_spot);
    } catch (err) {
      setLookupError(err?.response?.data?.message || t("gpLookupFail", "Vehicle not registered in this society"));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedSlot) {
      setSubmitError(t("gpSelectSlotError", "Please select an available parking slot"));
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
      toast.success(t("gpAssignToast", { vehicle: lookupResult.vehicle_number, slot: selectedSlot }, "Vehicle {vehicle} assigned to slot {slot}"));
      setVehicleNumber("");
      setLookupResult(null);
      setSelectedSlot("");
      onClose();
      onCreated();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || t("gpCreateFail", "Failed to create resident parking entry"));
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
      title={t("gpModTitle", "Resident Vehicle Lookup & Entry")}
      subtitle={t("gpModSubtitle", "Search registered vehicles by license plate and assign a parking slot")}
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
              placeholder={t("gpPlatePlaceholder", "Enter license plate (e.g. TN01AB1234)")}
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
                title={t("gpClear", "Clear")}
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
            <span>{lookupLoading ? t("gpSearching", "Searching...") : t("gpLookup", "Lookup")}</span>
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
                  {lookupResult.vehicle_name || t("gpResidentVehicle", "Resident Vehicle")}
                </span>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {t("gpVerified", "Verified")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  {t("gpVehicleType", "Vehicle Type")}
                </span>
                <span className="font-extrabold text-primary mt-0.5 block capitalize">
                  {lookupResult.vehicle_type === "CAR" ? `🚗 ${t("gpCarSuv", "Car / SUV")}` : lookupResult.vehicle_type === "BIKE" ? `🏍️ ${t("gpBikeType", "Bike")}` : lookupResult.vehicle_type}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  {t("gpResidentOwner", "Resident Owner")}
                </span>
                <span className="font-bold text-primary mt-0.5 block truncate">
                  {lookupResult.resident_name || t("gpResidentFallback", "Resident")}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  {t("gpDestinationUnit", "Destination Unit")}
                </span>
                <span className="font-bold text-accent mt-0.5 block truncate">
                  {t("gpFlatNumber", { number: lookupResult.flat_number || "—" }, "Flat {number}")}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card-inner-bg/60 border border-glass-border/40">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                  {lookupResult.has_valid_assignment ? t("gpAssignedSlot", "Assigned Slot") : t("gpAvailableSlots", "Available Slots")}
                </span>
                <span className="font-extrabold text-emerald-400 mt-0.5 block">
                  {lookupResult.has_valid_assignment ? lookupResult.assigned_spot : t("gpNAvailable", { count: availableSlots.length }, "{count} available")}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-primary">
                {t("gpAssignSpot", "Assign Parking Spot")} <span className="text-cyan-400">*</span>
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
                    {lookupResult.has_valid_assignment
                      ? t("gpExistingAssignment", "Vehicle already assigned")
                      : availableSlots.length === 0
                      ? t("gpNoSlotForType", { type: lookupResult.vehicle_type }, "No available slots for {type}")
                      : t("gpSelectTypeSlot", { type: lookupResult.vehicle_type }, "-- Select an available {type} slot --")}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.slot_number}>
                      {t("gpSlotOption", { slot: slot.slot_number }, "Slot {slot} (Available)")}
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
                  {t("gpCancel", "Cancel")}
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
                      <span>{t("gpAuthorizing", "Authorizing Entry...")}</span>
                    </>
                  ) : (
                    <>
                      <MdCheckCircle size={18} />
                      <span>{t("gpAuthorizeAssign", "Authorize & Assign Slot")}</span>
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
  const navigate = useNavigate();
  const [limit, setLimit] = useState(6);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const isMobile = useIsMobile();
  const { t }    = useLang();

  const [viewMode,     setViewMode]     = useState("all");
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
        limit:        limitRef.current,
        filter:       f,
        parking_type: mode === "all" ? "ALL" : mode === "resident" ? "RESIDENT" : "VISITOR",
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
    loadRequests(1, "", "ALL", "all", true);
  }, [loadRequests]);

  useEffect(() => {
    if (initialLoad) return;
    loadRequests(1, debSearch, activeTab, viewMode);
  }, [debSearch]);

  useEffect(() => {
    const onNewRequest = (newRequest) => {
      // Pending visitor pre-approvals are verified upon arrival at /guard/gatepass
      if (newRequest.parking_type === "VISITOR" && newRequest.status === "PENDING") {
        return;
      }

      const currentMode = viewModeRef.current;
      if (currentMode !== "all" && currentMode !== (newRequest.parking_type || "").toLowerCase()) {
        return;
      }

      const currentTab = activeTabRef.current;
      if (pageRef.current === 1 && (currentTab === "ALL" || currentTab === newRequest.status)) {
        setRequests((prev) => {
          if (prev.find((r) => r.id === newRequest.id)) return prev;
          const updated = [newRequest, ...prev];
          return updated.slice(0, limitRef.current);
        });
        setCounts((prev) => ({
          ...prev,
          ALL: prev.ALL + 1,
          [newRequest.status]: (prev[newRequest.status] || 0) + 1,
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
    if (!slot) { toast.error(t("gpErrSelectSlot", "Please select a slot")); return; }
    try {
      await API.put(`/parking/${id}/assign`, { assigned_spot: slot });
      setSelectedSlot({ ...selectedSlot, [id]: "" });
      toast.success(t("gpAssignSuccess", "Parking slot assigned successfully!"));
      loadSlots();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("gpAssignFail", "Failed to assign slot"));
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/parking/${id}/reject`);
      toast.info(t("gpRejectInfo", "Request rejected"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("gpRejectFail", "Failed to reject"));
    }
  };

  const handleExit = async (id) => {
    try {
      await API.put(`/parking/${id}/exit`);
      toast.success(t("gpExitSuccess", "Exit recorded successfully!"));
      loadSlots();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("gpExitFail", "Failed to mark exit"));
    }
  };

  const tabs = [
    { key: "ALL",       label: t("gpTabAll", "All Logs"), count: counts.ALL },
    { key: "PENDING",   label: t("gpPending", "Pending"), count: counts.PENDING },
    { key: "APPROVED",  label: t("gpApproved", "Parked"), count: counts.APPROVED },
    { key: "REJECTED",  label: t("gpRejected", "Rejected"), count: counts.REJECTED },
    { key: "COMPLETED", label: t("gpCompleted", "Exited"), count: counts.COMPLETED },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(99, 102, 241, 0.08))",
              color: "#6366F1",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              boxShadow: "0 6px 16px rgba(99, 102, 241, 0.18)",
            }}
          >
            <MdLocalParking size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-primary tracking-tight">
                {t("gpTitle", "Gate Parking Management")}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </div>
            <p className="text-xs text-secondary font-medium mt-0.5">
              {t("gpSubtitle", "Monitor active resident & visitor vehicles, parking spots, and gate exits")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowResidentModal(true)}
            className="py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-md shadow-indigo-600/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-0"
          >
            <MdAdd size={18} />
            <span>{t("gpResEntryBtn", "Resident Vehicle Entry")}</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer border-0 outline-none"
            title={t("gpRefresh", "Refresh")}
          >
            <MdRefresh size={18} className={refreshing ? "animate-spin text-accent" : ""} />
            <span className="hidden sm:inline">{refreshing ? t("gpRefreshing", "Refreshing…") : t("gpRefresh", "Refresh")}</span>
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
            { id: "all",      label: t("gpModeAll", "All Parking") },
            { id: "visitor",  label: t("gpModeVisitor", "Visitor Parking") },
            { id: "resident", label: t("gpModeResident", "Resident Parking") },
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
          <StatCard
            layout="inline"
            icon={MdLocalParking}
            tone="brand"
            interactive
            selected={activeTab === "ALL"}
            onClick={() => handleTabChange("ALL")}
            value={counts.ALL}
            label={t("gpStatTotalLogs", "Total Parking Logs")}
          />

          <StatCard
            layout="inline"
            icon={MdWarning}
            tone="info"
            interactive
            selected={activeTab === "PENDING"}
            onClick={() => handleTabChange("PENDING")}
            value={counts.PENDING}
            label={t("gpStatPending", "Pending Approval")}
          />

          <StatCard
            layout="inline"
            icon={MdCheckCircle}
            tone="success"
            interactive
            selected={activeTab === "APPROVED"}
            onClick={() => handleTabChange("APPROVED")}
            value={counts.APPROVED}
            label={t("gpStatParked", "Currently Parked")}
          />

          <StatCard
            layout="inline"
            icon={MdDone}
            tone="success"
            interactive
            selected={activeTab === "COMPLETED"}
            onClick={() => handleTabChange("COMPLETED")}
            value={counts.COMPLETED}
            label={t("gpStatExited", "Exited / Completed")}
          />
        </div>
      )}

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      {!initialLoad && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-glass-border">
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

          <div className="flex items-center gap-2 self-end sm:self-center">
            <ExpandableSearch
              value={search}
              onChange={setSearch}
              placeholder={t("gpSearchPlaceholder", "Search guest, vehicle plate...")}
            />
          </div>
        </div>
      )}

      {/* ── PARKING LIST ── */}
      {initialLoad ? (
        <div className="p-12 text-center text-secondary bg-card rounded-2xl border border-glass-border">
          <Spinner size={26} />
          <p className="mt-3 text-xs font-bold">{t("gpLoading", "Loading parking entries...")}</p>
        </div>
      ) : requests.length === 0 ? (
        viewMode === "visitor" ? (
          <div className="p-10 text-center bg-card rounded-2xl border border-glass-border space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center">
              <MdDirectionsCar size={28} />
            </div>
            <h3 className="text-base font-extrabold text-primary">
              {t("gpEmptyVisitorTitle", "No Active Visitor Vehicles Parked")}
            </h3>
            <p className="text-xs text-secondary max-w-md mx-auto">
              {t("gpEmptyVisitorSub", "Visitor gate passes are verified and parking slots are assigned directly at the gate when guests arrive.")}
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate("/guard/gatepass")}
                className="py-2.5 px-5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-md shadow-cyan-600/25 transition-all inline-flex items-center gap-2 cursor-pointer border-0"
              >
                <span>{t("gpGoGatepass", "Gate Pass Verification")}</span>
                <MdArrowForward size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-card rounded-2xl border border-glass-border space-y-2">
            <div className="text-3xl">{viewMode === "resident" ? "🏠" : "🅿️"}</div>
            <p className="text-sm font-extrabold text-primary">
              {viewMode === "resident"
                ? t("gpEmptyResident", "No Resident Parking Entries Yet")
                : activeTab === "ALL" ? t("gpEmptyAll", "No Parking Entries Recorded") : t("gpEmptyRequests", { status: activeTab.toLowerCase() }, "No {status} requests")}
            </p>
            <p className="text-xs text-secondary max-w-md mx-auto">
              {viewMode === "resident"
                ? t("gpEmptyResidentSub", "Use the '+ Resident Vehicle Entry' button above to assign a slot to a registered resident vehicle.")
                : t("gpEmptySub", "Gate parking entries will appear here once vehicles are parked.")}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs font-bold text-accent cursor-pointer border-0 bg-transparent mt-2"
              >
                {t("gpClearSearch", "Clear Search")}
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              {t(
                "gpShowingRange",
                {
                  from: (page - 1) * limit + 1,
                  to: Math.min(page * limit, totalItems),
                  total: totalItems,
                },
                "Showing {from}–{to} of {total} parking entries"
              )}
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
          </div>
        </>
      )}
    </div>
  );
}
