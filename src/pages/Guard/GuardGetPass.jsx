import { useState, useEffect, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdVerified, MdVpnKey, MdCheckCircle, MdWarning,
} from "react-icons/md";
import SlidingTabs from "../../components/common/SlidingTabs";

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
    if (!code.trim()) return;
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/preapproval/verify", { code });
      setMessage(res.data.message);
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
    } catch (err) {
      const msg = err.response?.data?.message || t("ggVerifyFail");
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
    if (!selectedSlot) {
      setMessage(t("ggSelectSlotFirst"));
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/preapproval/verify", {
        code,
        slot_number: selectedSlot,
        vehicle_type: vehicleType,
      });
      setMessage(res.data.message);
      setSuccess(true);
      setCode("");
      setSelectedSlot(null);
      setShowSlots(false);
      setVehicleType("CAR");
    } catch (err) {
      const msg = err.response?.data?.message || t("ggVerifyFail");
      setSuccess(false);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (message && !success) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message, success]);

  return (
    <div className="gs-root gg-root page-root animate-fadeIn">
      <div className="gs-er">
        <div className="gs-er-left">
          <div className="ad-page-icon">
            <MdVerified size={22} />
          </div>
          <div>
            <h1 className="gs-title">{t("ggTitle")}</h1>
            <p className="gs-sub">{t("ggSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="gs-card gg-card">
        <div className="gs-section-er">
          <div className="gs-section-icon">
            <MdVpnKey size={15} />
          </div>
          <div>
            <h3 className="gs-section-title">{t("ggVerifyBtn")}</h3>
            <p className="gs-section-sub">{t("ggPlaceholder")}</p>
          </div>
        </div>

        <div className="ge-search-wrap">
          <MdVpnKey className="ge-search-icon" size={17} />
          <input
            className="ge-search-input"
            placeholder={t("ggPlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && !showSlots && verifyPass()}
            disabled={showSlots}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {!showSlots && (
          <button
            type="button"
            onClick={verifyPass}
            disabled={loading || !code.trim()}
            className="btn-primary gg-action-btn"
          >
            <MdVerified size={16} />
            {loading ? t("ggVerifying") : t("ggVerifyBtn")}
          </button>
        )}

        {message && (
          <div className={`gs-banner ${success ? "gs-banner--success" : "gs-banner--error"}`}>
            {success ? <MdCheckCircle size={17} /> : <MdWarning size={17} />}
            {message}
          </div>
        )}

        {showSlots && (
          <div className="gg-slot-panel">
            <p className="gg-slot-heading">{t("ggSelectSlot")}</p>

            <SlidingTabs
              className="ge-filter-tabs"
              value={vehicleType}
              onChange={setVehicleType}
              fullWidth
              items={[
                { id: "CAR", label: t("ggCar") },
                { id: "BIKE", label: t("ggBike") },
              ]}
            />

            {slots.length === 0 ? (
              <p className="gg-slot-empty">
                {t("ggNoSlots", { type: vehicleType === "CAR" ? t("ggCar") : t("ggBike") })}
              </p>
            ) : (
              <div className="gg-slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.slot_number)}
                    className={`gg-slot-btn ${selectedSlot === slot.slot_number ? "is-active" : ""}`}
                  >
                    {slot.slot_number}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <p className="gg-slot-selected">
                <MdCheckCircle size={14} /> {t("ggSelected")}: {selectedSlot}
              </p>
            )}

            <button
              type="button"
              onClick={confirmWithSlot}
              disabled={loading || !selectedSlot}
              className="btn-primary gg-action-btn"
            >
              <MdCheckCircle size={16} />
              {loading ? t("ggConfirming") : t("ggConfirm")}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSlots(false);
                setSelectedSlot(null);
                setMessage("");
              }}
              className="btn-muted gg-cancel"
            >
              {t("ggCancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
