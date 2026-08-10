

import { useEffect, useState, useRef, useContext, useCallback } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdLocalShipping, MdOutlineInbox,
  MdClose, MdCheckCircle, MdCancel, MdQrCode, MdHome,
} from "react-icons/md";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";

/* ── Spinner ── */
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-accent mx-auto" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Timeline step dot ── */
function StepDot({ active, cancelled, label, index }) {
  return (
    <div className="flex flex-col items-center z-10 gap-1.5">
      <div className={`parcel-step-dot ${
        cancelled ? "parcel-step-dot--cancelled"
        : active   ? "parcel-step-dot--active"
        :            "parcel-step-dot--idle"
      }`}>
        {cancelled ? "✕" : active ? "✓" : index + 1}
      </div>
      <span className={`parcel-step-label ${
        cancelled ? "parcel-step-label--cancelled"
        : active   ? "parcel-step-label--active"
        :            "parcel-step-label--idle"
      }`}>
        {label}
      </span>
    </div>
  );
}

/* ── Flat badge chip shown on each parcel card ── */
function FlatChip({ label }) {
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: "var(--chip-bg, rgba(99,102,241,0.12))",
        color: "var(--accent, #6366f1)",
        border: "1px solid var(--accent-border, rgba(99,102,241,0.25))",
        flexShrink: 0,
      }}
    >
      <MdHome size={11} />
      {label}
    </span>
  );
}

/* ── Helper: resolve floor number from various nesting shapes ── */
function getFloorNumber(item) {
  const flatObj = item?.Flat || item;
  return (
    flatObj?.floor_number     ??
    flatObj?.Floor?.floor_number ??
    item?.floor_number        ??
    null
  );
}

/* ── Helper: build a short display label for a flat item ── */
function buildFlatLabel(item) {
  if (!item) return "";
  const flatObj = item.Flat || item;
  const block   = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
  const unit    = flatObj?.flat_number || item?.flat_number || "";
  const floor   = getFloorNumber(item);
  const parts   = [];
  if (block)                              parts.push(block);
  if (unit)                               parts.push(`Unit ${unit}`);
  if (floor !== null && floor !== undefined) parts.push(`Floor ${floor}`);
  return parts.join(" · ");
}

export default function MyCollection() {
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [parcels,    setParcels]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState({ courier_name: "" });

  const [submitting,   setSubmitting]   = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const submitTimeoutRef = useRef(null);

  // ── Flat / unit state (mirrors ResidentComplaints) ──
  const [myFlats,        setMyFlats]        = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [hasFlat,        setHasFlat]        = useState(false);
  const [checkingFlat,   setCheckingFlat]   = useState(true);

  const isOwner = authUser?.resident_type === "OWNER";
  const eligibleFlats = myFlats.filter(item => {
    const flatObj = item.Flat || item;
    if (isOwner && flatObj.occupancy_status === "RENTED") return false;
    return true;
  });
  const hasEligibleFlat = eligibleFlats.length > 0;

  // ── Map parcel id → flat label for display ──
  // (populated from parcel data itself when available, or from selected flat at creation time)
  const [parcelFlatMap, setParcelFlatMap] = useState({});

  const STATUS_CONFIG = {
    EXPECTED:  { label: t("parcelExpected"),  cls: "parcel-badge parcel-badge--expected"  },
    AT_GATE:   { label: t("parcelAtGate"),    cls: "parcel-badge parcel-badge--atgate"    },
    COLLECTED: { label: t("parcelCollected"), cls: "parcel-badge parcel-badge--collected" },
    CANCELLED: { label: t("parcelCancelled"), cls: "parcel-badge parcel-badge--cancelled" },
  };

  // ── Fetch flats (same dual-attempt pattern as ResidentComplaints) ──
  useEffect(() => {
    if (!authUser?.id) return;

    const fetchProperties = async () => {
      try {
        let flatsArr = [];

        // Attempt 1: memberships endpoint
        try {
          const res     = await API.get(`/users/${authUser.id}/memberships`);
          const payload = res.data?.data || res.data;
          if (Array.isArray(payload) && payload.length > 0) {
            flatsArr = payload;
          } else if (payload?.all && Array.isArray(payload.all)) {
            flatsArr = payload.all;
          }
        } catch (err) {
          console.warn("[MyCollection] Attempt 1 FAILED:", err.message);
        }

        // Attempt 2: get-flat fallback
        if (flatsArr.length === 0) {
          try {
            const res     = await API.get("/users/get-flat");
            const payload = res.data?.data || res.data;
            if (Array.isArray(payload)) {
              flatsArr = payload;
            } else if (payload && typeof payload === "object") {
              if (payload.units && Array.isArray(payload.units))       flatsArr = payload.units;
              else if (payload.flats && Array.isArray(payload.flats))  flatsArr = payload.flats;
              else if (payload.flat_number || payload.Flat)            flatsArr = [payload];
            }
          } catch (err2) {
            console.warn("[MyCollection] Attempt 2 FAILED:", err2.message);
          }
        }

        setMyFlats(flatsArr);
        setHasFlat(flatsArr.length > 0);

        if (flatsArr.length > 0 && !selectedFlatId) {
          const first = flatsArr[0];
          const fId   = first.flat_id || first.id || first.Flat?.id;
          setSelectedFlatId(fId ? String(fId) : "");
        }
      } catch (error) {
        console.error("[MyCollection] Critical error fetching properties:", error);
        setHasFlat(false);
      } finally {
        setCheckingFlat(false);
      }
    };

    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // ── Fetch parcels ──
  const fetchParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await API.get("/parcels");
      const list = res.data?.data;
      const arr  = Array.isArray(list) ? list : [];
      setParcels(arr);

      // Seed parcelFlatMap from server data if flat info is embedded
      const map = {};
      arr.forEach((p) => {
        if (p.flat_id && p.Flat) {
          map[p.id] = buildFlatLabel({ Flat: p.Flat, flat_id: p.flat_id });
        } else if (p.flat_label) {
          map[p.id] = p.flat_label;
        }
      });
      setParcelFlatMap((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load parcels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParcels(); }, [fetchParcels]);

  /* ── Real-time socket listeners ── */
  useEffect(() => {
    const onCreated = (parcel) => {
      setParcels((prev) => {
        if (prev.find((p) => p.id === parcel.id)) return prev;
        const hasTempEntry = prev.some((p) => String(p.id).startsWith("temp_"));
        if (hasTempEntry) {
          return prev.map((p) =>
            String(p.id).startsWith("temp_") && p.courier_name === parcel.courier_name
              ? parcel
              : p
          );
        }
        return [parcel, ...prev];
      });
    };

    const onUpdated = (updated) => {
      setParcels((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    };

    const onOtp = ({ parcelId, otp }) => {
      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId ? { ...p, pickup_code: otp, status: "AT_GATE" } : p
        )
      );
    };

    socket.on("parcel_created",   onCreated);
    socket.on("parcel_updated",   onUpdated);
    socket.on("parcel_collected", onUpdated);
    socket.on("parcel_otp",       onOtp);

    return () => {
      socket.off("parcel_created",   onCreated);
      socket.off("parcel_updated",   onUpdated);
      socket.off("parcel_collected", onUpdated);
      socket.off("parcel_otp",       onOtp);
    };
  }, []);

  /* ── Expect parcel (with optimistic update + flat info) ── */
  const expectParcel = async (e) => {
    e.preventDefault();

    if (submitting || submitTimeoutRef.current) {
      console.log("⚠️ Submit already in progress");
      return;
    }

    // Owners with multiple flats must pick one
    if (isOwner && myFlats.length > 1 && !selectedFlatId) {
      toast.error("Please select a unit for this parcel.");
      return;
    }

    try {
      setSubmitting(true);

      submitTimeoutRef.current = setTimeout(() => {
        submitTimeoutRef.current = null;
      }, 2000);

      // Resolve the flat label to store optimistically
      const chosenFlat    = myFlats.find((item) => {
        const fId = item.flat_id || item.id || item.Flat?.id;
        return String(fId) === String(selectedFlatId);
      }) || myFlats[0];
      const chosenFlatLabel = buildFlatLabel(chosenFlat);

      // Optimistic entry
      const tempId           = `temp_${Date.now()}`;
      const optimisticParcel = {
        id:           tempId,
        courier_name: form.courier_name,
        status:       "EXPECTED",
        entry_time:   new Date().toISOString(),
        pickup_code:  null,
        Flat:         null,
        resident:     null,
        _flatLabel:   chosenFlatLabel,
      };

      setParcels((prev) => [optimisticParcel, ...prev]);
      if (chosenFlatLabel) {
        setParcelFlatMap((prev) => ({ ...prev, [tempId]: chosenFlatLabel }));
      }

      const courierName = form.courier_name;
      setForm({ courier_name: "" });
      setShowModal(false);

      // Build payload
      const payload = { courier_name: courierName };
      if (isOwner && selectedFlatId) {
        payload.flat_id = selectedFlatId;
      }

      const res = await API.post("/parcels", payload);
      const realParcel = res.data;

      // Replace optimistic with real
      setParcels((prev) => prev.map((p) => (p.id === tempId ? realParcel : p)));

      // Move flat label key from temp → real id
      setParcelFlatMap((prev) => {
        const next = { ...prev, [realParcel.id]: chosenFlatLabel };
        delete next[tempId];
        return next;
      });

      toast.success("Parcel expected successfully!");
    } catch (err) {
      console.error("❌ Parcel creation failed:", err);
      setParcels((prev) => prev.filter((p) => !String(p.id).startsWith("temp_")));
      setShowModal(true);
      toast.error(err.response?.data?.message || "Failed to create parcel");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Cancel parcel ── */
  const cancelParcel = async (id) => {
    if (cancellingId) return;
    try {
      setCancellingId(id);
      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "CANCELLED" } : p))
      );
      await API.put(`/parcels/${id}/status`, { status: "CANCELLED" });
      toast.success("Parcel cancelled");
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      toast.error(err.response?.data?.message || "Failed to cancel parcel");
      fetchParcels();
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

  const counts = {
    total:     parcels.length,
    expected:  parcels.filter((p) => p.status === "EXPECTED").length,
    atGate:    parcels.filter((p) => p.status === "AT_GATE").length,
    collected: parcels.filter((p) => p.status === "COLLECTED").length,
  };

  const statCards = [
    { label: t("parcelStatTotal"),  val: counts.total,     cls: "parcel-stat-total"     },
    { label: t("parcelExpected"),   val: counts.expected,  cls: "parcel-stat-expected"  },
    { label: t("parcelAtGate"),     val: counts.atGate,    cls: "parcel-stat-atgate"    },
    { label: t("parcelCollected"),  val: counts.collected, cls: "parcel-stat-collected" },
  ];

  // Reset selectedFlatId if owner has only one flat (auto-select it)
  useEffect(() => {
    if (isOwner && myFlats.length === 1) {
      const first = myFlats[0];
      const fId   = first.flat_id || first.id || first.Flat?.id;
      if (fId) setSelectedFlatId(String(fId));
    }
  }, [isOwner, myFlats]);

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t("parcelTitle")}</h2>
          <p className="text-secondary text-xs mt-0.5">{t("parcelSubtitle")}</p>
        </div>
        <button
          onClick={() => hasEligibleFlat && setShowModal(true)}
          className="btn-primary flex items-center gap-2"
          disabled={submitting || checkingFlat || !hasEligibleFlat}
        >
          <MdAdd size={18} /> {t("parcelExpectBtn")}
        </button>
      </div>

      {/* ── No-flat warning (mirrors ResidentComplaints) ── */}
      {!checkingFlat && !hasEligibleFlat && (
        <div style={{
          background: "var(--stat-amber-bg)",
          border: "1px solid var(--stat-amber-border)",
          borderRadius: 12,
          padding: "14px 16px",
          fontSize: 13,
          color: "var(--stat-amber-color)",
        }}>
          ⚠️ {isOwner && myFlats.length > 0 ? "Owners cannot manage parcels for rented units." : (t("compNoFlat") || "No unit associated with your account. Please contact admin.")}
        </div>
      )}

      {/* ── STAT STRIP ── */}
      {!loading && parcels.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
          {statCards.map((s) => (
            <div key={s.label} className={`parcel-stat-card ${s.cls}`}>
              <p className="parcel-stat-val">{s.val}</p>
              <p className="parcel-stat-label">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTENT ── */}
      {loading ? (
        <div className="bg-card p-12 flex flex-col items-center gap-3 text-secondary">
          <Spinner />
          <p className="text-sm">{t("parcelLoading")}</p>
        </div>

      ) : parcels.length === 0 ? (
        <div className="bg-card p-16 flex flex-col items-center gap-3 text-secondary animate-fadeIn">
          <MdOutlineInbox size={52} className="opacity-25" />
          <p className="text-sm">{t("parcelEmpty")}</p>
          <button onClick={() => hasEligibleFlat && setShowModal(true)} disabled={!hasEligibleFlat} className="btn-primary mt-1">
            <MdAdd size={16} /> {t("parcelExpectBtn")}
          </button>
        </div>

      ) : (
        <div className="space-y-4">
          {parcels.map((p, i) => {
            const isCancelled  = p.status === "CANCELLED";
            const cfg          = STATUS_CONFIG[p.status] || STATUS_CONFIG.EXPECTED;
            const isTempParcel = String(p.id).startsWith("temp_");

            // Resolve flat label: from server-embedded data, or our local map
            const flatLabel =
              (p.Flat ? buildFlatLabel({ Flat: p.Flat }) : null) ||
              parcelFlatMap[p.id] ||
              p._flatLabel ||
              null;

            let progressWidth = "0%";
            if (p.status === "AT_GATE")   progressWidth = "50%";
            if (p.status === "COLLECTED") progressWidth = "100%";
            if (p.status === "CANCELLED") progressWidth = "50%";

            const steps = [
              { label: t("parcelExpected"), active: true, cancelled: false },
              {
                label:     t("parcelAtGate"),
                active:    ["AT_GATE", "COLLECTED", "CANCELLED"].includes(p.status),
                cancelled: false,
              },
              {
                label:     isCancelled ? t("parcelCancelled") : t("parcelCollected"),
                active:    p.status === "COLLECTED" || p.status === "CANCELLED",
                cancelled: isCancelled,
              },
            ];

            const iconBubbleCls =
              p.status === "COLLECTED"   ? "parcel-icon-bubble--collected"
              : p.status === "AT_GATE"   ? "parcel-icon-bubble--atgate"
              : p.status === "CANCELLED" ? "parcel-icon-bubble--cancelled"
              :                            "parcel-icon-bubble--expected";

            const iconColorCls =
              p.status === "COLLECTED"   ? "parcel-icon--collected"
              : p.status === "AT_GATE"   ? "parcel-icon--atgate"
              : p.status === "CANCELLED" ? "parcel-icon--cancelled"
              :                            "parcel-icon--expected";

            return (
              <div
                key={p.id}
                className={`bg-card rounded-2xl overflow-hidden animate-fadeIn ${isTempParcel ? "opacity-70" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="p-5 space-y-5">

                  {/* ── card header ── */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 parcel-icon-bubble ${iconBubbleCls}`}>
                        {isTempParcel ? (
                          <Spinner />
                        ) : (
                          <MdLocalShipping size={20} className={iconColorCls} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base leading-tight">
                          {p.courier_name}
                          {isTempParcel && (
                            <span className="text-xs text-secondary ml-2">(Creating...)</span>
                          )}
                        </h3>
                        {p.entry_time && (
                          <p className="text-xs text-secondary mt-0.5">
                            {new Date(p.entry_time).toLocaleString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                        {/* ── Flat / unit chip ── */}
                        {flatLabel && (
                          <div className="mt-1">
                            <FlatChip label={flatLabel} />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* ── timeline ── */}
                  <div className="relative flex items-start justify-between px-2 pt-1">
                    <div className="parcel-track-base absolute top-3.5 left-4 right-4 h-0.5 rounded-full" />
                    <div
                      className="parcel-track-progress absolute top-3.5 left-4 h-0.5 rounded-full transition-all duration-700"
                      style={{ width: `calc(${progressWidth} - 2rem)` }}
                    />
                    {isCancelled && (
                      <div
                        className="parcel-track-cancelled absolute top-3.5 h-0.5 rounded-full transition-all duration-700"
                        style={{ left: "calc(50%)", right: "1rem" }}
                      />
                    )}
                    {steps.map((s, idx) => (
                      <StepDot
                        key={idx} index={idx} label={s.label}
                        active={s.active} cancelled={s.cancelled}
                      />
                    ))}
                  </div>

                  {/* ── OTP box ── */}
                  {p.status === "AT_GATE" && p.pickup_code && (
                    <div className="parcel-otp-box rounded-xl p-4 animate-scaleIn">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <MdQrCode size={18} className="parcel-icon--atgate" />
                          <p className="text-xs font-medium parcel-icon--atgate">{t("parcelOtpLabel")}</p>
                        </div>
                        <p className="parcel-otp-code text-3xl font-bold tracking-[0.3em] tabular-nums">
                          {p.pickup_code}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── collected banner ── */}
                  {p.status === "COLLECTED" && (
                    <div className="parcel-banner parcel-banner--collected rounded-xl px-4 py-3 flex items-center gap-2 animate-fadeIn">
                      <MdCheckCircle size={16} className="parcel-icon--collected shrink-0" />
                      <p className="text-sm font-medium parcel-icon--collected">{t("parcelDelivered")}</p>
                    </div>
                  )}

                  {/* ── cancelled banner ── */}
                  {p.status === "CANCELLED" && (
                    <div className="parcel-banner parcel-banner--cancelled rounded-xl px-4 py-3 flex items-center gap-2 animate-fadeIn">
                      <MdCancel size={16} className="parcel-icon--cancelled shrink-0" />
                      <p className="text-sm font-medium parcel-icon--cancelled">{t("parcelCancelledBanner")}</p>
                    </div>
                  )}

                  {/* ── cancel button ── */}
                  {p.status === "AT_GATE" && !isTempParcel && (
                    <button
                      onClick={() => cancelParcel(p.id)}
                      disabled={cancellingId === p.id}
                      className="w-full btn-danger flex items-center justify-center gap-2 rounded-xl py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {cancellingId === p.id ? (
                        <><Spinner /><span>Cancelling...</span></>
                      ) : (
                        <><MdClose size={16} /> {t("parcelCancelBtn")}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL ── */}
      <Modal
        isOpen={showModal}
        onClose={() => !submitting && setShowModal(false)}
        title={t("parcelModalTitle")}
      >
        <form onSubmit={expectParcel} className="space-y-4">

          {/* ── Unit selector — owners with multiple flats only ── */}
          {isOwner && eligibleFlats.length > 1 && (
            <div>
              <label className="text-xs text-secondary block mb-1.5">
                Select Unit <span style={{ color: "var(--stat-red-color)" }}>*</span>
              </label>
              <select
                className="input h-11 w-full"
                style={{ cursor: "pointer" }}
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="" disabled>-- Choose the delivery unit --</option>
                {eligibleFlats.map((item, index) => {
                  const flatObj  = item.Flat || item;
                  const fId      = item.flat_id || flatObj.id || `fallback-${index}`;
                  const bName    = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
                  const fNum     = flatObj?.flat_number || item?.flat_number || "";
                  const floorNum = getFloorNumber(item);
                  const floor    = floorNum !== null && floorNum !== undefined ? `(Floor ${floorNum})` : "";
                  return (
                    <option key={fId} value={String(fId)}>
                      {bName ? `${bName} - ` : ""}Unit {fNum} {floor}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* ── Single flat info (read-only chip) — owners with 1 flat or tenants ── */}
          {eligibleFlats.length === 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <MdHome size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>Parcel for: <strong style={{ color: "var(--text-primary)" }}>{buildFlatLabel(eligibleFlats[0])}</strong></span>
            </div>
          )}

          {/* ── Courier name ── */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">{t("parcelCourierLabel")}</label>
            <input
              className="input h-11 w-full"
              placeholder={t("parcelCourierPlaceholder")}
              required
              disabled={submitting}
              value={form.courier_name}
              onChange={(e) => setForm({ ...form, courier_name: e.target.value })}
              autoFocus={!(isOwner && eligibleFlats.length > 1)}
            />
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !form.courier_name.trim() ||
              (isOwner && eligibleFlats.length > 1 && !selectedFlatId)
            }
            className="btn-primary w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Spinner />
                <span>Creating...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MdLocalShipping size={17} />
                {t("parcelSubmitBtn")}
              </span>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}