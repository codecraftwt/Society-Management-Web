import { useState } from "react";
import Modal from "../Modal";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  MdWarning,
  MdLocalFireDepartment,
  MdLocalHospital,
  MdSecurity,
  MdHelp,
  MdCheckCircle,
  MdSend,
  MdEmergency,
  MdLocationOn,
  MdClear,
} from "react-icons/md";

const EMERGENCY_TYPES = [
  {
    type: "SECURITY",
    label: "Security / Intruder",
    icon: MdSecurity,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.30)",
  },
  {
    type: "FIRE",
    label: "Fire Alert",
    icon: MdLocalFireDepartment,
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.30)",
  },
  {
    type: "MEDICAL",
    label: "Medical Emergency",
    icon: MdLocalHospital,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.30)",
  },
  {
    type: "GATE_PANIC",
    label: "Gate Panic / Threat",
    icon: MdWarning,
    color: "#dc2626",
    bg: "rgba(220,38,38,0.15)",
    border: "rgba(220,38,38,0.35)",
  },
  {
    type: "OTHER",
    label: "Other Emergency",
    icon: MdHelp,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.30)",
  },
];

const SOURCE_LABEL = {
  GUARD: "Security Guard",
  RESIDENT: "Resident",
  ADMIN: "Society Admin",
  COMMITTEE: "Committee Member",
  SUPER_ADMIN: "Super Admin",
};

function sourceName(alert) {
  if (alert.source === "RESIDENT") return alert.Resident?.name || "Resident";
  if (alert.source === "GUARD") return alert.Guard?.name || "Security Guard";
  return alert.Admin?.name || SOURCE_LABEL[alert.source] || "Staff";
}

export default function GuardEmergencyModal({
  alerts = [],
  isOpen,
  onClose,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("RAISE"); // 'RAISE' | 'ACTIVE'
  const [selectedType, setSelectedType] = useState("SECURITY");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const handleSendEmergency = async () => {
    try {
      setLoading(true);
      await API.post("/emergency", {
        type: selectedType,
        message: description.trim() || `Urgent ${selectedType} Emergency reported at Security Gate`,
      });

      toast.success("🚨 Gate SOS Emergency broadcasted to all residents and admins!");
      setDescription("");
      if (onRefresh) onRefresh();
      setActiveTab("ACTIVE");
    } catch (err) {
      console.error("Emergency send failed", err);
      toast.error(err?.response?.data?.message || "Failed to broadcast emergency");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      setResolvingId(alertId);
      await API.patch(`/emergency/${alertId}/resolve`);
      toast.success("Emergency marked as resolved ✅");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Resolve failed", err);
      toast.error("Failed to resolve emergency");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🚨 Security Guard Emergency & SOS Center"
    >
      <div className="space-y-4">
        {/* TAB BUTTONS */}
        <div className="flex gap-2 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-glass">
          <button
            type="button"
            onClick={() => setActiveTab("RAISE")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "RAISE"
                ? "bg-red-600 text-white shadow-md shadow-red-500/30"
                : "text-secondary hover:text-primary"
            }`}
          >
            <MdEmergency size={16} /> Raise Gate SOS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
              activeTab === "ACTIVE"
                ? "bg-red-600 text-white shadow-md shadow-red-500/30"
                : "text-secondary hover:text-primary"
            }`}
          >
            <MdWarning size={16} /> Active Alerts
            {alerts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-white text-red-600 rounded-full font-extrabold">
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {/* ── 1. RAISE SOS FORM ── */}
        {activeTab === "RAISE" && (
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Select Emergency Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EMERGENCY_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedType === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setSelectedType(t.type)}
                      style={{
                        background: isSelected ? t.bg : "var(--card-inner-bg)",
                        borderColor: isSelected ? t.border : "var(--glass-border)",
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                        isSelected ? "ring-2 ring-red-500" : "hover:border-red-500/40"
                      }`}
                    >
                      <Icon size={22} style={{ color: t.color }} />
                      <span
                        className="text-xs font-bold"
                        style={{ color: isSelected ? t.color : "var(--text-primary)" }}
                      >
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Emergency Notes & Location Details Section ── */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-card-inner-bg/70 border border-glass-border/70 shadow-inner">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <MdLocationOn className="text-rose-500" size={16} />
                  <span>Emergency Notes & Location Details</span>
                </label>
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-glass-border/40">
                  Optional
                </span>
              </div>

              {/* Modern Spacious Textarea */}
              <div className="relative pt-0.5">
                <textarea
                  rows={4}
                  style={{ minHeight: "120px" }}
                  placeholder="Describe the situation or exact location (e.g. Near Gate 2, Clubhouse lawn, Basement parking, Block A lobby)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full resize-y text-xs sm:text-sm bg-card-inner-bg/90 border-glass-border focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl p-3.5 leading-relaxed transition"
                />
                {description && (
                  <button
                    type="button"
                    onClick={() => setDescription("")}
                    className="absolute right-3 bottom-3.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold text-secondary hover:text-rose-400 bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  >
                    <MdClear size={12} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Broadcast CTA Button */}
            <button
              type="button"
              onClick={handleSendEmergency}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <MdSend size={18} />
              {loading ? "Broadcasting SOS..." : "🚨 Broadcast Gate SOS to Society"}
            </button>
          </div>
        )}

        {/* ── 2. ACTIVE ALERTS LIST ── */}
        {activeTab === "ACTIVE" && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-secondary text-sm">
                <MdCheckCircle size={32} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                No active emergencies in the society.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-2 relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white">
                        {alert.type}
                      </span>
                      <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                        {alert.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      <MdCheckCircle size={14} />
                      {resolvingId === alert.id ? "Resolving..." : "Mark Resolved"}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary pt-1 border-t border-red-500/20">
                    <span>
                      <strong>Raised By:</strong>{" "}
                      {sourceName(alert)}
                    </span>
                    {alert.source === "RESIDENT" && alert.Flat && (
                      <span>
                        <strong>Flat:</strong> {alert.Flat?.Block?.name}-{alert.Flat?.flat_number}
                      </span>
                    )}
                    <span>
                      <strong>Time:</strong> {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}