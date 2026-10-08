
import { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import {
  MdAdd, MdDelete, MdClose, MdEdit,
  MdDirectionsCar, MdTwoWheeler,
  MdOutlineInbox, MdCheckCircle,
  MdBlock, MdFilterList, MdSearch,
  MdLocalParking, MdWarning, MdPersonSearch,
  MdPendingActions, MdDone, MdRefresh, MdPersonRemove, MdChevronRight,
} from "react-icons/md";
import { FaParking } from "react-icons/fa";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalModal from "../../components/common/GlobalModal";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";

import Pagination from "../../components/common/Pagination";
import RecordCard from "../../components/common/RecordCard";
import "./Admin.css";

/* ── Status Badge (slot) ── */
function StatusBadge({ status, t }) {
  return (
    <GlobalBadge
      size="sm"
      variant={status === "AVAILABLE" ? "success" : "danger"}
      icon={status === "AVAILABLE" ? MdCheckCircle : MdBlock}
    >
      {status === "AVAILABLE" ? t("parkAvailable") : t("parkOccupied")}
    </GlobalBadge>
  );
}

/* ── Request Status Badge ── */
function ReqBadge({ status, t }) {
  const cfg = {
    PENDING: { label: t("parkStatusPending"), variant: "warning" },
    APPROVED: { label: t("parkStatusApproved"), variant: "success" },
    REJECTED: { label: t("parkStatusRejected"), variant: "danger" },
  }[status] || { label: status, variant: "neutral" };
  return (
    <GlobalBadge size="sm" variant={cfg.variant}>
      {cfg.label}
    </GlobalBadge>
  );
}

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Spinner({ small = false }) {
  const s = small ? 13 : 20;
  return (
    <svg style={{ width: s, height: s, flexShrink: 0 }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

const localizedRequiredError = (value, label, t) =>
  value === null || value === undefined || String(value).trim() === ""
    ? t("parkValidationRequired", { field: label })
    : null;

const localizedTitleError = (value, label, t) => {
  const required = localizedRequiredError(value, label, t);
  if (required) return required;
  const clean = String(value).trim();
  if (clean.length < 4) return t("parkValidationMinChars", { field: label, count: 4 });
  if (/^\d+$/.test(clean)) return t("parkValidationOnlyNumbers", { field: label });
  if (/^[\W_]+$/.test(clean)) return t("parkValidationOnlySpecial", { field: label });
  if (/\s{2,}/.test(clean)) return t("parkValidationSpaces", { field: label });
  return null;
};

const localizedPositiveNumberError = (value, label, t) => {
  const required = localizedRequiredError(value, label, t);
  if (required) return required;
  const number = Number(value);
  if (!Number.isFinite(number)) return t("parkValidationValidNumber", { field: label });
  if (number < 1) return t("parkValidationAtLeast", { field: label, count: 1 });
  return null;
};

/* ═══════════════════════════════════════════
   Resident Entry Panel
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   Resident Entry Panel  (no lookup — shows all unassigned vehicles)
═══════════════════════════════════════════ */
function ResidentEntryPanel({ slots, onCreated, t }) {
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
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
    if (!hasPermission(user, "parking_slots", "allocate")) {
      showUnauthorized(t("parkNoPermissionAssign"));
      return;
    }
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
      setSuccessMsg(t("parkAssignedVehicleSuccess", { slot, vehicle: vehicle.vehicle_number }));
      setSelectedSlot(prev => ({ ...prev, [vehicle.vehicle_id]: "" }));
      setExpandedId(null);
      loadVehicles();
      onCreated();
    } catch (err) {
      setSubmitError(prev => ({
        ...prev,
        [vehicle.vehicle_id]: err?.response?.data?.message || t("parkAssignFailed"),
      }));
    } finally {
      setSubmitting(null);
    }
  };

  /* ── Reject: cancel pending request + delete the vehicle ── */
  const handleReject = async (vehicle) => {
    if (!hasPermission(user, "parking_slots", "allocate")) {
      showUnauthorized(t("parkNoPermissionReject"));
      return;
    }
    setRejecting(vehicle.vehicle_id);
    setSubmitError(prev => ({ ...prev, [vehicle.vehicle_id]: "" }));
    try {
      /* 1. Cancel the PENDING parking request for this vehicle */
      await API.post("/parking/admin-cancel-vehicle-request", {
        vehicle_number: vehicle.vehicle_number,
        vehicle_id: vehicle.vehicle_id,
      });
      setSuccessMsg(t("parkVehicleRejectedSuccess", { vehicle: vehicle.vehicle_number }));
      setExpandedId(null);
      loadVehicles();
      onCreated();
    } catch (err) {
      setSubmitError(prev => ({
        ...prev,
        [vehicle.vehicle_id]: err?.response?.data?.message || t("parkRejectVehicleFailed"),
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
      <div className="parking-info-banner flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.22)" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🏠</span>
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)", margin: 0 }}>
            {t("parkResidentEntry")}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", margin: 0 }}>
            {t("parkResidentEntryInfo")}
          </p>
        </div>
      </div>

      {/* Feedback */}
      {successMsg && (
        <div className="parking-feedback parking-feedback--success flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
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
        <ExpandableSearch
          value={search}
          onChange={setSearch}
          placeholder={t("parkSearchVehicle")}
          maxWidth={320}
        />
        <GlobalButton variant="secondary" size="sm" icon={MdRefresh} onClick={loadVehicles}>
          {t("refresh")}
        </GlobalButton>
      </div>

      {!loading && (
        <p className="text-xs text-secondary">
          {t("parkUnassignedCount", { count: filtered.length })}
          {search ? ` ${t("parkMatchingSearch", { search })}` : ""}
        </p>
      )}

      {/* Body */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14 text-secondary">
          <Spinner />
          <p className="text-sm">{t("parkUnassignedLoading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdOutlineInbox size={44} className="opacity-20" />
          <p className="text-sm font-semibold">
            {search ? t("parkNoVehiclesMatch", { search }) : t("parkAllVehiclesAssigned")}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-accent hover:underline mt-1">
              {t("parkClearSearch")}
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
                        {vehicle.flat_number && <> · {t("parkFlatNumber", { number: vehicle.flat_number })}</>}
                        <span className="ml-1.5 font-bold"
                          style={{ color: vehicle.vehicle_type === "CAR" ? "#94B5F5" : "#9F87D7" }}>
                          {vehicle.vehicle_type === "CAR" ? t("parkCar") : t("parkBike")}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <GlobalBadge size="sm" variant="danger" icon={MdWarning}>{t("parkNoSlot")}</GlobalBadge>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : vehicle.vehicle_id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{
                        background: isExpanded ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                        border: "1px solid var(--glass-border)",
                        color: isExpanded ? "var(--accent)" : "var(--text-secondary)",
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
                      style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>

                      {/* Slot selector */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
                          style={{ color: "var(--text-secondary)" }}>
                          {t("parkAssignFreeTypeSlot", { type: vehicle.vehicle_type === "CAR" ? t("parkCar") : t("parkBike") })}
                          {availSlots.length === 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ color: "#f87171", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.22)" }}>
                              <MdWarning size={11} /> {t("parkNoTypeSlotsAvailable", { type: vehicle.vehicle_type === "CAR" ? t("parkCar") : t("parkBike") })}
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
                            <option value="">{t("parkSelectSlot")}</option>
                            {availSlots.map(s => (
                              <option key={s.id} value={s.slot_number}>
                                {s.slot_number}{s.parking_floor ? ` · ${t("parkLevelValue", { level: s.parking_floor })}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {/* Confirmation hint */}
                      {chosenSlot && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 11, color: "#4ade80" }}>
                          ✓ {t("parkAssignConfirmation", { slot: chosenSlot, vehicle: vehicle.vehicle_number, flat: vehicle.flat_number })}
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
                        ⚠️ {t("parkRejectVehicleNote")}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {/* Assign */}
                        <GlobalButton
                          onClick={() => handleCreate(vehicle)}
                          disabled={!chosenSlot || isSubmitting || isRejecting}
                          variant="success"
                          icon={MdAdd}
                          loading={isSubmitting}
                          fullWidth
                          className="flex-1"
                        >
                          {isSubmitting ? t("parkAssigning") : t("parkAssignSlot")}
                        </GlobalButton>

                        {/* Reject */}
                        <GlobalButton
                          onClick={() => handleReject(vehicle)}
                          disabled={isRejecting || isSubmitting}
                          variant="danger"
                          icon={MdBlock}
                          loading={isRejecting}
                        >
                          {isRejecting ? t("parkRejecting") : t("parkReject")}
                        </GlobalButton>
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
  const { t, lang } = useLang();
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
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
    if (!hasPermission(user, "parking_slots", "allocate")) {
      showUnauthorized(t("parkNoPermissionAssign"));
      return;
    }
    const slot = selectedSlot[reqId];
    if (!slot) return;
    setAssigning(reqId);
    setErrorMsg("");
    try {
      await API.put(`/parking/${reqId}/admin-assign`, { assigned_spot: slot });
      setSuccessMsg(t("parkRequestAssignedSuccess", { slot }));
      setSelectedSlot(prev => ({ ...prev, [reqId]: "" }));
      setExpandedId(null);
      loadRequests();
      onSlotAssigned();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("parkAssignFailed"));
    } finally {
      setAssigning(null);
    }
  };

  const handleReject = async (reqId) => {
    if (!hasPermission(user, "parking_slots", "allocate")) {
      showUnauthorized(t("parkNoPermissionReject"));
      return;
    }
    setRejecting(reqId);
    setErrorMsg("");
    try {
      // Change this one line in handleReject:
      await API.put(`/parking/${reqId}/admin-reject`);  // was: /parking/${reqId}/reject;
      setSuccessMsg(t("parkRequestRejectedSuccess"));
      loadRequests();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("parkRejectFailed"));
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
    { id: "PENDING", label: t("parkStatusPending"), badge: counts.PENDING },
    { id: "APPROVED", label: t("parkStatusApproved"), badge: counts.APPROVED },
    { id: "REJECTED", label: t("parkStatusRejected"), badge: counts.REJECTED },
    { id: "ALL", label: t("parkTabAll"), badge: counts.ALL },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Info banner */}
      <div className="parking-info-banner flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(107,70,193,0.08)", border: "1.5px solid rgba(107,70,193,0.22)" }}>
        <MdPendingActions style={{ color: "#9F87D7", fontSize: 20, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)", margin: 0 }}>{t("parkExtraRequests")}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            {t("parkExtraRequestsInfo")}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "#9F87D7", margin: 0, fontWeight: 600 }}>
            ℹ️ {t("parkExtraRequestsNote")}
          </p>
        </div>
      </div>

      {/* Feedback */}
      {successMsg && (
        <div className="parking-feedback parking-feedback--success flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
          <MdCheckCircle size={15} /> {successMsg}
          <button onClick={() => setSuccessMsg("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><MdClose size={13} /></button>
        </div>
      )}
      {errorMsg && (
        <div className="parking-feedback parking-feedback--danger flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.28)", color: "#f87171" }}>
          <MdWarning size={15} /> {errorMsg}
          <button onClick={() => setErrorMsg("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><MdClose size={13} /></button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <SlidingTabs value={filterTab} onChange={setFilterTab} items={TABS} />
        <GlobalButton variant="secondary" size="sm" icon={MdRefresh} onClick={loadRequests}>
          {t("refresh")}
        </GlobalButton>
      </div>

      {/* Request list */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14 text-secondary">
          <Spinner /> <p className="text-sm">{t("parkExtraLoading")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-secondary">
          <MdOutlineInbox size={44} className="opacity-20" />
          <p className="text-sm font-semibold">
            {filterTab === "PENDING"
              ? t("parkNoPendingRequests")
              : t("parkNoStatusRequests", {
                  status: filterTab === "ALL"
                    ? t("parkTabAll")
                    : t(`parkStatus${filterTab.charAt(0)}${filterTab.slice(1).toLowerCase()}`),
                })}
          </p>
          {filterTab === "PENDING" && (
            <p className="text-xs text-secondary text-center" style={{ maxWidth: 300, lineHeight: 1.5 }}>
              {t("parkRequestsEmptyInfo")}
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
                        <GlobalBadge size="sm" variant="warning">{t("parkExtra")}</GlobalBadge>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {req.guest_name}
                        {req.Flat?.flat_number && <> · {t("parkFlatNumber", { number: req.Flat.flat_number })}</>}
                        {req.resident?.name && <> · {req.resident.name}</>}
                        <span className="ml-1.5 font-bold" style={{ color: req.vehicle_type === "CAR" ? "#94B5F5" : "#9F87D7" }}>
                          {req.vehicle_type === "CAR" ? t("parkCar") : t("parkBike")}
                        </span>
                      </p>
                      <p className="text-xs text-secondary" style={{ marginTop: 2, opacity: 0.55 }}>
                        {t("parkRequestedOn", { date: new Date(req.createdAt).toLocaleDateString(lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" }) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ReqBadge status={req.status} t={t} />
                    {req.assigned_spot && (
                      <GlobalBadge size="sm" variant="success" icon={MdLocalParking}>
                        {req.assigned_spot}
                      </GlobalBadge>
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
                      style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
                          style={{ color: "var(--text-secondary)" }}>
                          {t("parkAssignFreeTypeSlot", { type: req.vehicle_type === "CAR" ? t("parkCar") : t("parkBike") })}
                          {availSlots.length === 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ color: "#f87171", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.22)" }}>
                              <MdWarning size={11} /> {t("parkNoTypeSlotsAvailable", { type: req.vehicle_type === "CAR" ? t("parkCar") : t("parkBike") })}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <MdLocalParking size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
                          <Select className="input h-10 w-full" style={{ paddingLeft: 32, fontSize: 13, fontWeight: 600 }}
                            value={selectedSlot[req.id] || ""}
                            onChange={e => setSelectedSlot(prev => ({ ...prev, [req.id]: e.target.value }))}
                            disabled={availSlots.length === 0}>
                            <option value="">{t("parkSelectSlot")}</option>
                            {availSlots.map(s => (
                              <option key={s.id} value={s.slot_number}>
                                {s.slot_number}{s.parking_floor ? ` · ${t("parkLevelValue", { level: s.parking_floor })}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {selectedSlot[req.id] && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 11, color: "#4ade80" }}>
                          ✓ {t("parkPermanentAssignConfirmation", { slot: selectedSlot[req.id], vehicle: req.vehicle_number })}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <GlobalButton onClick={() => handleAssign(req.id)}
                          disabled={!selectedSlot[req.id] || assigning === req.id}
                          variant="success"
                          icon={MdDone}
                          loading={assigning === req.id}
                          fullWidth
                          className="flex-1">
                          {assigning === req.id ? t("parkAssigning") : t("parkAssignNotify")}
                        </GlobalButton>
                        <GlobalButton onClick={() => handleReject(req.id)}
                          disabled={rejecting === req.id}
                          variant="danger"
                          icon={MdBlock}
                          loading={rejecting === req.id}>
                          {t("parkReject")}
                        </GlobalButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approved footer */}
                {req.status === "APPROVED" && req.assigned_spot && (
                  <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold"
                    style={{ borderTop: "1px solid rgba(74,222,128,0.15)", color: "#4ade80", background: "rgba(74,222,128,0.04)" }}>
                    <MdCheckCircle size={13} />
                    {t("parkApprovedFooter", { slot: req.assigned_spot, vehicle: req.vehicle_number })}
                  </div>
                )}

                {/* Rejected footer */}
                {req.status === "REJECTED" && (
                  <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold"
                    style={{ borderTop: "1px solid rgba(248,113,113,0.15)", color: "#f87171", background: "rgba(248,113,113,0.04)" }}>
                    <MdBlock size={13} /> {t("parkRejectedFooter")}
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



export default function AssignParkingSlot({ hideHeader = false, societyId } = {}) {
  const { t } = useLang();
  const { user } = useAuthContext();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { showUnauthorized, showError } = useCustomAlert();
  const isCommittee = isCommitteeMember(user);

  const [mainTab, setMainTab] = useState("slots");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  /* SuperAdmin society filter */
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    if (societyId) return societyId;
    const stored = localStorage.getItem("superadmin_society_filter");
    return stored && stored !== "ALL" ? stored : "";
  });
  const [societiesList, setSocietiesList] = useState([]);

  /* Wing filter & lists */
  const [wingFilter, setWingFilter] = useState("ALL");
  const [wingsList, setWingsList] = useState([]);
  const [createWingsList, setCreateWingsList] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then((res) => {
          const d = res.data;
          const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.societies) ? d.societies : [];
          setSocietiesList(list);
        })
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  const activeSocietyId = isSuperAdmin ? filterSocietyId : user?.society_id;

  useEffect(() => {
    if (activeSocietyId) {
      API.get(`/blocks/${activeSocietyId}`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
          setWingsList(list);
        })
        .catch(() => setWingsList([]));
    } else {
      setWingsList([]);
      setWingFilter("ALL");
    }
  }, [activeSocietyId]);

  const loadWingsForSociety = useCallback(async (socId) => {
    if (!socId) {
      setCreateWingsList([]);
      return;
    }
    try {
      const res = await API.get(`/blocks/${socId}`);
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setCreateWingsList(list);
    } catch {
      setCreateWingsList([]);
    }
  }, []);

  /* Slots list */
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState({ total: 0, cars: 0, bikes: 0, available: 0, occupied: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* Filters */
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  /* Detail Slot Modal */
  const [detailSlot, setDetailSlot] = useState(null);

  /* Create form */
  const [showForm, setShowForm] = useState(false);
  const [showAllSlotsPreview, setShowAllSlotsPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    society_id: "",
    wing: "",
    prefix: "",
    start_number: "",
    count: "",
    vehicle_type: "CAR",
    parking_floor: "P1",
  });

  /* Edit slot */
  const [editSlot, setEditSlot] = useState(null);
  const [editForm, setEditForm] = useState({
    slot_number: "",
    parking_floor: "",
    vehicle_type: "CAR",
    parking_type: "DEFAULT",
    wing: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  /* Unsaved-changes guard (create + edit slot forms) */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showForm || !!editSlot);
  const requestCloseForm = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else {
      setShowAllSlotsPreview(false);
      setShowForm(false);
    }
  };
  const requestCloseEdit = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else setEditSlot(null);
  };
  const [editError, setEditError] = useState("");

  const handleOpenCreate = () => {
    if (!hasPermission(user, "parking_slots", "create_slot")) {
      showUnauthorized(t("parkNoPermissionCreate"));
      return;
    }
    const initialSocId = isSuperAdmin
      ? (filterSocietyId || (societiesList[0]?.id ? String(societiesList[0]?.id) : ""))
      : (user?.society_id ? String(user?.society_id) : "");

    setForm({
      society_id: initialSocId,
      wing: "",
      prefix: "",
      start_number: "",
      count: "",
      vehicle_type: "CAR",
      parking_floor: "P1",
    });

    if (initialSocId) {
      loadWingsForSociety(initialSocId);
    } else {
      setCreateWingsList([]);
    }

    setShowAllSlotsPreview(false);
    setShowForm(true);
    setConfirmDel(null);
  };

  const openDelConfirm = (slot) => {
    if (!hasPermission(user, "parking_slots", "delete_slot")) {
      showUnauthorized(t("parkNoPermissionDelete"));
      return;
    }
    setConfirmDel(slot);
  };

  const openReleaseConfirm = (slot) => {
    if (!hasPermission(user, "parking_slots", "release")) {
      showUnauthorized(t("parkNoPermissionRelease"));
      return;
    }
    setReleaseConfirm(slot);
  };

  /* ────────────────────────────
     CREATE SLOTS
  ──────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission(user, "parking_slots", "create_slot")) {
      showUnauthorized(t("parkNoPermissionCreate"));
      return;
    }

    if (isSuperAdmin && !form.society_id) {
      showError(t("selectSocietyRequired") || "Please select a society");
      return;
    }

    const floorErr = localizedRequiredError(form.parking_floor, t("parkFloorLevel"), t);
    if (floorErr) { showError(floorErr); return; }

    const prefixErr = localizedTitleError(form.prefix, t("parkPrefix"), t);
    if (prefixErr) { showError(prefixErr); return; }

    const startErr = localizedPositiveNumberError(form.start_number, t("parkStartNumber"), t);
    if (startErr) { showError(startErr); return; }

    const countErr = localizedPositiveNumberError(form.count, t("parkCount"), t);
    if (countErr) { showError(countErr); return; }

    setSubmitting(true);
    try {
      await API.post("/parking-slots", form);
      const resetSocId = isSuperAdmin ? (filterSocietyId || "") : (user?.society_id || "");
      setForm({
        society_id: resetSocId,
        wing: "",
        prefix: "",
        start_number: "",
        count: "",
        vehicle_type: "CAR",
        parking_floor: "P1",
      });
      setShowForm(false);
      loadSlots(1, vehicleFilter, debouncedSearch, statusFilter, wingFilter);
      loadAllSlots();
      loadPendingResidentCount();
      loadOwnerSlots();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  /* ────────────────────────────
     DELETE SLOT
  ──────────────────────────── */
  const deleteSlot = async (id) => {
    if (!hasPermission(user, "parking_slots", "delete_slot")) {
      showUnauthorized(t("parkNoPermissionDelete"));
      return;
    }
    setDeleting(id);
    try {
      await API.delete(`/parking-slots/${id}`);
      setConfirmDel(null);
      const newPage = slots.length === 1 && page > 1 ? page - 1 : page;
      loadSlots(newPage, vehicleFilter, debouncedSearch, statusFilter, wingFilter);
      loadAllSlots();
      loadOwnerSlots();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  /* ────────────────────────────
     EDIT SLOT
  ──────────────────────────── */
  const openEdit = (slot) => {
    if (!hasPermission(user, "parking_slots", "edit_slot")) {
      showUnauthorized(t("parkNoPermissionEdit"));
      return;
    }
    setEditSlot(slot);
    setEditForm({
      slot_number: slot.slot_number || "",
      parking_floor: slot.parking_floor || "",
      vehicle_type: slot.vehicle_type || "CAR",
      parking_type: slot.parking_type || "DEFAULT",
      wing: slot.wing || "",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editSlot) return;
    if (!hasPermission(user, "parking_slots", "edit_slot")) {
      showUnauthorized(t("parkNoPermissionEdit"));
      return;
    }

    const slotErr = localizedRequiredError(editForm.slot_number, t("parkSlotNumber"), t);
    if (slotErr) { setEditError(slotErr); return; }

    const floorErr = localizedRequiredError(editForm.parking_floor, t("parkFloorLevel"), t);
    if (floorErr) { setEditError(floorErr); return; }

    setEditSubmitting(true);
    setEditError("");
    try {
      await API.put(`/parking-slots/${editSlot.id}`, editForm);
      setEditSlot(null);
      refreshAll();
    } catch (err) {
      setEditError(err?.response?.data?.message || t("parkUpdateFailed"));
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ────────────────────────────
     RELEASE SLOT (REVOKE)
  ──────────────────────────── */
  const handleReleaseSlot = async (slot) => {
    if (!slot) return;
    if (!hasPermission(user, "parking_slots", "release")) {
      showUnauthorized(t("parkNoPermissionRelease"));
      return;
    }
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
    const allSlotNumbers = [];
    for (let i = 0; i < cnt; i++) {
      allSlotNumbers.push(`${pfx}${start + i}`);
    }
    return {
      firstSlot,
      lastSlot,
      cnt,
      floor: form.parking_floor || "P1",
      wing: form.wing || null,
      type: form.vehicle_type === "CAR" ? (t("parkCar") || "Car") : (t("parkBike") || "Bike"),
      allSlotNumbers,
    };
  }, [form, t]);

  /* Delete */
  const [deleting, setDeleting] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  /* Release occupant */
  const [releaseConfirm, setReleaseConfirm] = useState(null);
  const [releasing, setReleasing] = useState(null);

  /* Expandable Card state */
  const [expandedSlotId, setExpandedSlotId] = useState(null);

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
  const headers = useMemo(() => {
    return (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
  }, [isSuperAdmin, filterSocietyId]);

  const loadFlats = useCallback(async () => {
    try {
      const res = await API.get("/flats", { headers });
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setFlats(list);
    } catch (e) { console.error(e); }
  }, [headers]);

  const loadAllSlots = useCallback(async () => {
    try {
      const res = await API.get("/parking-slots?limit=200", { headers });
      const d = res.data;
      setAllSlots(Array.isArray(d) ? d : d?.data || []);
    } catch (e) { console.error(e); }
  }, [headers]);

  const loadSlots = useCallback(async (pageNum, vFilter, currentSearch, statusF = "ALL", wingF = wingFilter, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      /* UI uses OCCUPIED; the API stores ASSIGNED */
      const apiStatus = statusF === "OCCUPIED" ? "ASSIGNED" : statusF;
      const params = new URLSearchParams({
        page: pageNum,
        limit: limitRef.current,
        ...(filterSocietyId ? { society_id: filterSocietyId } : {}),
        ...(vFilter !== "ALL" ? { vehicle_type: vFilter } : {}),
        ...(apiStatus !== "ALL" ? { status: apiStatus } : {}),
        ...(wingF && wingF !== "ALL" ? { wing: wingF } : {}),
        ...(currentSearch ? { search: currentSearch } : {}),
      });
      const res = await API.get(`/parking-slots?${params}`, { headers });
      setSlots(res.data.data || []);
      setStats(res.data.stats || { total: 0, cars: 0, bikes: 0, available: 0, occupied: 0 });
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setInitialLoad(false); setFetching(false); }
  }, [filterSocietyId, headers, wingFilter]);

  const loadPendingResidentCount = useCallback(async () => {
    try {
      const res = await API.get("/parking?parking_type=RESIDENT&filter=PENDING&limit=1", { headers });
      setPendingResidentCount(res.data?.counts?.PENDING || 0);
    } catch (e) { /* silent */ }
  }, [headers]);

  const loadOwnerSlots = useCallback(async (showLoader = false) => {
    if (showLoader) setOwnerLoading(true);
    try {
      const res = await API.get("/parking-slots", { params: { limit: 1000, ...(filterSocietyId ? { society_id: filterSocietyId } : {}) }, headers });
      setOwnerSlots(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) { console.error(e); setOwnerSlots([]); }
    finally { setOwnerLoading(false); }
  }, [filterSocietyId, headers]);

  useEffect(() => { loadOwnerSlots(true); }, [loadOwnerSlots]);

  useEffect(() => {
    loadSlots(1, "ALL", "", "ALL", wingFilter, true);
    loadAllSlots();
    loadFlats();
    loadPendingResidentCount();
  }, [filterSocietyId]);

  useEffect(() => {
    if (initialLoad) return;
    loadSlots(1, vehicleFilter, debouncedSearch, statusFilter, wingFilter);
  }, [debouncedSearch, vehicleFilter, statusFilter, wingFilter, filterSocietyId]);

  const handlePageChange = (p) => loadSlots(p, vehicleFilter, debouncedSearch, statusFilter, wingFilter);
  const handleFilterChange = (key) => {
    if (key === "AVAILABLE" || key === "OCCUPIED") {
      setStatusFilter(key);
      setVehicleFilter("ALL");
    } else {
      setStatusFilter("ALL");
      setVehicleFilter(key);
    }
    setPage(1);
  };

  const refreshAll = () => {
    loadAllSlots();
    loadFlats();
    loadSlots(page, vehicleFilter, debouncedSearch, statusFilter, wingFilter);
    loadPendingResidentCount();
    loadOwnerSlots();
  };

  const getWingLabel = (s) => {
    if (!s) return null;
    const name = s.wing || s.block_name || s.Block?.name || s.Flat?.Block?.name || s.Flat?.Floor?.Block?.name || s.flat?.Block?.name || s.Flat?.block_name;
    if (!name) return null;
    return /^(wing|block|tower)/i.test(name) ? name : `Wing ${name}`;
  };

  /* Distinct list of wings for filtering */
  const availableWings = useMemo(() => {
    const map = new Map();
    wingsList.forEach((w) => {
      if (w.name) map.set(w.name, w.name);
    });
    slots.forEach((s) => {
      if (s.wing) map.set(s.wing, s.wing);
    });
    allSlots.forEach((s) => {
      if (s.wing) map.set(s.wing, s.wing);
    });
    return Array.from(map.values());
  }, [wingsList, slots, allSlots]);

  const filterTabs = [
    { key: "ALL", label: t("parkTabAll") || "All", icon: <FaParking size={12} />, count: stats.total },
    { key: "CAR", label: t("parkTabCars") || "Cars", icon: <MdDirectionsCar size={14} />, count: stats.cars },
    { key: "BIKE", label: t("parkTabBikes") || "Bikes", icon: <MdTwoWheeler size={14} />, count: stats.bikes },
    { key: "AVAILABLE", label: t("parkTabAvailable") || "Available", icon: <MdCheckCircle size={13} />, count: stats.available },
    { key: "OCCUPIED", label: t("parkOccupied") || "Occupied", icon: <MdBlock size={13} />, count: stats.occupied || (stats.total - stats.available) },
  ];

  const activeFilter = statusFilter !== "ALL" ? statusFilter : vehicleFilter;
  const activeFilterLabel =
    filterTabs.find((f) => f.key === activeFilter)?.label || t("parkTabAll") || "All";

  const mainTabs = [
    { key: "slots", label: t("parkMainSlots"), icon: <FaParking size={13} /> },
    { key: "ownership", label: t("parkSlotOwners"), icon: <MdPersonSearch size={15} /> },
    { key: "resident-entry", label: t("parkResidentEntry"), icon: <span style={{ fontSize: 14 }}>🏠</span> },
    { key: "resident-requests", label: t("parkExtraRequests"), icon: <MdPendingActions size={14} /> },
  ];

  /* ── Slot Ownership: filtered view ── */
  const ownerQ = debouncedOwnerSearch.toLowerCase().trim();
  const cleanOwnerQ = ownerQ.replace(/[\s\-_]+/g, "");
  const ownerFiltered = ownerSlots.filter(s => {
    if (ownerType !== "ALL" && s.vehicle_type !== ownerType) return false;
    if (ownerStatus === "AVAILABLE" && s.status !== "AVAILABLE") return false;
    if (ownerStatus === "ASSIGNED" && s.status === "AVAILABLE") return false;
    if (ownerAlloc === "WITH_VEHICLE" && !s.vehicle) return false;
    if (ownerAlloc === "NO_VEHICLE" && s.vehicle) return false;
    if (ownerAlloc === "ALLOCATED" && !s.resident && !s.flat_number) return false;
    if (ownerAlloc === "FREE" && s.status !== "AVAILABLE") return false;
    if (wingFilter !== "ALL") {
      const slotWing = s.wing || s.block_name || s.Flat?.Block?.name;
      if (slotWing !== wingFilter) return false;
    }
    if (ownerQ) {
      const hay = [
        s.slot_number,
        s.parking_floor,
        s.wing,
        s.flat_number,
        s.resident?.name,
        s.resident?.email,
        s.resident?.phone,
        s.vehicle?.vehicle_number,
        s.vehicle?.vehicle_name,
      ].filter(Boolean).join(" ").toLowerCase();

      const cleanHay = hay.replace(/[\s\-_]+/g, "");
      if (!hay.includes(ownerQ) && (!cleanOwnerQ || !cleanHay.includes(cleanOwnerQ))) {
        return false;
      }
    }
    return true;
  });

  const ownerSegment = (opts, value, setValue) => (
    <SlidingTabs
      value={value}
      onChange={setValue}
      items={opts.map((option) => ({ id: option.value, label: option.label }))}
    />
  );

  /* ────────────────────────────
     RENDER
  ──────────────────────────── */
  return (
    <div className="parking-management-page space-y-5 animate-fadeIn">
      {/* ── Page Header: Unified Single Row ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {!hideHeader && (
          <div className="flex items-center gap-3">
            <div className="ad-page-icon">
              <FaParking size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{t("parkManagementTitle") || "Parking Management"}</h2>
              <p className="text-secondary text-xs mt-0.5">{t("parkPageSummary")}</p>
            </div>
          </div>
        )}

        <div className="ps-page-toolbar flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full">
          {isSuperAdmin && (
            <Select
              className="input"
              style={{ minWidth: 150, height: 38, padding: "6px 12px", borderRadius: 10, fontSize: 13 }}
              value={filterSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val || "ALL");
              }}
            >
              <option value="">{t("allSocieties") || "All Societies"}</option>
              {societiesList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          )}

          {!isCommittee && mainTab === "slots" && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              className="parking-create-slots-btn justify-center shrink-0 whitespace-nowrap"
              onClick={handleOpenCreate}
            >
              {t("parkCreateBtn") || "Create Slots"}
            </GlobalButton>
          )}

          <SlidingTabs
            value={mainTab}
            onChange={(key) => { setMainTab(key); setShowForm(false); }}
            items={(isSearchOpen ? mainTabs.filter(tab => tab.key === mainTab) : mainTabs).map((tab) => ({
              id: tab.key,
              label: tab.label,
              icon: tab.icon,
              badge: tab.key === "resident-requests" && pendingResidentCount > 0 ? pendingResidentCount : undefined,
            }))}
          />

          <ExpandableSearch
            value={mainTab === "ownership" ? ownerSearch : search}
            onChange={mainTab === "ownership" ? setOwnerSearch : setSearch}
            isOpen={isSearchOpen}
            onOpenChange={setIsSearchOpen}
            maxWidth={240}
            placeholder={
              mainTab === "ownership"
                ? t("parkSearchOwners")
                : mainTab === "resident-entry"
                ? t("parkSearchResidentVehicles")
                : t("parkSearchSlots")
            }
          />
        </div>
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
                    { value: "ALL", label: t("parkTabAll") },
                    { value: "CAR", label: t("parkTabCars") },
                    { value: "BIKE", label: t("parkTabBikes") },
                  ],
                  ownerType,
                  setOwnerType
                )}
                {ownerSegment(
                  [
                    { value: "ALL", label: t("parkAllStatus") },
                    { value: "AVAILABLE", label: t("parkAvailable") },
                    { value: "ASSIGNED", label: t("parkAssigned") },
                  ],
                  ownerStatus,
                  setOwnerStatus
                )}
                {ownerSegment(
                  [
                    { value: "ALL", label: t("parkTabAll") },
                    { value: "FREE", label: t("parkFreeOnly") },
                    { value: "ALLOCATED", label: t("parkAllocated") },
                    { value: "WITH_VEHICLE", label: t("parkWithVehicle") },
                    { value: "NO_VEHICLE", label: t("parkNoVehicle") },
                  ],
                  ownerAlloc,
                  setOwnerAlloc
                )}

                {availableWings.length > 0 && (
                  <Select
                    className="input"
                    style={{ minWidth: 135, height: 36, padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}
                    value={wingFilter}
                    onChange={(e) => setWingFilter(e.target.value)}
                  >
                    <option value="ALL">{t("allWings") || "All Wings"}</option>
                    {availableWings.map((w) => (
                      <option key={w} value={w}>{/^(wing|block|tower)/i.test(w) ? w : `Wing ${w}`}</option>
                    ))}
                  </Select>
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
                  : t("parkNoMatchFilter")}
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
                            {isCar ? <MdDirectionsCar size={16} /> : <MdTwoWheeler size={16} />}
                          </div>
                          <div className="ps-head-text">
                            <span className="ps-slot-label">{t("parkColSlot")}</span>
                            <h4 className="ps-slot-number">{s.slot_number}</h4>
                          </div>
                          <MdChevronRight className="ps-card-arrow" size={16} />
                        </div>
                        <StatusBadge status={s.status} t={t} />
                      </div>

                      <span className="ps-slot-meta">
                        {s.parking_floor ? t("parkFloorValue", { floor: s.parking_floor }) : t("parkGroundFloor")} ·{" "}
                        {isCar ? t("parkCar") : t("parkBike")}
                        {getWingLabel(s) ? ` · ${getWingLabel(s)}` : ""}
                      </span>

                      {/* Middle Details */}
                      <div className="ps-card-middle">
                        {isAvail ? (
                          <div className="ps-avail-bay">
                            <span className="ps-avail-dot" />
                            <span className="ps-avail-bay-text">
                              {t("parkUnallocatedAvailable")}
                            </span>
                          </div>
                        ) : (
                          <div className="ps-occupied-details">
                            <div className="ps-resident-row">
                              <span className="ps-resident-avatar" aria-hidden="true">
                                {s.resident?.name?.trim()?.charAt(0)?.toUpperCase() || "R"}
                              </span>
                              <div className="ps-resident-meta">
                                <span className="ps-resident-name">
                                  {s.resident?.name || t("parkOccupied")}
                                </span>
                                <span className="ps-resident-sub">
                                  {s.flat_number
                                    ? t("parkFlatNumber", { number: s.flat_number })
                                    : s.resident?.email || t("parkOccupied")}
                                </span>
                              </div>
                            </div>
                            {s.vehicle ? (
                              <div className="ps-vehicle-tag">
                                <span className="ps-plate-mark" aria-hidden="true" />
                                <span className="ps-vehicle-plate">
                                  {s.vehicle.vehicle_number}
                                </span>
                                {s.vehicle.vehicle_name && (
                                  <span className="ps-vehicle-model">
                                    {s.vehicle.vehicle_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="ps-no-resident-tag">
                                {s.resident ? t("parkNoVehicleLinked") : "—"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="ps-card-footer ps-card-actions">
                        {!isAvail && (
                          <GlobalButton
                            variant="danger"
                            size="xs"
                            icon={MdPersonRemove}
                            onClick={() => openReleaseConfirm(s)}
                            title={t("parkReleaseTitle")}
                            fullWidth
                            className="slot-owner-release-btn flex-1"
                          >
                            {t("parkRelease")}
                          </GlobalButton>
                        )}
                        {!isCommittee && (
                          <GlobalButton
                            variant="edit"
                            size="xs"
                            icon={MdEdit}
                            onClick={() => openEdit(s)}
                            title={t("parkEditSlot")}
                            fullWidth
                            className="slot-owner-edit-btn flex-1"
                          >
                            {t("parkEdit")}
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
                  {t("parkShowingTotal", { shown: ownerFiltered.length, total: ownerSlots.length })}
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
          <div className="ps-slots-container space-y-4">
            {/* Filter and Count Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-glass">
              <div className="flex items-center gap-2.5 flex-wrap">
                <SlidingTabs
                  value={activeFilter}
                  onChange={handleFilterChange}
                  items={filterTabs.map((filter) => ({
                    id: filter.key,
                    label: filter.label,
                    icon: filter.icon,
                    badge: filter.count,
                  }))}
                />

                {availableWings.length > 0 && (
                  <Select
                    className="input"
                    style={{ minWidth: 135, height: 36, padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}
                    value={wingFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWingFilter(val);
                      setPage(1);
                    }}
                  >
                    <option value="ALL">{t("allWings") || "All Wings"}</option>
                    {availableWings.map((w) => (
                      <option key={w} value={w}>{/^(wing|block|tower)/i.test(w) ? w : `Wing ${w}`}</option>
                    ))}
                  </Select>
                )}
              </div>

              {!initialLoad && (
                <span className="text-xs text-secondary font-medium">
                  {t("parkShowingTotal", { shown: slots.length, total: totalItems })}
                </span>
              )}
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
                <p>{t("parkCreateHint")}</p>
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
                <h4>
                  {search
                    ? t("parkNoSlotsMatch", { search })
                    : t("parkNoMatchInFilter", { filter: activeFilterLabel })}
                </h4>
                <p>{t("parkAdjustFilters")}</p>
                <GlobalButton
                  onClick={() => { setSearch(""); setVehicleFilter("ALL"); setStatusFilter("ALL"); }}
                  variant="reset"
                  size="sm"
                  icon={MdRefresh}
                  className="mt-2"
                >
                  {t("parkShowAll") || "Reset Filters"}
                </GlobalButton>
              </div>
            )}

            {/* Card Grid with slide page transition */}
            {!initialLoad && slots.length > 0 && (
              <div key={page} className="animate-slide-page">
                <div className="ps-card-grid">
                  {slots.map((slot, i) => {
                    const isCar = slot.vehicle_type === "CAR";
                    const isAvail = slot.status === "AVAILABLE";
                    return (
                      <RecordCard
                        key={slot.id}
                        tone={isAvail ? "success" : "brand"}
                        interactive
                        blob={false}
                        onClick={() => setDetailSlot(slot)}
                        style={{ animationDelay: `${i * 15}ms` }}
                        className="ps-slot-card"
                        icon={isCar ? MdDirectionsCar : MdTwoWheeler}
                        title={
                          <div className="ps-head-text">
                            <span className="ps-slot-label">{t("parkColSlot")}</span>
                            <h4 className="ps-slot-number">{slot.slot_number}</h4>
                          </div>
                        }
                        description={
                          <span className="ps-slot-meta">
                            {slot.parking_floor ? t("parkFloorValue", { floor: slot.parking_floor }) : t("parkGround")} ·{" "}
                            {isCar ? t("parkCar") : t("parkBike")}
                            {getWingLabel(slot) ? ` · ${getWingLabel(slot)}` : ""}
                          </span>
                        }
                        badge={<StatusBadge status={slot.status} t={t} />}
                      >
                        {/* Compact Card Middle: Resident, Flat & Vehicle info */}
                        <div className="ps-card-middle">
                          {isAvail ? (
                            <div className="ps-avail-bay">
                              <span className="ps-avail-dot" />
                              <span className="ps-avail-bay-text">
                                {t("parkUnallocatedAvailableShort")}
                              </span>
                            </div>
                          ) : (
                            <div className="ps-occupied-details">
                              <div className="ps-resident-row">
                                <span className="ps-resident-avatar" aria-hidden="true">
                                  {slot.resident?.name?.trim()?.charAt(0)?.toUpperCase() || "R"}
                                </span>
                                <div className="ps-resident-meta">
                                  <span className="ps-resident-name">
                                    {slot.resident?.name || t("parkOccupied")}
                                  </span>
                                  {slot.flat_number && (
                                    <span className="ps-resident-sub">
                                      {t("parkFlatNumber", { number: slot.flat_number })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {slot.vehicle?.vehicle_number && (
                                <div className="ps-vehicle-tag">
                                  <span className="ps-plate-mark" aria-hidden="true" />
                                  <span className="ps-vehicle-plate">
                                    {slot.vehicle.vehicle_number}
                                  </span>
                                  {slot.vehicle.vehicle_name && (
                                    <span className="ps-vehicle-model">
                                      {slot.vehicle.vehicle_name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </RecordCard>
                    );
                  })}
                </div>

                {/* Pagination Footer */}
                <div className="ps-pagination-container mt-4">
                  <p className="ps-pagination-info">
                    {t("billShowing") || "Showing"} <strong>{slots.length}</strong> {t("billOf") || "of"} <strong>{totalItems}</strong> {t("parkSlotCount") || "Slots"}
                  </p>
                  <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
                </div>
              </div>
            )}

            {/* Slot Details Modal Popup */}
            <GlobalModal
              isOpen={!!detailSlot}
              onClose={() => setDetailSlot(null)}
              title={detailSlot ? (
                <span className="flex items-center gap-2 flex-wrap">
                  <span>{t("parkSlotValue", { slot: detailSlot.slot_number })}</span>
                  <StatusBadge status={detailSlot.status} t={t} />
                </span>
              ) : ""}
              subtitle={detailSlot
                ? `${detailSlot.parking_floor ? t("parkFloorValue", { floor: detailSlot.parking_floor }) : t("parkGroundFloor")} · ${detailSlot.vehicle_type === "CAR" ? t("parkFourWheeler") : t("parkTwoWheeler")}`
                : ""}
              icon={detailSlot?.vehicle_type === "BIKE" ? MdTwoWheeler : MdDirectionsCar}
              size="md"
              disableUnsavedWarning
              bodyClassName="parking-slot-detail-body"
              footer={detailSlot ? (
                <div className="parking-slot-detail-actions">
                  {!isCommittee && (
                    <GlobalButton
                      variant="edit"
                      icon={MdEdit}
                      onClick={() => {
                        const slot = detailSlot;
                        setDetailSlot(null);
                        openEdit(slot);
                      }}
                    >
                      {t("parkEditSlot")}
                    </GlobalButton>
                  )}
                  {detailSlot.status !== "AVAILABLE" && (
                    <GlobalButton
                      variant="warning"
                      icon={MdPersonRemove}
                      onClick={() => {
                        const slot = detailSlot;
                        setDetailSlot(null);
                        openReleaseConfirm(slot);
                      }}
                    >
                      {t("parkReleaseSlot")}
                    </GlobalButton>
                  )}
                  {!isCommittee && (
                    <GlobalButton
                      variant="delete"
                      icon={MdDelete}
                      onClick={() => {
                        const slot = detailSlot;
                        setDetailSlot(null);
                        openDelConfirm(slot);
                      }}
                    >
                      {t("parkDelete")}
                    </GlobalButton>
                  )}
                  <GlobalButton variant="secondary" onClick={() => setDetailSlot(null)}>
                    {t("close")}
                  </GlobalButton>
                </div>
              ) : null}
            >
              {detailSlot && (
                <div className="parking-slot-detail-content">
                  {detailSlot.status === "AVAILABLE" ? (
                    <div className="parking-slot-available-state">
                      <div className="parking-slot-available-icon">
                        {detailSlot.vehicle_type === "CAR" ? <MdDirectionsCar size={26} /> : <MdTwoWheeler size={26} />}
                      </div>
                      <p className="parking-slot-available-title">{t("parkSlotAvailableTitle")}</p>
                      <p className="parking-slot-detail-copy">
                        {t("parkSlotAvailableCopy")}
                      </p>

                      <div className="parking-slot-detail-grid mt-3 w-full">
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("wing") || "Wing / Block"}</span>
                          <p className="parking-slot-detail-value">{getWingLabel(detailSlot) || "—"}</p>
                        </section>
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("parkFloorLevel") || "Floor"}</span>
                          <p className="parking-slot-detail-value">{detailSlot.parking_floor ? t("parkFloorValue", { floor: detailSlot.parking_floor }) : t("parkGroundFloor") || "Ground"}</p>
                        </section>
                      </div>
                    </div>
                  ) : (
                    <>
                      <section className="parking-slot-detail-card parking-slot-resident-card">
                        <span className="parking-slot-detail-label">{t("parkAssignedResident")}</span>
                        <div className="parking-slot-resident-row">
                          <div className="parking-slot-resident-avatar">
                            {detailSlot.resident?.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="parking-slot-resident-copy">
                            <p className="parking-slot-detail-value">{detailSlot.resident?.name || t("parkOccupied")}</p>
                            {detailSlot.resident?.email && <p className="parking-slot-detail-copy">{detailSlot.resident.email}</p>}
                            {detailSlot.resident?.phone && <p className="parking-slot-detail-copy">{detailSlot.resident.phone}</p>}
                          </div>
                        </div>
                      </section>

                      <div className="parking-slot-detail-grid">
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("parkAssignedUnit")}</span>
                          <p className="parking-slot-detail-value">
                            {detailSlot.flat_number ? t("parkFlatNumber", { number: detailSlot.flat_number }) : "—"}
                          </p>
                        </section>
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("wing") || "Wing / Block"}</span>
                          <p className="parking-slot-detail-value">{getWingLabel(detailSlot) || "—"}</p>
                        </section>
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("parkFloorLevel") || "Floor"}</span>
                          <p className="parking-slot-detail-value">{detailSlot.parking_floor ? t("parkFloorValue", { floor: detailSlot.parking_floor }) : t("parkGroundFloor") || "Ground"}</p>
                        </section>
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("parkAllocationType")}</span>
                          <p className="parking-slot-detail-value">{detailSlot.parking_type === "EXTRA" ? t("parkExtra") : t("parkStandard")}</p>
                        </section>
                      </div>

                      {detailSlot.vehicle?.vehicle_number && (
                        <section className="parking-slot-detail-card">
                          <span className="parking-slot-detail-label">{t("parkRegisteredVehicle")}</span>
                          <div className="parking-slot-vehicle-row">
                            <span className="parking-slot-vehicle-number">{detailSlot.vehicle.vehicle_number}</span>
                            {detailSlot.vehicle.vehicle_name && (
                              <span className="parking-slot-detail-copy">{detailSlot.vehicle.vehicle_name}</span>
                            )}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              )}
            </GlobalModal>
          </div>
        </>
      )}

      {/* Create Slots Modal */}
      <GlobalModal
        isOpen={showForm}
        onClose={requestCloseForm}
        title={t("parkFormTitle") || "Create Parking Slots"}
        subtitle={t("parkCreateSubtitle") || "Configure batch slot creation with automated numbering"}
        icon={FaParking}
        size="md"
        disableUnsavedWarning={false}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <GlobalButton variant="cancel" onClick={requestCloseForm}>
              {t("cancel") || "Cancel"}
            </GlobalButton>
            <GlobalButton
              type="submit"
              form="create-parking-slots-form"
              variant="add"
              icon={MdAdd}
              loading={submitting}
              borderDraw
              size="md"
            >
              {submitting
                ? (t("parkCreating") || "Creating...")
                : (t("parkCreateBtn") || "Create Slots")}
            </GlobalButton>
          </div>
        }
      >
        <form id="create-parking-slots-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Step 1 for SuperAdmin: Society Selection */}
          {isSuperAdmin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("society") || "Society"} <span className="text-red-400">*</span>
              </label>
              <Select
                className="input w-full"
                style={{ height: 42, borderRadius: 12, padding: "0 14px", fontSize: 13, fontWeight: 500 }}
                value={form.society_id}
                required
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, society_id: val, wing: "" });
                  loadWingsForSociety(val);
                }}
              >
                <option value="">{t("selectSociety") || "Select Society"}</option>
                {societiesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Wing Selection (For SuperAdmin and Society Admin) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary">
              {t("wing") || "Wing / Block Name"}
            </label>
            {(createWingsList.length > 0 || wingsList.length > 0) ? (
              <Select
                className="input w-full"
                style={{ height: 42, borderRadius: 12, padding: "0 14px", fontSize: 13, fontWeight: 500 }}
                value={form.wing || ""}
                onChange={(e) => setForm({ ...form, wing: e.target.value })}
              >
                <option value="">{t("selectWing") || "Select Wing"}</option>
                {(createWingsList.length > 0 ? createWingsList : wingsList).map((w) => (
                  <option key={w.id || w.name} value={w.name}>{w.name}</option>
                ))}
              </Select>
            ) : (
              <input
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkWingPlaceholder") || "e.g. Wing A, Block B"}
                value={form.wing || ""}
                onChange={(e) => setForm({ ...form, wing: e.target.value })}
              />
            )}
          </div>

          {/* Vehicle Type Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              {t("parkVehicleType") || "Vehicle Type"}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setForm({ ...form, vehicle_type: "CAR" })}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  form.vehicle_type === "CAR"
                    ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                    : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary hover:border-slate-400/30"
                }`}
              >
                <MdDirectionsCar size={17} />
                <span>{t("parkCar") || "Car Space"}</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, vehicle_type: "BIKE" })}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  form.vehicle_type === "BIKE"
                    ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                    : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary hover:border-slate-400/30"
                }`}
              >
                <MdTwoWheeler size={17} />
                <span>{t("parkBike") || "Bike Space"}</span>
              </button>
            </div>
          </div>

          {/* Floor & Prefix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("parkFloorLevel")} <span className="text-red-400">*</span>
              </label>
              <input
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkFloorPlaceholder") || "e.g. B1, Ground, P1"}
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
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkPrefixPlaceholderLong") || "e.g. A-, C-"}
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value })}
              />
            </div>
          </div>

          {/* Start Number & Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("parkStartNumber") || "Start Number"} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkStartNumberPlaceholder") || "101"}
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
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkCountPlaceholder") || "20"}
                required
                value={form.count}
                onChange={(e) => setForm({ ...form, count: e.target.value })}
              />
            </div>
          </div>

          {/* Live Preview Banner & All Slots Viewer */}
          {generatedPreview && (
            <div className="flex flex-col gap-2.5 animate-fadeIn mt-1">
              <div
                className="rounded-xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-3"
                style={{
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.28)",
                  color: "var(--accent)",
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="px-2 py-0.5 rounded-md font-extrabold uppercase text-[10px] shrink-0"
                    style={{ background: "rgba(59, 130, 246, 0.22)", color: "var(--accent)" }}
                  >
                    {t("parkPreview") || "Preview"}
                  </span>
                  <span className="truncate font-semibold text-primary">
                    {t("parkSlotsRange", { first: generatedPreview.firstSlot, last: generatedPreview.lastSlot })}
                    {generatedPreview.wing ? ` (${generatedPreview.wing})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-bold text-accent">
                    {t("parkPreviewCount", { count: generatedPreview.cnt, type: generatedPreview.type })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllSlotsPreview(!showAllSlotsPreview)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border shadow-xs"
                    style={{
                      background: showAllSlotsPreview ? "var(--accent)" : "rgba(255, 255, 255, 0.08)",
                      color: showAllSlotsPreview ? "#ffffff" : "var(--text-primary)",
                      borderColor: showAllSlotsPreview ? "var(--accent)" : "var(--glass-border)",
                    }}
                  >
                    {showAllSlotsPreview ? (t("hideAllSlots") || "Hide All Slots") : (t("showAllSlots") || "Show All Slots")}
                  </button>
                </div>
              </div>

              {/* All Slots Grid Preview */}
              {showAllSlotsPreview && (
                <div
                  className="rounded-xl p-3 border flex flex-col gap-2.5 animate-fadeIn"
                  style={{
                    background: "var(--card-inner-bg)",
                    borderColor: "var(--glass-border)",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                      {t("allSlotsToCreate") || "All Slots to be Created"} ({generatedPreview.allSlotNumbers.length})
                    </span>
                    <span className="text-[11px] text-tertiary">
                      Level: {generatedPreview.floor} {generatedPreview.wing ? `· ${generatedPreview.wing}` : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {generatedPreview.allSlotNumbers.map((slotNum, idx) => (
                      <div
                        key={slotNum + idx}
                        className="flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all"
                        style={{
                          background: "var(--card-bg)",
                          borderColor: "var(--glass-border)",
                        }}
                      >
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            background: form.vehicle_type === "CAR" ? "rgba(59, 130, 246, 0.15)" : "rgba(168, 85, 247, 0.15)",
                            color: form.vehicle_type === "CAR" ? "#60a5fa" : "#c084fc",
                          }}
                        >
                          {form.vehicle_type === "CAR" ? <MdDirectionsCar size={13} /> : <MdTwoWheeler size={13} />}
                        </span>
                        <span className="text-primary font-mono font-bold truncate">{slotNum}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </GlobalModal>

      <GlobalConfirmDialog
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => deleteSlot(confirmDel?.id || confirmDel)}
        title={t("parkDeleteConfirmTitle")}
        message={t("parkDeleteConfirmMessage", { slot: typeof confirmDel === "object" ? confirmDel?.slot_number : confirmDel })}
        confirmLabel={t("parkDeleteSlot")}
        cancelLabel={t("cancel") || "Cancel"}
        variant="danger"
        loading={deleting === (confirmDel?.id || confirmDel)}
      />

      {/* Edit Slot Modal */}
      <GlobalModal
        isOpen={!!editSlot}
        onClose={requestCloseEdit}
        title={t("parkEditSlot") || "Edit Parking Slot"}
        subtitle={t("parkEditSubtitle") || "Update slot configuration and assigned unit"}
        icon={MdEdit}
        size="md"
        disableUnsavedWarning={false}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <GlobalButton variant="cancel" onClick={requestCloseEdit}>
              {t("cancel") || "Cancel"}
            </GlobalButton>
            <GlobalButton
              type="submit"
              form="edit-parking-slot-form"
              variant="save"
              icon={MdDone}
              loading={editSubmitting}
              borderDraw
              size="md"
            >
              {editSubmitting ? (t("saving") || "Saving...") : (t("parkSaveChanges") || "Save Changes")}
            </GlobalButton>
          </div>
        }
      >
        <form id="edit-parking-slot-form" onSubmit={handleEditSubmit} className="flex flex-col gap-4">
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
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  editForm.vehicle_type === "CAR"
                    ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                    : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary hover:border-slate-400/30"
                }`}
              >
                <MdDirectionsCar size={17} />
                <span>{t("parkCar") || "Car Space"}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, vehicle_type: "BIKE" })}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  editForm.vehicle_type === "BIKE"
                    ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                    : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary hover:border-slate-400/30"
                }`}
              >
                <MdTwoWheeler size={17} />
                <span>{t("parkBike") || "Bike Space"}</span>
              </button>
            </div>
          </div>

          {/* Slot Number & Floor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("parkSlotNumber")} <span className="text-red-400">*</span>
              </label>
              <input
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkSlotNumberPlaceholder")}
                required
                value={editForm.slot_number}
                onChange={(e) => setEditForm({ ...editForm, slot_number: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-secondary">
                {t("parkFloorLevel")}
              </label>
              <input
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkFloorPlaceholder")}
                value={editForm.parking_floor}
                onChange={(e) => setEditForm({ ...editForm, parking_floor: e.target.value })}
              />
            </div>
          </div>

          {/* Wing / Block Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary">
              {t("wing") || "Wing / Block"}
            </label>
            {wingsList.length > 0 ? (
              <Select
                className="input w-full"
                style={{ height: 42, borderRadius: 12, padding: "0 14px", fontSize: 13, fontWeight: 500 }}
                value={editForm.wing || ""}
                onChange={(e) => setEditForm({ ...editForm, wing: e.target.value })}
              >
                <option value="">{t("selectWing") || "Select Wing"}</option>
                {wingsList.map((w) => (
                  <option key={w.id || w.name} value={w.name}>{w.name}</option>
                ))}
              </Select>
            ) : (
              <input
                className="input w-full"
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                placeholder={t("parkWingPlaceholder") || "e.g. Wing A, Block B"}
                value={editForm.wing || ""}
                onChange={(e) => setEditForm({ ...editForm, wing: e.target.value })}
              />
            )}
          </div>

          {/* Allocated Flat Dropdown / Viewer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>{t("parkAllocatedFlat")}</span>
              {editSlot?.flat_number && (
                <span className="text-[11px] font-bold text-emerald-400">
                  {t("parkCurrentFlat", { number: editSlot.flat_number })}
                </span>
              )}
            </label>
            <div className="relative">
              <Select
                className="input w-full"
                rootStyle={{ width: "100%" }}
                style={{
                  height: 42,
                  borderRadius: 12,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                value={editForm.flat_id || ""}
                onChange={(e) => setEditForm({ ...editForm, flat_id: e.target.value })}
              >
                <option value="">{t("parkNoFlatAllocated")}</option>
                {flats.map((f) => {
                  const blockName = f.Floor?.Block?.name || f.Block?.name;
                  return (
                    <option key={f.id} value={f.id}>
                      {t("parkFlatNumber", { number: f.flat_number })}{blockName ? ` (${blockName})` : ""}{f.resident?.name ? ` · ${f.resident.name}` : ""}
                    </option>
                  );
                })}
              </Select>
            </div>
            {editSlot?.resident && (
              <div className="text-[11px] text-secondary flex items-center gap-1.5 mt-0.5">
                <span>{t("parkResidentLabel")}: <strong>{editSlot.resident.name}</strong></span>
                {editSlot.vehicle && (
                  <span>· {t("parkVehicleLabel")}: <strong style={{ fontFamily: "monospace" }}>{editSlot.vehicle.vehicle_number}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Parking Type (DEFAULT vs EXTRA) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
              {t("parkTypeCategory")}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, parking_type: "DEFAULT" })}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  editForm.parking_type === "DEFAULT"
                    ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                    : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary hover:border-slate-400/30"
                }`}
              >
                <FaParking size={15} />
                <span>{t("parkStandardDefault")}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, parking_type: "EXTRA" })}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  editForm.parking_type === "EXTRA"
                    ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                    : "bg-card-inner-bg text-secondary border-glass-border hover:text-primary hover:border-slate-400/30"
                }`}
              >
                <span style={{ fontSize: 13, fontWeight: 800 }}>⚡</span>
                <span>{t("parkExtraSpace")}</span>
              </button>
            </div>
          </div>
        </form>
      </GlobalModal>

      <GlobalConfirmDialog
        isOpen={!!releaseConfirm}
        onClose={() => setReleaseConfirm(null)}
        onConfirm={() => handleReleaseSlot(releaseConfirm)}
        title={t("parkReleaseConfirmTitle")}
        message={
          releaseConfirm
            ? releaseConfirm.resident?.name || releaseConfirm.flat_number
              ? t("parkReleaseAssignedMessage", {
                  slot: releaseConfirm.slot_number,
                  resident: releaseConfirm.resident?.name || t("parkAssignedResidentLower"),
                  flat: releaseConfirm.flat_number ? ` (${t("parkFlatNumber", { number: releaseConfirm.flat_number })})` : "",
                })
              : t("parkReleaseAvailableMessage", { slot: releaseConfirm.slot_number })
            : ""
        }
        confirmLabel={t("parkReleaseSlot")}
        cancelLabel={t("cancel") || "Cancel"}
        variant="warning"
        icon={MdPersonRemove}
        loading={!!releaseConfirm && releasing === releaseConfirm.id}
      />

      {/* Unsaved-changes discard confirm */}
      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); if (editSlot) setEditSlot(null); else setShowForm(false); }}
      />
    </div>
  );
}



