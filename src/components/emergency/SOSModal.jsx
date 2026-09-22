import { useState } from "react";
import GlobalModal from "../common/GlobalModal";
import GlobalButton from "../common/GlobalButton";
import SlidingTabs from "../common/SlidingTabs";
import Select from "../common/Select";
import API from "../../services/api";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
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
    labelKey: "sosTypeSecurity",
    icon: MdSecurity,
    color: "var(--accent)",
    bg: "var(--accent-soft)",
    border: "rgba(var(--acct-purple-rgb),0.28)",
    cssBg: "var(--accent-soft)",
    cssColor: "var(--accent)",
  },
  {
    type: "FIRE",
    labelKey: "sosTypeFire",
    icon: MdLocalFireDepartment,
    color: "var(--reject-color)",
    bg: "var(--reject-bg)",
    border: "var(--reject-border)",
    cssBg: "var(--reject-bg)",
    cssColor: "var(--reject-color)",
  },
  {
    type: "MEDICAL",
    labelKey: "sosTypeMedical",
    icon: MdLocalHospital,
    color: "var(--acct-cyan)",
    bg: "rgba(var(--acct-cyan-rgb),0.16)",
    border: "rgba(var(--acct-cyan-rgb),0.35)",
    cssBg: "rgba(var(--acct-cyan-rgb),0.16)",
    cssColor: "var(--acct-cyan)",
  },
  {
    type: "LIFT_STUCK",
    labelKey: "sosTypeLiftStuck",
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
    labelKey: "sosTypeAnimal",
    icon: MdHelp,
    color: "var(--approve-color)",
    bg: "var(--approve-bg)",
    border: "var(--approve-border)",
    cssBg: "var(--approve-bg)",
    cssColor: "var(--approve-color)",
  },
  {
    type: "OTHER",
    labelKey: "sosTypeOther",
    icon: MdHelp,
    color: "var(--acct-violet)",
    bg: "rgba(var(--acct-violet-rgb),0.12)",
    border: "rgba(var(--acct-violet-rgb),0.28)",
    cssBg: "rgba(var(--acct-violet-rgb),0.12)",
    cssColor: "var(--acct-violet)",
  },
];

const SOURCE_META = {
  GUARD: "sosSourceGuard",
  RESIDENT: "sosSourceResident",
  ADMIN: "sosSourceAdmin",
  COMMITTEE: "sosSourceCommittee",
  SUPER_ADMIN: "sosSourceSuperAdmin",
};

function sourceName(alert, t) {
  if (alert.source === "RESIDENT") return alert.Resident?.name || t("sosSourceResident");
  if (alert.source === "GUARD") return alert.Guard?.name || t("sosSourceGuard");
  return alert.Admin?.name || t(SOURCE_META[alert.source] || "sosSourceStaff");
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
  senderLabel = "sosSenderSOS",
  modalTitle = "sosDefaultModalTitle",
  successMessage = "sosDefaultSuccess",
}) {
  const { t } = useLang();
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
      toast.error(t("sosSelectSocietyErr"));
      return;
    }

    if (selectedType === "OTHER" && !otherReason.trim()) {
      toast.error(t("sosProvideReasonErr"));
      return;
    }

    setStage("CONFIRM");
  };

  const handleConfirmSend = async () => {
    try {
      setLoading(true);
      const typeLabel = t(EMERGENCY_TYPES.find((et) => et.type === selectedType)?.labelKey || "sosTypeOther");
      const finalMessage = description.trim()
        ? description.trim()
        : selectedType === "OTHER"
        ? t("sosOtherEmergencyMsg", { reason: otherReason.trim() })
        : t("sosUrgentMsg", { type: typeLabel });

      const payload = {
        type: selectedType,
        message: finalMessage,
      };

      if (selectedType === "OTHER") {
        payload.other_reason = otherReason.trim();
      }

      if (requireSociety) payload.society_id = selectedSocietyId;

      await API.post("/emergency", payload);
      toast.success(t(successMessage));
      setDescription("");
      setOtherReason("");
      setStage("FORM");
      if (onRefresh) onRefresh();
      if (withAlerts) setActiveTab("ACTIVE");
    } catch (err) {
      console.error("Emergency send failed", err);
      toast.error(err?.response?.data?.message || t("sosBroadcastFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      setResolvingId(alertId);
      await API.patch(`/emergency/${alertId}/resolve`);
      toast.success(t("sosToastResolved"));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Resolve failed", err);
      toast.error(t("sosToastResolveFailed"));
    } finally {
      setResolvingId(null);
    }
  };

  const currentTypeObj = EMERGENCY_TYPES.find((t) => t.type === selectedType) || EMERGENCY_TYPES[0];
  const TypeIcon = currentTypeObj.icon;
  const title = String(t(modalTitle) || "Emergency SOS Center").replace(/^\u{1F6A8}\s*/u, "");

  const tabItems = [
    { id: "RAISE", label: t("sosRaiseTab", { sender: t(senderLabel) }), icon: <MdEmergency size={15} /> },
  ];
  if (withAlerts) {
    tabItems.push({
      id: "ACTIVE",
      label: t("sosActiveAlertsTab"),
      icon: <MdWarning size={15} />,
      alert: alerts.length,
    });
  }

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={t("sosModalSubtitle")}
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
                      {t("sosSelectSocietyLabel")} <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                    </label>
                    <Select
                      value={selectedSocietyId}
                      onChange={(e) => setSelectedSocietyId(e.target.value)}
                      className="input w-full"
                      style={{ height: 42, cursor: "pointer", fontSize: 13 }}
                    >
                      <option value="" disabled>
                        {t("sosSelectTargetSociety")}
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
                    {t("sosSelectTypeLabel")} <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EMERGENCY_TYPES.map((et) => {
                      const Icon = et.icon;
                      const isSelected = selectedType === et.type;
                      return (
                        <button
                          key={et.type}
                          type="button"
                          onClick={() => setSelectedType(et.type)}
                          style={{
                            // Use a solid token color when selected to match mobile solid palette.
                            background: isSelected ? (et.color || "var(--accent)") : (et.bg || "var(--card-inner-bg)"),
                            border: `1.5px solid ${isSelected ? (et.color || "var(--accent)") : "var(--glass-border)"}`,
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
                          <Icon size={22} style={{ color: isSelected ? "#fff" : (et.color || "var(--text-primary)") }} />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isSelected ? "#fff" : "var(--text-primary)",
                              lineHeight: 1.25,
                            }}
                          >
                            {t(et.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedType === "OTHER" && (
                  <div>
                    <label style={{ ...fieldLabel, color: "#ec4899" }}>
                      {t("sosSpecifyOtherLabel")} <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t("sosReasonExamples")}
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
                      {t("sosNotesLocationLabel")}
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
                      {t("sosOptionalTag")}
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      rows={5}
                      placeholder={t("sosDescriptionPlaceholder")}
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
                        <MdClear size={12} /> {t("sosClearBtn")}
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
                  {t("sosReviewContinue")}
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
                    {t("sosConfirmTitle")}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0", fontWeight: 500 }}>
                    {t("sosConfirmMsg")}
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
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{t("sosEmergencyTypeLabel")}</span>
                      <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>{t(currentTypeObj.labelKey)}</span>
                    </div>
                    {selectedType === "OTHER" && otherReason && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{t("sosReasonWord")}</span>
                        <span style={{ color: "#ec4899", fontWeight: 700 }}>{otherReason}</span>
                      </div>
                    )}
                    {description.trim() && (
                      <div>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 4 }}>{t("sosNotesWord")}</span>
                        <p style={{ color: "var(--text-primary)", fontWeight: 500, fontStyle: "italic", margin: 0, lineHeight: 1.45 }}>
                          “{description.trim()}”
                        </p>
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, lineHeight: 1.45, margin: "12px 0 0" }}>
                    {t("sosInstantNotify")}
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
                    {t("sosBackEdit")}
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
                    {loading ? t("sosTriggering") : t("sosConfirmSend")}
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
                {t("sosNoActiveEmergencies")}
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
                        {t(EMERGENCY_TYPES.find((et) => et.type === alert.type)?.labelKey || "sosTypeOther")}
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: "8px 0 0", color: "var(--text-primary)", lineHeight: 1.4 }}>
                        {alert.message}
                      </p>
                      {alert.other_reason && (
                        <p style={{ fontSize: 12, color: "#ec4899", fontWeight: 700, margin: "4px 0 0" }}>
                          {t("sosReason", { reason: alert.other_reason })}
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
                      {resolvingId === alert.id ? t("sosResolving") : t("sosMarkResolved")}
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
                      <strong style={{ color: "var(--text-primary)" }}>{t("sosRaisedBy")}</strong> {sourceName(alert, t)}
                    </span>
                    {alert.source === "RESIDENT" && alert.Flat && (
                      <span>
                        <strong style={{ color: "var(--text-primary)" }}>{t("sosFlatLabel")}</strong> {alert.Flat?.Block?.name}-{alert.Flat?.flat_number}
                      </span>
                    )}
                    <span>
                      <strong style={{ color: "var(--text-primary)" }}>{t("sosTimeLabel")}</strong> {new Date(alert.created_at).toLocaleTimeString()}
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