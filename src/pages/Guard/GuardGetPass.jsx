import { useState, useEffect, useCallback, useRef } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdVerified,
  MdVpnKey,
  MdCheckCircle,
  MdWarning,
  MdDirectionsCar,
  MdTwoWheeler,
  MdLocalParking,
  MdOutlineDoorFront,
  MdClear,
  MdSecurity,
  MdArrowForward,
} from "react-icons/md";
import SlidingTabs from "../../components/common/SlidingTabs";

function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function GuardGatePass() {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [vehicleType, setVehicleType] = useState("CAR");
  const inputRef = useRef(null);

  const fetchSlots = useCallback(async (type = vehicleType) => {
    try {
      const res = await API.get(`/parking-slots/available?vehicle_type=${type}`);
      setSlots(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Slot fetch error", err);
      setSlots([]);
    }
  }, [vehicleType]);

  useEffect(() => {
    if (showSlots) {
      setSelectedSlot(null);
      fetchSlots(vehicleType);
    }
  }, [vehicleType, showSlots, fetchSlots]);

  const verifyPass = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/preapproval/verify", { code: code.trim() });
      setMessage(res.data.message || "GatePass verified successfully!");
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
    } catch (err) {
      const msg = err.response?.data?.message || t("ggVerifyFail") || "Verification failed";
      setSuccess(false);
      setMessage(msg);
      if (msg === "Please select a parking slot" || err.response?.data?.requiresSlot) {
        setShowSlots(true);
        fetchSlots(vehicleType);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmWithSlot = async () => {
    if (!selectedSlot || loading) {
      setMessage(t("ggSelectSlotFirst") || "Please select a parking slot");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/preapproval/verify", {
        code: code.trim(),
        slot_number: selectedSlot,
        vehicle_type: vehicleType,
      });
      setMessage(res.data.message || "Entry confirmed with assigned parking slot!");
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
    } catch (err) {
      const msg = err.response?.data?.message || t("ggVerifyFail") || "Verification failed";
      setSuccess(false);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (message && !success) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message, success]);

  // Max code length for display boxes (usually 6 digits)
  const maxDigits = 6;
  const cleanCode = code.replace(/\s+/g, "").toUpperCase();

  return (
    <div className="gs-root gg-root page-root animate-fadeIn max-w-4xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="ad-page-icon">
            <MdSecurity size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {t("ggTitle") || "GatePass Verification"}
            </h1>
            <p className="text-xs text-secondary mt-0.5">
              {t("ggSubtitle") || "Quick verification for visitor passes, pre-approvals, and guest parking."}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Security Gate Terminal Active</span>
        </div>
      </div>

      {/* ── MAIN VERIFICATION CARD ── */}
      <div className="rounded-3xl border border-glass-border bg-card p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-accent/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-md shadow-cyan-500/10">
              <MdVpnKey size={26} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
              {t("ggVerifyBtn") || "Enter GatePass / Visitor Code"}
            </h2>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              Ask the visitor or delivery person for their 4 to 6 character pre-approval pass code.
            </p>
          </div>

          {/* Interactive Code / OTP Segmented Boxes */}
          {!showSlots && (
            <div className="space-y-4">
              <div
                onClick={() => inputRef.current?.focus()}
                className="cursor-pointer group"
              >
                {/* 6 Segmented Digit Boxes */}
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-2">
                  {Array.from({ length: maxDigits }).map((_, idx) => {
                    const char = cleanCode[idx] || "";
                    const isCurrent = cleanCode.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold tracking-wider transition-all duration-200 ${
                          char
                            ? "border-cyan-500 bg-cyan-500/15 text-primary shadow-md shadow-cyan-500/10 scale-105"
                            : isCurrent
                            ? "border-cyan-500/80 bg-card-inner-bg text-primary ring-4 ring-cyan-500/20 scale-105"
                            : "border-glass-border bg-card-inner-bg text-secondary group-hover:border-white/20"
                        }`}
                      >
                        {char || (isCurrent ? <span className="w-2.5 h-0.5 bg-cyan-400 animate-pulse" /> : "")}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden native input for seamless mobile keyboard, paste, and fast typing */}
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  maxLength={maxDigits}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && !showSlots && verifyPass()}
                  disabled={showSlots}
                  autoComplete="off"
                  spellCheck={false}
                  className="opacity-0 absolute -top-10 left-0 w-1 h-1 pointer-events-none"
                />
              </div>

              {/* Quick Clear Button if code exists */}
              {code && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCode("");
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-secondary hover:text-primary bg-card-inner-bg border border-glass-border transition-all"
                  >
                    <MdClear size={13} />
                    <span>Clear code</span>
                  </button>
                </div>
              )}

              {/* Primary Verify Action Button */}
              <button
                type="button"
                onClick={verifyPass}
                disabled={loading || !code.trim()}
                className="w-full justify-center py-3.5 px-6 rounded-2xl text-sm font-bold flex items-center gap-2.5 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/25 border-none transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spinner size={18} />
                    <span>{t("ggVerifying") || "Verifying Pass..."}</span>
                  </>
                ) : (
                  <>
                    <MdVerified size={18} />
                    <span>{t("ggVerifyBtn") || "Verify Pass & Authorize Entry"}</span>
                    <MdArrowForward size={16} className="opacity-80" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── STATUS BANNER FEEDBACK ── */}
          {message && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all animate-fadeIn ${
                success
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/10"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-md shadow-amber-500/10"
              }`}
            >
              {success ? (
                <MdCheckCircle size={22} className="shrink-0 text-emerald-400" />
              ) : (
                <MdWarning size={22} className="shrink-0 text-amber-400" />
              )}
              <div className="flex-1 text-xs sm:text-sm">{message}</div>
            </div>
          )}

          {/* ── PARKING SLOT SELECTION PANEL (WHEN REQUIRED) ── */}
          {showSlots && (
            <div className="space-y-4 pt-4 border-t border-glass-border/60 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                    <MdLocalParking size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">
                      {t("ggSelectSlot") || "Assign Parking Slot"}
                    </h3>
                    <p className="text-[11px] text-secondary">
                      This guest requires an available parking bay.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-accent px-2.5 py-1 rounded-lg bg-card-inner-bg border border-glass-border">
                  Code: {code}
                </span>
              </div>

              {/* Vehicle Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleType("CAR")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                    vehicleType === "CAR"
                      ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-sm shadow-cyan-500/10"
                      : "bg-card-inner-bg border-glass-border text-secondary hover:text-primary"
                  }`}
                >
                  <MdDirectionsCar size={16} />
                  <span>{t("ggCar") || "Car Parking"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType("BIKE")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                    vehicleType === "BIKE"
                      ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-sm shadow-cyan-500/10"
                      : "bg-card-inner-bg border-glass-border text-secondary hover:text-primary"
                  }`}
                >
                  <MdTwoWheeler size={16} />
                  <span>{t("ggBike") || "Bike Parking"}</span>
                </button>
              </div>

              {/* Slot Grid */}
              {slots.length === 0 ? (
                <div className="py-8 text-center bg-card-inner-bg rounded-2xl border border-glass-border p-4 space-y-1.5">
                  <MdLocalParking size={30} className="mx-auto opacity-30 text-secondary" />
                  <p className="text-xs font-semibold text-secondary">
                    {t("ggNoSlots", { type: vehicleType === "CAR" ? t("ggCar") || "Car" : t("ggBike") || "Bike" }) ||
                      `No available ${vehicleType.toLowerCase()} parking slots right now.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.slot_number;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.slot_number)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500 text-cyan-400 ring-2 ring-cyan-500/30 scale-105 shadow-md shadow-cyan-500/15"
                            : "bg-card-inner-bg border-glass-border text-primary hover:border-white/30"
                        }`}
                      >
                        <span className="text-xs font-extrabold tracking-tight">
                          {slot.slot_number}
                        </span>
                        <span className="text-[10px] font-semibold text-secondary">
                          {slot.floor_number ? `Fl ${slot.floor_number}` : "Available"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Slot Indicator */}
              {selectedSlot && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <MdCheckCircle size={15} />
                    <span>Assigned Slot: <strong>{selectedSlot}</strong></span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    {vehicleType}
                  </span>
                </div>
              )}

              {/* Action Buttons for Slot */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSlots(false);
                    setSelectedSlot(null);
                    setMessage("");
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold bg-card-inner-bg border border-glass-border text-secondary hover:text-primary transition-all text-center"
                >
                  {t("ggCancel") || "Cancel"}
                </button>

                <button
                  type="button"
                  onClick={confirmWithSlot}
                  disabled={loading || !selectedSlot}
                  className="flex-2 py-3 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Spinner size={15} />
                      <span>{t("ggConfirming") || "Confirming..."}</span>
                    </>
                  ) : (
                    <>
                      <MdCheckCircle size={16} />
                      <span>{t("ggConfirm") || "Confirm & Grant Access"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
