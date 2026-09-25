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
// The entry field collects only the 6 digits; we rebuild the full code here
// so a valid pass can never be sent truncated / without the "GP-" prefix.
const normalizePassCode = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 6 ? `GP-${digits}` : null;
};

// Theme-aware soft tints derived from the design tokens (no hardcoded colors).
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
  // Last successful scan summary (EN/OUT chip shown under the OTP boxes)
  const [lastScan, setLastScan] = useState(null);

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
  };

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
  const cleanCode = code.replace(/\D/g, "");

  return (
    <div className="gs-root gg-root page-root animate-fadeIn max-w-4xl mx-auto space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl opacity-30 blur-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dark))" }}
            />
            <div
              className="relative w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-dark))", boxShadow: "0 10px 30px " + tint("accent", 35) }}
            >
              <MdSecurity size={24} />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {t("ggTitle") || "GatePass Verification"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {t("ggSubtitle") || "Quick verification for visitor passes, pre-approvals, and guest parking."}
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto backdrop-blur"
          style={{
            background: tint("accent", 12),
            color: "var(--accent)",
            border: "1px solid " + tint("accent", 30),
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          <span>{t("ggTerminalActive", "Security Gate Terminal Active")}</span>
        </div>
      </div>

      {/* ── MAIN VERIFICATION CARD ── */}
      <div
        className="rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-shadow"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Subtle Ambient Background Glow */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
          style={{ background: "linear-gradient(135deg, " + tint("accent", 22) + ", transparent)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"
          style={{ background: "linear-gradient(315deg, " + tint("accent-soft", 60) + ", transparent)" }}
        />
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(to right, transparent, var(--accent), transparent)" }} />

        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md group"
              style={{
                background: tint("accent", 14),
                border: "1px solid " + tint("accent", 30),
                color: "var(--accent)",
                boxShadow: "0 4px 12px " + tint("accent", 18),
              }}
            >
              <MdQrCodeScanner size={26} className="transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {t("ggVerifyBtn") || "Enter GatePass / Visitor Code"}
            </h2>
            <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t("ggAskVisitorHint", "Ask the visitor for their gate pass code: the letters GP, a dash, then 6 digits (e.g. GP-123456).")}
            </p>
          </div>

          {/* Interactive Code / OTP Segmented Boxes */}
          {!showSlots && (
            <div className="space-y-4">
              <div
                onClick={() => inputRef.current?.focus()}
                className="cursor-pointer group"
              >
                {/* GP- Prefix + 6 Segmented Digit Boxes */}
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-2">
                  <span className="text-lg sm:text-xl font-extrabold tracking-wider select-none tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    GP-
                  </span>
                  {Array.from({ length: maxDigits }).map((_, idx) => {
                    const char = cleanCode[idx] || "";
                    const isCurrent = cleanCode.length === idx;
                    return (
                      <div
                        key={idx}
                        className={
                          char || isCurrent
                            ? "w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold tracking-wider transition-all duration-200 scale-105"
                            : "w-11 h-14 sm:w-13 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold tracking-wider transition-all duration-200"
                        }
                        style={{
                          ...(char || isCurrent
                            ? {
                                borderColor: "var(--accent)",
                                background: tint("accent", 14),
                                color: "var(--text-primary)",
                                boxShadow: "0 4px 12px " + tint("accent", 18),
                              }
                            : {
                                borderColor: "var(--glass-border)",
                                borderBottomColor: "var(--accent)",
                                borderBottomWidth: 2,
                                background: "var(--card-inner-bg)",
                                color: "var(--text-tertiary)",
                              }),
                          transitionProperty: "border-color, background-color, box-shadow, transform",
                        }}
                        onMouseEnter={(e) => {
                          if (!char && !isCurrent) {
                            e.currentTarget.style.borderColor = "var(--accent)";
                            e.currentTarget.style.background = tint("accent", 6);
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!char && !isCurrent) {
                            e.currentTarget.style.borderColor = "var(--glass-border)";
                            e.currentTarget.style.borderBottomColor = "var(--accent)";
                            e.currentTarget.style.background = "var(--card-inner-bg)";
                          }
                        }}
                      >
                        {char || (isCurrent ? <span className="w-2.5 h-0.5 animate-pulse" style={{ background: "var(--accent)" }} /> : "")}
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
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
                  onKeyDown={(e) => e.key === "Enter" && !showSlots && verifyPass()}
                  disabled={showSlots}
                  autoComplete="off"
                  spellCheck={false}
                  className="opacity-0 absolute -top-10 left-0 w-1 h-1 pointer-events-none"
                />
              </div>

              {/* Quick Clear Button if code exists */}
              <div className="flex items-center justify-center gap-2">
                {code ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCode("");
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                    style={{
                      color: "var(--text-secondary)",
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tint("accent", 45);
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--glass-border)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    <MdClear size={13} />
                    <span>{t("ggClearCode", "Clear code")}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    <MdOutlineKeyboard size={13} />
                    <span>{t("ggTypeCodeHint", "Type 6 digits or paste a code")}</span>
                  </span>
                )}
              </div>

              {/* Last scan summary chip */}
              {lastScan && (
                <div
                  className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold border animate-fadeIn"
                  style={{
                    color: lastScan.isExit ? "var(--accent)" : "var(--success)",
                    background: tint(lastScan.isExit ? "accent" : "success", 12),
                    borderColor: tint(lastScan.isExit ? "accent" : "success", 30),
                  }}
                >
                  <MdOutlineCheck size={14} />
                  <span>
                    {lastScan.isExit
                      ? t("ggExitRecorded", "Visitor EXIT recorded")
                      : t("ggEntryRecorded", "Visitor ENTRY recorded")}
                    {lastScan.name ? ` · ${lastScan.name}` : ""}
                  </span>
                </div>
              )}

              {/* Primary Verify Action Button */}
              <button
                type="button"
                onClick={verifyPass}
                disabled={loading || !code.trim()}
                className="relative w-full justify-center py-3.5 px-6 rounded-2xl text-sm font-bold flex items-center gap-2.5 text-white border-none transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                  boxShadow: "0 10px 30px " + tint("accent", 30),
                }}
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.22), transparent)" }}
                />
                <span className="relative flex items-center gap-2.5">
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
                color: success ? "var(--success)" : "var(--warning)",
                boxShadow: "0 8px 24px " + tint(success ? "success" : "warning", 10),
              }}
            >
              {success ? (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tint("success", 18), color: "var(--success)" }}
                >
                  <MdCheckCircle size={22} />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tint("warning", 18), color: "var(--warning)" }}
                >
                  <MdWarning size={22} />
                </div>
              )}
              <div className="flex-1 text-xs sm:text-sm">{message}</div>
            </div>
          )}

          {/* ── PARKING SLOT SELECTION PANEL (WHEN REQUIRED) ── */}
          {showSlots && (
            <div className="space-y-4 pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: tint("accent", 14), color: "var(--accent)" }}
                  >
                    <MdLocalParking size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {t("ggSelectSlot") || "Assign Parking Slot"}
                    </h3>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {t("ggGuestParkingNeeded", "This guest requires an available parking bay.")}
                    </p>
                  </div>
                </div>

                <span
                  className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg"
                  style={{ color: "var(--accent)", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
                >
                  {t("ggCode", "Code")}: {normalizePassCode(code) || code}
                </span>
              </div>

              {/* Vehicle Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleType("CAR")}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border"
                  style={
                    vehicleType === "CAR"
                      ? { background: tint("accent", 18), borderColor: "var(--accent)", color: "var(--accent)", boxShadow: "0 4px 12px " + tint("accent", 18) }
                      : { background: "var(--card-inner-bg)", borderColor: "var(--glass-border)", color: "var(--text-secondary)" }
                  }
                >
                  <MdDirectionsCar size={16} />
                  <span>{t("ggCar") || "Car Parking"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType("BIKE")}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border"
                  style={
                    vehicleType === "BIKE"
                      ? { background: tint("accent", 18), borderColor: "var(--accent)", color: "var(--accent)", boxShadow: "0 4px 12px " + tint("accent", 18) }
                      : { background: "var(--card-inner-bg)", borderColor: "var(--glass-border)", color: "var(--text-secondary)" }
                  }
                >
                  <MdTwoWheeler size={16} />
                  <span>{t("ggBike") || "Bike Parking"}</span>
                </button>
              </div>

              {/* Slot Grid */}
              {slots.length === 0 ? (
                <div className="py-8 text-center p-4 space-y-1.5 rounded-2xl" style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                  <MdLocalParking size={30} className="mx-auto opacity-30" style={{ color: "var(--text-secondary)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
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
                          isSelected ? "scale-105" : ""
                        }`}
                        style={
                          isSelected
                            ? { background: tint("accent", 18), borderColor: "var(--accent)", color: "var(--accent)", boxShadow: "0 6px 16px " + tint("accent", 18) }
                            : { background: "var(--card-inner-bg)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }
                        }
                      >
                        <span className="text-xs font-extrabold tracking-tight tabular-nums">
                          {slot.slot_number}
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                          {slot.floor_number ? t("ggFloor", { floor: slot.floor_number }, "Fl {floor}") : t("ggAvailable", "Available")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Slot Indicator */}
              {selectedSlot && (
                <div
                  className="p-3 rounded-xl flex items-center justify-between text-xs font-semibold"
                  style={{ background: tint("accent", 10), border: "1px solid " + tint("accent", 25), color: "var(--accent)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <MdCheckCircle size={15} />
                    <span>{t("ggAssignedSlot", { slot: selectedSlot }, "Assigned Slot: {slot}")}</span>
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
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold transition-all text-center"
                  style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
                >
                  {t("ggCancel") || "Cancel"}
                </button>

                <button
                  type="button"
                  onClick={confirmWithSlot}
                  disabled={loading || !selectedSlot}
                  className="flex-2 py-3 px-5 rounded-xl text-xs font-bold text-white border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--success), var(--accent))", boxShadow: "0 8px 20px " + tint("success", 22) }}
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

          {/* ── FOOTER HINT ── */}
          {!showSlots && (
            <div className="flex items-center justify-center gap-4 pt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              <span className="flex items-center gap-1.5">
                <MdOutlineDoorFront size={14} />
                <span>{t("ggSecondScanOut", "Second scan marks visitor OUT")}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}