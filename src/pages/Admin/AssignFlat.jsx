import { useEffect, useState, useCallback, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd, MdSearch, MdClose, MdHome, MdPerson,
  MdChevronLeft, MdChevronRight, MdLinkOff,
  MdApartment, MdLayers, MdBusiness, MdHomeWork,
  MdCheckCircle, MdCheck, MdArrowForward,
  MdArrowBack, MdMeetingRoom, MdDirectionsCar, MdPhone,
} from "react-icons/md";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import { getRequiredError } from "../../utils/validators";

import Pagination from "../../components/common/Pagination";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function getSocietyId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.society_id;
  } catch { return null; }
}

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Spinner({ small = false }) {
  const s = small ? 13 : 20;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

const RESIDENT_TYPE_STYLES = {
  OWNER:  { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)", label: "Owner" },
  TENANT: { bg: "rgba(160,90,255,0.12)", color: "var(--accent)", border: "rgba(160,90,255,0.25)", label: "Tenant" },
};

const BHK_STYLES = {
  "1BHK": { bg: "rgba(107,70,193,0.10)",  color: "#9F87D7", border: "rgba(107,70,193,0.22)" },
  "2BHK": { bg: "rgba(91,141,239,0.10)",  color: "#94B5F5", border: "rgba(91,141,239,0.22)" },
  "3BHK": { bg: "rgba(107,70,193,0.10)", color: "#9F87D7", border: "rgba(107,70,193,0.22)" },
};

function ResidentTypeBadge({ type }) {
  if (!type) return null;
  const s = RESIDENT_TYPE_STYLES[type] || RESIDENT_TYPE_STYLES.OWNER;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  );
}

function BhkBadge({ type }) {
  if (!type) return null;
  const s = BHK_STYLES[type] || BHK_STYLES["1BHK"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{type}</span>
  );
}

function flatBlockName(flat) {
  return flat?.Floor?.Block?.name || flat?.Block?.name || null;
}
function flatFloorNumber(flat) {
  return flat?.Floor?.floor_number ?? null;
}
function flatIsRowHouse(flat) {
  return flat?.floor_id == null;
}



function StepIndicator({ step, total, labels }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 20 }}>
      {labels.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < total - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                className={!done && !active ? "res-step-circle-inactive" : ""}
                style={{
                  width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, transition: "all 0.3s",
                  background: done ? "#34d399" : active ? "linear-gradient(135deg, var(--accent, #6B46C1), #8b5cf6)" : "var(--card-inner-bg, rgba(148, 163, 184, 0.15))",
                  border: `2px solid ${done ? "#34d399" : active ? "var(--accent, #6B46C1)" : "var(--glass-border, rgba(148, 163, 184, 0.35))"}`,
                  color: done || active ? "#fff" : "var(--text-secondary)",
                  boxShadow: active ? "0 4px 12px rgba(107,70,193,0.35)" : "none",
                }}
              >
                {done ? <MdCheckCircle size={15} /> : num}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? "var(--accent, #9F87D7)" : done ? "#34d399" : "var(--text-secondary)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className={!done ? "res-step-line" : ""}
                style={{
                  flex: 1, height: 3, margin: "0 6px", marginBottom: 16,
                  background: done ? "#34d399" : "var(--divider, rgba(148, 163, 184, 0.35))",
                  transition: "all 0.3s", borderRadius: 999
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectionCard({ icon, title, subtitle, selected, onClick, color = "#5B8DEF", colorBg = "rgba(91,141,239,0.10)" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
        textAlign: "left", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 12,
        background: selected ? colorBg : "var(--card-inner-bg, rgba(255,255,255,0.04))",
        border: `2px solid ${selected ? color : "rgba(255,255,255,0.08)"}`,
        outline: "none",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? colorBg : "rgba(255,255,255,0.05)",
        border: `1px solid ${selected ? color : "rgba(255,255,255,0.08)"}`,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: selected ? color : "var(--text-primary)" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: selected ? color : "transparent",
        border: `2px solid ${selected ? color : "rgba(255,255,255,0.2)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <MdCheckCircle size={12} color="#fff" />}
      </div>
    </button>
  );
}

function SummaryRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ color: "var(--text-secondary)", display: "flex" }}>{icon}</div>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function AssignWizard({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [allFlats, setAllFlats] = useState([]);
  const [residents, setResidents] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const [propertyType, setPropertyType] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [selectedFlat, setSelectedFlat] = useState(null);

  const [residentId, setResidentId] = useState("");
  const residentType = "OWNER"; // ✅ Hardcoded as Admin only assigns owners
  const [flatType, setFlatType] = useState("2BHK");
  const [parkingSlotId, setParkingSlotId] = useState("");
  const [residentSearch, setResidentSearch] = useState("");
  const { t } = useLang();

  const isApartment = propertyType === "APARTMENT";
  const totalSteps = isApartment ? 5 : 4;
  const stepLabels = isApartment
    ? [t("afTabType"), t("afTabBlock"), t("afTabFloor"), t("afTabUnit"), t("afTabResident")]
    : [t("afTabType"), t("afTabBlock"), t("afTabHouse"), t("afTabResident")];

  useEffect(() => {
    setLoadingDropdowns(true);
    Promise.all([
      API.get("/flats/unassigned"),
      API.get("/users/resident?limit=1000"), // ✅ FETCH ALL RESIDENTS for multi-flat feature
      API.get("/parking-slots/available")
    ]).then(([flatRes, residentRes, slotRes]) => {
      setAllFlats(flatRes.data || []);
      setResidents(residentRes.data?.data || residentRes.data || []); // Handle paginated response
      setAvailableSlots(slotRes.data || []);
    }).catch(console.error)
      .finally(() => setLoadingDropdowns(false));
  }, []);

  const availableBlocks = (() => {
    const seen = new Set();
    const blocks = [];
    allFlats.forEach(f => {
      const isRH = f.floor_id == null;
      if (propertyType === "APARTMENT" && isRH) return;
      if (propertyType === "ROW_HOUSE" && !isRH) return;
      const blockId = f.Block?.id || f.Floor?.Block?.id;
      const blockName = f.Block?.name || f.Floor?.Block?.name;
      if (blockId && !seen.has(blockId)) {
        seen.add(blockId);
        blocks.push({ id: blockId, name: blockName });
      }
    });
    return blocks;
  })();

  const availableFloors = (() => {
    if (!isApartment || !selectedBlockId) return [];
    const seen = new Set();
    const floors = [];
    allFlats.forEach(f => {
      if (f.floor_id == null) return;
      const blockId = f.Floor?.Block?.id;
      if (String(blockId) !== String(selectedBlockId)) return;
      const floorId = f.Floor?.id;
      const floorNum = f.Floor?.floor_number;
      if (floorId && !seen.has(floorId)) {
        seen.add(floorId);
        floors.push({ id: floorId, number: floorNum });
      }
    });
    return floors.sort((a, b) => Number(a.number) - Number(b.number));
  })();

  const availableFlats = (() => {
    if (!selectedBlockId) return [];
    return allFlats.filter(f => {
      if (isApartment) {
        if (f.floor_id == null) return false;
        const blockId = f.Floor?.Block?.id;
        if (String(blockId) !== String(selectedBlockId)) return false;
        if (selectedFloorId && String(f.Floor?.id) !== String(selectedFloorId)) return false;
        return true;
      } else {
        if (f.floor_id != null) return false;
        const blockId = f.Block?.id;
        return String(blockId) === String(selectedBlockId);
      }
    });
  })();

 const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(residentSearch.toLowerCase()) && 
    r.resident_type !== "TENANT" // ✅ FIX: Exclude tenants from the selection list!
  );

  const canGoNext = () => {
    if (step === 1) return !!propertyType;
    if (step === 2) return !!selectedBlockId;
    if (step === 3 && isApartment) return !!selectedFloorId;
    const flatStep = isApartment ? 4 : 3;
    if (step === flatStep) return !!selectedFlatId;
    return true;
  };

  const goNext = () => { setFormError(""); setStep(s => s + 1); };

  const goBack = () => {
    setFormError("");
    if (step === 2) { setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }
    if (step === 3 && isApartment) { setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }
    const flatStep = isApartment ? 4 : 3;
    if (step === flatStep) { setSelectedFlatId(""); setSelectedFlat(null); }
    setStep(s => s - 1);
  };

  const handleFlatSelect = (flatId) => {
    setSelectedFlatId(flatId);
    const flat = allFlats.find(f => String(f.id) === String(flatId));
    setSelectedFlat(flat || null);
    if (flat?.flat_type) setFlatType(flat.flat_type);
  };

  const handleSubmit = async () => {
    setFormError("");
    const unitError = getRequiredError(selectedFlatId, "Unit");
    const residentError = getRequiredError(residentId, "Resident");
    if (unitError || residentError) {
      setFormError("Please select both a unit and a resident.");
      return;
    }
    setSubmitting(true);
    try {
      await API.put(`/flats/assign/${selectedFlatId}`, {
        resident_id: residentId,
        resident_type: residentType,
        flat_type: isApartment ? flatType : null,
        parking_slot_id: parkingSlotId || null
      });
      onSuccess();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Assignment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBlock = availableBlocks.find(b => String(b.id) === String(selectedBlockId));
  const selectedFloor = availableFloors.find(f => String(f.id) === String(selectedFloorId));
  
  const flatStep = isApartment ? 4 : 3;
  const residentStep = isApartment ? 5 : 4;

  const modalShellStyle = {
    width: "100%",
    maxWidth: 560,
    background: "var(--card-bg, #0f172a)",
    border: "1.5px solid var(--glass-border, rgba(255,255,255,0.12))",
    borderRadius: 20,
    maxHeight: "90vh",
    overflowY: "auto",
    overflowX: "hidden",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(160,90,255,0.15)",
    animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const modalHeader = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), #9e58ff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(160,90,255,0.35)", flexShrink: 0 }}>
            <MdHome size={22} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>{t("afTitle")}</h3>
            <p style={{ fontSize: 12, color: "#4BCBEB", margin: "2px 0 0", fontWeight: 600 }}>
              {t("afStepOf", { step, total: totalSteps })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--glass-border, rgba(255,255,255,0.12))", background: "var(--card-inner-bg, rgba(255,255,255,0.06))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
        >
          <MdClose size={17} />
        </button>
      </div>
      <div style={{ height: 1, background: "var(--glass-border, rgba(255,255,255,0.08))", margin: "16px 0 0" }} />
    </>
  );

  if (loadingDropdowns) {
    return (
      <div className="modal-scroll-thin" style={modalShellStyle} onClick={(e) => e.stopPropagation()}>
        {modalHeader}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 24px 36px" }}>
          <Spinner />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("afLoadingUnits")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-scroll-thin" style={modalShellStyle} onClick={(e) => e.stopPropagation()}>
      {modalHeader}

      <div style={{ padding: "20px 24px 24px" }}>
      <StepIndicator step={step} total={totalSteps} labels={stepLabels} />

      {formError && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
          <MdClose size={14} style={{ flexShrink: 0 }} /> {formError}
        </div>
      )}

      {/* ── STEP 1: Property Type ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{t("afPropertyQuestion")}</p>
          <SelectionCard
            icon={<MdApartment size={20} style={{ color: "#94B5F5" }} />}
            title={t("afApartmentTitle")}
            subtitle={t("afApartmentSub")}
            selected={propertyType === "APARTMENT"}
            onClick={() => { setPropertyType("APARTMENT"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }}
            color="#5B8DEF"
            colorBg="rgba(91,141,239,0.10)"
          />
          <SelectionCard
            icon={<MdHomeWork size={20} style={{ color: "#34d399" }} />}
            title={t("afRowHouseTitle")}
            subtitle={t("afRowHouseSub")}
            selected={propertyType === "ROW_HOUSE"}
            onClick={() => { setPropertyType("ROW_HOUSE"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }}
            color="#10b981"
            colorBg="rgba(16,185,129,0.10)"
          />
        </div>
      )}

      {/* ── STEP 2: Block Selection ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{t("afWhichBlock")}</p>
          {availableBlocks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>{t("afNoBlocks")}</div>
          ) : (
            availableBlocks.map(block => (
              <SelectionCard
                key={block.id}
                icon={isApartment ? <MdApartment size={20} style={{ color: "#94B5F5" }} /> : <MdHomeWork size={20} style={{ color: "#34d399" }} />}
                title={t("afBlockName", { name: block.name })}
                subtitle={isApartment ? t("afApartmentBlockSub") : t("afRowHouseBlockSub")}
                selected={String(selectedBlockId) === String(block.id)}
                onClick={() => { setSelectedBlockId(block.id); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }}
                color={isApartment ? "#5B8DEF" : "#10b981"}
                colorBg={isApartment ? "rgba(91,141,239,0.10)" : "rgba(16,185,129,0.10)"}
              />
            ))
          )}
        </div>
      )}

      {/* ── STEP 3 (Apartment): Floor Selection ── */}
      {step === 3 && isApartment && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            {t("afWhichFloor")} <span style={{ color: "#94B5F5", fontWeight: 600 }}>{t("afBlockName", { name: selectedBlock?.name })}</span>
          </p>
          {availableFloors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>{t("afNoFloors")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {availableFloors.map(floor => (
                <button
                  key={floor.id} type="button"
                  onClick={() => { setSelectedFloorId(floor.id); setSelectedFlatId(""); setSelectedFlat(null); }}
                  style={{
                    padding: "16px 10px", borderRadius: 12, cursor: "pointer",
                    textAlign: "center", transition: "all 0.18s", outline: "none",
                    background: String(selectedFloorId) === String(floor.id) ? "rgba(91,141,239,0.12)" : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                    border: `2px solid ${String(selectedFloorId) === String(floor.id) ? "#5B8DEF" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <MdLayers size={22} style={{ color: String(selectedFloorId) === String(floor.id) ? "#94B5F5" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: String(selectedFloorId) === String(floor.id) ? "#94B5F5" : "var(--text-primary)" }}>{t("afFloorName", { number: floor.number })}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3/4: Flat Selection ── */}
      {step === flatStep && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
            {isApartment ? t("afSelectFlat") : t("afSelectHouse")}
          </p>

          {availableFlats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>{t("afNoUnits")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
              {availableFlats.map(flat => {
                const isSelected = String(selectedFlatId) === String(flat.id);
                return (
                  <button
                    key={flat.id} type="button" onClick={() => handleFlatSelect(flat.id)}
                    style={{
                      padding: "14px 10px", borderRadius: 12, cursor: "pointer",
                      textAlign: "center", transition: "all 0.18s", outline: "none",
                      background: isSelected ? (isApartment ? "rgba(91,141,239,0.12)" : "rgba(16,185,129,0.12)") : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                      border: `2px solid ${isSelected ? (isApartment ? "#5B8DEF" : "#10b981") : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {isApartment
                      ? <MdMeetingRoom size={20} style={{ color: isSelected ? "#94B5F5" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                      : <MdHomeWork size={20} style={{ color: isSelected ? "#34d399" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                    }
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? (isApartment ? "#94B5F5" : "#34d399") : "var(--text-primary)" }}>{flat.flat_number}</div>
                  </button>
                );
              })}
            </div>
          )}

          {isApartment && selectedFlatId && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{t("afFlatSize")}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {["1BHK", "2BHK", "3BHK"].map(opt => {
                  const active = flatType === opt; const s = BHK_STYLES[opt];
                  return (
                    <button key={opt} type="button" onClick={() => setFlatType(opt)} style={{
                      flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                      fontSize: 13, fontWeight: 700, transition: "all 0.18s", outline: "none",
                      background: active ? s.bg : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                      border: `2px solid ${active ? s.border : "rgba(255,255,255,0.08)"}`,
                      color: active ? s.color : "var(--text-secondary)",
                    }}>{opt}</button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP (last): Resident Selection ── */}
      {step === residentStep && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ background: "rgba(160,90,255,0.06)", border: "1px solid rgba(160,90,255,0.2)", borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "var(--accent, #9F87D7)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>{t("afSelectedUnit")}</p>
            <SummaryRow label={t("afPropType")} value={isApartment ? t("afApartmentTitle") : t("afRowHouseTitle")} icon={isApartment ? <MdApartment size={15} color="var(--accent)" /> : <MdHomeWork size={15} color="#10b981" />} />
            <SummaryRow label={t("afPhaseBlock")} value={t("afBlockName", { name: selectedBlock?.name })} icon={<MdBusiness size={15} />} />
            {isApartment && <SummaryRow label={t("afFloor")} value={t("afFloorName", { number: selectedFloor?.number })} icon={<MdLayers size={15} />} />}
            <SummaryRow label={isApartment ? t("afFlatNumber") : t("afHouseNumber")} value={selectedFlat?.flat_number} icon={<MdHome size={15} />} />
            {isApartment && <SummaryRow label={t("afConfiguration")} value={flatType} icon={<MdMeetingRoom size={15} />} />}
          </div>

          <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("afSelectResidentTitle")}
            </p>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <MdSearch size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
              <input
                className="input search-input w-full"
                style={{ paddingLeft: 36, height: 40, borderRadius: 10, fontSize: 13 }}
                placeholder={t("afSearchResident")}
                value={residentSearch}
                onChange={e => setResidentSearch(e.target.value)}
              />
              {residentSearch && (
                <button
                  type="button"
                  onClick={() => setResidentSearch("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  <MdClose size={14} />
                </button>
              )}
            </div>

            <div style={{ maxHeight: 210, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
              {filteredResidents.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>{t("afNoResidents")}</p>
              ) : filteredResidents.map(r => {
                const isSelected = String(residentId) === String(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setResidentId(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      transition: "all 0.16s ease",
                      outline: "none",
                      textAlign: "left",
                      background: isSelected ? "rgba(160,90,255,0.12)" : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                      border: `1.5px solid ${isSelected ? "var(--accent, #a05aff)" : "var(--glass-border, rgba(255,255,255,0.08))"}`,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: isSelected ? "linear-gradient(135deg, var(--accent, #6B46C1), #8b5cf6)" : "rgba(160,90,255,0.14)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, color: "#fff",
                    }}>
                      {r.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSelected ? "var(--accent, #a05aff)" : "var(--text-primary)" }}>{r.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                        {r.email && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{r.email}</span>}
                        {r.phone && <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}><MdPhone size={11} /> {r.phone}</span>}
                      </div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: isSelected ? "var(--accent, #a05aff)" : "transparent",
                      border: `2px solid ${isSelected ? "var(--accent, #a05aff)" : "var(--glass-border, rgba(255,255,255,0.2))"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <MdCheck size={13} color="#fff" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("afLinkParking")}
            </p>
            <Select
              value={parkingSlotId}
              onChange={(e) => setParkingSlotId(e.target.value)}
              className="input w-full h-11 text-sm bg-card"
              style={{ borderRadius: 12, border: "1px solid var(--glass-border)", padding: "0 14px", fontSize: 13 }}
            >
              <option value="">{t("afNoParkingOption")}</option>
              {availableSlots.map(s => (
                <option key={s.id} value={s.id}>
                  {s.parking_floor ? `${t("afFloorName", { number: s.parking_floor })} - ` : ""}{s.slot_number} ({s.vehicle_type})
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--glass-border, rgba(255,255,255,0.08))", marginTop: 20 }}>
        {step > 1 && (
          <button type="button" onClick={goBack} className="sa-btn sa-btn-ghost">
            <MdArrowBack size={15} /> {t("afBack")}
          </button>
        )}
        <button type="button" onClick={onClose} className="sa-btn sa-btn-ghost">
          {t("cancel")}
        </button>
        <div style={{ flex: 1 }} />
        {step < residentStep ? (
          <GlobalButton
            type="button"
            variant="add"
            borderDraw
            icon={MdArrowForward}
            iconPosition="right"
            onClick={goNext}
            disabled={!canGoNext()}
            style={{ fontWeight: 700, opacity: canGoNext() ? 1 : 0.45 }}
          >
            {t("afNext")}
          </GlobalButton>
        ) : (
          <GlobalButton
            type="button"
            variant="add"
            borderDraw
            icon={MdCheckCircle}
            loading={submitting}
            disabled={submitting || !residentId}
            onClick={handleSubmit}
            style={{ fontWeight: 700 }}
          >
            {submitting ? t("afAssigning") : t("afConfirmAssignment")}
          </GlobalButton>
        )}
      </div>
      </div>
    </div>
  );
}

export default function AssignFlat() {
  const [limit, setLimit] = useState(10);
  const { t } = useLang();
  const { user } = useContext(AuthContext);

  const [showForm,     setShowForm]     = useState(false);
  const [allAssigned,   setAllAssigned]   = useState([]);
  const [totalAll,     setTotalAll]     = useState(0);
  const [initialLoad,  setInitialLoad]  = useState(true);
  const [fetching,     setFetching]     = useState(false);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const debouncedSearch                 = useDebounce(search, 400);
  const [confirmId,    setConfirmId]    = useState(null);

  /* ── Filter Dropdown States ── */
  const [filterBlockId,      setFilterBlockId]      = useState("");
  const [filterFloorId,      setFilterFloorId]      = useState("");
  const [filterResidentType, setFilterResidentType] = useState("ALL");
  const [filterPropertyType, setFilterPropertyType] = useState("ALL");

  /* ── Dynamic Options ── */
  const [blocksList, setBlocksList] = useState([]);
  const [floorsList, setFloorsList] = useState([]);

  // Load society blocks
  useEffect(() => {
    const socId = user?.society_id || getSocietyId();
    if (socId) {
      API.get(`/blocks/${socId}`)
        .then(res => setBlocksList(res.data || []))
        .catch(() => setBlocksList([]));
    }
  }, [user]);

  // Load floors when block changes
  useEffect(() => {
    if (filterBlockId) {
      API.get(`/floors/${filterBlockId}`)
        .then(res => setFloorsList(res.data || []))
        .catch(() => setFloorsList([]));
    } else {
      setFloorsList([]);
      setFilterFloorId("");
    }
  }, [filterBlockId]);

  /* ── Load all assigned flats for high-speed client-side multi-dimensional filtering ── */
  const loadAssigned = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const res = await API.get("/flats/assigned?limit=1000");
      const rawAssigned = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.assigned)
        ? res.data.assigned
        : [];
      setAllAssigned(rawAssigned);
      setTotalAll(res.data.totalAll ?? res.data.pagination?.totalItems ?? rawAssigned.length);
    } catch (err) {
      console.error("Failed to load assigned flats", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadAssigned(true);
  }, [loadAssigned]);

  /* ── Multi-filter matching ── */
  const filteredAssigned = useMemo(() => {
    return allAssigned.filter(flat => {
      const isRH = flatIsRowHouse(flat);
      const blockId = flat.Block?.id || flat.Floor?.Block?.id;
      const blockName = flatBlockName(flat) || "";
      const floorNum = flatFloorNumber(flat);
      const floorId = flat.floor_id || flat.Floor?.id;
      const resType = flat.User?.resident_type;
      const resName = flat.User?.name || "";
      const resPhone = flat.User?.phone || "";
      const flatNo = flat.flat_number?.toString() || "";

      // 1. Block Filter
      if (filterBlockId && String(blockId) !== String(filterBlockId)) return false;

      // 2. Floor Filter
      if (filterFloorId) {
        if (isRH) return false;
        if (String(floorId) !== String(filterFloorId) && String(floorNum) !== String(filterFloorId)) return false;
      }

      // 3. Resident / Occupant Type Filter
      if (filterResidentType !== "ALL" && resType !== filterResidentType) return false;

      // 4. Property Type Filter
      if (filterPropertyType === "FLAT" && isRH) return false;
      if (filterPropertyType === "ROW_HOUSE" && !isRH) return false;

      // 5. Search Text Filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchFlat = flatNo.toLowerCase().includes(q);
        const matchBlock = blockName.toLowerCase().includes(q);
        const matchRes = resName.toLowerCase().includes(q);
        const matchPhone = resPhone.toLowerCase().includes(q);
        if (!matchFlat && !matchBlock && !matchRes && !matchPhone) return false;
      }

      return true;
    });
  }, [allAssigned, filterBlockId, filterFloorId, filterResidentType, filterPropertyType, debouncedSearch]);

  const totalItems = filteredAssigned.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedAssigned = filteredAssigned.slice((page - 1) * limit, page * limit);

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUnassign = async (id) => {
    try {
      await API.put(`/flats/unassign/${id}`);
      setConfirmId(null);
      loadAssigned(false);
    } catch (err) {
      console.error("Failed to unassign flat", err);
      setConfirmId(null);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    loadAssigned(false);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Page Header Single-Row Layout with All Filters Aligned ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdHome size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>
              {t("afTitle") || "Assign Flat"}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {initialLoad ? "—" : totalItems} {t("afAssignedFlats")?.toLowerCase() || "assigned properties"}
            </p>
          </div>
        </div>

        {/* Filters and Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Block Filter */}
          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterBlockId}
            onChange={e => { setFilterBlockId(e.target.value); setFilterFloorId(""); setPage(1); }}
          >
            <option value="">{t("afAllBlocks")}</option>
            {blocksList.map(b => (
              <option key={b.id} value={b.id}>{t("afBlockName", { name: b.name })}</option>
            ))}
          </Select>

          {/* Floor Filter */}
          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterFloorId}
            onChange={e => { setFilterFloorId(e.target.value); setPage(1); }}
            disabled={!filterBlockId || filterPropertyType === "ROW_HOUSE"}
          >
            <option value="">{t("afAllFloors")}</option>
            {floorsList.map(f => (
              <option key={f.id} value={f.id}>{t("afFloorName", { number: f.floor_number })}</option>
            ))}
          </Select>

          {/* Occupant Type (Owner / Tenant) */}
          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterResidentType}
            onChange={e => { setFilterResidentType(e.target.value); setPage(1); }}
          >
            <option value="ALL">{t("afAllOccupants")}</option>
            <option value="OWNER">{t("afOwner")}</option>
            <option value="TENANT">{t("afTenant")}</option>
          </Select>

          {/* Property Type (Flat / Row House) */}
          <Select
            className="input h-10 text-xs min-w-32 bg-white/5 border-white/10"
            value={filterPropertyType}
            onChange={e => { setFilterPropertyType(e.target.value); setPage(1); }}
          >
            <option value="ALL">{t("afAllTypes")}</option>
            <option value="FLAT">{t("afFlatTypeOption")}</option>
            <option value="ROW_HOUSE">{t("afRowHouseTypeOption")}</option>
          </Select>

          {/* Expandable Search */}
          <ExpandableSearch
            value={search}
            onChange={val => { setSearch(val); setPage(1); }}
            placeholder={t("afSearchPlaceholder")}
            onClear={() => setSearch("")}
            fetching={fetching}
          />

          {/* Assign Unit Button */}
          <GlobalButton
            variant="add"
            borderDraw
            icon={MdAdd}
            className="shrink-0"
            style={{ height: 42 }}
            onClick={() => { setShowForm(true); setConfirmId(null); }}
          >
            {t("afAssignBtn") || "Assign Unit"}
          </GlobalButton>
        </div>
      </div>

      {/* ── Modal Popup Overlay for Assign Wizard ── */}
      {showForm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <AssignWizard onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
        </div>,
        document.body
      )}

      {/* ── Table Container ── */}
      <div className="bg-card rounded-2xl overflow-hidden">
        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <Spinner /><p className="text-sm">{t("loading")}</p>
          </div>
        )}

        {!initialLoad && totalAll === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <MdHome size={40} className="opacity-20" />
            <p className="text-sm">{t("afNoFlats") || "No flats assigned yet."}</p>
          </div>
        )}

        {!initialLoad && totalAll > 0 && paginatedAssigned.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-secondary">
            <MdSearch size={36} className="opacity-20" />
            <p className="text-sm">{t("afNoMatch")}</p>
            <button
              onClick={() => {
                setSearch("");
                setFilterBlockId("");
                setFilterFloorId("");
                setFilterResidentType("ALL");
                setFilterPropertyType("ALL");
                setPage(1);
              }}
              style={{ fontSize: 12, color: "#94B5F5", background: "none", border: "none", cursor: "pointer" }}
            >
              {t("resetAllFilters")}
            </button>
          </div>
        )}

        {!initialLoad && paginatedAssigned.length > 0 && (
          <div key={`${page}-${filterBlockId}-${filterFloorId}-${filterResidentType}-${filterPropertyType}`} className="animate-slide-page">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--card-inner-bg)", borderBottom: "1px solid var(--divider)" }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("afColSr")}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("afColUnit")}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("afColResident")}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("afColType")}</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("afColAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssigned.map((flat, idx) => {
                    const isRH  = flatIsRowHouse(flat);
                    const block = flatBlockName(flat);
                    const floor = flatFloorNumber(flat);
                    return (
                      <tr key={flat.id} style={{ borderBottom: "1px solid var(--divider)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td className="px-5 py-3 text-xs text-secondary">{(page - 1) * limit + idx + 1}</td>
                        <td className="px-5 py-3">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: isRH ? "rgba(16,185,129,0.10)" : "rgba(91,141,239,0.10)",
                              border: `1px solid ${isRH ? "rgba(16,185,129,0.22)" : "rgba(91,141,239,0.22)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {isRH ? <MdHomeWork size={16} style={{ color: "#34d399" }} /> : <MdApartment size={16} style={{ color: "#94B5F5" }} />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{isRH ? t("afHouse") : t("afFlat")} {flat.flat_number}</span>
                                {isRH ? null : <BhkBadge type={flat.flat_type} />}
                              </div>
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                                {!isRH && floor != null && <>{t("afFloorName", { number: floor })}{block && " · "}</>}
                                {block && <>{t("afBlockName", { name: block })}</>}
                                {!block && !floor && "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(107,70,193,0.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#9F87D7" }}>
                              {flat.User?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{flat.User?.name || "—"}</p>
                              {flat.User?.phone && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0" }}>{flat.User.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><ResidentTypeBadge type={flat.User?.resident_type} /></td>
                        <td className="px-5 py-3 text-right">
                          {confirmId === flat.id ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("sure")}</span>
                              <button onClick={() => handleUnassign(flat.id)} style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 7, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>{t("yes")}</button>
                              <button onClick={() => setConfirmId(null)} style={{ fontSize: 12, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>{t("cancel")}</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmId(flat.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", cursor: "pointer" }}>
                              <MdLinkOff size={14} /> {t("afUnassign") || "Unassign"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y" style={{ borderColor: "var(--divider)" }}>
              {paginatedAssigned.map(flat => {
                const isRH  = flatIsRowHouse(flat);
                const block = flatBlockName(flat);
                const floor = flatFloorNumber(flat);
                return (
                  <div key={flat.id} style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: isRH ? "rgba(16,185,129,0.10)" : "rgba(91,141,239,0.10)", border: `1px solid ${isRH ? "rgba(16,185,129,0.22)" : "rgba(91,141,239,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isRH ? <MdHomeWork size={18} style={{ color: "#34d399" }} /> : <MdApartment size={18} style={{ color: "#94B5F5" }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{isRH ? t("afHouse") : t("afFlat")} {flat.flat_number}</span>
                            {!isRH && <BhkBadge type={flat.flat_type} />}
                            <ResidentTypeBadge type={flat.User?.resident_type} />
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "3px 0 0" }}>
                            {!isRH && floor != null ? t("afFloorName", { number: floor }) : ""}
                            {!isRH && floor != null && block ? " · " : ""}
                            {block ? t("afBlockName", { name: block }) : ""}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(107,70,193,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#9F87D7", flexShrink: 0 }}>
                              {flat.User?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{flat.User?.name || "—"}</span>
                          </div>
                        </div>
                      </div>
                      {confirmId === flat.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => handleUnassign(flat.id)} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>{t("yes")}</button>
                          <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>{t("cancel")}</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(flat.id)} style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <MdLinkOff size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--divider)" }}>
              <p className="text-xs text-secondary">{t("afShowing", { shown: paginatedAssigned.length, total: totalItems })}</p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { setLimit(s); setPage(1); }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}