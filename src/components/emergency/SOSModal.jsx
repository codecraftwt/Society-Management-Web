import { useState } from "react";
import GlobalModal from "../common/GlobalModal";
import GlobalButton from "../common/GlobalButton";
import SlidingTabs from "../common/SlidingTabs";
import Select from "../common/Select";
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
    color: "var(--accent)",
    bg: "var(--accent-soft)",
    border: "rgba(var(--acct-purple-rgb),0.28)",
    cssBg: "var(--accent-soft)",
    cssColor: "var(--accent)",
  },
  {
    type: "FIRE",
    label: "Fire Alert",
    icon: MdLocalFireDepartment,
    color: "var(--reject-color)",
    bg: "var(--reject-bg)",
    border: "var(--reject-border)",
    cssBg: "var(--reject-bg)",
    cssColor: "var(--reject-color)",
  },
  {
    type: "MEDICAL",
    label: "Medical Emergency",
    icon: MdLocalHospital,
    color: "var(--acct-cyan)",
    bg: "rgba(var(--acct-cyan-rgb),0.16)",
    border: "rgba(var(--acct-cyan-rgb),0.35)",
    cssBg: "rgba(var(--acct-cyan-rgb),0.16)",
    cssColor: "var(--acct-cyan)",
  },
  {
    type: "LIFT_STUCK",
    label: "Lift Stuck",
    icon: MdWarning,
    // Use orange for Lift Stuck
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.35)",
    cssBg: "rgba(249,115,22,0.12)",
    cssColor: "#f97316",
  },
  {
    type: "ANIMAL",
    label: "Animal Menace",
    icon: MdHelp,
    color: "var(--approve-color)",
    bg: "var(--approve-bg)",
    border: "var(--approve-border)",
    cssBg: "var(--approve-bg)",
    cssColor: "var(--approve-color)",
  },
  {
    type: "OTHER",
    label: "Other Emergency",
    icon: MdHelp,
    color: "var(--acct-violet)",
    bg: "rgba(var(--acct-violet-rgb),0.12)",
    border: "rgba(var(--acct-violet-rgb),0.28)",
    cssBg: "rgba(var(--acct-violet-rgb),0.12)",
    cssColor: "var(--acct-violet)",
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

const fieldLabel = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const inputStyle = {
  minHeight: 96,
  fontSize: 13,
  lineHeight: 1.5,
  borderRadius: 12,
  padding: "12px 14px",
  background: "var(--input-bg, var(--card-inner-bg))",
  border: "1px solid var(--input-border, var(--glass-border))",
  color: "var(--text-primary)",
  width: "100%",
  resize: "vertical",
};

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
  modalTitle = "Emergency SOS Center",
  successMessage = "🚨 SOS Emergency broadcasted to the society!",
}) {
  const [activeTab, setActiveTab] = useState("RAISE");
  const [stage, setStage] = useState("FORM");
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
  const TypeIcon = currentTypeObj.icon;
  const title = String(modalTitle || "Society SOS Center").replace(/^🚨\s*/, "");

  const tabItems = [
    { id: "RAISE", label: `Raise ${senderLabel}`, icon: <MdEmergency size={15} /> },
  ];
  if (withAlerts) {
    tabItems.push({
      id: "ACTIVE",
      label: "Active Alerts",
      icon: <MdWarning size={15} />,
      alert: alerts.length,
    });
  }

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Broadcast an emergency to security, admins, and residents"
      icon={MdEmergency}
      size="lg"
      warnUnsavedChanges={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <SlidingTabs
          fullWidth
          value={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            if (id === "RAISE") setStage("FORM");
          }}
          items={tabItems}
        />

        {activeTab === "RAISE" && (
          <>
            {stage === "FORM" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {requireSociety && (
                  <div>
                    <label style={fieldLabel}>
                      Broadcast to Society <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
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
                  <label style={fieldLabel}>
                    Select Emergency Type <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
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
                            // Use a solid token color when selected to match mobile solid palette.
                            background: isSelected ? (t.color || "var(--accent)") : (t.bg || "var(--card-inner-bg)"),
                            border: `1.5px solid ${isSelected ? (t.color || "var(--accent)") : "var(--glass-border)"}`,
                            borderRadius: 12,
                            padding: "12px 10px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                            gap: 8,
                            cursor: "pointer",
                            transition: "border-color 0.15s ease, background 0.15s ease, color 0.15s ease",
                          }}
                        >
                          <Icon size={22} style={{ color: isSelected ? "#fff" : (t.color || "var(--text-primary)") }} />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isSelected ? "#fff" : "var(--text-primary)",
                              lineHeight: 1.25,
                            }}
                          >
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedType === "OTHER" && (
                  <div>
                    <label style={{ ...fieldLabel, color: "#ec4899" }}>
                      Specify Reason for Other <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Gas cylinder leak, Water pipe burst, Stuck in terrace, Electrical short circuit..."
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="input w-full"
                      style={{ ...inputStyle, minHeight: 85 }}
                    />
                  </div>
                )}

                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      <MdLocationOn size={16} style={{ color: "var(--danger, #ef4444)" }} />
                      Emergency Notes & Location Details
                    </label>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "var(--card-bg)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      Optional
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      rows={5}
                      placeholder="Provide additional details to help security and neighbors respond faster (e.g. Exact location, flat number, injured persons)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input w-full"
                      style={{ ...inputStyle, minHeight: 120, paddingBottom: description ? 36 : 12 }}
                    />
                    {description && (
                      <button
                        type="button"
                        onClick={() => setDescription("")}
                        style={{
                          position: "absolute",
                          right: 10,
                          bottom: 10,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                          background: "var(--card-bg)",
                          border: "1px solid var(--glass-border)",
                          cursor: "pointer",
                        }}
                      >
                        <MdClear size={12} /> Clear
                      </button>
                    )}
                  </div>
                </div>

                <GlobalButton
                  type="button"
                  variant="danger"
                  icon={MdArrowForward}
                  iconPosition="right"
                  onClick={handleProceedToConfirm}
                  fullWidth
                  borderDraw
                >
                  Review & Continue
                </GlobalButton>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: "color-mix(in srgb, #ef4444 10%, var(--card-inner-bg))",
                    border: "1px solid color-mix(in srgb, #ef4444 28%, var(--glass-border))",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      margin: "0 auto 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: currentTypeObj.color,
                    }}
                  >
                    <TypeIcon size={26} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                    Confirm Emergency SOS
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0", fontWeight: 500 }}>
                    Are you sure you want to trigger this emergency alert?
                  </p>

                  <div
                    style={{
                      marginTop: 14,
                      background: "var(--card-bg)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 12,
                      padding: 12,
                      textAlign: "left",
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Emergency Type</span>
                      <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>{currentTypeObj.label}</span>
                    </div>
                    {selectedType === "OTHER" && otherReason && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Reason</span>
                        <span style={{ color: "#ec4899", fontWeight: 700 }}>{otherReason}</span>
                      </div>
                    )}
                    {description.trim() && (
                      <div>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 4 }}>Notes</span>
                        <p style={{ color: "var(--text-primary)", fontWeight: 500, fontStyle: "italic", margin: 0, lineHeight: 1.45 }}>
                          “{description.trim()}”
                        </p>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, lineHeight: 1.45, margin: "12px 0 0" }}>
                    This will instantly notify on-duty security, admins, and neighboring residents.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <GlobalButton
                    type="button"
                    variant="cancel"
                    icon={MdArrowBack}
                    onClick={() => setStage("FORM")}
                    disabled={loading}
                  >
                    Back / Edit
                  </GlobalButton>
                  <GlobalButton
                    type="button"
                    variant="danger"
                    icon={MdSend}
                    onClick={handleConfirmSend}
                    loading={loading}
                    disabled={loading}
                    borderDraw
                    style={{ flex: 1 }}
                  >
                    {loading ? "Triggering SOS..." : "Confirm & Send SOS"}
                  </GlobalButton>
                </div>
              </div>
            )}
          </>
        )}

        {withAlerts && activeTab === "ACTIVE" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "52vh", overflowY: "auto", paddingRight: 2 }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--text-secondary)", fontSize: 13 }}>
                <MdCheckCircle size={32} style={{ margin: "0 auto 8px", color: "var(--success, #10b981)", opacity: 0.85, display: "block" }} />
                No active emergencies in the society.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: "color-mix(in srgb, #ef4444 8%, var(--card-inner-bg))",
                    border: "1px solid color-mix(in srgb, #ef4444 26%, var(--glass-border))",
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          background: "#ef4444",
                          color: "#fff",
                        }}
                      >
                        {alert.type}
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: "8px 0 0", color: "var(--text-primary)", lineHeight: 1.4 }}>
                        {alert.message}
                      </p>
                      {alert.other_reason && (
                        <p style={{ fontSize: 12, color: "#ec4899", fontWeight: 700, margin: "4px 0 0" }}>
                          Reason: {alert.other_reason}
                        </p>
                      )}
                    </div>
                    <GlobalButton
                      type="button"
                      variant="success"
                      size="sm"
                      icon={MdCheckCircle}
                      onClick={() => handleResolve(alert.id)}
                      loading={resolvingId === alert.id}
                      disabled={resolvingId === alert.id}
                    >
                      {resolvingId === alert.id ? "Resolving..." : "Mark Resolved"}
                    </GlobalButton>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px 14px",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      paddingTop: 8,
                      borderTop: "1px solid var(--glass-border)",
                    }}
                  >
                    <span>
                      <strong style={{ color: "var(--text-primary)" }}>Raised By:</strong> {sourceName(alert)}
                    </span>
                    {alert.source === "RESIDENT" && alert.Flat && (
                      <span>
                        <strong style={{ color: "var(--text-primary)" }}>Flat:</strong> {alert.Flat?.Block?.name}-{alert.Flat?.flat_number}
                      </span>
                    )}
                    <span>
                      <strong style={{ color: "var(--text-primary)" }}>Time:</strong> {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </GlobalModal>
  );
}
