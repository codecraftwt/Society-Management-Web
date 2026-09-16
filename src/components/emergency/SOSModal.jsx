import { useState } from "react";
import Modal from "../Modal";
import API from "../../services/api";
import { toast } from "react-toastify";
import Select from "../common/Select";
import {
  MdWarning,
  MdLocalFireDepartment,
  MdLocalHospital,
  MdSecurity,
  MdHelp,
  MdCheckCircle,
  MdSend,
  MdEmergency,
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
    type: "OTHER",
    label: "Other Emergency",
    icon: MdHelp,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.30)",
  },
];

const SOURCE_META = {
  GUARD: "Security Guard",
  RESIDENT: "Resident",
  ADMIN: "Society Admin",
  COMMITTEE: "Committee Member",
  SUPER_ADMIN: "Super Admin",
};

function sourceName(alert) {
  if (alert.source === "RESIDENT") return alert.Resident?.name || "Resident";
  if (alert.source === "GUARD") return alert.Guard?.name || "Security Guard";
  return alert.Admin?.name || SOURCE_META[alert.source] || "Staff";
}

export default function SOSModal({
  isOpen,
  onClose,
  onRefresh,
  alerts = [],
  societies = [],
  defaultSocietyId = "",
  requireSociety = false,
  withAlerts = true,
  senderLabel = "SOS",
  modalTitle = "🚨 Emergency SOS Center",
  successMessage = "🚨 SOS Emergency broadcasted to the society!",
}) {
  const [activeTab, setActiveTab] = useState("RAISE"); // 'RAISE' | 'ACTIVE'
  const [selectedType, setSelectedType] = useState("SECURITY");
  const [description, setDescription] = useState("");
  const [selectedSocietyId, setSelectedSocietyId] = useState(defaultSocietyId || "");
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const handleSend = async () => {
    if (requireSociety && !selectedSocietyId) {
      toast.error("Please select the society you want to broadcast the SOS to");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type: selectedType,
        message: description.trim() || `Urgent ${selectedType} Emergency reported`,
      };
      if (requireSociety) payload.society_id = selectedSocietyId;

      await API.post("/emergency", payload);
      toast.success(successMessage);
      setDescription("");
      if (onRefresh) onRefresh();
      if (withAlerts) setActiveTab("ACTIVE");
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
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
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
            <MdEmergency size={16} /> Raise {senderLabel}
          </button>
          {withAlerts && (
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
          )}
        </div>

        {/* ── 1. RAISE SOS FORM ── */}
        {activeTab === "RAISE" && (
          <div className="space-y-4 pt-1">
            {requireSociety && (
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                  Broadcast to Society <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedSocietyId}
                  onChange={(e) => setSelectedSocietyId(e.target.value)}
                  className="input w-full"
                  style={{ height: 44, cursor: "pointer", fontSize: 13 }}
                >
                  <option value="" disabled>
                    -- Select the society to send the SOS --
                  </option>
                  {societies.map((soc) => (
                    <option key={soc.id} value={soc.id}>
                      {soc.name} (#{soc.id})
                    </option>
                  ))}
                </Select>
              </div>
            )}

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

            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                Emergency Notes / Location Details (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Fire near clubhouse / Medical aid requested / Intruder spotted"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full resize-none text-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 transition disabled:opacity-50"
            >
              <MdSend size={18} />
              {loading ? `Broadcasting ${senderLabel}...` : `🚨 Broadcast ${senderLabel} to Society`}
            </button>
          </div>
        )}

        {/* ── 2. ACTIVE ALERTS LIST ── */}
        {withAlerts && activeTab === "ACTIVE" && (
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
                      <strong>Raised By:</strong> {sourceName(alert)}
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