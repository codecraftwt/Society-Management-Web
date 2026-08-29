
import { useEffect, useState, useRef, useContext, useCallback } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd,
  MdLocalShipping,
  MdOutlineInbox,
  MdOutlineInventory2,
  MdOutlineDoorFront,
  MdClose,
  MdVerified,
  MdQrCode,
  MdHome,
} from "react-icons/md";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import { QRCodeCanvas } from "qrcode.react";

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

function getFloorNumber(item) {
  const flatObj = item?.Flat || item;
  return (
    flatObj?.floor_number ??
    flatObj?.Floor?.floor_number ??
    item?.floor_number ??
    null
  );
}

function buildFlatLabel(item) {
  if (!item) return "";
  const flatObj = item.Flat || item;
  const block = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
  const unit = flatObj?.flat_number || item?.flat_number || "";
  const floor = getFloorNumber(item);
  const parts = [];
  if (block) parts.push(block);
  if (unit) parts.push(`Unit ${unit}`);
  if (floor !== null && floor !== undefined) parts.push(`Floor ${floor}`);
  return parts.join(" · ");
}

export default function MyCollection() {
  const { t } = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ courier_name: "" });

  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const submitTimeoutRef = useRef(null);

  const [myFlats, setMyFlats] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [checkingFlat, setCheckingFlat] = useState(true);

  const isOwner = authUser?.resident_type === "OWNER";
  const eligibleFlats = myFlats.filter((item) => {
    const flatObj = item.Flat || item;
    if (isOwner && flatObj.occupancy_status === "RENTED") return false;
    return true;
  });
  const hasEligibleFlat = eligibleFlats.length > 0;

  const [parcelFlatMap, setParcelFlatMap] = useState({});

  useEffect(() => {
    if (!authUser?.id) return;

    const fetchProperties = async () => {
      try {
        let flatsArr = [];

        try {
          const res = await API.get(`/users/${authUser.id}/memberships`);
          const payload = res.data?.data || res.data;
          if (Array.isArray(payload) && payload.length > 0) {
            flatsArr = payload;
          } else if (payload?.all && Array.isArray(payload.all)) {
            flatsArr = payload.all;
          }
        } catch (err) {
          console.warn("[MyCollection] Attempt 1 FAILED:", err.message);
        }

        if (flatsArr.length === 0) {
          try {
            const res = await API.get("/users/get-flat");
            const payload = res.data?.data || res.data;
            if (Array.isArray(payload)) {
              flatsArr = payload;
            } else if (payload && typeof payload === "object") {
              if (payload.units && Array.isArray(payload.units)) flatsArr = payload.units;
              else if (payload.flats && Array.isArray(payload.flats)) flatsArr = payload.flats;
              else if (payload.flat_number || payload.Flat) flatsArr = [payload];
            }
          } catch (err2) {
            console.warn("[MyCollection] Attempt 2 FAILED:", err2.message);
          }
        }

        setMyFlats(flatsArr);

        if (flatsArr.length > 0 && !selectedFlatId) {
          const first = flatsArr[0];
          const fId = first.flat_id || first.id || first.Flat?.id;
          setSelectedFlatId(fId ? String(fId) : "");
        }
      } catch (error) {
        console.error("[MyCollection] Critical error fetching properties:", error);
      } finally {
        setCheckingFlat(false);
      }
    };

    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const fetchParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/parcels");
      const list = res.data?.data;
      const arr = Array.isArray(list) ? list : [];
      setParcels(arr);

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

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

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

    socket.on("parcel_created", onCreated);
    socket.on("parcel_updated", onUpdated);
    socket.on("parcel_collected", onUpdated);
    socket.on("parcel_otp", onOtp);

    return () => {
      socket.off("parcel_created", onCreated);
      socket.off("parcel_updated", onUpdated);
      socket.off("parcel_collected", onUpdated);
      socket.off("parcel_otp", onOtp);
    };
  }, []);

  const expectParcel = async (e) => {
    e.preventDefault();

    if (submitting || submitTimeoutRef.current) {
      console.log("⚠️ Submit already in progress");
      return;
    }

    if (isOwner && myFlats.length > 1 && !selectedFlatId) {
      toast.error("Please select a unit for this parcel.");
      return;
    }

    try {
      setSubmitting(true);

      submitTimeoutRef.current = setTimeout(() => {
        submitTimeoutRef.current = null;
      }, 2000);

      const chosenFlat =
        myFlats.find((item) => {
          const fId = item.flat_id || item.id || item.Flat?.id;
          return String(fId) === String(selectedFlatId);
        }) || myFlats[0];
      const chosenFlatLabel = buildFlatLabel(chosenFlat);

      const tempId = `temp_${Date.now()}`;
      const optimisticParcel = {
        id: tempId,
        courier_name: form.courier_name,
        status: "EXPECTED",
        entry_time: new Date().toISOString(),
        pickup_code: null,
        Flat: null,
        resident: null,
        _flatLabel: chosenFlatLabel,
      };

      setParcels((prev) => [optimisticParcel, ...prev]);
      if (chosenFlatLabel) {
        setParcelFlatMap((prev) => ({ ...prev, [tempId]: chosenFlatLabel }));
      }

      const courierName = form.courier_name;
      setForm({ courier_name: "" });
      setShowModal(false);

      const payload = { courier_name: courierName };
      if (isOwner && selectedFlatId) {
        payload.flat_id = selectedFlatId;
      }

      const res = await API.post("/parcels", payload);
      const realParcel = res.data;

      setParcels((prev) => prev.map((p) => (p.id === tempId ? realParcel : p)));

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
    total: parcels.length,
    expected: parcels.filter((p) => p.status === "EXPECTED").length,
    atGate: parcels.filter((p) => p.status === "AT_GATE").length,
    collected: parcels.filter((p) => p.status === "COLLECTED").length,
    cancelled: parcels.filter((p) => p.status === "CANCELLED").length,
  };

  useEffect(() => {
    if (isOwner && myFlats.length === 1) {
      const first = myFlats[0];
      const fId = first.flat_id || first.id || first.Flat?.id;
      if (fId) setSelectedFlatId(String(fId));
    }
  }, [isOwner, myFlats]);

  const getStep = (status) => {
    if (status === "EXPECTED") return 1;
    if (status === "AT_GATE") return 2;
    if (status === "COLLECTED") return 3;
    if (status === "CANCELLED") return 3;
    return 1;
  };

  const pillClass = (status) =>
    status === "EXPECTED"
      ? "gc-pill--expected"
      : status === "AT_GATE"
      ? "gc-pill--atgate"
      : status === "COLLECTED"
      ? "gc-pill--collected"
      : "gc-pill--cancelled";

  const accentClass = (status) =>
    status === "EXPECTED"
      ? "gc-accent--expect"
      : status === "AT_GATE"
      ? "gc-accent--gate"
      : status === "COLLECTED"
      ? "gc-accent--done"
      : "gc-accent--cancel";

  const statusLabel = (status) => {
    if (status === "EXPECTED") return t("parcelExpected");
    if (status === "AT_GATE") return t("parcelAtGate");
    if (status === "COLLECTED") return t("parcelCollected");
    if (status === "CANCELLED") return t("parcelCancelled");
    return status;
  };

  return (
    <div className="gc-page">
      <div className="gc-hero">
        <div className="gc-hero-top">
          <div className="gc-hero-icon">
            <MdOutlineInventory2 />
          </div>
          <div>
            <h2 className="gc-hero-title">{t("parcelTitle")}</h2>
            <p className="gc-hero-sub">{t("parcelSubtitle")}</p>
          </div>
          <div className="gc-hero-actions">
            <div className="gc-hero-total">
              <b>{counts.total}</b>
              <span>{t("parcelStatTotal")}</span>
            </div>
            <button
              onClick={() => hasEligibleFlat && setShowModal(true)}
              className="gc-btn gc-btn--accent gc-btn--compact"
              disabled={submitting || checkingFlat || !hasEligibleFlat}
            >
              <MdAdd size={18} /> {t("parcelExpectBtn")}
            </button>
          </div>
        </div>

        <div className="gc-hero-counts">
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--expect" />
            {t("parcelExpected")}
            <b>{counts.expected}</b>
          </div>
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--gate" />
            {t("parcelAtGate")}
            <b>{counts.atGate}</b>
          </div>
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--done" />
            {t("parcelCollected")}
            <b>{counts.collected}</b>
          </div>
          <div className="gc-count-chip">
            <span className="gc-count-dot gc-count-dot--cancel" />
            {t("parcelCancelled")}
            <b>{counts.cancelled}</b>
          </div>
        </div>
      </div>

      {!checkingFlat && !hasEligibleFlat && (
        <div className="gc-warn">
          ⚠️{" "}
          {isOwner && myFlats.length > 0
            ? "Owners cannot manage parcels for rented units."
            : t("compNoFlat") || "No unit associated with your account. Please contact admin."}
        </div>
      )}

      {loading ? (
        <div className="gc-loading">
          <Spinner size={24} />
          <p>{t("parcelLoading")}</p>
        </div>
      ) : parcels.length === 0 ? (
        <div className="gc-empty">
          <MdOutlineInbox size={40} />
          <p>{t("parcelEmpty")}</p>
          <button
            onClick={() => hasEligibleFlat && setShowModal(true)}
            disabled={!hasEligibleFlat}
            className="gc-btn gc-btn--accent gc-btn--compact"
          >
            <MdAdd size={16} /> {t("parcelExpectBtn")}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {parcels.map((p) => {
            const isCancelled = p.status === "CANCELLED";
            const isTempParcel = String(p.id).startsWith("temp_");
            const step = getStep(p.status);
            const flatLabel =
              (p.Flat ? buildFlatLabel({ Flat: p.Flat }) : null) ||
              parcelFlatMap[p.id] ||
              p._flatLabel ||
              null;

            let progressWidth = "0%";
            if (p.status === "AT_GATE") progressWidth = "50%";
            if (p.status === "COLLECTED") progressWidth = "100%";
            if (p.status === "CANCELLED") progressWidth = "100%";

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
              t("parcelExpected"),
              t("parcelAtGate"),
              isCancelled ? t("parcelCancelled") : t("parcelCollected"),
            ];

            return (
              <div key={p.id} className={`gc-card ${isTempParcel ? "opacity-70" : ""}`}>
                <span className={`gc-card-accent ${accentClass(p.status)}`} />

                <div className="gc-card-inner">
                  <div className="gc-head">
                    <div className="gc-head-icon">
                      {isTempParcel ? <Spinner size={18} /> : <MdLocalShipping />}
                    </div>
                    <div className="gc-head-text">
                      <h3 className="gc-head-title">
                        {p.courier_name}
                        {isTempParcel && (
                          <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.7, marginLeft: 8 }}>
                            (Creating...)
                          </span>
                        )}
                      </h3>
                      {p.entry_time && (
                        <p className="gc-hero-sub" style={{ marginTop: 4 }}>
                          {new Date(p.entry_time).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {flatLabel && (
                        <div className="gc-flat-chip">
                          <MdHome />
                          {flatLabel}
                        </div>
                      )}
                    </div>
                    <span className={`gc-pill ${pillClass(p.status)}`}>
                      <span className="gc-pill-dot" />
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  <div className="gc-stepper">
                    <div className="gc-stepper-rail">
                      <div className={`gc-stepper-fill ${fillClass}`} style={{ width: progressWidth }} />
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

                  {p.status === "EXPECTED" && (
                    <div className="gc-waiting">
                      {t("parcelWaiting", "Waiting for the parcel to arrive at the gate")}
                    </div>
                  )}

                  {p.status === "AT_GATE" && p.pickup_code && (
                    <div className="gc-otp-show">
                      <div className="gc-otp-show-left">
                        <div className="gc-otp-qr">
                          <QRCodeCanvas value={String(p.pickup_code)} size={88} />
                        </div>
                        <div>
                          <p className="gc-otp-show-label">
                            <MdQrCode size={16} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                            {t("parcelOtpLabel")}
                          </p>
                          <p className="gc-otp-show-hint">
                            {t("parcelOtpSubtitle") || "Show this QR at the gate to collect your parcel"}
                          </p>
                        </div>
                      </div>
                      <p className="gc-otp-code">{p.pickup_code}</p>
                    </div>
                  )}

                  {p.status === "COLLECTED" && (
                    <div className="gc-done-banner">
                      {t("parcelDelivered")} <MdVerified />
                    </div>
                  )}

                  {p.status === "CANCELLED" && (
                    <div className="gc-cancel-banner">
                      {t("parcelCancelledBanner")} <MdClose />
                    </div>
                  )}

                  {p.status === "AT_GATE" && !isTempParcel && (
                    <button
                      onClick={() => cancelParcel(p.id)}
                      disabled={cancellingId === p.id}
                      className="gc-btn gc-btn--danger"
                    >
                      {cancellingId === p.id ? (
                        <>
                          <Spinner size={16} />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <MdClose />
                          <span>{t("parcelCancelBtn")}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => !submitting && setShowModal(false)}
        title={t("parcelModalTitle")}
      >
        <form onSubmit={expectParcel} className="space-y-4">
          {isOwner && eligibleFlats.length > 1 && (
            <div>
              <label className="text-xs text-secondary block mb-1.5">
                Select Unit <span style={{ color: "var(--stat-red-color)" }}>*</span>
              </label>
              <Select
                className="input h-11 w-full"
                style={{ cursor: "pointer" }}
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="" disabled>
                  -- Choose the delivery unit --
                </option>
                {eligibleFlats.map((item, index) => {
                  const flatObj = item.Flat || item;
                  const fId = item.flat_id || flatObj.id || `fallback-${index}`;
                  const bName = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
                  const fNum = flatObj?.flat_number || item?.flat_number || "";
                  const floorNum = getFloorNumber(item);
                  const floor = floorNum !== null && floorNum !== undefined ? `(Floor ${floorNum})` : "";
                  return (
                    <option key={fId} value={String(fId)}>
                      {bName ? `${bName} - ` : ""}Unit {fNum} {floor}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

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
              <span>
                Parcel for:{" "}
                <strong style={{ color: "var(--text-primary)" }}>{buildFlatLabel(eligibleFlats[0])}</strong>
              </span>
            </div>
          )}

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
            className="gc-btn gc-btn--accent"
          >
            {submitting ? (
              <>
                <Spinner size={16} />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <MdLocalShipping />
                <span>{t("parcelSubmitBtn")}</span>
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
