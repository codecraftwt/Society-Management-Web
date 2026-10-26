import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
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
  MdFlashOn,
  MdOpenInNew,
  MdShield,
  MdBuild,
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

function formatDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return {
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  };
}

const fetchVisitorLogs = async () => {
  const res = await API.get("/visitors?page=1&limit=10");
  const list = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.visitors || [];
  return list.slice(0, 10);
};

const getPurposeMeta = (purpose) => {
  const value = String(purpose || "VISITOR").toUpperCase();
  const label = purpose || "Visitor";

  if (value.includes("DELIVER")) {
    return {
      label,
      icon: MdLocalShipping,
      color: "#10b981",
      soft: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
    };
  }
  if (value.includes("CAB") || value.includes("TAXI")) {
    return {
      label,
      icon: MdLocalTaxi,
      color: "#f59e0b",
      soft: "rgba(245, 158, 11, 0.13)",
      border: "rgba(245, 158, 11, 0.32)",
    };
  }
  if (value.includes("SERVICE") || value.includes("HELP")) {
    return {
      label,
      icon: MdBuild,
      color: "#a05aff",
      soft: "rgba(160, 90, 255, 0.13)",
      border: "rgba(160, 90, 255, 0.32)",
    };
  }
  return {
    label,
    icon: MdPersonAdd,
    color: "#3b82f6",
    soft: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
  };
};

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
    setLogsLoading(true);
    try {
      setRecentLogs(await fetchVisitorLogs());
    } catch {
      // Non-blocking
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRecentLogs = async () => {
      try {
        const logs = await fetchVisitorLogs();
        if (!cancelled) setRecentLogs(logs);
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    };

    loadRecentLogs();
    return () => {
      cancelled = true;
    };
  }, []);

  const activityCounts = useMemo(() => {
    const inside = recentLogs.filter((log) => !log.exit_time).length;
    return {
      all: recentLogs.length,
      inside,
      exited: recentLogs.length - inside,
    };
  }, [recentLogs]);

  const filteredLogs = useMemo(() => {
    if (logFilter === "IN") return recentLogs.filter((l) => !l.exit_time);
    if (logFilter === "OUT") return recentLogs.filter((l) => Boolean(l.exit_time));
    return recentLogs;
  }, [recentLogs, logFilter]);

  // Keep the feed compact so the activity panel aligns with the left column.
  const displayedLogs = useMemo(() => filteredLogs.slice(0, 4), [filteredLogs]);

  const quickActions = useMemo(
    () => [
      {
        id: "guest",
        to: "/guard/guest-entry",
        icon: MdPersonAdd,
        title: t("vlsGuest", "Guest Entry"),
        subtitle: "Visitors & family",
        color: "#3b82f6",
        soft: "rgba(59, 130, 246, 0.12)",
      },
      {
        id: "delivery",
        to: "/guard/delivery-entry",
        icon: MdLocalShipping,
        title: t("delivery", "Delivery"),
        subtitle: "Parcels & courier",
        color: "#10b981",
        soft: "rgba(16, 185, 129, 0.12)",
      },
      {
        id: "cab",
        to: "/guard/cab-entry",
        icon: MdLocalTaxi,
        title: t("cab", "Cab Entry"),
        subtitle: "Uber, Ola & rides",
        color: "#f59e0b",
        soft: "rgba(245, 158, 11, 0.13)",
      },
      {
        id: "logs",
        to: "/guard/visitorlogs",
        icon: MdFormatListBulleted,
        title: t("visitorLog", "Visitor Logs"),
        subtitle: "Full gate history",
        color: "#a05aff",
        soft: "rgba(160, 90, 255, 0.13)",
      },
    ],
    [t]
  );

  const fetchSlots = useCallback(async (type) => {
    try {
      const res = await API.get(`/parking-slots/available?vehicle_type=${type}`);
      setSlots(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setSlots([]);
    }
  }, []);

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
        detail.push(
          t(
            "ggAllowedTimeText",
            { count: res.data.dwell_minutes },
            `Allowed: ${res.data.dwell_minutes}m`
          )
        );
      }
      if (res.data?.dailyLimit) {
        detail.push(
          t(
            "ggDailyUsageText",
            { used: res.data.usesToday ?? 0, limit: res.data.dailyLimit },
            `Daily: ${res.data.usesToday ?? 0}/${res.data.dailyLimit}`
          )
        );
      }
      setMessage(
        [res.data?.message || t("ggVerifiedSuccess", "GatePass verified successfully!"), ...detail]
          .filter(Boolean)
          .join(" • ")
      );
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
        setSelectedSlot(null);
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
        detail.push(
          t(
            "ggAllowedTimeText",
            { count: res.data.dwell_minutes },
            `Allowed: ${res.data.dwell_minutes}m`
          )
        );
      }
      if (res.data?.dailyLimit) {
        detail.push(
          t(
            "ggDailyUsageText",
            { used: res.data.usesToday ?? 0, limit: res.data.dailyLimit },
            `Daily: ${res.data.usesToday ?? 0}/${res.data.dailyLimit}`
          )
        );
      }
      setMessage(
        [
          res.data?.message ||
            t("ggEntryConfirmSuccess", "Entry confirmed with assigned parking slot!"),
          ...detail,
        ]
          .filter(Boolean)
          .join(" • ")
      );
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
      setLastScan({
        isExit: res.data?.scan_type === "exit",
        name: res.data?.visitor_name || null,
      });
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

  const triggerKeyPress = useCallback(
    (key) => {
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
    },
    [maxDigits]
  );

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

  // Global physical keyboard listener for laptops, desktops & barcode scanners
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
    <div className="gpv-page max-w-[1240px] mx-auto space-y-4 pb-6 pt-0 animate-fadeIn">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="gpv-header-icon shrink-0">
            <MdShield size={24} />
          </div>
          <div className="min-w-0">
            <p className="gpv-eyebrow">{t("gateSecurity", "Security Gate")}</p>
            <h1 className="gpv-title mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              {t("ggTitle", "Verify GatePass")}
            </h1>
            <p className="gpv-sub mt-0.5 text-xs sm:text-[13px]">
              {t("ggSubtitle", "Scan or enter a resident-issued pass code")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="gpv-status">
            <span className="gpv-status-dot" />
            {t("ggTerminalActive", "Security Gate Terminal Active")}
          </span>
          <span className="gpv-secure-badge">
            <MdShield size={13} />
            SECURE
          </span>
        </div>
      </div>

      {/* ── MAIN DASHBOARD GRID ── */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN: verification console + quick entry shortcuts */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          {/* 1. Verification card */}
          <section className="gpv-surface relative overflow-hidden rounded-3xl">
            <div className="gpv-topline" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[var(--accent)] opacity-[0.06] blur-3xl" />

            <div className="relative space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="gpv-icon-tile shrink-0">
                    <MdQrCodeScanner size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="gpv-title text-sm font-extrabold sm:text-base">
                      {t("ggPlaceholder", "Enter GatePass Code")}
                    </h2>
                    <p className="gpv-sub mt-0.5 text-[11px] sm:text-xs">
                      {t("ggTypeCodeHint", "Type 6 digits, scan QR barcode, or paste")}
                    </p>
                  </div>
                </div>

                <span className="gpv-secure-badge">
                  <MdVerified size={13} />
                  {t("ggTerminalActive", "Security Gate Terminal Active")}
                </span>
              </div>

              {!showSlots && (
                <div className="space-y-3.5">
                  <div className="gpv-scan-panel rounded-2xl p-3.5 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="gpv-scan-kicker">PASS CODE</p>
                        <p className="gpv-sub mt-0.5 text-[11px]">
                          {t("ggAskVisitorHint", "Enter the 6-digit code shown on the resident pass.")}
                        </p>
                      </div>

                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePasteClipboard}
                          className="gpv-ctrl"
                          title="Paste from clipboard"
                        >
                          <MdContentPaste size={14} />
                          <span>Paste</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowKeypad((value) => !value)}
                          className={`gpv-ctrl ${showKeypad ? "gpv-ctrl--active" : ""}`}
                          title="Toggle touch numpad"
                          aria-pressed={showKeypad}
                        >
                          <MdDialpad size={14} />
                          <span>Keypad</span>
                        </button>

                        {cleanCode.length > 0 && (
                          <button
                            type="button"
                            onClick={() => triggerKeyPress("clear")}
                            className="gpv-ctrl gpv-ctrl--danger"
                            title={t("ggClearCode", "Clear code")}
                            aria-label={t("ggClearCode", "Clear code")}
                          >
                            <MdClear size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => inputRef.current?.focus()}
                      className="gpv-digits cursor-text select-none"
                      role="group"
                      aria-label="Gate pass code"
                    >
                      <div className="gpv-prefix">GP-</div>

                      {Array.from({ length: maxDigits }).map((_, idx) => {
                        const char = cleanCode[idx] || "";
                        const isCurrent = cleanCode.length === idx;
                        const isFilled = Boolean(char);

                        return (
                          <div
                            key={idx}
                            className={`gpv-digit ${
                              isFilled
                                ? "gpv-digit--filled"
                                : isCurrent
                                  ? "gpv-digit--active"
                                  : ""
                            }`}
                          >
                            {char ||
                              (isCurrent ? (
                                <Motion.span
                                  animate={{ opacity: [0, 1, 0] }}
                                  transition={{ repeat: Infinity, duration: 1 }}
                                  className="h-1 w-2.5 rounded-full bg-[var(--accent)]"
                                />
                              ) : (
                                <span className="gpv-digit-dot" />
                              ))}
                          </div>
                        );
                      })}

                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        maxLength={maxDigits}
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, "").slice(0, maxDigits))
                        }
                        onKeyDown={(e) => e.key === "Enter" && !showSlots && verifyPass()}
                        disabled={showSlots}
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Gate pass code digits"
                        className="pointer-events-none absolute h-px w-px opacity-0"
                      />
                    </div>

                    <div className="gpv-hint mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <MdOutlineKeyboard size={13} className="text-[var(--accent)]" />
                        {t("ggPressEnter", "Press Enter to verify")}
                      </span>
                      <span className="gpv-hint-dot" />
                      <span>{t("ggSecondScanOut", "Second scan marks visitor OUT")}</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showKeypad && (
                      <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="gpv-keypad mx-auto">
                          <div className="grid grid-cols-3 gap-1.5">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => triggerKeyPress(num)}
                                className={`gpv-key ${
                                  activeKey === num ? "gpv-key--active" : ""
                                }`}
                              >
                                {num}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => triggerKeyPress("clear")}
                              className="gpv-key gpv-key--danger"
                              title={t("ggClearCode", "Clear")}
                              aria-label={t("ggClearCode", "Clear")}
                            >
                              <MdClear size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerKeyPress("0")}
                              className={`gpv-key ${
                                activeKey === "0" ? "gpv-key--active" : ""
                              }`}
                            >
                              0
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerKeyPress("backspace")}
                              className="gpv-key gpv-key--warn"
                              title="Backspace"
                              aria-label="Backspace"
                            >
                              <MdBackspace size={17} />
                            </button>
                          </div>
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={verifyPass}
                    disabled={loading || cleanCode.length < 6}
                    className="gpv-verify group"
                  >
                    {loading ? (
                      <>
                        <Spinner size={17} />
                        <span>{t("ggVerifying", "Verifying...")}</span>
                      </>
                    ) : (
                      <>
                        <MdVerified size={18} />
                        <span>{t("ggVerifyBtn", "Verify GatePass")}</span>
                        <MdArrowForward
                          size={16}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Status banner */}
              <AnimatePresence>
                {message && (
                  <Motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    role="status"
                    aria-live="polite"
                    className={`gpv-alert ${
                      success ? "gpv-alert--ok" : "gpv-alert--warn"
                    }`}
                  >
                    <div
                      className={`gpv-alert-icon ${
                        success ? "gpv-alert-icon--ok" : "gpv-alert-icon--warn"
                      }`}
                    >
                      {success ? <MdCheckCircle size={19} /> : <MdWarning size={19} />}
                    </div>
                    <div className="flex-1 leading-snug">{message}</div>
                  </Motion.div>
                )}
              </AnimatePresence>

              {/* Last scan receipt */}
              {lastScan && !message && (
                <div
                  className={`gpv-alert ${
                    lastScan.isExit ? "gpv-alert--info" : "gpv-alert--ok"
                  }`}
                >
                  <div
                    className={`gpv-alert-icon ${
                      lastScan.isExit ? "gpv-alert-icon--info" : "gpv-alert-icon--ok"
                    }`}
                  >
                    <MdCheckCircle size={18} />
                  </div>
                  <span>
                    {lastScan.isExit
                      ? t("ggExitRecorded", "Visitor EXIT recorded")
                      : t("ggEntryRecorded", "Visitor ENTRY recorded")}
                    {lastScan.name ? ` • ${lastScan.name}` : ""}
                  </span>
                </div>
              )}

              {/* Parking slot selection */}
              {showSlots && (
                <div className="gpv-scan-panel mt-1 space-y-3.5 rounded-2xl p-3.5 animate-fadeIn sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="gpv-icon-tile">
                        <MdLocalParking size={17} />
                      </div>
                      <div>
                        <h4 className="gpv-title text-xs font-extrabold sm:text-sm">
                          {t("ggSelectSlot", "Select vehicle type and parking slot")}
                        </h4>
                        <p className="gpv-sub mt-0.5 text-[11px]">
                          {t("ggGuestParkingNeeded", "This guest requires an available parking bay.")}
                        </p>
                      </div>
                    </div>

                    <span className="gpv-code-chip">{normalizePassCode(code) || code}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVehicleType("CAR");
                        setSelectedSlot(null);
                        fetchSlots("CAR");
                      }}
                      className={`gpv-choice ${
                        vehicleType === "CAR" ? "gpv-choice--active" : ""
                      }`}
                    >
                      <MdDirectionsCar size={16} />
                      <span>{t("ggCar", "Car")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVehicleType("BIKE");
                        setSelectedSlot(null);
                        fetchSlots("BIKE");
                      }}
                      className={`gpv-choice ${
                        vehicleType === "BIKE" ? "gpv-choice--active" : ""
                      }`}
                    >
                      <MdTwoWheeler size={16} />
                      <span>{t("ggBike", "Bike")}</span>
                    </button>
                  </div>

                  {slots.length === 0 ? (
                    <div className="gpv-empty-slots">
                      <MdLocalParking size={24} className="mb-1 opacity-40" />
                      <p>
                        {t(
                          "ggNoSlots",
                          { type: vehicleType === "CAR" ? t("ggCar", "Car") : t("ggBike", "Bike") },
                          `No ${vehicleType.toLowerCase()} slots available.`
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot === slot.slot_number;
                        return (
                          <button
                            key={slot.id || slot.slot_number}
                            type="button"
                            onClick={() => setSelectedSlot(slot.slot_number)}
                            className={`gpv-slot ${isSelected ? "gpv-slot--active" : ""}`}
                          >
                            <span className="font-mono text-xs font-bold">{slot.slot_number}</span>
                            <span className="gpv-sub text-[10px]">
                              {slot.floor_number
                                ? t(
                                    "ggFloor",
                                    { floor: slot.floor_number },
                                    `Fl ${slot.floor_number}`
                                  )
                                : t("ggAvailable", "Available")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlots(false);
                        setSelectedSlot(null);
                        setMessage("");
                      }}
                      className="gpv-secondary-btn flex-1"
                    >
                      {t("ggCancel", "Cancel")}
                    </button>

                    <button
                      type="button"
                      onClick={confirmWithSlot}
                      disabled={loading || !selectedSlot}
                      className="gpv-confirm-btn flex-[1.4]"
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
          </section>

          {/* 2. Quick entry shortcuts */}
          <section className="gpv-surface rounded-3xl p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="gpv-icon-tile">
                  <MdFlashOn size={16} />
                </div>
                <div>
                  <h4 className="gpv-title text-xs font-extrabold uppercase tracking-wider">
                    {t("quickGatePasses", "Quick Entry Shortcuts")}
                  </h4>
                  <p className="gpv-sub mt-0.5 text-[10px]">
                    No pass code? Direct check-in
                  </p>
                </div>
              </div>

              <Link
                to="/guard/visitorlogs"
                className="gpv-sub flex items-center gap-1 text-[11px] font-bold transition-colors hover:text-[var(--accent)]"
              >
                <span>{t("visitorLog", "Visitor Logs")}</span>
                <MdArrowForward size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.id}
                    to={action.to}
                    style={{ "--gpv-c": action.color, "--gpv-soft": action.soft }}
                    className="gpv-quick-card group rounded-2xl p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="gpv-quick-icon shrink-0">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="gpv-title truncate text-xs font-bold sm:text-[13px]">
                          {action.title}
                        </p>
                        <p className="gpv-sub truncate text-[10px] sm:text-[11px]">
                          {action.subtitle}
                        </p>
                      </div>
                      <MdArrowForward size={15} className="gpv-quick-arrow shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: live gate activity */}
        <aside className="min-w-0 lg:col-span-5">
          <div className="gpv-surface flex h-full flex-col rounded-3xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--divider)] pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="gpv-live-badge">
                  <span className="gpv-live-dot" />
                  LIVE
                </span>
                <div className="min-w-0">
                  <h4 className="gpv-title truncate text-sm font-extrabold">
                    {t("recentGateActivity", "Live Gate Activity")}
                  </h4>
                  <p className="gpv-sub mt-0.5 truncate text-[11px]">
                    Real-time gate movements
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchRecentLogs}
                  disabled={logsLoading}
                  className="gpv-icon-btn"
                  title="Refresh activity feed"
                  aria-label="Refresh activity feed"
                >
                  <MdRefresh
                    size={16}
                    className={logsLoading ? "animate-spin text-[var(--accent)]" : ""}
                  />
                </button>

                <Link
                  to="/guard/visitorlogs"
                  className="gpv-icon-btn"
                  title="Open full visitor logs"
                  aria-label="Open full visitor logs"
                >
                  <MdOpenInNew size={15} />
                </Link>
              </div>
            </div>

            <div className="gpv-tabs mt-3">
              {[
                { id: "ALL", label: "All", count: activityCounts.all },
                { id: "IN", label: "Inside", count: activityCounts.inside },
                { id: "OUT", label: "Exited", count: activityCounts.exited },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLogFilter(tab.id)}
                  className={`gpv-tab ${logFilter === tab.id ? "gpv-tab--active" : ""}`}
                >
                  <span>{tab.label}</span>
                  <span className="gpv-tab-count">{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              {displayedLogs.length === 0 ? (
                <div className="flex min-h-[250px] flex-1 flex-col items-center justify-center px-4 text-center">
                  <div className="gpv-empty-icon">
                    {logsLoading ? <Spinner size={20} /> : <MdFormatListBulleted size={22} />}
                  </div>
                  <p className="gpv-title text-xs font-bold">
                    {logsLoading ? "Loading activity..." : "No recent activity"}
                  </p>
                  <p className="gpv-sub mt-1 text-[11px]">
                    {logsLoading
                      ? "Fetching the latest gate movements."
                      : "New visitor entries and exits will appear here."}
                  </p>
                </div>
              ) : (
                displayedLogs.map((log, index) => {
                  const meta = getPurposeMeta(log.purpose);
                  const Icon = meta.icon;
                  const flatNum =
                    log.flat?.flat_number || log.Flat?.flat_number || log.flat_number || "—";
                  const dt = formatDateTime(log.entry_time);
                  const isOut = Boolean(log.exit_time);

                  return (
                    <Motion.div
                      key={log.id ?? index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="gpv-row flex items-center justify-between gap-2.5 p-2.5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div
                          className="gpv-activity-icon shrink-0"
                          style={{
                            color: meta.color,
                            background: meta.soft,
                            borderColor: meta.border,
                          }}
                        >
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="gpv-title truncate text-xs font-bold sm:text-[13px]">
                              {log.visitor_name || "Visitor"}
                            </span>
                            <span
                              className="truncate rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{
                                color: meta.color,
                                background: meta.soft,
                                borderColor: meta.border,
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold">
                            <span className="gpv-flat-chip">
                              <MdApartment size={11} className="text-[var(--accent)]" />
                              <span>{flatNum}</span>
                            </span>
                            {dt && (
                              <>
                                <span className="gpv-hint-dot" />
                                <span className="gpv-sub inline-flex items-center gap-1">
                                  <MdAccessTime size={10} />
                                  {dt.time}
                                </span>
                                <span className="gpv-sub hidden xl:inline">{dt.date}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`gpv-status-chip ${
                          isOut ? "gpv-status-chip--out" : "gpv-status-chip--in"
                        }`}
                      >
                        {isOut ? <MdLogout size={11} /> : <MdLogin size={11} />}
                        <span>{isOut ? "EXIT" : "INSIDE"}</span>
                      </span>
                    </Motion.div>
                  );
                })
              )}
            </div>

            <Link
              to="/guard/visitorlogs"
              className="gpv-footer-link mt-auto"
            >
              <span className="flex items-center gap-2">
                <span className="gpv-icon-tile gpv-icon-tile--sm">
                  <MdFormatListBulleted size={13} />
                </span>
                <span>View More Activity</span>
              </span>
              <span className="flex items-center gap-1 text-[10px]">
                <span className="gpv-sub">All Visitor Logs</span>
                <MdArrowForward
                  size={13}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
