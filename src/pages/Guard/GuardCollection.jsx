import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import {
  MdChevronLeft,
  MdChevronRight,
  MdOutlineInventory2,
  MdOutlineDoorFront,
  MdVerified,
  MdClose,
  MdMarkEmailRead,
} from "react-icons/md";
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

const EMPTY_COUNTS = { EXPECTED: 0, AT_GATE: 0, COLLECTED: 0, CANCELLED: 0, ALL: 0 };

export default function GuardCollection() {
  const { t } = useLang();

  const [parcels, setParcels] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
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

  const shiftCount = (prev, from, to) => {
    const next = { ...prev };
    if (from && next[from] !== undefined) next[from] = Math.max(0, (next[from] || 0) - 1);
    if (to && next[to] !== undefined) next[to] = (next[to] || 0) + 1;
    return next;
  };

  const loadData = useCallback(async (pg = 1, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const res = await API.get(`/parcels?page=${pg}&limit=${LIMIT}`);
      const data = res.data;
      setParcels(Array.isArray(data) ? data : data?.data || []);
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      const c = data?.counts || {};
      setCounts({
        EXPECTED: c.EXPECTED ?? 0,
        AT_GATE: c.AT_GATE ?? 0,
        COLLECTED: c.COLLECTED ?? 0,
        CANCELLED: c.CANCELLED ?? 0,
        ALL: c.ALL ?? data?.pagination?.totalItems ?? 0,
      });
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
      setCounts((prev) => ({
        ...prev,
        ALL: (prev.ALL || 0) + 1,
        [parcel.status]: (prev[parcel.status] || 0) + 1,
      }));
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
      setParcels((prev) => {
        const existing = prev.find((x) => x.id === updated.id);
        if (existing && existing.status !== updated.status) {
          setCounts((c) => shiftCount(c, existing.status, updated.status));
        }
        return prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x));
      });
    };

    const onCollected = (updated) => {
      setParcels((prev) => {
        const existing = prev.find((x) => x.id === updated.id);
        if (existing && existing.status !== "COLLECTED") {
          setCounts((c) => shiftCount(c, existing.status, "COLLECTED"));
        }
        return prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x));
      });
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
      setCounts((c) => shiftCount(c, "EXPECTED", "AT_GATE"));

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

  const verifyAndCollect = async (id, otpOverride) => {
    if (collectingId) return;

    const otpValue = String(otpOverride ?? otpInputs[id] ?? "")
      .replace(/\D/g, "")
      .slice(0, 4);

    if (otpValue.length !== 4) {
      toast.warning(t("gcOtpRequired") || "Please enter a valid 4-digit OTP");
      return;
    }

    setButtonClickedId(id);
    setVerifyingId(id);
    setCollectingId(id);

    try {
      await API.put(`/parcels/${id}/status`, {
        status: "COLLECTED",
        pickup_code: otpValue,
      });

      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "COLLECTED" } : p))
      );
      setCounts((c) => shiftCount(c, "AT_GATE", "COLLECTED"));
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
    } finally {
      setCollectingId(null);
      setVerifyingId(null);
      setButtonClickedId(null);
    }
  };

  const handleOtpChange = (id, value) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4);
    setOtpInputs((prev) => ({ ...prev, [id]: cleanValue }));
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

  return (
    <div className="gc-page">

      {/* ── HERO ── */}
      <div className="gc-hero">
        <div className="gc-hero-top">
          <div className="gc-hero-icon">
            <MdOutlineInventory2 />
          </div>
          <div>
            <h2 className="gc-hero-title">{t("gcTitle")}</h2>
            <p className="gc-hero-sub">{t("gcSubtitle")}</p>
          </div>
          <div className="gc-hero-total">
            <b>{counts.ALL}</b>
            <span>{t("gcTotalParcels", "Total parcels")}</span>
          </div>
        </div>

        <div className="gc-hero-counts">
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--expect" />
            {t("gcCountExpected", "Expected")}
            <b>{counts.EXPECTED}</b>
          </div>
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--gate" />
            {t("gcCountAtGate", "At gate")}
            <b>{counts.AT_GATE}</b>
          </div>
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--done" />
            {t("gcCountCollected", "Collected")}
            <b>{counts.COLLECTED}</b>
          </div>
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--cancel" />
            {t("gcCountCancelled", "Cancelled")}
            <b>{counts.CANCELLED}</b>
          </div>
        </div>
      </div>

      {initialLoad ? (
        <div className="gc-loading">
          <Spinner size={24} />
          <p>{t("gcLoading")}</p>
        </div>

      ) : parcels.length === 0 ? (
        <div className="gc-empty">
          <MdOutlineInventory2 size={40} />
          <p>{t("gcEmpty")}</p>
        </div>

      ) : (
        <>
          {fetching && (
            <div className="gc-fetching">
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
              if (p.status === "CANCELLED") progressWidth = "100%";

              const pillClass =
                p.status === "EXPECTED"
                  ? "gc-pill--expected"
                  : p.status === "AT_GATE"
                  ? "gc-pill--atgate"
                  : p.status === "COLLECTED"
                  ? "gc-pill--collected"
                  : "gc-pill--cancelled";

              const accentClass =
                p.status === "EXPECTED"
                  ? "gc-accent--expect"
                  : p.status === "AT_GATE"
                  ? "gc-accent--gate"
                  : p.status === "COLLECTED"
                  ? "gc-accent--done"
                  : "gc-accent--cancel";

              const fillClass = isCancelled
                ? "gc-fill--cancel"
                : p.status === "COLLECTED"
                ? "gc-fill--done"
                : p.status === "AT_GATE"
                ? "gc-fill--active"
                : "";

              const stepIcons = [
                <MdOutlineInventory2 key="s0" />,
                <MdOutlineDoorFront key="s1" />,
                isCancelled ? <MdClose key="s2" /> : <MdVerified key="s2" />,
              ];

              const stepLabels = [
                t("gcStepExpected"),
                t("gcStepAtGate"),
                isCancelled ? t("gcStepCancelled") : t("gcStepCollected"),
              ];

              return (
                <div
                  key={p.id}
                  className="gc-card"
                  style={{
                    transform: isClicked ? "scale(0.997)" : undefined,
                    opacity: isVerifying ? 0.85 : 1,
                    transition: "transform 0.15s ease, opacity 0.2s ease",
                  }}
                >
                  <span className={`gc-card-accent ${accentClass}`} />

                  <div className="gc-card-inner">
                    {/* ── HEAD ── */}
                    <div className="gc-head">
                      <div className="gc-head-icon">
                        <MdOutlineInventory2 />
                      </div>
                      <div className="gc-head-text">
                        <h3 className="gc-head-title">{p.courier_name}</h3>
                        <div className="gc-flat-chip">
                          <MdMarkEmailRead />
                          {t("gcFlat")}: {p.Flat?.Floor?.Block?.name} › {t("gcFloor")} {p.Flat?.Floor?.floor_number} › {p.Flat?.flat_number}
                        </div>
                      </div>
                      <span className={`gc-pill ${pillClass}`}>
                        <span className="gc-pill-dot" />
                        {p.status}
                      </span>
                    </div>

                    {/* ── PREMIUM STEPPER ── */}
                    <div className="gc-stepper">
                      <div className="gc-stepper-rail">
                        <div
                          className={`gc-stepper-fill ${fillClass}`}
                          style={{ width: progressWidth }}
                        />
                      </div>

                      <div className="gc-step-row">
                        {stepIcons.map((icon, index) => {
                          const stepNo = index + 1;
                          const done = isCancelled ? stepNo < 3 : step > stepNo;
                          const active = !isCancelled && step === stepNo;
                          const cancelledHere = isCancelled && stepNo === 3;
                          return (
                            <div key={index} className="gc-step">
                              <div
                                className={`gc-step-dot ${
                                  done
                                    ? "gc-step-dot--done"
                                    : active
                                    ? "gc-step-dot--active"
                                    : cancelledHere
                                    ? "gc-step-dot--cancel"
                                    : ""
                                }`}
                              >
                                {done ? <MdVerified /> : icon}
                              </div>
                              <span
                                className={`gc-step-label ${
                                  done
                                    ? "gc-step-label--done"
                                    : active
                                    ? "gc-step-label--active"
                                    : cancelledHere
                                    ? "gc-step-label--cancel"
                                    : ""
                                }`}
                              >
                                {stepLabels[index]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── EXPECTED → Mark Arrived ── */}
                    {p.status === "EXPECTED" && (
                      <button
                        onClick={() => markArrived(p.id)}
                        disabled={processingId === p.id || actionTimeoutRef.current[p.id]}
                        className="gc-btn gc-btn--warn"
                      >
                        {processingId === p.id ? (
                          <>
                            <Spinner size={16} />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <MdOutlineDoorFront />
                            <span>{t("gcMarkArrived")}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* ── AT_GATE → OTP verify ── */}
                    {p.status === "AT_GATE" && (
                      <div className="gc-otp-wrap">
                        {isVerifying && (
                          <div className="gc-verify-banner">
                            <Spinner size={16} />
                            <span>{t("gcVerifyOtp", "Verifying OTP...")}</span>
                          </div>
                        )}

                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={t("gcOtpPlaceholder") || "Enter 4-digit OTP"}
                          value={otpInputs[p.id] || ""}
                          disabled={collectingId === p.id}
                          onChange={(e) => handleOtpChange(p.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && otpInputs[p.id]?.length === 4) {
                              verifyAndCollect(p.id, otpInputs[p.id]);
                            }
                          }}
                          className="gc-otp-input"
                          maxLength={4}
                          autoComplete="off"
                        />

                        <button
                          onClick={() => verifyAndCollect(p.id, otpInputs[p.id])}
                          disabled={collectingId === p.id || !otpInputs[p.id] || otpInputs[p.id].length !== 4}
                          className="gc-btn gc-btn--success"
                        >
                          {collectingId === p.id ? (
                            isVerifying ? (
                              <>
                                <Spinner size={18} />
                                <span>{t("gcVerifyOtp", "Verifying OTP...")}</span>
                              </>
                            ) : (
                              <>
                                <Spinner size={18} />
                                <span>Collecting...</span>
                              </>
                            )
                          ) : (
                            <>
                              <MdVerified />
                              <span>{t("gcVerifyCollect") || "Verify & Collect"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {p.status === "COLLECTED" && (
                      <div className="gc-done-banner">
                        {t("gcCollectedMsg")} <MdVerified />
                      </div>
                    )}

                    {p.status === "CANCELLED" && (
                      <div className="gc-cancel-banner">
                        {t("gcCancelledMsg")} <MdClose />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination footer ── */}
          <div
            className="gc-footer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}
          >
            <span className="gc-footer-shown">
              Showing{" "}
              <strong>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
              </strong>{" "}
              of{" "}
              <strong>{totalItems}</strong>{" "}
              parcels
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>
      )}
    </div>
  );
}