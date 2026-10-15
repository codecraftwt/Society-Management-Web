import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdVerified,
  MdCheckCircle,
  MdWarning,
  MdDirectionsCar,
  MdTwoWheeler,
  MdLocalParking,
  MdClear,
  MdSecurity,
  MdArrowForward,
  MdQrCodeScanner,
  MdOutlineKeyboard,
  MdBackspace,
  MdAccessTime,
  MdRefresh,
  MdLogin,
  MdLogout,
  MdApartment,
  MdPersonAdd,
  MdLocalShipping,
  MdLocalTaxi,
  MdFormatListBulleted,
  MdContentPaste,
  MdDialpad,
  MdBolt,
  MdFlashOn,
  MdOpenInNew,
} from "react-icons/md";

function Spinner({ size = 15 }) {
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

// Normalize gate pass to "GP-" + 6 digits
const normalizePassCode = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 6 ? `GP-${digits}` : null;
};

// Theme-aware soft tints derived from design tokens
const tint = (color, alpha) => `color-mix(in srgb, var(--${color}) ${alpha}%, transparent)`;

function formatDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return {
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  };
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
  const [lastScan, setLastScan] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [showKeypad, setShowKeypad] = useState(false);

  // Recent visitor activity feed & tab filter
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("ALL"); // ALL | IN | OUT

  const fetchRecentLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await API.get("/visitors?page=1&limit=10");
      const list = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.visitors || [];
      setRecentLogs(list.slice(0, 10));
    } catch {
      // Non-blocking
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs]);

  const filteredLogs = useMemo(() => {
    if (logFilter === "IN") return recentLogs.filter((l) => !l.exit_time);
    if (logFilter === "OUT") return recentLogs.filter((l) => Boolean(l.exit_time));
    return recentLogs;
  }, [recentLogs, logFilter]);

  // Cleanly display up to 4 records to perfectly match the height of the left sections
  const displayedLogs = useMemo(() => {
    return filteredLogs.slice(0, 4);
  }, [filteredLogs]);

  const fetchSlots = useCallback(async (type = vehicleType) => {
    try {
      const res = await API.get(`/parking-slots/available?vehicle_type=${type}`);
      setSlots(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
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
      setMessage(t("ggInvalidCode", "Enter the full 6-digit pass code (GP-XXXXXX)"));
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
        detail.push(t("ggAllowedTimeText", { count: res.data.dwell_minutes }, `Allowed: ${res.data.dwell_minutes}m`));
      }
      if (res.data?.dailyLimit) {
        detail.push(t("ggDailyUsageText", { used: res.data.usesToday ?? 0, limit: res.data.dailyLimit }, `Daily: ${res.data.usesToday ?? 0}/${res.data.dailyLimit}`));
      }
      setMessage([res.data?.message || t("ggVerifiedSuccess", "GatePass verified successfully!"), ...detail].filter(Boolean).join(" • "));
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
      setLastScan({ isExit, name: res.data?.visitor_name || null });
      fetchRecentLogs();
    } catch (err) {
      const msg = err.response?.data?.message || t("ggVerifyFail", "Verification failed");
      setSuccess(false);
      setMessage(msg);
      if (msg === "Please select a parking slot" || err.response?.data?.requiresSlot) {
        setShowSlots(true);
        fetchSlots(vehicleType);
      }
    } finally {
      setLoading(false);
    }
  }, [code, loading, vehicleType, fetchSlots, fetchRecentLogs, t]);

  const confirmWithSlot = async () => {
    if (!selectedSlot || loading) {
      setMessage(t("ggSelectSlotFirst", "Please select a slot first"));
      setSuccess(false);
      return;
    }
    const passCode = normalizePassCode(code);
    if (!passCode) {
      setMessage(t("ggInvalidCode", "Enter the full 6-digit pass code (GP-XXXXXX)"));
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
        detail.push(t("ggAllowedTimeText", { count: res.data.dwell_minutes }, `Allowed: ${res.data.dwell_minutes}m`));
      }
      if (res.data?.dailyLimit) {
        detail.push(t("ggDailyUsageText", { used: res.data.usesToday ?? 0, limit: res.data.dailyLimit }, `Daily: ${res.data.usesToday ?? 0}/${res.data.dailyLimit}`));
      }
      setMessage([res.data?.message || t("ggEntryConfirmSuccess", "Entry confirmed with assigned parking slot!"), ...detail].filter(Boolean).join(" • "));
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
      setLastScan({ isExit: res.data?.scan_type === "exit", name: res.data?.visitor_name || null });
      fetchRecentLogs();
    } catch (err) {
      const msg = err.response?.data?.message || t("ggVerifyFail", "Verification failed");
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

  const triggerKeyPress = useCallback((key) => {
    setActiveKey(key);
    setTimeout(() => {
      setActiveKey((prev) => (prev === key ? null : prev));
    }, 140);

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

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const digits = text.replace(/\D/g, "").slice(0, maxDigits);
        if (digits) {
          setCode(digits);
        }
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  // Global Physical Keyboard Listener for Laptops / Desktop PCs / Barcode Scanners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSlots) return;
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
    <div className="page-root max-w-6xl mx-auto space-y-4 pb-6 animate-fadeIn">
      {/* ── COMMAND HEADER: Sleek & Modern ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
            <MdSecurity size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t("ggTitle", "GatePass Terminal")}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t("ggSubtitle", "Instant visitor verification, QR validation & gate authorization")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("ggTerminalActive", "Terminal Live")}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <MdBolt size={14} />
            <span>Auto-Scanner Ready</span>
          </div>
        </div>
      </div>

      {/* ── MAIN DASHBOARD GRID (7 Cols / 5 Cols, Perfectly Equal Height) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT COLUMN: Main Verification Console + Quick Entry Shortcuts Directly Below */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* 1. Main Verification Card */}
          <div className="relative rounded-3xl p-5 sm:p-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-indigo-500/15 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all">
            {/* Ambient High-Tech Light Beam */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-purple-500" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              {/* Terminal Action Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <MdQrCodeScanner size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                      {t("ggVerifyBtn", "Enter Pass Code")}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {t("ggTypeCodeHint", "Type 6 digits, scan QR barcode, or paste")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <MdContentPaste size={14} className="text-indigo-500" />
                    <span>Paste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowKeypad((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      showKeypad
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                    title="Toggle touch numpad"
                  >
                    <MdDialpad size={14} />
                    <span>Keypad</span>
                  </button>

                  {cleanCode.length > 0 && (
                    <button
                      type="button"
                      onClick={() => triggerKeyPress("clear")}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-0.5 cursor-pointer transition-colors"
                      title={t("ggClearCode", "Clear code")}
                    >
                      <MdClear size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* High-Tech PIN Display Unit */}
              {!showSlots && (
                <div className="space-y-4">
                  <div
                    onClick={() => inputRef.current?.focus()}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/50 border border-slate-200/90 dark:border-slate-800/80 shadow-inner cursor-pointer select-none group transition-all"
                  >
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                      {/* Metallic GP- prefix */}
                      <div className="px-3.5 py-3 rounded-xl font-mono font-black text-sm tracking-widest bg-gradient-to-br from-indigo-50 to-indigo-100/70 dark:from-indigo-950/60 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 shadow-2xs">
                        GP-
                      </div>

                      {/* 6 Segmented Digit Slots */}
                      {Array.from({ length: maxDigits }).map((_, idx) => {
                        const char = cleanCode[idx] || "";
                        const isCurrent = cleanCode.length === idx;
                        const isFilled = Boolean(char);

                        return (
                          <div
                            key={idx}
                            className={`w-11 h-14 sm:w-12 sm:h-15 rounded-xl border-2 font-mono font-black text-2xl flex items-center justify-center transition-all duration-150 ${
                              isFilled
                                ? "border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 text-indigo-700 dark:text-white shadow-md shadow-indigo-500/15 scale-102"
                                : isCurrent
                                ? "border-indigo-400 bg-white/70 dark:bg-slate-900/70 text-slate-800 dark:text-white ring-4 ring-indigo-500/15"
                                : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-slate-400"
                            }`}
                          >
                            {char || (isCurrent ? (
                              <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-2.5 h-1 rounded-full bg-indigo-500"
                              />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            ))}
                          </div>
                        );
                      })}
                    </div>

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

                  {/* Sleek Collapsible Touch Keypad */}
                  <AnimatePresence>
                    {showKeypad && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="max-w-[270px] mx-auto p-2 rounded-2xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/60 shadow-inner">
                          <div className="grid grid-cols-3 gap-1.5">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => triggerKeyPress(num)}
                                className={`h-9 rounded-xl font-bold text-sm transition-all duration-100 flex items-center justify-center cursor-pointer select-none ${
                                  activeKey === num
                                    ? "bg-indigo-600 text-white shadow-md scale-95"
                                    : "bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-800 shadow-2xs"
                                }`}
                              >
                                {num}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => triggerKeyPress("clear")}
                              className="h-9 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 border border-slate-200/70 dark:border-slate-800 shadow-2xs flex items-center justify-center cursor-pointer transition-colors"
                              title={t("ggClearCode", "Clear")}
                            >
                              <MdClear size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerKeyPress("0")}
                              className={`h-9 rounded-xl font-bold text-sm transition-all duration-100 flex items-center justify-center cursor-pointer select-none ${
                                activeKey === "0"
                                  ? "bg-indigo-600 text-white shadow-md scale-95"
                                  : "bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-800 shadow-2xs"
                              }`}
                            >
                              0
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerKeyPress("backspace")}
                              className="h-9 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-500 border border-slate-200/70 dark:border-slate-800 shadow-2xs flex items-center justify-center cursor-pointer transition-colors"
                              title="Backspace"
                            >
                              <MdBackspace size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Primary Verify Action Button */}
                  <button
                    type="button"
                    onClick={verifyPass}
                    disabled={loading || cleanCode.length < 6}
                    className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
                    style={{
                      background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)",
                      boxShadow: cleanCode.length === 6 ? "0 12px 28px -5px rgba(99, 102, 241, 0.45)" : "none",
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner size={17} />
                        <span>{t("ggVerifying", "Authorizing Pass...")}</span>
                      </>
                    ) : (
                      <>
                        <MdVerified size={18} />
                        <span>{t("ggVerifyBtn", "Authorize & Validate Pass")}</span>
                        <MdArrowForward size={16} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 select-none">
                    <MdOutlineKeyboard size={14} className="text-indigo-500" />
                    <span>Press [Enter ↵] to verify • Second scan marks visitor EXIT</span>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-semibold transition-all ${
                      success
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        success
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {success ? <MdCheckCircle size={20} /> : <MdWarning size={20} />}
                    </div>
                    <div className="flex-1 leading-snug">{message}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Last scan chip */}
              {lastScan && !message && (
                <div
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold ${
                    lastScan.isExit
                      ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300"
                      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  <MdCheckCircle size={16} />
                  <span>
                    {lastScan.isExit
                      ? t("ggExitRecorded", "Visitor EXIT recorded")
                      : t("ggEntryRecorded", "Visitor ENTRY recorded")}
                    {lastScan.name ? ` • ${lastScan.name}` : ""}
                  </span>
                </div>
              )}

              {/* Parking Slot Selection Modal / Panel */}
              {showSlots && (
                <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <MdLocalParking size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {t("ggSelectSlot", "Assign Visitor Parking Slot")}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("ggGuestParkingNeeded", "Visitor requires allocated parking bay")}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400">
                      {normalizePassCode(code) || code}
                    </span>
                  </div>

                  {/* Vehicle Type Switcher */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleType("CAR")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        vehicleType === "CAR"
                          ? "border-indigo-600 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      <MdDirectionsCar size={16} />
                      <span>{t("ggCar", "Car")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVehicleType("BIKE")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        vehicleType === "BIKE"
                          ? "border-indigo-600 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      <MdTwoWheeler size={16} />
                      <span>{t("ggBike", "Bike")}</span>
                    </button>
                  </div>

                  {/* Slot Grid */}
                  {slots.length === 0 ? (
                    <div className="py-5 text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                      <MdLocalParking size={24} className="mx-auto opacity-30 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500">
                        {t("ggNoSlots", { type: vehicleType === "CAR" ? t("ggCar", "Car") : t("ggBike", "Bike") }, `No ${vehicleType.toLowerCase()} slots available.`)}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot === slot.slot_number;
                        return (
                          <button
                            key={slot.id || slot.slot_number}
                            type="button"
                            onClick={() => setSelectedSlot(slot.slot_number)}
                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold scale-102"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                            }`}
                          >
                            <span className="text-xs font-bold font-mono">
                              {slot.slot_number}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {slot.floor_number ? t("ggFloor", { floor: slot.floor_number }, `Fl ${slot.floor_number}`) : t("ggAvailable", "Available")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Slot Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlots(false);
                        setSelectedSlot(null);
                        setMessage("");
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                    >
                      {t("ggCancel", "Cancel")}
                    </button>

                    <button
                      type="button"
                      onClick={confirmWithSlot}
                      disabled={loading || !selectedSlot}
                      className="flex-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      {loading ? (
                        <>
                          <Spinner size={14} />
                          <span>{t("ggConfirming", "Confirming...")}</span>
                        </>
                      ) : (
                        <>
                          <MdCheckCircle size={16} />
                          <span>{t("ggConfirm", "Confirm Entry")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Quick Entry Shortcuts (ADJUSTED DIRECTLY BELOW VERIFY GATEPASS) */}
          <div className="rounded-3xl p-4 sm:p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-indigo-500/15 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-3 transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <MdFlashOn size={14} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {t("quickGatePasses", "Quick Entry Shortcuts")}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                No pass code? Direct check-in
              </span>
            </div>

            {/* 4 Sleek Horizontal Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Guest Entry */}
              <Link
                to="/guard/guest-entry"
                className="group p-3 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 via-blue-500/4 to-transparent hover:from-blue-500/15 hover:border-blue-500/40 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <MdPersonAdd size={16} />
                  </div>
                  <MdArrowForward size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t("vlsGuest", "Guest Entry")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    Visitors & family
                  </span>
                </div>
              </Link>

              {/* Delivery Entry */}
              <Link
                to="/guard/delivery-entry"
                className="group p-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-emerald-500/4 to-transparent hover:from-emerald-500/15 hover:border-emerald-500/40 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                    <MdLocalShipping size={16} />
                  </div>
                  <MdArrowForward size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {t("delivery", "Delivery")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    Parcels & courier
                  </span>
                </div>
              </Link>

              {/* Cab / Taxi Entry */}
              <Link
                to="/guard/cab-entry"
                className="group p-3 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-amber-500/4 to-transparent hover:from-amber-500/15 hover:border-amber-500/40 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/30 group-hover:scale-110 transition-transform">
                    <MdLocalTaxi size={16} />
                  </div>
                  <MdArrowForward size={14} className="text-amber-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {t("cab", "Cab Entry")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    Uber, Ola & rides
                  </span>
                </div>
              </Link>

              {/* Visitor Logs */}
              <Link
                to="/guard/visitorlogs"
                className="group p-3 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/8 via-purple-500/4 to-transparent hover:from-purple-500/15 hover:border-purple-500/40 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs shadow-purple-500/30 group-hover:scale-110 transition-transform">
                    <MdFormatListBulleted size={16} />
                  </div>
                  <MdArrowForward size={14} className="text-purple-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {t("visitorLog", "Visitor Logs")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    Full gate history
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Full-Height Live Recent Gate Activity Stream (Equal Height to the Two Left Sections) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-0">
          <div className="rounded-3xl p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-indigo-500/15 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col flex-1 h-full min-h-0 space-y-3.5 transition-all">
            {/* Live Feed Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">
                    {t("recentGateActivity", "Live Gate Activity")}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time gate movements</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchRecentLogs}
                  disabled={logsLoading}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Refresh activity feed"
                >
                  <MdRefresh size={16} className={logsLoading ? "animate-spin text-indigo-500" : ""} />
                </button>

                <Link
                  to="/guard/visitorlogs"
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Open full visitor logs"
                >
                  <MdOpenInNew size={15} />
                </Link>
              </div>
            </div>

            {/* Quick Filter Segmented Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 text-[11px] font-bold">
              {[
                { id: "ALL", label: "All Movements" },
                { id: "IN", label: "Inside" },
                { id: "OUT", label: "Exited" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLogFilter(tab.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    logFilter === tab.id
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Activity Stream List - Only show the records that fit cleanly */}
            <div className="flex-1 flex flex-col justify-start space-y-2 min-h-0 overflow-hidden">
              {displayedLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {logsLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size={15} />
                      <span>Loading logs...</span>
                    </div>
                  ) : (
                    <span>No recent entries found for this filter.</span>
                  )}
                </div>
              ) : (
                displayedLogs.map((log) => {
                  const flatNum = log.flat?.flat_number || log.Flat?.flat_number || log.flat_number || "—";
                  const dt = formatDateTime(log.entry_time);
                  const isOut = Boolean(log.exit_time);
                  const purpose = String(log.purpose || "VISITOR").toUpperCase();

                  // Color-coded purpose pill
                  let badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                  if (purpose.includes("DELIVER")) badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                  else if (purpose.includes("CAB") || purpose.includes("TAXI")) badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                  else if (purpose.includes("SERVICE") || purpose.includes("HELP")) badgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900/80 transition-all shadow-2xs flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {log.visitor_name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badgeColor}`}>
                            {log.purpose || "Visitor"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                            <MdApartment size={12} className="text-indigo-500" />
                            <span>{flatNum}</span>
                          </span>
                          {dt && <span>{dt.time}</span>}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <MdLogout size={12} />
                            <span>EXIT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <MdLogin size={12} />
                            <span>INSIDE</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* View More Option: Anchored to Bottom, Redirects to /guard/visitorlogs */}
            <Link
              to="/guard/visitorlogs"
              className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-2.5 rounded-2xl hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <MdFormatListBulleted size={14} />
                </div>
                <span>View More Activity</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <span>All Visitor Logs</span>
                <MdArrowForward size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}