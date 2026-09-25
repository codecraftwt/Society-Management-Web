import { createPortal } from "react-dom";
import { MdClose, MdAdd } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { Spinner } from "../amenityHelpers.jsx";
import Select from "../../../components/common/Select";

const inputStyle = { height: 42, borderRadius: 12, width: "100%", border: "1.5px solid var(--glass-border)", background: "var(--input-bg)", color: "var(--text-primary)", padding: "0 14px", fontSize: 13, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" };

const Label = ({ children }) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7 }}>{children}</label>
);

export default function Create({
  isMobile,
  editingAmenity,
  form,
  setForm,
  submitting,
  requestCloseForm,
  submitAmenity,
  markDirty,
}) {
  const { t } = useLang();

  return createPortal(
    <div
      onClick={requestCloseForm}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scaleIn"
        style={{
          width: "100%", maxWidth: 640,
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: 20,
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft, rgba(99,102,241,0.18))", border: "1px solid var(--accent-light, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {editingAmenity ? "✏️" : "✨"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{editingAmenity ? t("amenFormEditTitle") : t("amenFormTitle")}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t("amenFormSub")}</div>
            </div>
          </div>
          <button
            onClick={requestCloseForm}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-inner-bg)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", transition: "all 0.15s", flexShrink: 0 }}
          >
            <MdClose size={16} />
          </button>
        </div>

        <div style={{ height: 1, background: "var(--glass-border)", margin: "16px 0 0", flexShrink: 0 }} />

        {/* Modal Body */}
        <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div><Label>{t("amenFieldName")}</Label><input style={inputStyle} placeholder={t("amenFieldNamePlaceholder")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t("amenFieldBookingType")}</Label><Select style={inputStyle} value={form.booking_type} onChange={e => setForm({ ...form, booking_type: e.target.value })}><option value="SLOT">{t("amenSlotBased")}</option><option value="FULL_DAY">{t("amenFullDay")}</option></Select></div>
            <div><Label>{t("amenFieldPricing")}</Label><Select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="FREE">{t("amenFreeAccess")}</option><option value="PAID">{t("amenPaid")}</option></Select></div>
            {form.type === "PAID" && <div><Label>{t("amenFieldRate")}</Label><input type="number" style={inputStyle} placeholder="0" value={form.rate_per_hour} onChange={e => setForm({ ...form, rate_per_hour: e.target.value })} /></div>}
            <div><Label>{t("amenFieldCapacity")}</Label><input type="number" style={inputStyle} placeholder="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
            {form.booking_type === "SLOT" && <>
              <div><Label>{t("amenFieldOpenTime")}</Label><input type="time" style={inputStyle} value={form.opening_time} onChange={e => setForm({ ...form, opening_time: e.target.value })} /></div>
              <div><Label>{t("amenFieldCloseTime")}</Label><input type="time" style={inputStyle} value={form.closing_time} onChange={e => setForm({ ...form, closing_time: e.target.value })} /></div>
            </>}
            {/* Requires Approval toggle */}
            <div
              onClick={() => { setForm({ ...form, requires_approval: !form.requires_approval }); markDirty(); }}
              style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "0 14px", borderRadius: 12, cursor: "pointer", background: "var(--card-inner-bg)", border: "1.5px solid var(--glass-border)", gridColumn: isMobile ? "1" : "span 2" }}
            >
              {/* toggle track */}
              <div style={{ width: 40, height: 22, borderRadius: 99, position: "relative", flexShrink: 0, background: form.requires_approval ? "var(--accent, #6366f1)" : "var(--glass-border)", transition: "background 0.25s ease", boxShadow: form.requires_approval ? "0 0 0 3px var(--accent-soft)" : "none" }}>
                <div style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", left: form.requires_approval ? 21 : 3, transition: "left 0.25s ease" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t("amenRequiresApproval")}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>{t("amenRequiresApprovalSub")}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={requestCloseForm} className="btn-muted" style={{ borderRadius: 12, padding: "10px 18px", fontSize: 13 }}>{t("cancel")}</button>
            <button onClick={submitAmenity} disabled={submitting} className="btn-primary" style={{ borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
              {submitting ? <Spinner cls="h-3 w-3" /> : <MdAdd size={16} />} {editingAmenity ? t("save") : t("amenCreateBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
