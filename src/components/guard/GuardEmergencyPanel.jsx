import { useState, useRef } from "react";
import API from "../../services/api";
import { toast } from "react-toastify";
import Select from "../common/Select";

export default function GuardEmergencyPanel({ onSent }) {
  const [type, setType] = useState("FIRE");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const descRef = useRef(null);

  /* === SEND EMERGENCY === */
  const sendEmergency = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description for the emergency");
      return;
    }

    try {
      setLoading(true);

      await API.post("/emergency", {
        type,
        message:description,
      });

      toast.success("Emergency alert sent successfully 🚨");

      setDescription("");
      if (descRef.current) descRef.current.style.height = "";

      // SAFE CALLBACK
      if (onSent) onSent();

    } catch (err) {
      console.error("Emergency send failed", err);
      toast.error("Failed to send emergency");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card p-5 rounded-xl space-y-4">

      <h2 className="text-lg font-semibold gd-emergency-title">
        Emergency Alert
      </h2>

      {/* TYPE SELECT */}
      <Select
        className="input"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="FIRE">Fire</option>
        <option value="MEDICAL">Medical</option>
        <option value="SECURITY">Security</option>
        <option value="OTHER">Other</option>
      </Select>

      {/* DESCRIPTION */}
      <textarea
        ref={descRef}
        placeholder="Describe emergency..."
        className="input resize-none gd-emergency-desc"
        rows="3"
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.max(e.target.scrollHeight, 96)}px`;
        }}
      />

      {/* BUTTON */}
      <button
        onClick={sendEmergency}
        disabled={loading}
        className="btn-danger w-full gd-emergency-send"
      >
        {loading ? "Sending..." : "Send Emergency"}
      </button>

    </div>
  );
}


