import { useState, useEffect, useCallback, useRef } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdVerified,
  MdCheckCircle,
  MdWarning,
  MdDirectionsCar,
  MdTwoWheeler,
  MdLocalParking,
  MdOutlineDoorFront,
  MdClear,
  MdSecurity,
  MdArrowForward,
  MdQrCodeScanner,
  MdOutlineKeyboard,
  MdOutlineCheck,
  MdBackspace,
  MdSpeed,
  MdVerifiedUser,
  MdInfoOutline,
} from "react-icons/md";

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

// The backend stores gate passes as "GP-" + 6 digits (9 chars).
const normalizePassCode = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 6 ? `GP-${digits}` : null;
};

// Theme-aware soft tints derived from design tokens
const tint = (color, alpha) => `color-mix(in srgb, var(--${color}) ${alpha}%, transparent)`;

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
  const [lastScan, setLastScan] = useState(null);
  const [activeKey, setActiveKey] = useState(null);

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

  const verifyPass = useCallback(async () => {
    if (loading) return;
    const passCode = normalizePassCode(code);
    if (!passCode) {
      setMessage(t("ggInvalidCode") || "Enter the full 6-digit pass code (GP-XXXXXX)");
      setSuccess(false);
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/preapproval/verify", { code: passCode });
      const isExit = res.data?.scan_type === "exit";
      const detail = [];
      if (res.data?.dwell_minutes) {
        detail.push(t("ggAllowedTimeText", { count: res.data.dwell_minutes }, "Allowed time: {count} min"));
      }
      if (res.data?.dailyLimit) {
        detail.push(t("ggDailyUsageText", { used: res.data.usesToday ?? 0, limit: res.data.dailyLimit }, "Daily: {used}/{limit}"));
      }
      setMessage([res.data.message || t("ggVerifiedSuccess", "GatePass verified successfully!"), ...detail].filter(Boolean).join("  •  "));
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
      setLastScan({ isExit, name: res.data?.visitor_name || null });
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
  }, [code, loading, vehicleType, fetchSlots, t]);

  const confirmWithSlot = async () => {
    if (!selectedSlot || loading) {
      setMessage(t("ggSelectSlotFirst") || "Please select a parking slot");
      setSuccess(false);
      return;
    }
    const passCode = normalizePassCode(code);
    if (!passCode) {
      setMessage(t("ggInvalidCode") || "Enter the full 6-digit pass code (GP-XXXXXX)");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/preapproval/verify", {
        code: passCode,
        slot_number: selectedSlot,
        vehicle_type: vehicleType,
      });
      const detail = [];
      if (res.data?.dwell_minutes) {
        detail.push(t("ggAllowedTimeText", { count: res.data.dwell_minutes }, "Allowed time: {count} min"));
      }
      if (res.data?.dailyLimit) {
        detail.push(t("ggDailyUsageText", { used: res.data.usesToday ?? 0, limit: res.data.dailyLimit }, "Daily: {used}/{limit}"));
      }
      setMessage([res.data.message || t("ggEntryConfirmSuccess", "Entry confirmed with assigned parking slot!"), ...detail].filter(Boolean).join("  •  "));
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
      setLastScan({ isExit: res.data?.scan_type === "exit", name: res.data?.visitor_name || null });
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

  // Max code length for display boxes (6 digits after GP- prefix)
  const maxDigits = 6;
  const cleanCode = code.replace(/\D/g, "").slice(0, maxDigits);

  // Unified Handler with visual keypress effect
  const triggerKeyPress = useCallback((key) => {
    setActiveKey(key);
    setTimeout(() => {
      setActiveKey((prev) => (prev === key ? null : prev));
    }, 180);

    if (key >= "0" && key <= "9") {
      setCode((prev) => {
        const clean = prev.replace(/\D/g, "").slice(0, maxDigits);
        if (clean.length < maxDigits) {
          return clean + key;
        }
        return clean;
      });
    } else if (key === "backspace") {
      setCode((prev) => prev.replace(/\D/g, "").slice(0, -1));
    } else if (key === "clear") {
      setCode("");
      inputRef.current?.focus();
    }
  }, [maxDigits]);

  // Global Physical Keyboard Listener for Laptops / Desktop PCs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSlots) return;

      // Ignore if user is typing in some modal or external input
      if (e.target.tagName === "INPUT" && e.target !== inputRef.current) return;
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        triggerKeyPress(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        triggerKeyPress("backspace");
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        triggerKeyPress("clear");
      } else if (e.key === "Enter") {
        e.preventDefault();
        verifyPass();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSlots, triggerKeyPress, verifyPass]);

  return (
    <div className="gs-root gg-root page-root animate-fadeIn max-w-5xl mx-auto space-y-6 pb-8">
      {/* ── HEADER ── */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="ad-page-icon shrink-0">
            <MdSecurity size={24} />
          </div>
          <div>
            <h2 className="page-title">{t("ggTitle", "GatePass Verification Terminal")}</h2>
            <p className="page-subtitle">
              {t("ggSubtitle", "Instant pre-approval verification, QR gate code check & automated access authorization")}
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto backdrop-blur shadow-xs border"
          style={{
            background: tint("accent", 12),
            color: "var(--accent)",
            borderColor: tint("accent", 30),
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          <span>{t("ggTerminalActive", "Live Terminal Active")}</span>
        </div>
      </div>

      {/* ── QUICK FEATURE HIGHLIGHT STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-glass-border flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MdSpeed size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-primary block">{t("ggFastPassTitle", "Fast Pass Verification")}</span>
            <span className="text-[11px] text-secondary">{t("ggFastPassSub", "Zero-delay instant check-in")}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-glass-border flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MdVerifiedUser size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-primary block">{t("ggResidentAuthTitle", "Resident Pre-Approved")}</span>
            <span className="text-[11px] text-secondary">{t("ggResidentAuthSub", "Host flat authorized access")}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-glass-border flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <MdLocalParking size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-primary block">{t("ggParkingSyncTitle", "Smart Slot Assignment")}</span>
            <span className="text-[11px] text-secondary">{t("ggParkingSyncSub", "Automated guest vehicle allocation")}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN VERIFICATION CARD ── */}
      <div
        className="rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all border border-glass-border bg-card"
        style={{
          boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 30px " + tint("accent", 10),
        }}
      >
        {/* Ambient Top Highlight */}
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />

        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md group transition-transform hover:scale-105"
              style={{
                background: tint("accent", 14),
                border: "1px solid " + tint("accent", 30),
                color: "var(--accent)",
                boxShadow: "0 6px 18px " + tint("accent", 20),
              }}
            >
              <MdQrCodeScanner size={28} className="transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-primary">
              {t("ggVerifyBtn", "Enter GatePass / Visitor Code")}
            </h2>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {t("ggAskVisitorHint", "Ask the visitor for their 6-digit gate code (e.g., GP-123456)")}
            </p>
          </div>

          {/* Interactive Code / OTP Segmented Boxes */}
          {!showSlots && (
            <div className="space-y-4">
              <div
                onClick={() => inputRef.current?.focus()}
                className="cursor-pointer group select-none"
              >
                {/* GP- Prefix + 6 Segmented Digit Boxes */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  <div
                    className="px-3 py-3 rounded-2xl border-2 font-black text-base sm:text-lg flex items-center justify-center tracking-wider text-secondary bg-card-inner-bg border-glass-border shadow-xs"
                  >
                    GP-
                  </div>

                  {Array.from({ length: maxDigits }).map((_, idx) => {
                    const char = cleanCode[idx] || "";
                    const isCurrent = cleanCode.length === idx;
                    const isJustTyped = cleanCode.length - 1 === idx && activeKey !== null;

                    return (
                      <div
                        key={idx}
                        className={`w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold tracking-wider transition-all duration-150 ${
                          isJustTyped
                            ? "scale-110 shadow-lg"
                            : char || isCurrent
                            ? "scale-105"
                            : ""
                        }`}
                        style={{
                          ...(char || isCurrent
                            ? {
                                borderColor: "var(--accent)",
                                background: tint("accent", isJustTyped ? 25 : 14),
                                color: "var(--text-primary)",
                                boxShadow: isJustTyped
                                  ? "0 0 20px " + tint("accent", 50)
                                  : "0 4px 14px " + tint("accent", 20),
                              }
                            : {
                                borderColor: "var(--glass-border)",
                                background: "var(--card-inner-bg)",
                                color: "var(--text-secondary)",
                              }),
                        }}
                      >
                        {char || (isCurrent ? <span className="w-2.5 h-0.5 animate-pulse" style={{ background: "var(--accent)" }} /> : "")}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden native input for keyboard, barcode scanner gun, and paste */}
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  maxLength={maxDigits}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
                  onKeyDown={(e) => e.key === "Enter" && !showSlots && verifyPass()}
                  disabled={showSlots}
                  autoComplete="off"
                  spellCheck={false}
                  className="opacity-0 absolute -top-10 left-0 w-1 h-1 pointer-events-none"
                />
              </div>

              {/* On-Screen Touch / Laptop Keyboard Indicator Keypad */}
              <div className="max-w-xs mx-auto pt-1">
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => {
                    const isPressed = activeKey === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => triggerKeyPress(num)}
                        className={`h-11 rounded-xl border text-primary font-extrabold text-base transition-all duration-100 shadow-2xs cursor-pointer flex items-center justify-center select-none ${
                          isPressed
                            ? "scale-90 text-white border-blue-600 bg-blue-600 shadow-md ring-2 ring-blue-500/40"
                            : "bg-card-inner-bg hover:bg-surface-hover active:scale-95 border-glass-border"
                        }`}
                        style={isPressed ? { background: "var(--accent)", borderColor: "var(--accent)" } : {}}
                      >
                        {num}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => triggerKeyPress("clear")}
                    className={`h-11 rounded-xl border font-bold text-xs transition-all duration-100 shadow-2xs cursor-pointer flex items-center justify-center gap-1 select-none ${
                      activeKey === "clear"
                        ? "scale-90 bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/40"
                        : "bg-card-inner-bg hover:bg-rose-500/15 text-rose-500 active:scale-95 border-glass-border"
                    }`}
                    title="Clear (Esc / Del)"
                  >
                    <MdClear size={16} />
                    <span>Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerKeyPress("0")}
                    className={`h-11 rounded-xl border text-primary font-extrabold text-base transition-all duration-100 shadow-2xs cursor-pointer flex items-center justify-center select-none ${
                      activeKey === "0"
                        ? "scale-90 text-white border-blue-600 bg-blue-600 shadow-md ring-2 ring-blue-500/40"
                        : "bg-card-inner-bg hover:bg-surface-hover active:scale-95 border-glass-border"
                    }`}
                    style={activeKey === "0" ? { background: "var(--accent)", borderColor: "var(--accent)" } : {}}
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerKeyPress("backspace")}
                    className={`h-11 rounded-xl border font-bold text-xs transition-all duration-100 shadow-2xs cursor-pointer flex items-center justify-center select-none ${
                      activeKey === "backspace"
                        ? "scale-90 bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/40"
                        : "bg-card-inner-bg hover:bg-amber-500/15 text-amber-500 active:scale-95 border-glass-border"
                    }`}
                    title="Backspace"
                  >
                    <MdBackspace size={18} />
                  </button>
                </div>

                {/* Laptop Keyboard Hint */}
                <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-secondary font-medium select-none">
                  <MdOutlineKeyboard size={14} className="text-accent" />
                  <span>{t("ggLaptopHint", "Keyboard active: Type 0-9, Backspace to delete, Enter to verify")}</span>
                </div>
              </div>

              {/* Last scan summary chip */}
              {lastScan && (
                <div
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border animate-fadeIn max-w-sm mx-auto shadow-xs"
                  style={{
                    color: lastScan.isExit ? "var(--accent)" : "var(--success, #10b981)",
                    background: tint(lastScan.isExit ? "accent" : "success", 12),
                    borderColor: tint(lastScan.isExit ? "accent" : "success", 30),
                  }}
                >
                  <MdOutlineCheck size={16} />
                  <span>
                    {lastScan.isExit
                      ? t("ggExitRecorded", "Visitor EXIT Recorded")
                      : t("ggEntryRecorded", "Visitor ENTRY Recorded")}
                    {lastScan.name ? ` • ${lastScan.name}` : ""}
                  </span>
                </div>
              )}

              {/* Primary Verify Action Button */}
              <button
                type="button"
                onClick={verifyPass}
                disabled={loading || !cleanCode.trim()}
                className="relative w-full justify-center py-3.5 px-6 rounded-2xl text-sm font-bold flex items-center gap-2.5 text-white border-none transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl cursor-pointer group"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-dark, var(--accent)))",
                  boxShadow: "0 10px 28px " + tint("accent", 30),
                }}
              >
                <span className="relative flex items-center gap-2.5">
                  {loading ? (
                    <>
                      <Spinner size={18} />
                      <span>{t("ggVerifying", "Verifying GatePass...")}</span>
                    </>
                  ) : (
                    <>
                      <MdVerified size={19} />
                      <span>{t("ggVerifyBtn", "Authorize & Validate Pass")}</span>
                      <MdArrowForward size={17} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* ── STATUS BANNER FEEDBACK ── */}
          {message && (
            <div
              className="p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all animate-fadeIn"
              style={{
                background: tint(success ? "success" : "warning", 12),
                borderColor: tint(success ? "success" : "warning", 30),
                color: success ? "var(--success, #10b981)" : "var(--warning, #f59e0b)",
                boxShadow: "0 8px 24px " + tint(success ? "success" : "warning", 10),
              }}
            >
              {success ? (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tint("success", 18), color: "var(--success, #10b981)" }}
                >
                  <MdCheckCircle size={22} />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tint("warning", 18), color: "var(--warning, #f59e0b)" }}
                >
                  <MdWarning size={22} />
                </div>
              )}
              <div className="flex-1 text-xs sm:text-sm">{message}</div>
            </div>
          )}

          {/* ── PARKING SLOT SELECTION PANEL (WHEN REQUIRED) ── */}
          {showSlots && (
            <div className="space-y-4 pt-4 border-t border-glass-border animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: tint("accent", 14), color: "var(--accent)" }}
                  >
                    <MdLocalParking size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">
                      {t("ggSelectSlot", "Assign Visitor Parking Slot")}
                    </h3>
                    <p className="text-[11px] text-secondary">
                      {t("ggGuestParkingNeeded", "This guest requires an allocated parking bay.")}
                    </p>
                  </div>
                </div>

                <span
                  className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg border border-glass-border bg-card-inner-bg text-primary"
                >
                  {t("ggCode", "Code")}: {normalizePassCode(code) || code}
                </span>
              </div>

              {/* Vehicle Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleType("CAR")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    vehicleType === "CAR"
                      ? "border-blue-600 bg-blue-500/15 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "bg-card-inner-bg border-glass-border text-secondary hover:text-primary"
                  }`}
                >
                  <MdDirectionsCar size={17} />
                  <span>{t("ggCar", "Car Parking")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType("BIKE")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    vehicleType === "BIKE"
                      ? "border-blue-600 bg-blue-500/15 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "bg-card-inner-bg border-glass-border text-secondary hover:text-primary"
                  }`}
                >
                  <MdTwoWheeler size={17} />
                  <span>{t("ggBike", "Bike Parking")}</span>
                </button>
              </div>

              {/* Slot Grid */}
              {slots.length === 0 ? (
                <div className="py-8 text-center p-4 space-y-1.5 rounded-2xl bg-card-inner-bg border border-glass-border">
                  <MdLocalParking size={32} className="mx-auto opacity-30 text-secondary" />
                  <p className="text-xs font-semibold text-secondary">
                    {t("ggNoSlots", { type: vehicleType === "CAR" ? "Car" : "Bike" }, `No available ${vehicleType.toLowerCase()} parking slots.`)}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.slot_number;
                    return (
                      <button
                        key={slot.id || slot.slot_number}
                        type="button"
                        onClick={() => setSelectedSlot(slot.slot_number)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? "scale-105 border-blue-600 bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-md font-bold"
                            : "bg-card-inner-bg border-glass-border text-primary hover:border-blue-500/50"
                        }`}
                      >
                        <span className="text-xs font-extrabold tracking-tight tabular-nums">
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
                <div
                  className="p-3 rounded-xl flex items-center justify-between text-xs font-semibold border"
                  style={{ background: tint("accent", 10), borderColor: tint("accent", 25), color: "var(--accent)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <MdCheckCircle size={16} />
                    <span>{t("ggAssignedSlot", { slot: selectedSlot }, `Assigned Slot: ${selectedSlot}`)}</span>
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
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold transition-all text-center bg-card-inner-bg border border-glass-border text-secondary hover:text-primary cursor-pointer"
                >
                  {t("ggCancel", "Cancel")}
                </button>

                <button
                  type="button"
                  onClick={confirmWithSlot}
                  disabled={loading || !selectedSlot}
                  className="flex-2 py-3 px-5 rounded-xl text-xs font-bold text-white border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #10b981, var(--accent))" }}
                >
                  {loading ? (
                    <>
                      <Spinner size={15} />
                      <span>{t("ggConfirming", "Confirming...")}</span>
                    </>
                  ) : (
                    <>
                      <MdCheckCircle size={17} />
                      <span>{t("ggConfirm", "Confirm & Grant Access")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── FOOTER HINT ── */}
          {!showSlots && (
            <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-secondary">
              <span className="flex items-center gap-1.5">
                <MdOutlineDoorFront size={15} />
                <span>{t("ggSecondScanOut", "Second verification scan automatically marks visitor EXIT")}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECURITY GUIDELINES CARD ── */}
      <div className="p-4 rounded-2xl bg-card border border-glass-border flex items-start gap-3 shadow-xs">
        <MdInfoOutline size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-secondary leading-relaxed">
          <span className="font-bold text-primary block mb-0.5">{t("ggGuidelinesTitle", "Security Verification Rule")}</span>
          {t("ggGuidelinesBody", "All pre-approved visitors must present their 6-digit gatepass code generated by the resident. For unauthorized entries without passes, use the Guest or Delivery entry modal instead.")}
        </div>
      </div>
    </div>
  );
}