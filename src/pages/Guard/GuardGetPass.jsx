import { useState, useEffect } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";

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

  const fetchSlots = async (type = vehicleType) => {
    try {
      const res = await API.get(`/parking-slots/available?vehicle_type=${type}`);
      setSlots(res.data);
    } catch (err) {
      console.error("Slot fetch error", err);
    }
  };

  useEffect(() => {
    if (showSlots) {
      setSelectedSlot(null);
      fetchSlots(vehicleType);
    }
  }, [vehicleType, showSlots]);

  /* ── First verification (without slot) ── */
  const verifyPass = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMessage("");

    try {
      // ✅ First call without slot - backend will ask for slot if needed
      const res = await API.post("/preapproval/verify", { code });
      
      // ✅ Success - no parking needed
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

      // ✅ If backend asks for slot, show slot picker
      if (msg === "Please select a parking slot" || err.response?.data?.requiresSlot) {
        setShowSlots(true);
        fetchSlots(vehicleType);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Confirm with slot ── */
  const confirmWithSlot = async () => {
    if (!selectedSlot) {
      setMessage("Please select a slot first");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ✅ Second call WITH slot - backend will create entry
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

  /* ── Auto-hide error ── */
  useEffect(() => {
    if (message && !success) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, success]);

  return (
    <div className="bg-card p-6 rounded-xl space-y-5 max-w-md shadow-lg">
      <h2 className="text-lg font-semibold tracking-wide">{t("ggTitle")}</h2>

      {/* Code Input */}
      <input
        className="input"
        placeholder={t("ggPlaceholder")}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !showSlots && verifyPass()}
      />

      {/* Verify Button */}
      {!showSlots && (
        <button onClick={verifyPass} disabled={loading} className="btn-primary w-full">
          {loading ? t("ggVerifying") : t("ggVerifyBtn")}
        </button>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Slot Picker */}
      {showSlots && (
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
          <p className="text-sm text-yellow-400 font-medium">🚗 Select Vehicle Type &amp; Slot</p>

          {/* Vehicle Type Toggle */}
          <div className="flex gap-2">
            {["CAR", "BIKE"].map((type) => (
              <button
                key={type}
                onClick={() => setVehicleType(type)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  vehicleType === type
                    ? "bg-yellow-500/30 border-yellow-400 text-white"
                    : "bg-white/10 border-white/10 hover:bg-white/20"
                }`}
              >
                {type === "CAR" ? "🚗 Car" : "🏍️ Bike"}
              </button>
            ))}
          </div>

          {/* Slot Grid */}
          {slots.length === 0 ? (
            <p className="text-xs text-red-400">No {vehicleType} slots available</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.slot_number)}
                  className={`py-2 rounded-lg text-sm border transition-colors ${
                    selectedSlot === slot.slot_number
                      ? "bg-blue-500/30 border-blue-400 text-white"
                      : "bg-white/10 border-white/10 hover:bg-white/20"
                  }`}
                >
                  {slot.slot_number}
                </button>
              ))}
            </div>
          )}

          {selectedSlot && <p className="text-xs text-green-400">✅ Selected: {selectedSlot}</p>}

          {/* Confirm Button */}
          <button
            onClick={confirmWithSlot}
            disabled={loading || !selectedSlot}
            className="btn-primary w-full mt-2 disabled:opacity-50"
          >
            {loading ? "Confirming..." : "✅ Confirm Entry"}
          </button>

          {/* Cancel */}
          <button
            onClick={() => {
              setShowSlots(false);
              setSelectedSlot(null);
              setMessage("");
            }}
            className="w-full py-2 text-sm text-white/40 hover:text-white/70"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}