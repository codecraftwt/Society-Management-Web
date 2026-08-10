import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd, MdSearch, MdClose, MdHome, MdPerson,
  MdChevronLeft, MdChevronRight, MdLinkOff,
  MdApartment, MdLayers, MdBusiness, MdHomeWork,
  MdCheckCircle, MdArrowForward,
  MdArrowBack, MdMeetingRoom,
} from "react-icons/md";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
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

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={15} /> Prev
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`e-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

const RESIDENT_TYPE_STYLES = {
  OWNER:  { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)", label: "Owner" },
  TENANT: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)", label: "Tenant" },
};

const BHK_STYLES = {
  "1BHK": { bg: "rgba(99,102,241,0.10)",  color: "#818cf8", border: "rgba(99,102,241,0.22)" },
  "2BHK": { bg: "rgba(59,130,246,0.10)",  color: "#60a5fa", border: "rgba(59,130,246,0.22)" },
  "3BHK": { bg: "rgba(168,85,247,0.10)", color: "#c084fc", border: "rgba(168,85,247,0.22)" },
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

const LIMIT = 10;

function StepIndicator({ step, total, labels }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
      {labels.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < total - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, transition: "all 0.3s",
                background: done ? "#34d399" : active ? "#3b82f6" : "var(--card-inner-bg, rgba(255,255,255,0.06))",
                border: `2px solid ${done ? "#34d399" : active ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                color: done || active ? "#fff" : "var(--text-secondary)",
              }}>
                {done ? <MdCheckCircle size={16} /> : num}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#3b82f6" : done ? "#34d399" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 6px", marginBottom: 18,
                background: done ? "#34d399" : "rgba(255,255,255,0.08)",
                transition: "all 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectionCard({ icon, title, subtitle, selected, onClick, color = "#3b82f6", colorBg = "rgba(59,130,246,0.10)" }) {
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

  const isApartment = propertyType === "APARTMENT";
  const totalSteps = isApartment ? 5 : 4;
  const stepLabels = isApartment
    ? ["Type", "Block", "Floor", "Unit", "Resident"]
    : ["Type", "Block", "House", "Resident"];

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
    if (!selectedFlatId || !residentId) {
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

  if (loadingDropdowns) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 20px" }}>
        <Spinner /><p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading available units...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl animate-scaleIn" style={{ padding: "24px", maxWidth: 560 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", margin: 0 }}>Assign Unit to Resident</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>Step {step} of {totalSteps}</p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
          <MdClose size={20} />
        </button>
      </div>

      <StepIndicator step={step} total={totalSteps} labels={stepLabels} />

      {formError && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>
          {formError}
        </div>
      )}

      {/* ── STEP 1: Property Type ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>What type of property are you assigning?</p>
          <SelectionCard
            icon={<MdApartment size={20} style={{ color: "#60a5fa" }} />}
            title="Apartment / Flat"
            subtitle="Multi-floor building with individual units (e.g. A-101, A-202)"
            selected={propertyType === "APARTMENT"}
            onClick={() => { setPropertyType("APARTMENT"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }}
            color="#3b82f6"
            colorBg="rgba(59,130,246,0.10)"
          />
          <SelectionCard
            icon={<MdHomeWork size={20} style={{ color: "#34d399" }} />}
            title="Row House / Villa"
            subtitle="Independent ground-level houses (e.g. RH-1, RH-2)"
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
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Which block or phase is the unit in?</p>
          {availableBlocks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>No available blocks for this property type.</div>
          ) : (
            availableBlocks.map(block => (
              <SelectionCard
                key={block.id}
                icon={isApartment ? <MdApartment size={20} style={{ color: "#60a5fa" }} /> : <MdHomeWork size={20} style={{ color: "#34d399" }} />}
                title={`Block ${block.name}`}
                subtitle={`${isApartment ? "Apartment block" : "Row house block"}`}
                selected={String(selectedBlockId) === String(block.id)}
                onClick={() => { setSelectedBlockId(block.id); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }}
                color={isApartment ? "#3b82f6" : "#10b981"}
                colorBg={isApartment ? "rgba(59,130,246,0.10)" : "rgba(16,185,129,0.10)"}
              />
            ))
          )}
        </div>
      )}

      {/* ── STEP 3 (Apartment): Floor Selection ── */}
      {step === 3 && isApartment && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            Which floor is the flat on? <span style={{ color: "#60a5fa", fontWeight: 600 }}>Block {selectedBlock?.name}</span>
          </p>
          {availableFloors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>No available floors in this block.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {availableFloors.map(floor => (
                <button
                  key={floor.id} type="button"
                  onClick={() => { setSelectedFloorId(floor.id); setSelectedFlatId(""); setSelectedFlat(null); }}
                  style={{
                    padding: "16px 10px", borderRadius: 12, cursor: "pointer",
                    textAlign: "center", transition: "all 0.18s", outline: "none",
                    background: String(selectedFloorId) === String(floor.id) ? "rgba(59,130,246,0.12)" : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                    border: `2px solid ${String(selectedFloorId) === String(floor.id) ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <MdLayers size={22} style={{ color: String(selectedFloorId) === String(floor.id) ? "#60a5fa" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: String(selectedFloorId) === String(floor.id) ? "#60a5fa" : "var(--text-primary)" }}>Floor {floor.number}</div>
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
            Select an available {isApartment ? "flat" : "house"}.
          </p>

          {availableFlats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: 13 }}>No available units.</div>
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
                      background: isSelected ? (isApartment ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)") : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                      border: `2px solid ${isSelected ? (isApartment ? "#3b82f6" : "#10b981") : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {isApartment
                      ? <MdMeetingRoom size={20} style={{ color: isSelected ? "#60a5fa" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                      : <MdHomeWork size={20} style={{ color: isSelected ? "#34d399" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                    }
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? (isApartment ? "#60a5fa" : "#34d399") : "var(--text-primary)" }}>{flat.flat_number}</div>
                  </button>
                );
              })}
            </div>
          )}

          {isApartment && selectedFlatId && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Flat Size (BHK)</p>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 12, padding: "12px 16px", marginBottom: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Selected Unit</p>
            <SummaryRow label="Type" value={isApartment ? "Apartment" : "Row House"} icon={isApartment ? <MdApartment size={14} /> : <MdHomeWork size={14} />} />
            <SummaryRow label="Block" value={`Block ${selectedBlock?.name}`} icon={<MdBusiness size={14} />} />
            {isApartment && <SummaryRow label="Floor" value={`Floor ${selectedFloor?.number}`} icon={<MdLayers size={14} />} />}
            <SummaryRow label={isApartment ? "Flat" : "House"} value={selectedFlat?.flat_number} icon={<MdHome size={14} />} />
            {isApartment && <SummaryRow label="BHK" value={flatType} icon={<MdMeetingRoom size={14} />} />}
          </div>

          {/* ✅ STATIC OWNER ROLE - NO TOGGLE */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Assignment Role
            </p>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 18 }}>🏠</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Owner</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Admins exclusively assign Owners to properties. Owners can later assign Tenants via their app.</div>
              </div>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Select Resident</p>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
              <input className="input w-full" style={{ paddingLeft: 32 }} placeholder="Search by name..." value={residentSearch} onChange={e => setResidentSearch(e.target.value)} />
            </div>

            <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredResidents.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>No residents found.</p>
              ) : filteredResidents.map(r => {
                const isSelected = String(residentId) === String(r.id);
                return (
                  <button
                    key={r.id} type="button" onClick={() => setResidentId(r.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.16s", outline: "none", textAlign: "left",
                      background: isSelected ? "rgba(59,130,246,0.10)" : "var(--card-inner-bg, rgba(255,255,255,0.04))",
                      border: `2px solid ${isSelected ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: isSelected ? "rgba(59,130,246,0.2)" : "rgba(99,102,241,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: isSelected ? "#60a5fa" : "#818cf8",
                    }}>
                      {r.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isSelected ? "#60a5fa" : "var(--text-primary)" }}>{r.name}</p>
                      {r.phone && <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{r.phone}</p>}
                    </div>
                    {isSelected && <MdCheckCircle size={18} style={{ color: "#3b82f6", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Assign Parking Slot (Optional)</p>
            <select
              value={parkingSlotId}
              onChange={(e) => setParkingSlotId(e.target.value)}
              className="input w-full h-11 text-sm bg-card"
              style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", padding: "0 14px" }}
            >
              <option value="">-- No Parking --</option>
              {availableSlots.map(s => (
                <option key={s.id} value={s.id} style={{ background: "var(--bg-default)", color: "var(--text-primary)" }}>
                  {s.parking_floor ? `Floor ${s.parking_floor} - ` : ""}{s.slot_number} ({s.vehicle_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        {step > 1 && (
          <button type="button" onClick={goBack} className="btn-muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MdArrowBack size={16} /> Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < residentStep ? (
          <button type="button" onClick={goNext} disabled={!canGoNext()} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, opacity: canGoNext() ? 1 : 0.45 }}>
            Next <MdArrowForward size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || !residentId} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, opacity: (submitting || !residentId) ? 0.65 : 1 }}>
            {submitting ? <><Spinner small /> Assigning…</> : <><MdCheckCircle size={16} /> Confirm Assignment</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AssignFlat() {
  const { t } = useLang();

  const [showForm,     setShowForm]     = useState(false);
  const [assigned,     setAssigned]     = useState([]);
  const [totalAll,     setTotalAll]     = useState(0);
  const [initialLoad,  setInitialLoad]  = useState(true);
  const [fetching,     setFetching]     = useState(false);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalItems,   setTotalItems]   = useState(0);
  const [search,       setSearch]       = useState("");
  const debouncedSearch                 = useDebounce(search, 500);
  const [confirmId,    setConfirmId]    = useState(null);
  const [filterType,   setFilterType]   = useState("ALL");

  const loadAssigned = useCallback(async (pageNum, currentSearch, currentFilter, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({ page: pageNum, limit: LIMIT });
      if (currentSearch) params.set("search", currentSearch);
      if (currentFilter && currentFilter !== "ALL") params.set("filter_type", currentFilter);
      const res = await API.get(`/flats/assigned?${params}`);
      setAssigned(res.data.data || []);
      setTotalAll(res.data.totalAll ?? res.data.pagination?.totalItems ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalItems(res.data.pagination?.totalItems ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load assigned flats", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadAssigned(1, "", "ALL", true); }, [loadAssigned]);
  useEffect(() => { if (!initialLoad) loadAssigned(1, debouncedSearch, filterType); }, [debouncedSearch, filterType, initialLoad, loadAssigned]);

  const handlePageChange = (p) => loadAssigned(p, debouncedSearch, filterType);

  const handleUnassign = async (id) => {
    try {
      await API.put(`/flats/unassign/${id}`);
      setConfirmId(null);
      const newPage = assigned.length === 1 && page > 1 ? page - 1 : page;
      loadAssigned(newPage, debouncedSearch, filterType);
    } catch (err) {
      console.error("Failed to unassign flat", err);
      setConfirmId(null);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    loadAssigned(1, debouncedSearch, filterType);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <MdHome size={20} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("afTitle") || "Assign Flat"}</h2>
            <p className="text-secondary text-xs mt-0.5">
              {initialLoad ? "—" : totalAll} {t("afAssignedFlats")?.toLowerCase() || "assigned flats"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(p => !p); setConfirmId(null); }}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center shrink-0"
        >
          {showForm ? <MdClose size={18} /> : <MdAdd size={18} />}
          {showForm ? "Close" : (t("afAssignBtn") || "Assign Unit")}
        </button>
      </div>

      {showForm && <AssignWizard onClose={() => setShowForm(false)} onSuccess={handleSuccess} />}

      <div className="bg-card rounded-2xl overflow-hidden">
        <div style={{ borderBottom: "1px solid var(--divider)", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", gap: 12, flexWrap: "wrap" }}>
            <p className="text-xs text-secondary" style={{ flexShrink: 0 }}>
              {initialLoad ? "—" : `${totalItems} assigned`}
              {search && !initialLoad && ` matching "${search}"`}
            </p>
            <div style={{ position: "relative", maxWidth: 260, width: "100%" }}>
              <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
              <input className="input h-9 text-xs w-full" style={{ paddingLeft: 30 }}
                placeholder="Search flat or resident…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {fetching && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}><Spinner small /></span>}
              {!fetching && search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                  <MdClose size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <Spinner /><p className="text-sm">Loading…</p>
          </div>
        )}

        {!initialLoad && totalAll === 0 && filterType === "ALL" && !search && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <MdHome size={40} className="opacity-20" />
            <p className="text-sm">{t("afNoFlats") || "No flats assigned yet."}</p>
          </div>
        )}

        {!initialLoad && (totalAll === 0 || assigned.length === 0) && (filterType !== "ALL" || !!search) && !fetching && (
          <div className="flex flex-col items-center gap-2 py-14 text-secondary">
            <MdSearch size={36} className="opacity-20" />
            <p className="text-sm">No flats match your filter.</p>
            <button onClick={() => { setSearch(""); setFilterType("ALL"); }} style={{ fontSize: 12, color: "#60a5fa", background: "none", border: "none", cursor: "pointer" }}>
              Clear filters
            </button>
          </div>
        )}

        {!initialLoad && assigned.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--card-inner-bg)", borderBottom: "1px solid var(--divider)" }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Unit</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Resident</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Type</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.map((flat, idx) => {
                    const isRH  = flatIsRowHouse(flat);
                    const block = flatBlockName(flat);
                    const floor = flatFloorNumber(flat);
                    return (
                      <tr key={flat.id} style={{ borderBottom: "1px solid var(--divider)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td className="px-5 py-3 text-xs text-secondary">{(page - 1) * LIMIT + idx + 1}</td>
                        <td className="px-5 py-3">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: isRH ? "rgba(16,185,129,0.10)" : "rgba(59,130,246,0.10)",
                              border: `1px solid ${isRH ? "rgba(16,185,129,0.22)" : "rgba(59,130,246,0.22)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {isRH ? <MdHomeWork size={16} style={{ color: "#34d399" }} /> : <MdApartment size={16} style={{ color: "#60a5fa" }} />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{isRH ? "House" : "Flat"} {flat.flat_number}</span>
                                {isRH ? null : <BhkBadge type={flat.flat_type} />}
                              </div>
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                                {!isRH && floor != null && <>Floor {floor}{block && " · "}</>}
                                {block && <>Block {block}</>}
                                {!block && !floor && "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(99,102,241,0.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#818cf8" }}>
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
                              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sure?</span>
                              <button onClick={() => handleUnassign(flat.id)} style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 7, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>Yes</button>
                              <button onClick={() => setConfirmId(null)} style={{ fontSize: 12, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
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
              {assigned.map(flat => {
                const isRH  = flatIsRowHouse(flat);
                const block = flatBlockName(flat);
                const floor = flatFloorNumber(flat);
                return (
                  <div key={flat.id} style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: isRH ? "rgba(16,185,129,0.10)" : "rgba(59,130,246,0.10)", border: `1px solid ${isRH ? "rgba(16,185,129,0.22)" : "rgba(59,130,246,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isRH ? <MdHomeWork size={18} style={{ color: "#34d399" }} /> : <MdApartment size={18} style={{ color: "#60a5fa" }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{isRH ? "House" : "Flat"} {flat.flat_number}</span>
                            {!isRH && <BhkBadge type={flat.flat_type} />}
                            <ResidentTypeBadge type={flat.User?.resident_type} />
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "3px 0 0" }}>
                            {!isRH && floor != null ? `Floor ${floor}` : ""}
                            {!isRH && floor != null && block ? " · " : ""}
                            {block ? `Block ${block}` : ""}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>
                              {flat.User?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{flat.User?.name || "—"}</span>
                          </div>
                        </div>
                      </div>
                      {confirmId === flat.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => handleUnassign(flat.id)} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>Yes</button>
                          <button onClick={() => setConfirmId(null)} style={{ fontSize: 11, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
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
              <p className="text-xs text-secondary">Showing {assigned.length} of {totalItems}</p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}