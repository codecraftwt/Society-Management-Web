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
  MdArrowBack,
  MdArrowForward,
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
    type: "LIFT_STUCK",
    label: "Lift Stuck",
    icon: MdWarning,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.30)",
  },
  {
    type: "ANIMAL",
    label: "Animal Menace",
    icon: MdHelp,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.30)",
  },
  {
    type: "OTHER",
    label: "Other Emergency",
    icon: MdHelp,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.30)",
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
  const [stage, setStage] = useState("FORM"); // 'FORM' | 'CONFIRM'
  const [selectedType, setSelectedType] = useState("SECURITY");
  const [description, setDescription] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [selectedSocietyId, setSelectedSocietyId] = useState(defaultSocietyId || "");
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const handleProceedToConfirm = () => {
    if (requireSociety && !selectedSocietyId) {
      toast.error("Please select the society you want to broadcast the SOS to");
      return;
    }

    if (selectedType === "OTHER" && !otherReason.trim()) {
      toast.error("Please provide a reason for selecting Other.");
      return;
    }

    setStage("CONFIRM");
  };

  const handleConfirmSend = async () => {
    try {
      setLoading(true);
      const finalMessage = description.trim()
        ? description.trim()
        : selectedType === "OTHER"
        ? `Other Emergency: ${otherReason.trim()}`
        : `Urgent ${selectedType} Emergency reported`;

      const payload = {
        type: selectedType,
        message: finalMessage,
      };

      if (selectedType === "OTHER") {
        payload.other_reason = otherReason.trim();
      }

      if (requireSociety) payload.society_id = selectedSocietyId;

      await API.post("/emergency", payload);
      toast.success(successMessage);
      setDescription("");
      setOtherReason("");
      setStage("FORM");
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

  const currentTypeObj = EMERGENCY_TYPES.find((t) => t.type === selectedType) || EMERGENCY_TYPES[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} warnUnsavedChanges={false}>
      <div className="space-y-4">
        {/* TAB BUTTONS */}
        <div className="flex gap-2 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-glass">
          <button
            type="button"
            onClick={() => {
              setActiveTab("RAISE");
              setStage("FORM");
            }}
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

        {/* ── 1. RAISE SOS FLOW ── */}
        {activeTab === "RAISE" && (
          <>
            {stage === "FORM" ? (
              <div className="space-y-4 pt-1">
                {requireSociety && (
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                      Broadcast to Society <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedSocietyId}
                      onChange={(e) => setSelectedSocietyId(e.target.value)}
                      className="input w-full"
                      style={{ height: 42, cursor: "pointer", fontSize: 13 }}
                    >
                      <option value="" disabled>
                        -- Select target society --
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
                    Select Emergency Type <span className="text-red-500">*</span>
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

                {/* Other Reason input (Mandatory if OTHER) */}
                {selectedType === "OTHER" && (
                  <div>
                    <label className="block text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1.5">
                      Specify Reason for Other <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      style={{ minHeight: "85px", fontSize: "13px", lineHeight: "1.5" }}
                      placeholder="e.g. Gas cylinder leak, Water pipe burst, Stuck in terrace, Electrical short circuit..."
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="input w-full rounded-xl p-3 border-pink-500/40 focus:border-pink-500 resize-y"
                    />
                  </div>
                )}

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
                      rows={5}
                      style={{ minHeight: "135px" }}
                      placeholder="Provide additional details to help security and neighbors respond faster (e.g. Exact location, flat number, injured persons, immediate assistance needed)..."
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

                <button
                  type="button"
                  onClick={handleProceedToConfirm}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 transition"
                >
                  <span>Review & Continue</span>
                  <MdArrowForward size={18} />
                </button>
              </div>
            ) : (
              /* ── CONFIRMATION STEP ── */
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3 text-center">
                  <div
                    className="w-14 h-14 rounded-full mx-auto flex items-center justify-center shadow-lg"
                    style={{ background: currentTypeObj.color }}
                  >
                    <currentTypeObj.icon size={28} className="text-white" />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Confirm Emergency SOS
                    </h3>
                    <p className="text-xs text-secondary mt-1">
                      Are you sure you want to trigger this emergency alert?
                    </p>
                  </div>

                  <div className="bg-black/20 dark:bg-white/5 p-3 rounded-xl text-left text-xs space-y-1.5 border border-glass">
                    <div className="flex justify-between">
                      <span className="text-secondary font-semibold">Emergency Type:</span>
                      <span className="font-black text-white">{currentTypeObj.label}</span>
                    </div>

                    {selectedType === "OTHER" && otherReason && (
                      <div className="flex justify-between">
                        <span className="text-secondary font-semibold">Reason:</span>
                        <span className="font-bold text-pink-400">{otherReason}</span>
                      </div>
                    )}

                    {description.trim() && (
                      <div>
                        <span className="text-secondary font-semibold block mb-0.5">Notes:</span>
                        <p className="text-white text-xs font-medium italic">
                          "{description.trim()}"
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-red-400 font-semibold leading-tight">
                    ⚠️ This will instantly notify on-duty security guards, admins, and neighboring residents.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStage("FORM")}
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl btn btn-secondary text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <MdArrowBack size={16} /> Back / Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSend}
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/30 transition disabled:opacity-50"
                  >
                    <MdSend size={16} />
                    {loading ? "Triggering SOS..." : "🚨 Confirm & Send SOS"}
                  </button>
                </div>
              </div>
            )}
          </>
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
                      {alert.other_reason && (
                        <p className="text-xs text-pink-400 font-bold mt-0.5">
                          Reason: {alert.other_reason}
                        </p>
                      )}
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