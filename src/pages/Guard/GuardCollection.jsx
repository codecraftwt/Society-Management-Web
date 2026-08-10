import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { toast } from "react-toastify";

/* ── Spinner ── */
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
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="pagination-ellipsis">...</span>
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
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

const LIMIT = 5;

export default function GuardCollection() {
  const { t } = useLang();

  const [parcels, setParcels] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [otpInputs, setOtpInputs] = useState({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ✅ Better loading state management
  const [processingId, setProcessingId] = useState(null);
  const [collectingId, setCollectingId] = useState(null);
  
  // ✅ New: Visual feedback states
  const [verifyingId, setVerifyingId] = useState(null);
  const [buttonClickedId, setButtonClickedId] = useState(null);
  
  // ✅ Prevent rapid clicks
  const actionTimeoutRef = useRef({});

  const loadData = useCallback(async (pg = 1, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const res = await API.get(`/parcels?page=${pg}&limit=${LIMIT}`);
      const data = res.data;
      setParcels(Array.isArray(data) ? data : data?.data || []);
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load parcels");
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadData(1, true);
  }, [loadData]);

  /* ── Real-time socket listeners ── */
  useEffect(() => {
    const onCreated = (parcel) => {
      setParcels((prev) => {
        if (prev.find((p) => p.id === parcel.id)) return prev;
        setTotalItems((c) => c + 1);
        if (page === 1) {
          const updated = [parcel, ...prev];
          return updated.slice(0, LIMIT);
        }
        return prev;
      });
    };

    const onUpdated = (updated) => {
      setParcels((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    };

    const onCollected = (updated) => {
      setParcels((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    };

    socket.on("parcel_created", onCreated);
    socket.on("parcel_updated", onUpdated);
    socket.on("parcel_collected", onCollected);

    return () => {
      socket.off("parcel_created", onCreated);
      socket.off("parcel_updated", onUpdated);
      socket.off("parcel_collected", onCollected);
    };
  }, [page]);

  const handlePageChange = (pg) => loadData(pg);

  // ✅ IMPROVED: Mark arrived with instant feedback
  const markArrived = async (id) => {
    // ✅ Prevent double-click
    if (processingId || actionTimeoutRef.current[id]) {
      console.log("⚠️ Action already in progress for parcel", id);
      return;
    }
    
    try {
      // ✅ Instant visual feedback
      setButtonClickedId(id);
      setProcessingId(id);
      
      // ✅ Set timeout lock
      actionTimeoutRef.current[id] = setTimeout(() => {
        delete actionTimeoutRef.current[id];
      }, 2000);
      
      // ✅ Optimistic update
      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "AT_GATE" } : p))
      );

      await API.put(`/parcels/${id}/status`, { status: "AT_GATE" });
      toast.success("Parcel marked as arrived");
      
    } catch (err) {
      console.error("❌ Mark arrived failed:", err);
      
      if (err.response?.status === 403 && err.response?.data?.message?.includes("shift")) {
        toast.warning(t("gcNotOnShift") || "You are not on shift. Please check your active shift.");
      } else {
        toast.error(t("gcError") || "An error occurred. Please try again.");
      }
      
      // ✅ Rollback
      loadData(page);
      
    } finally {
      setProcessingId(null);
      setTimeout(() => setButtonClickedId(null), 500); // Clear visual feedback
    }
  };

  // ✅ IMPROVED: Verify and collect with multi-stage feedback
  const verifyAndCollect = async (id) => {
    // ✅ Prevent double-click
    if (collectingId || actionTimeoutRef.current[id]) {
      console.log("⚠️ Collection already in progress for parcel", id);
      return;
    }

    const otpValue = otpInputs[id]?.trim();
    
    // ✅ Validate OTP immediately
    if (!otpValue || otpValue.length !== 4) {
      toast.warning(t("gcOtpRequired") || "Please enter a valid 4-digit OTP");
      return;
    }
    
    try {
      // ✅ Stage 1: Button clicked - instant feedback
      setButtonClickedId(id);
      
      // ✅ Stage 2: Start verifying (after 100ms to show click animation)
      setTimeout(() => {
        setVerifyingId(id);
      }, 100);
      
      setCollectingId(id);
      
      // ✅ Set timeout lock
      actionTimeoutRef.current[id] = setTimeout(() => {
        delete actionTimeoutRef.current[id];
      }, 3000); // Longer timeout for verification
      
      // ✅ Optimistic update
      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "COLLECTED" } : p))
      );

      await API.put(`/parcels/${id}/status`, {
        status: "COLLECTED",
        pickup_code: otpValue,
      });
      
      // ✅ Success feedback
      setOtpInputs((prev) => ({ ...prev, [id]: "" }));
      toast.success("✅ Parcel collected successfully!");
      
    } catch (err) {
      console.error("❌ Collect failed:", err);
      
      if (err.response?.status === 403 && err.response?.data?.message?.includes("shift")) {
        toast.warning(t("gcNotOnShift") || "You are not on shift. Please check your active shift.");
      } else if (err.response?.status === 400) {
        toast.error("❌ " + (t("gcInvalidOtp") || "Invalid OTP. Please try again."));
      } else {
        toast.error(t("gcError") || "An error occurred. Please try again.");
      }
      
      // ✅ Rollback
      loadData(page);
      
    } finally {
      setCollectingId(null);
      setVerifyingId(null);
      setTimeout(() => setButtonClickedId(null), 500);
    }
  };

  // ✅ Auto-submit on 4-digit OTP entry
  const handleOtpChange = (id, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);
    setOtpInputs((prev) => ({ ...prev, [id]: cleanValue }));
    
    // ✅ Auto-submit when 4 digits entered
    if (cleanValue.length === 4 && !collectingId) {
      setTimeout(() => {
        verifyAndCollect(id);
      }, 300); // Small delay for better UX
    }
  };

  // ✅ Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(actionTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const getStep = (status) => {
    if (status === "EXPECTED")  return 1;
    if (status === "AT_GATE")   return 2;
    if (status === "COLLECTED") return 3;
    if (status === "CANCELLED") return 3;
    return 1;
  };

  const getStatusStyle = (status) => {
    if (status === "COLLECTED") return "bg-green-500/20 text-green-400";
    if (status === "AT_GATE")   return "bg-yellow-500/20 text-yellow-400";
    if (status === "EXPECTED")  return "bg-blue-500/20 text-blue-400";
    if (status === "CANCELLED") return "bg-red-500/20 text-red-400";
    return "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("gcTitle")}</h2>
        <p className="text-sm text-white/60">
          {t("gcSubtitle")} — {totalItems} total
        </p>
      </div>

      {initialLoad ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 20px" }}>
          <Spinner size={24} />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("gcLoading")}</p>
        </div>

      ) : parcels.length === 0 ? (
        <p className="text-white/60">{t("gcEmpty")}</p>

      ) : (
        <>
          {fetching && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <Spinner size={16} />
            </div>
          )}

          <div className="space-y-5">
            {parcels.map((p) => {
              const step = getStep(p.status);
              const isCancelled = p.status === "CANCELLED";
              const isVerifying = verifyingId === p.id;
              const isClicked = buttonClickedId === p.id;

              let progressWidth = "0%";
              if (p.status === "AT_GATE")   progressWidth = "50%";
              if (p.status === "COLLECTED") progressWidth = "100%";
              if (p.status === "CANCELLED") progressWidth = "50%";

              const timelineLabels = [
                t("gcStepExpected"),
                t("gcStepAtGate"),
                isCancelled ? t("gcStepCancelled") : t("gcStepCollected"),
              ];

              return (
                <div
                  key={p.id}
                  className="bg-card border border-white/10 rounded-2xl p-5 shadow-md space-y-4 transition-all"
                  style={{
                    transform: isClicked ? 'scale(0.995)' : 'scale(1)',
                    opacity: isVerifying ? 0.8 : 1,
                  }}
                >
                  {/* Header */}
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{p.courier_name}</h3>
                      <p className="text-sm text-white/60">
  {t("gcFlat")}: {p.Flat?.Floor?.Block?.name} › {t("gcFloor")} {p.Flat?.Floor?.floor_number} › {p.Flat?.flat_number}
</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="relative flex items-center justify-between">
                    <div className="absolute top-3 left-0 right-0 h-1 bg-white/10" />
                    <div
                      className="absolute top-3 left-0 h-1 bg-green-500 transition-all duration-500"
                      style={{ width: progressWidth }}
                    />
                    {isCancelled && (
                      <div
                        className="absolute top-3 left-1/2 h-1 bg-red-500 transition-all duration-500"
                        style={{ width: "50%" }}
                      />
                    )}
                    {timelineLabels.map((label, index) => (
                      <div key={index} className="flex flex-col items-center z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                          ${
                            index + 1 === 3
                              ? isCancelled
                                ? "bg-red-500 text-white"
                                : p.status === "COLLECTED"
                                ? "bg-green-500 text-white"
                                : "bg-white/20 text-white/50"
                              : step >= index + 1
                              ? "bg-green-500 text-white"
                              : "bg-white/20 text-white/50"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-xs mt-1 text-white/70">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* EXPECTED → Mark Arrived */}
                  {p.status === "EXPECTED" && (
                    <button
                      onClick={() => markArrived(p.id)}
                      disabled={processingId === p.id || actionTimeoutRef.current[p.id]}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95 font-medium"
                    >
                      {processingId === p.id ? (
                        <>
                          <Spinner size={16} />
                          <span>Processing...</span>
                        </>
                      ) : (
                        t("gcMarkArrived")
                      )}
                    </button>
                  )}

                  {/* AT_GATE → OTP verify */}
                  {p.status === "AT_GATE" && (
                    <div className="space-y-3">
                      {/* ✅ Verification status indicator */}
                      {isVerifying && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2 animate-pulse">
                          <Spinner size={16} />
                          <span className="text-sm text-blue-400 font-medium">
                            🔐 Verifying OTP...
                          </span>
                        </div>
                      )}
                      
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={t("gcOtpPlaceholder") || "Enter 4-digit OTP"}
                        value={otpInputs[p.id] || ""}
                        disabled={collectingId === p.id}
                        onChange={(e) => handleOtpChange(p.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && otpInputs[p.id]?.length === 4) {
                            verifyAndCollect(p.id);
                          }
                        }}
                        className="input text-center tracking-widest text-lg font-bold transition-all focus:ring-2 focus:ring-green-500"
                        maxLength={4}
                        autoComplete="off"
                      />
                      
                      <button
                        onClick={() => verifyAndCollect(p.id)}
                        disabled={collectingId === p.id || !otpInputs[p.id] || otpInputs[p.id].length !== 4 || actionTimeoutRef.current[p.id]}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all transform active:scale-95 font-medium shadow-lg"
                      >
                        {collectingId === p.id ? (
                          isVerifying ? (
                            <>
                              <Spinner size={18} />
                              <span>🔐 Verifying OTP...</span>
                            </>
                          ) : (
                            <>
                              <Spinner size={18} />
                              <span>Collecting...</span>
                            </>
                          )
                        ) : (
                          <>
                            <span>✅ {t("gcVerifyCollect") || "Verify & Collect"}</span>
                            {otpInputs[p.id]?.length === 4 && (
                              <span className="text-xs opacity-75">(or press Enter)</span>
                            )}
                          </>
                        )}
                      </button>
                      
                      {/* ✅ Helper text */}
                      <p className="text-xs text-center text-white/50">
                        Auto-submits when you enter 4 digits
                      </p>
                    </div>
                  )}

                  {p.status === "COLLECTED" && (
                    <div className="text-center text-green-400 font-semibold py-2 bg-green-500/10 rounded-lg">
                      {t("gcCollectedMsg")} ✅
                    </div>
                  )}

                  {p.status === "CANCELLED" && (
                    <div className="text-center text-red-400 font-semibold py-2 bg-red-500/10 rounded-lg">
                      {t("gcCancelledMsg")} ❌
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination footer */}
          <div
            className="table-footer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 16 }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Showing{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>{" "}
              parcels
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>
      )}
    </div>
  );
}