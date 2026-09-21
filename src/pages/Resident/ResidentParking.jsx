import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import {
  MdAdd, MdOutlineInbox, MdSearch,
  MdDirectionsCar, MdTwoWheeler,
  MdChevronLeft, MdChevronRight, MdLocalParking,
  MdCheckCircle, MdInfo, MdClose, MdSend,
} from "react-icons/md";
import Select from "../../components/common/Select";
import Modal from "../../components/Modal";
import FieldError from "../../components/common/FieldError";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import { getTitleError, getVehicleNumberError, getRequiredDateError, getSelectError } from "../../utils/validators";

/* ── Debounce hook — keeps input focused ── */
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Spinner ── */
function Spinner({ size = 20, small = false }) {
  const s = small ? 13 : size;
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
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="pagination-btn"
      >
        <MdChevronLeft size={15} /> Prev
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="pagination-btn"
      >
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

const LIMIT = 10;

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentParking() {
  const { t } = useLang();

  const [showForm,     setShowForm]     = useState(false);
  const [hasFlat,      setHasFlat]      = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitLoading,setSubmitLoading]= useState(false);

  // self vs guest creation (mirrors mobile AddVehicle screen)
  const [mode, setMode] = useState("guest"); // "self" | "guest"

  const [form, setForm] = useState({
    guest_name:       "",
    vehicle_name:     "",
    vehicle_number:   "",
    vehicle_type:     "CAR",
    expected_arrival: "",
    duration_hours:   24,
    flat_id:          "",
  });

  // self-mode parking context (allocated slots + flats from /parking-slots/my-slots)
  const [allocatedSlots, setAllocatedSlots] = useState([]);
  const [myFlats, setMyFlats] = useState([]);
  const [slotsLoading,   setSlotsLoading]   = useState(true);
  const [registeredVehicles, setRegisteredVehicles] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null); // null = request new extra slot

  // ── Requests data ── ✅ FIX: Added COMPLETED to counts
  const [requests,   setRequests]   = useState([]);
  const [counts,     setCounts]     = useState({ ALL: 0, APPROVED: 0, REJECTED: 0, COMPLETED: 0 });

  // ── Two loading states ──
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  // ── Search & filter ──
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debouncedSearch = useDebounce(search, 500);

  // ── Pagination ──
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Check flat ── */
useEffect(() => {
  API.get("/users/get-flat")
    .then((res) => {
      const flats = Array.isArray(res.data) ? res.data : [];
      setHasFlat(flats.length > 0);   // ✅ correct check
    })
    .catch(() => setHasFlat(false));
}, []);

  /* ── Load self-mode parking context (allocated slots, flats, vehicles) ── */
  const loadParkingContext = useCallback(async () => {
    try {
      const [slotsRes, vehsRes] = await Promise.all([
        API.get("/parking-slots/my-slots"),
        API.get("/vehicles/my"),
      ]);
      const slots = slotsRes.data?.slots || [];
      const flats = slotsRes.data?.flats || [];
      setAllocatedSlots(slots);
      setMyFlats(flats);
      setRegisteredVehicles(vehsRes.data || []);
      if (flats.length === 1) {
        setForm((f) => ({ ...f, flat_id: String(flats[0].id) }));
      }
    } catch (e) { console.error(e); }
    finally { setSlotsLoading(false); }
  }, []);

  // Auto-dismiss success banner
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  /* ── Self-mode derived slot state ── */
  const availableSlots = allocatedSlots.filter((slot) => {
    if (String(slot.flat_id) !== String(form.flat_id)) return false;
    if (slot.vehicle_type !== form.vehicle_type) return false;
    return true;
  });
  const isSlotOccupied = (slot) =>
    registeredVehicles.some((v) => v.parking_slot_id === slot.id);
  const hasAnyFreeSlot = availableSlots.some((s) => !isSlotOccupied(s));

  /* ── Fetch requests ── */
  const fetchData = useCallback(async (
    pageNum, currentFilter, currentSearch, isInitial = false
  ) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);

    try {
      const params = new URLSearchParams({
        page:   pageNum,
        limit:  LIMIT,
        filter: currentFilter,
        parking_type: "ALL",   // show guest (VISITOR) + resident extra-slot requests
        ...(currentSearch ? { search: currentSearch } : {}),
      });

      const res = await API.get(`/parking?${params}`);

      setRequests(res.data.data || []);
      setCounts(res.data.counts  || {});
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  // ── First load ──
  useEffect(() => {
    fetchData(1, "ALL", "", true);
    loadParkingContext();
  }, [fetchData, loadParkingContext]);

  // ── Re-fetch on search/filter change ──
  useEffect(() => {
    if (initialLoad) return;
    fetchData(1, filter, debouncedSearch);
  }, [debouncedSearch, filter, initialLoad, fetchData]);

  const handleFilterChange = (newFilter) => setFilter(newFilter);

  const handlePageChange = (newPage) =>
    fetchData(newPage, filter, debouncedSearch);

  /* ── Submit new guest parking request ── */
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const guestErr = getTitleError(form.guest_name, "Guest name");
    if (guestErr) { setErrorMessage(guestErr); return; }

    const vehicleErr = getVehicleNumberError(form.vehicle_number, "Vehicle number");
    if (vehicleErr) { setErrorMessage(vehicleErr); return; }

    const arrivalErr = getRequiredDateError(form.expected_arrival, "Arrival date");
    if (arrivalErr) { setErrorMessage(arrivalErr); return; }

    if (myFlats.length > 1 && !form.flat_id) {
      setErrorMessage("Please select which flat this guest belongs to.");
      return;
    }

    setSubmitLoading(true);
    try {
      await API.post("/parking", {
        guest_name:        form.guest_name.trim(),
        vehicle_number:    form.vehicle_number.toUpperCase(),
        vehicle_type:      form.vehicle_type,
        expected_arrival:  form.expected_arrival,
        duration_hours:    Number(form.duration_hours) || 24,
        flat_id:           form.flat_id ? Number(form.flat_id) : undefined,
      });
      resetForm();
      setSuccessMessage(t("parkGuestSuccess") || "Guest parking requested successfully!");
      setShowForm(false);
      fetchData(1, filter, debouncedSearch);
    } catch (err) {
      const message = err.response?.data?.message;
      if (message === "Flat not found") {
        setHasFlat(false);
        setErrorMessage(t("parkNoFlat"));
      } else {
        setErrorMessage(message || t("parkSomethingWrong"));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── Submit self vehicle + link/request slot (mirrors mobile `handleSelfSubmit`) ── */
  const handleSelfSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const nameErr = getTitleError(form.vehicle_name, "Vehicle name");
    if (nameErr) { setErrorMessage(nameErr); return; }

    const vehicleErr = getVehicleNumberError(form.vehicle_number, "Vehicle number");
    if (vehicleErr) { setErrorMessage(vehicleErr); return; }

    if (myFlats.length > 1 && !form.flat_id) {
      setErrorMessage("Please select which flat this vehicle belongs to.");
      return;
    }

    if (availableSlots.length > 0 && selectedSlotId === null && hasAnyFreeSlot) {
      setErrorMessage("Please select a parking slot, or choose 'Request New Extra Slot' to ask the admin.");
      return;
    }

    const slotIdToLink = selectedSlotId; // number → link now; null → admin assigns later

    setSubmitLoading(true);
    try {
      const res = await API.post("/vehicles", {
        vehicle_name:    form.vehicle_name.trim(),
        vehicle_number:  form.vehicle_number.toUpperCase(),
        vehicle_type:    form.vehicle_type,
        flat_id:         form.flat_id ? Number(form.flat_id) : undefined,
        parking_slot_id: slotIdToLink ?? undefined,
      });

      const linkedSlot = slotIdToLink !== null
        ? availableSlots.find((s) => s.id === slotIdToLink)
        : null;
      let successMsg;
      if (slotIdToLink !== null) {
        successMsg = `Vehicle added and linked to slot ${linkedSlot?.slot_number ?? slotIdToLink}!`;
      } else if (res.data?.free_slot) {
        successMsg = `Vehicle added! Free slot ${res.data.free_slot} is available — select it to link.`;
      } else if (res.data?.request_id) {
        successMsg = "Vehicle added! A parking slot request has been sent to the admin.";
      } else {
        successMsg = "Vehicle added! Note: no slot request could be created — please contact admin.";
      }
      resetForm();
      loadParkingContext();
      setShowForm(false);
      setSuccessMessage(successMsg);

      fetchData(1, filter, debouncedSearch);
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || "Failed to add vehicle. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      guest_name:       "",
      vehicle_name:     "",
      vehicle_number:   "",
      vehicle_type:     "CAR",
      expected_arrival: "",
      duration_hours:   24,
      flat_id:          myFlats.length === 1 ? String(myFlats[0].id) : "",
    });
    setSelectedSlotId(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  /* ── Helpers ── ✅ FIX: Added COMPLETED status */
  const statusColor = (status) => {
    if (status === "APPROVED")  return "bg-green-500/20 text-green-400";
    if (status === "REJECTED")  return "bg-red-500/20 text-red-400";
    if (status === "COMPLETED") return "bg-purple-500/20 text-purple-400"; // ✅ ADDED
    return "bg-yellow-500/20 text-yellow-400";
  };

  const statusLabel = (status) => {
    if (status === "APPROVED")  return t("parkStatusApproved");
    if (status === "REJECTED")  return t("parkStatusRejected");
    if (status === "COMPLETED") return t("parkStatusCompleted"); // ✅ ADDED
    return t("parkStatusPending");
  };

  const filterTabs = [
    { key: "ALL",       label: t("billTabAll"),          count: counts.ALL       },
    { key: "PENDING",   label: t("parkStatusPending"),   count: counts.PENDING   },
    { key: "APPROVED",  label: t("parkStatusApproved"),  count: counts.APPROVED  },
    { key: "COMPLETED", label: t("parkStatusCompleted"), count: counts.COMPLETED },
    { key: "REJECTED",  label: t("parkStatusRejected"),  count: counts.REJECTED  },
  ];

  const isEmpty    = !initialLoad && counts.ALL === 0;
  const noMatch    = !initialLoad && counts.ALL > 0 && requests.length === 0 && !fetching;
  const hasResults = !initialLoad && requests.length > 0;

  return (
    <div className="ge-root animate-fadeIn">

      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdLocalParking size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("parkTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("parkCount") || "requests"}</p>
          </div>
        </div>
        {hasFlat && (
          <button
            onClick={() => setShowForm((p) => !p)}
            className="btn-primary flex items-center gap-2"
          >
            <MdAdd size={18} /> {t("parkRequestBtn")}
          </button>
        )}
      </div>

      {/* ── SUCCESS TOAST (shown after form auto-closes) ── */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400 flex items-center justify-between">
          <span className="flex items-center gap-2"><MdCheckCircle size={16} /> {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage("")} className="ml-3 opacity-60 hover:opacity-100">
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* ── NO FLAT WARNING ── */}
      {!hasFlat && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-400">
          ⚠️ {t("parkNoFlat")}
        </div>
      )}

      {/* ── REQUEST FORM MODAL (Self / Guest — mirrors mobile AddVehicle) ── */}
      <Modal
        isOpen={showForm && hasFlat}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={mode === "self" ? t("parkSelfTitle") || "Add My Vehicle" : t("parkFormTitle")}
        icon={mode === "self" ? MdDirectionsCar : MdLocalParking}
        size="md"
      >
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage("")} className="ml-3 opacity-60 hover:opacity-100">
              <MdClose size={16} />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400 flex items-center justify-between">
            <span className="flex items-center gap-2"><MdCheckCircle size={16} /> {successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage("")} className="ml-3 opacity-60 hover:opacity-100">
              <MdClose size={16} />
            </button>
          </div>
        )}

        {/* Mode toggle — For Self / For Guest */}
        <div className="flex rounded-xl bg-white/5 border border-white/8 p-1 mb-4">
          <button
            type="button"
            onClick={() => { setMode("self"); setErrorMessage(""); }}
            className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition cursor-pointer ${
              mode === "self" ? "bg-accent text-white" : "text-secondary hover:bg-white/5"
            }`}
          >
            <MdDirectionsCar size={16} /> {t("parkModeSelf") || "For Self"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("guest"); setErrorMessage(""); }}
            className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition cursor-pointer ${
              mode === "guest" ? "bg-accent text-white" : "text-secondary hover:bg-white/5"
            }`}
          >
            <MdLocalParking size={16} /> {t("parkModeGuest") || "For Guest"}
          </button>
        </div>

        <form onSubmit={mode === "self" ? handleSelfSubmit : handleGuestSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mode === "self" ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
                {t("parkSelfName") || "Vehicle Name"} <span className="text-red-400">*</span>
              </label>
              <input
                className="input h-11 w-full"
                placeholder="e.g. My Swift"
                value={form.vehicle_name}
                onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
                {t("parkGuestName") || "Guest Name"} <span className="text-red-400">*</span>
              </label>
              <input
                className="input h-11 w-full"
                placeholder="e.g. John Doe"
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
              {t("parkVehicleNumber") || "Vehicle Number"} <span className="text-red-400">*</span>
            </label>
            <input
              className="input h-11 w-full"
              placeholder="e.g. MH12AB1234"
              value={form.vehicle_number}
              onChange={(e) => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
              {t("parkVehicleType") || "Vehicle Type"} <span className="text-red-400">*</span>
            </label>
            <Select
              className="input h-11 w-full"
              value={form.vehicle_type}
              onChange={(e) => { setSelectedSlotId(null); setForm({ ...form, vehicle_type: e.target.value }); }}
            >
              <option value="CAR">{t("parkCar") || "Car (4 Wheeler)"}</option>
              <option value="BIKE">{t("parkBike") || "Bike (2 Wheeler)"}</option>
            </Select>
          </div>

          {myFlats.length > 1 && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
                {t("parkWhichFlat") || "Which Flat?"} <span className="text-red-400">*</span>
              </label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-secondary py-2">
                  <Spinner size={13} /> {t("parkLoading")}
                </div>
              ) : (
                <Select
                  className="input h-11 w-full"
                  value={form.flat_id}
                  onChange={(e) => { setSelectedSlotId(null); setForm({ ...form, flat_id: e.target.value }); }}
                >
                  <option value="">{t("parkSelectFlat") || "Select flat…"}</option>
                  {myFlats.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      Flat {f.flat_number}{f.floor_id != null ? ` — Floor ${f.floor_id}` : ""}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          {mode === "guest" ? (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
                  {t("parkArrival") || "Expected Arrival"} <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="input h-11 w-full"
                  value={form.expected_arrival}
                  onChange={(e) => setForm({ ...form, expected_arrival: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
                  {t("parkDuration") || "Duration (Hours)"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  className="input h-11 w-full"
                  placeholder="e.g. 24"
                  value={form.duration_hours}
                  onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                />
              </div>
            </>
          ) : (
            /* ── SELF MODE: SLOT PICKER ── */
            <div className="sm:col-span-2">
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-secondary py-2">
                  <Spinner size={13} /> {t("parkLoading")}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="bg-white/5 border border-white/8 rounded-lg p-4 text-sm">
                  <p className="flex items-center gap-2 font-bold" style={{ color: "var(--accent)" }}>
                    <MdInfo size={16} /> No {form.vehicle_type} slot pre-assigned to your flat
                  </p>
                  <p className="text-secondary mt-1.5 leading-relaxed">
                    This vehicle will be registered as <strong>Extra</strong> and a slot request will be sent to the admin automatically. They'll assign an available slot.
                  </p>
                </div>
              ) : (
                <>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
                    {t("parkSelfSlotTitle") || "Select Parking Slot"}
                  </label>
                  <div className="flex flex-col gap-2">
                    {availableSlots.map((slot) => {
                      const occupied = isSlotOccupied(slot);
                      const selected = selectedSlotId === slot.id;
                      return (
                        <button
                          type="button"
                          key={slot.id}
                          disabled={occupied}
                          onClick={() => !occupied && setSelectedSlotId(slot.id)}
                          className="w-full rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-left transition cursor-pointer disabled:cursor-not-allowed"
                          style={{
                            border: `2px solid ${selected ? "var(--accent)" : "var(--glass-border)"}`,
                            background: selected ? "var(--accent-soft)" : "var(--card-inner-bg)",
                            opacity: occupied ? 0.55 : 1,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                              style={{
                                borderColor: selected ? "var(--accent)" : "var(--glass-border)",
                                background: selected ? "var(--accent)" : "transparent",
                              }}
                            >
                              {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                            </span>
                            <span>
                              <span className="block font-bold text-sm" style={{ color: occupied ? "var(--text-secondary)" : "var(--text-primary)", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                                {slot.slot_number}
                              </span>
                              {slot.parking_floor != null && (
                                <span className="block text-[11px] text-secondary font-semibold mt-0.5">Level {slot.parking_floor}</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                              style={{
                                background: slot.parking_type === "DEFAULT" ? "var(--approve-bg)" : "var(--approval-bg)",
                                color: slot.parking_type === "DEFAULT" ? "var(--approve-color)" : "var(--approval-color)",
                                border: `1px solid ${slot.parking_type === "DEFAULT" ? "var(--approve-border)" : "var(--approval-border)"}`,
                              }}
                            >
                              {slot.parking_type === "DEFAULT" ? "Default" : "Extra"}
                            </span>
                            <span
                              className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                              style={{
                                background: occupied ? "var(--reject-bg)" : "var(--approve-bg)",
                                color: occupied ? "var(--reject-color)" : "var(--approve-color)",
                                border: `1px solid ${occupied ? "var(--reject-border)" : "var(--approve-border)"}`,
                              }}
                            >
                              {occupied ? "Occupied" : "Available"}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    <span className="flex items-center gap-3 text-[11px] text-secondary font-semibold">
                      <span className="flex-1 h-px bg-white/10" /> or <span className="flex-1 h-px bg-white/10" />
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedSlotId(null)}
                      className="w-full rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-left transition cursor-pointer"
                      style={{
                        border: `2px solid ${selectedSlotId === null ? "var(--accent)" : "var(--glass-border)"}`,
                        background: selectedSlotId === null ? "var(--approval-bg)" : "var(--card-inner-bg)",
                        opacity: selectedSlotId === null ? 1 : 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{
                            borderColor: selectedSlotId === null ? "var(--accent)" : "var(--glass-border)",
                            background: selectedSlotId === null ? "var(--accent)" : "transparent",
                          }}
                        >
                          {selectedSlotId === null && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <span>
                          <span className="block font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                            Request New Extra Slot
                          </span>
                          <span className="block text-[11px] text-secondary font-medium mt-0.5">
                            Skip all pre-assigned slots and ask the admin to allocate a new one.
                          </span>
                        </span>
                      </div>
                      <span
                        className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                        style={{
                          background: "var(--approval-bg)", color: "var(--approval-color)",
                          border: "1px solid var(--approval-border)",
                        }}
                      >
                        Admin assigns
                      </span>
                    </button>

                    {selectedSlotId !== null && (
                      <div className="rounded-lg p-3 text-xs flex items-center gap-2" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        <MdCheckCircle size={13} />
                        Slot {availableSlots.find((s) => s.id === selectedSlotId)?.slot_number} will be linked to this vehicle immediately — no admin action needed.
                      </div>
                    )}
                    {selectedSlotId === null && (
                      <div className="rounded-lg p-3 text-xs flex items-center gap-2 bg-white/5 border border-white/8 text-secondary">
                        <MdInfo size={13} />
                        {hasAnyFreeSlot
                          ? "Free slots are available above. A new extra slot request will still go to your admin if you proceed."
                          : "All your assigned slots are occupied. A new extra slot request will be sent to the admin."}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="sm:col-span-2 flex gap-3 pt-1">
            <button type="submit" className="btn-primary h-11 flex-1 justify-center" disabled={submitLoading}>
              {submitLoading
                ? <span className="flex items-center gap-2"><Spinner size={14} /> {t("compSubmitting")}</span>
                : mode === "self"
                  ? (selectedSlotId !== null
                      ? <><MdDirectionsCar size={16} /> {"Add Vehicle & Link Slot"}</>
                      : <><MdSend size={16} /> {"Add Vehicle & Request Slot"}</>)
                  : <><MdSend size={16} /> {t("compSubmitBtn")}</>}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="h-11 px-4 rounded-xl bg-white/10 text-sm hover:bg-white/15 transition cursor-pointer"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── REQUEST LIST ── */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 border border-white/8">

        {/* Toolbar — search + filter */}
        {!initialLoad && (
          <div className="ge-toolbar mb-4">
            <ExpandableSearch
              placeholder={t("visSearch") || "Search guest, vehicle…"}
              value={search}
              onChange={setSearch}
            />

            <SlidingTabs
              className="gp-filter-tabs"
              value={filter}
              onChange={handleFilterChange}
              items={filterTabs.map((tab) => ({
                id: tab.key,
                label: tab.label,
                badge: tab.count,
                alert: tab.key === "PENDING" ? tab.count : undefined,
              }))}
            />
          </div>
        )}

        {/* Content */}
        {initialLoad ? (
          <div className="flex flex-col items-center gap-3 py-12 text-secondary">
            <Spinner size={28} />
            <p className="text-sm">{t("parkLoading")}</p>
          </div>

        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary animate-fadeIn">
            <MdOutlineInbox size={48} className="opacity-20" />
            <p className="text-sm">{t("parkEmpty")}</p>
            {hasFlat && (
              <button onClick={() => setShowForm(true)} className="btn-primary mt-1">
                <MdAdd size={16} /> {t("parkRequestBtn")}
              </button>
            )}
          </div>

        ) : noMatch ? (
          <div className="flex flex-col items-center gap-2 py-12 text-secondary animate-fadeIn">
            <MdSearch size={32} className="opacity-25" />
            <p className="text-sm">{t("visNoMatch") || "No requests match your search"}</p>
            <button
              onClick={() => { setSearch(""); setFilter("ALL"); }}
              className="text-xs text-accent hover:underline mt-1"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {t("billClearFilters")}
            </button>
          </div>

        ) : hasResults ? (
          <>
            {/* MOBILE CARDS */}
            <div className="md:hidden space-y-4">
              {requests.map((r, i) => (
                <div
                  key={r.id}
                  className="rounded-xl overflow-hidden animate-fadeIn"
                  style={{
                    animationDelay: `${i * 35}ms`,
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div style={{
                    height: 3,
                    background:
                      r.status === "APPROVED"  ? "linear-gradient(90deg,#34d399,#059669)"
                      : r.status === "REJECTED"  ? "linear-gradient(90deg,#f87171,#dc2626)"
                      : r.status === "COMPLETED" ? "linear-gradient(90deg,#9F87D7,#5A3BA2)" // ✅ ADDED
                      : "linear-gradient(90deg,#4BCBEB,var(--accent))",
                  }} />
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{r.guest_name}</p>
                        <p className="text-xs text-secondary mt-0.5 flex items-center gap-1">
                          {r.vehicle_type === "BIKE"
                            ? <MdTwoWheeler size={12} />
                            : <MdDirectionsCar size={12} />}
                          {r.vehicle_number}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    {r.assigned_spot && (
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        <MdDirectionsCar size={14} />
                        {t("parkSpot")}: <strong>{r.assigned_spot}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Mobile pagination */}
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-secondary border-b border-white/10">
                    <th className="p-3 text-left">{t("parkColGuest")}</th>
                    <th className="p-3 text-left">{t("parkColVehicle")}</th>
                    <th className="p-3 text-left">{t("parkColSpot")}</th>
                    <th className="p-3 text-left">{t("billStatusCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 hover:bg-white/3 transition animate-fadeIn"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                        {r.guest_name}
                      </td>
                      <td className="p-3 text-secondary">
                        <span className="flex items-center gap-1.5">
                          {r.vehicle_type === "BIKE"
                            ? <MdTwoWheeler size={14} className="shrink-0" />
                            : <MdDirectionsCar size={14} className="shrink-0" />}
                          {r.vehicle_number}
                        </span>
                      </td>
                      <td className="p-3" style={{ color: "var(--accent)" }}>
                        {r.assigned_spot || "—"}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Desktop footer: count + pagination */}
              <div className="flex flex-col gap-2 mt-3">
                <p className="text-xs text-secondary text-right">
                  {t("reportShowing") || "Showing"} {requests.length} {t("reportOf") || "of"} {totalItems} {t("parkCount") || "requests"}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}