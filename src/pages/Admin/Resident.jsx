
import { useEffect, useState, useCallback, useRef, useContext, useMemo } from "react";

import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdPersonAdd, MdDelete, MdSearch, MdClose, MdHome,
  MdChevronLeft, MdChevronRight, MdPerson, MdApartment,
  MdLayers, MdAdd, MdHomeWork, MdMeetingRoom, MdCheckCircle,
  MdUploadFile, MdBadge, MdCreditCard, MdCheck, MdDirectionsCar,
  MdPeople, MdPhone, MdContactPhone, MdEdit, MdArrowBack,
  MdArrowForward, MdLocalParking, MdWarning,
} from "react-icons/md";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";

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
          <button key={p} onClick={() => onPageChange(p)} className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   FLAT DATA HELPERS
───────────────────────────────────────── */
function flatBlockName(flat) {
  return flat?.Floor?.Block?.name || flat?.Block?.name || flat?.block_name || null;
}
function flatFloorNumber(flat) {
  return flat?.Floor?.floor_number ?? flat?.floor_number ?? null;
}
function flatIsRowHouse(flat) {
  return flat?.floor_id == null;
}

/* ─────────────────────────────────────────
   BADGE STYLES
───────────────────────────────────────── */
const RESIDENT_TYPE_STYLES = {
  OWNER: { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)", label: "Owner" },
  TENANT: { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)", label: "Tenant" },
};
const BHK_STYLES = {
  "1BHK": { bg: "rgba(107,70,193,0.10)", color: "#9F87D7", border: "rgba(107,70,193,0.22)" },
  "2BHK": { bg: "rgba(91,141,239,0.10)", color: "#94B5F5", border: "rgba(91,141,239,0.22)" },
  "3BHK": { bg: "rgba(107,70,193,0.10)", color: "#9F87D7", border: "rgba(107,70,193,0.22)" },
};

function ResidentTypeBadge({ type }) {
  if (!type) return null;
  const s = RESIDENT_TYPE_STYLES[type] || RESIDENT_TYPE_STYLES.OWNER;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: "0.02em" }}>
      {s.label}
    </span>
  );
}

function BhkBadge({ type }) {
  if (!type) return null;
  const s = BHK_STYLES[type] || BHK_STYLES["2BHK"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {type}
    </span>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionDivider({ icon: Icon, label, required }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
      <Icon size={13} />
      {label}
      {required && <span style={{ color: "#f87171", fontSize: 10 }}>*</span>}
      <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
    </div>
  );
}

function CounterField({ value, onChange, min = 0, max = 99 }) {
  return (
    <input
      className="input w-full"
      type="number"
      value={value}
      min={min}
      max={max}
      placeholder="0"
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") { onChange(""); return; }
        const parsed = parseInt(raw, 10);
        if (isNaN(parsed)) return;
        onChange(Math.min(max, Math.max(min, parsed)));
      }}
      onFocus={(e) => e.target.select()}
      onWheel={(e) => e.currentTarget.blur()}
    />
  );
}

function DocumentUploadField({ label, icon: Icon, accept, file, onChange, required }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const preview = file?.type?.startsWith("image/") ? URL.createObjectURL(file) : null;
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const dropped = e.dataTransfer.files?.[0]; if (dropped) onChange(dropped); }}
        style={{ borderRadius: 12, border: `2px dashed ${file ? "rgba(34,197,94,0.5)" : dragging ? "rgba(107,70,193,0.6)" : "rgba(255,255,255,0.12)"}`, background: file ? "rgba(34,197,94,0.06)" : dragging ? "rgba(107,70,193,0.06)" : "var(--card-inner-bg,rgba(255,255,255,0.04))", padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12, minHeight: 64 }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: file ? "rgba(34,197,94,0.12)" : "rgba(107,70,193,0.10)", border: `1px solid ${file ? "rgba(34,197,94,0.25)" : "rgba(107,70,193,0.20)"}` }}>
          {file ? <MdCheck size={20} style={{ color: "#4ade80" }} /> : <Icon size={20} style={{ color: "#9F87D7" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {file ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Click or drag to upload</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>PDF or Image · Max 2MB</p>
            </>
          )}
        </div>
        {file && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", flexShrink: 0 }}>
            <MdClose size={16} />
          </button>
        )}
        {preview && <img src={preview} alt="preview" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />}
        <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STEP INDICATOR
═══════════════════════════════════════════ */
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
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, transition: "all 0.3s", background: done ? "#34d399" : active ? "linear-gradient(135deg,#6B46C1,#6B46C1)" : "rgba(255,255,255,0.07)", border: `2px solid ${done ? "#34d399" : active ? "#6B46C1" : "rgba(255,255,255,0.12)"}`, color: done || active ? "#fff" : "var(--text-secondary)", boxShadow: active ? "0 4px 12px rgba(107,70,193,0.35)" : "none" }}>
                {done ? <MdCheckCircle size={14} /> : num}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#9F87D7" : done ? "#34d399" : "var(--text-secondary)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 16, background: done ? "#34d399" : "rgba(255,255,255,0.08)", transition: "all 0.3s", borderRadius: 999 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectionCard({ icon, title, subtitle, selected, onClick, color = "#6B46C1", colorBg = "rgba(107,70,193,0.10)" }) {
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", padding: "14px 16px", borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 14, outline: "none", background: selected ? colorBg : "rgba(255,255,255,0.03)", border: `2px solid ${selected ? color : "rgba(255,255,255,0.08)"}`, boxShadow: selected ? `0 0 0 1px ${color}22` : "none" }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? colorBg : "rgba(255,255,255,0.05)", border: `1px solid ${selected ? color : "rgba(255,255,255,0.08)"}` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: selected ? color : "var(--text-primary)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: selected ? color : "transparent", border: `2px solid ${selected ? color : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
        {selected && <MdCheckCircle size={12} color="#fff" />}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   ASSIGN FLAT MODAL
═══════════════════════════════════════════ */
function AssignFlatModal({ residentId, residentName, societyId, onClose, onSuccess }) {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN";
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [allFlats, setAllFlats] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [propertyType, setPropertyType] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [flatType, setFlatType] = useState("2BHK");
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);

  const isApartment = propertyType === "APARTMENT";
  const totalSteps = isApartment ? 4 : 3;
  const stepLabels = isApartment ? ["Type", "Block", "Floor", "Unit"] : ["Type", "Block", "Unit"];
  const flatStep = isApartment ? 4 : 3;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setLoadingData(true);
    const headers = isSuperAdmin && societyId ? { "x-society-id": societyId } : {};
    Promise.all([
      API.get("/flats/unassigned", { headers }),
      API.get("/parking-slots/available", { headers }),
    ])
      .then(([fRes, sRes]) => {
        setAllFlats(fRes.data || []);
        setAvailableSlots(sRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [residentId, societyId, isSuperAdmin]);

  const availableBlocks = (() => {
    const seen = new Set(); const out = [];
    allFlats.forEach((f) => {
      const isRH = f.floor_id == null;
      if (propertyType === "APARTMENT" && isRH) return;
      if (propertyType === "ROW_HOUSE" && !isRH) return;
      const bid = f.Block?.id || f.Floor?.Block?.id;
      const bname = f.Block?.name || f.Floor?.Block?.name;
      if (bid && !seen.has(bid)) { seen.add(bid); out.push({ id: bid, name: bname }); }
    });
    return out;
  })();

  const availableFloors = (() => {
    if (!isApartment || !selectedBlockId) return [];
    const seen = new Set(); const out = [];
    allFlats.forEach((f) => {
      if (f.floor_id == null) return;
      if (String(f.Floor?.Block?.id) !== String(selectedBlockId)) return;
      const fid = f.Floor?.id; const fnum = f.Floor?.floor_number;
      if (fid && !seen.has(fid)) { seen.add(fid); out.push({ id: fid, number: fnum }); }
    });
    return out.sort((a, b) => Number(a.number) - Number(b.number));
  })();

  const availableFlats = (() => {
    if (!selectedBlockId) return [];
    return allFlats.filter((f) => {
      if (isApartment) {
        if (f.floor_id == null) return false;
        if (String(f.Floor?.Block?.id) !== String(selectedBlockId)) return false;
        if (selectedFloorId && String(f.Floor?.id) !== String(selectedFloorId)) return false;
        return true;
      } else {
        if (f.floor_id != null) return false;
        return String(f.Block?.id) === String(selectedBlockId);
      }
    });
  })();

  const selectedBlock = availableBlocks.find((b) => String(b.id) === String(selectedBlockId));
  const selectedFloor = availableFloors.find((f) => String(f.id) === String(selectedFloorId));

  const canGoNext = () => {
    if (step === 1) return !!propertyType;
    if (step === 2) return !!selectedBlockId;
    if (step === 3 && isApartment) return !!selectedFloorId;
    return !!selectedFlatId;
  };

  const goBack = () => {
    setFormError("");
    if (step === 2) { setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }
    if (step === 3 && isApartment) { setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }
    if (step === flatStep) { setSelectedFlatId(""); setSelectedFlat(null); }
    setStep((s) => s - 1);
  };

  const handleFlatSelect = (flatId) => {
    setSelectedFlatId(flatId);
    const flat = allFlats.find((f) => String(f.id) === String(flatId));
    setSelectedFlat(flat || null);
    if (flat?.flat_type) setFlatType(flat.flat_type);
    setSelectedSlotIds([]);
  };

  const toggleSlot = (slotId) => {
    const sid = String(slotId);
    setSelectedSlotIds(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!selectedFlatId) { setFormError("Please select a unit."); return; }
    setSubmitting(true);
    try {
      const parkingSlots = selectedSlotIds.map((id, idx) => ({
        slot_id: Number(id),
        parking_type: idx === 0 ? "DEFAULT" : "EXTRA",
      }));
      const payload = {
        resident_id: Number(residentId),
        resident_type: "OWNER",
        flat_type: isApartment ? flatType : null,
        parking_slots: parkingSlots,
      };
      await API.put(`/flats/assign/${selectedFlatId}`, payload);
      toast.success(`Flat assigned to ${residentName}`);
      onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message || "Assignment failed. Please try again.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, background: "var(--card-bg,rgba(15,23,42,0.98))", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, maxHeight: "90vh", overflowY: "auto", backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(107,70,193,0.08)", animation: "modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 22px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#6B46C1,#6B46C1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(107,70,193,0.3)" }}>
              <MdHome size={18} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Assign New Flat</p>
              <p style={{ margin: 0, fontSize: 12, color: "#9F87D7", fontWeight: 600 }}>→ {residentName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
            <MdClose size={17} />
          </button>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "16px 0 0" }} />

        <div style={{ padding: "20px 22px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingData ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "30px 0", color: "var(--text-secondary)", fontSize: 13, justifyContent: "center" }}>
              <Spinner small /> Loading available units…
            </div>
          ) : (
            <>
              <StepIndicator step={step} total={totalSteps} labels={stepLabels} />

              {formError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
                  <MdClose size={14} style={{ flexShrink: 0 }} /> {formError}
                </div>
              )}

              {/* STEP 1: Property Type */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Property Type</p>
                  <SelectionCard icon={<MdApartment size={18} style={{ color: "#9F87D7" }} />} title="Apartment / Flat" subtitle="Multi-floor building" selected={propertyType === "APARTMENT"} onClick={() => { setPropertyType("APARTMENT"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }} color="#6B46C1" colorBg="rgba(107,70,193,0.10)" />
                  <SelectionCard icon={<MdHomeWork size={18} style={{ color: "#34d399" }} />} title="Row House / Villa" subtitle="Ground-level independent house" selected={propertyType === "ROW_HOUSE"} onClick={() => { setPropertyType("ROW_HOUSE"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }} color="#10b981" colorBg="rgba(16,185,129,0.10)" />
                </div>
              )}

              {/* STEP 2: Block */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Block</p>
                  {availableBlocks.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>No available blocks for this property type.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px,1fr))", gap: 8 }}>
                      {availableBlocks.map((block) => {
                        const active = String(selectedBlockId) === String(block.id);
                        return (
                          <button key={block.id} type="button" onClick={() => { setSelectedBlockId(block.id); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); }}
                            style={{ padding: "14px 10px", borderRadius: 14, cursor: "pointer", textAlign: "center", transition: "all 0.18s", outline: "none", background: active ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)", border: `2px solid ${active ? "#6B46C1" : "rgba(255,255,255,0.08)"}` }}>
                            {isApartment ? <MdApartment size={22} style={{ color: active ? "#9F87D7" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} /> : <MdHomeWork size={22} style={{ color: active ? "#34d399" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />}
                            <div style={{ fontSize: 13, fontWeight: 700, color: active ? (isApartment ? "#9F87D7" : "#34d399") : "var(--text-primary)" }}>Block {block.name}</div>
                            {active && <MdCheckCircle size={12} style={{ color: isApartment ? "#9F87D7" : "#34d399", marginTop: 4 }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Floor */}
              {step === 3 && isApartment && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Floor — <span style={{ color: "#9F87D7" }}>Block {selectedBlock?.name}</span></p>
                  {availableFloors.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>No floors with vacant flats.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px,1fr))", gap: 8 }}>
                      {availableFloors.map((floor) => {
                        const active = String(selectedFloorId) === String(floor.id);
                        return (
                          <button key={floor.id} type="button" onClick={() => { setSelectedFloorId(floor.id); setSelectedFlatId(""); setSelectedFlat(null); }}
                            style={{ padding: "14px 8px", borderRadius: 14, cursor: "pointer", textAlign: "center", transition: "all 0.18s", outline: "none", background: active ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)", border: `2px solid ${active ? "#6B46C1" : "rgba(255,255,255,0.08)"}` }}>
                            <MdLayers size={20} style={{ color: active ? "#9F87D7" : "var(--text-secondary)", display: "block", margin: "0 auto 6px" }} />
                            <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#9F87D7" : "var(--text-primary)" }}>Floor {floor.number}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP flatStep: Unit + Parking */}
              {step === flatStep && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select {isApartment ? "Flat" : "House"}</p>
                    {availableFlats.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>No vacant units available.</div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px,1fr))", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                        {availableFlats.map((flat) => {
                          const isSel = String(selectedFlatId) === String(flat.id);
                          const color = isApartment ? "#9F87D7" : "#34d399";
                          const bg = isApartment ? "rgba(107,70,193,0.12)" : "rgba(16,185,129,0.12)";
                          const borderC = isApartment ? "#6B46C1" : "#10b981";
                          return (
                            <button key={flat.id} type="button" onClick={() => handleFlatSelect(flat.id)}
                              style={{ padding: "12px 6px", borderRadius: 12, cursor: "pointer", textAlign: "center", transition: "all 0.16s", outline: "none", background: isSel ? bg : "rgba(255,255,255,0.04)", border: `2px solid ${isSel ? borderC : "rgba(255,255,255,0.08)"}` }}>
                              {isApartment ? <MdMeetingRoom size={18} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 4px" }} /> : <MdHomeWork size={18} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 4px" }} />}
                              <div style={{ fontSize: 12, fontWeight: 700, color: isSel ? color : "var(--text-primary)" }}>{flat.flat_number}</div>
                              {isSel && <MdCheckCircle size={11} style={{ color, marginTop: 3 }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {isApartment && selectedFlatId && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Flat Size (BHK)</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["1BHK", "2BHK", "3BHK"].map((opt) => {
                          const active = flatType === opt;
                          const s = BHK_STYLES[opt];
                          return (
                            <button key={opt} type="button" onClick={() => setFlatType(opt)}
                              style={{ flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.18s", outline: "none", background: active ? s.bg : "rgba(255,255,255,0.04)", border: `2px solid ${active ? s.border : "rgba(255,255,255,0.08)"}`, color: active ? s.color : "var(--text-secondary)" }}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedFlatId && availableSlots.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Parking Slots
                        <span style={{ marginLeft: 6, fontWeight: 400, textTransform: "none", fontSize: 10, letterSpacing: 0, color: "var(--text-secondary)" }}>
                          (optional · 1st selected = Default, others = Extra)
                        </span>
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6, maxHeight: 140, overflowY: "auto" }}>
                        {availableSlots.map((s) => {
                          const isSel = selectedSlotIds.includes(String(s.id));
                          const selIdx = selectedSlotIds.indexOf(String(s.id));
                          const badgeLabel = selIdx === 0 ? "DEFAULT" : selIdx > 0 ? "EXTRA" : null;
                          return (
                            <button key={s.id} type="button" onClick={() => toggleSlot(s.id)}
                              style={{ padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all 0.16s", outline: "none", background: isSel ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)", border: `2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}` }}>
                              <MdLocalParking size={16} style={{ color: isSel ? "#C0B0E5" : "var(--text-secondary)", display: "block", margin: "0 auto 3px" }} />
                              <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? "#C0B0E5" : "var(--text-primary)" }}>{s.slot_number}</div>
                              {s.vehicle_type && <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>{s.vehicle_type}</div>}
                              {badgeLabel && (
                                <div style={{ fontSize: 9, fontWeight: 800, color: badgeLabel === "DEFAULT" ? "#4ade80" : "#fbbf24", marginTop: 2 }}>
                                  {badgeLabel}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedSlotIds.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                          {selectedSlotIds.map((sid, idx) => {
                            const slotObj = availableSlots.find(s => String(s.id) === sid);
                            if (!slotObj) return null;
                            return (
                              <div key={sid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, background: "rgba(107,70,193,0.07)", border: "1px solid rgba(107,70,193,0.18)" }}>
                                <MdLocalParking size={13} style={{ color: "#C0B0E5", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#C0B0E5", flex: 1 }}>
                                  {slotObj.slot_number}{slotObj.vehicle_type ? ` · ${slotObj.vehicle_type}` : ""}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: idx === 0 ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)", color: idx === 0 ? "#4ade80" : "#fbbf24", border: `1px solid ${idx === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}` }}>
                                  {idx === 0 ? "DEFAULT" : "EXTRA"}
                                </span>
                                <button type="button" onClick={() => toggleSlot(slotObj.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                                  <MdClose size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFlat && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: isApartment ? "rgba(107,70,193,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${isApartment ? "rgba(107,70,193,0.20)" : "rgba(16,185,129,0.20)"}` }}>
                      {isApartment ? <MdApartment size={20} style={{ color: "#9F87D7", flexShrink: 0 }} /> : <MdHomeWork size={20} style={{ color: "#34d399", flexShrink: 0 }} />}
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 14, color: isApartment ? "#9F87D7" : "#34d399", margin: 0, letterSpacing: "-0.01em" }}>
                          {isApartment ? "Flat" : "House"} {selectedFlat.flat_number}{isApartment && ` · ${flatType}`}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "3px 0 0" }}>
                          {selectedBlock && `Block ${selectedBlock.name}`}
                          {isApartment && selectedFloor && ` · Floor ${selectedFloor.number}`}
                          {selectedSlotIds.length > 0 && ` · ${selectedSlotIds.length} slot(s)`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                {step > 1 && (
                  <button type="button" onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-secondary)", cursor: "pointer" }}>
                    <MdArrowBack size={15} /> Back
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {step < flatStep ? (
                  <button type="button" onClick={() => { setFormError(""); setStep((s) => s + 1); }} disabled={!canGoNext()}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: canGoNext() ? "linear-gradient(135deg,#6B46C1,#6B46C1)" : "rgba(255,255,255,0.06)", border: "none", color: canGoNext() ? "#fff" : "var(--text-secondary)", cursor: canGoNext() ? "pointer" : "not-allowed", boxShadow: canGoNext() ? "0 4px 14px rgba(107,70,193,0.35)" : "none", transition: "all 0.2s" }}>
                    Next <MdArrowForward size={15} />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={submitting || !selectedFlatId}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, fontSize: 13, fontWeight: 800, background: submitting || !selectedFlatId ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#6B46C1,#6B46C1)", border: "none", color: submitting || !selectedFlatId ? "var(--text-secondary)" : "#fff", cursor: submitting || !selectedFlatId ? "not-allowed" : "pointer", boxShadow: submitting || !selectedFlatId ? "none" : "0 4px 16px rgba(107,70,193,0.4)", transition: "all 0.2s" }}>
                    {submitting ? <><Spinner small /> Assigning…</> : <><MdCheckCircle size={16} /> Confirm Assignment</>}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes modalPop { from { transform: scale(0.94) translateY(12px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   MULTI-FLAT ASSIGN SECTION
───────────────────────────────────────── */
function emptyAssignment() {
  return {
    _id: Math.random().toString(36).slice(2),
    propType: "",
    blockId: "",
    floorId: "",
    flat_id: "",
    flat_type: "2BHK",
    parking_slots: [], // string IDs; index-0 → DEFAULT, rest → EXTRA
  };
}
function usedFlatIds(assignments, selfIndex) {
  return assignments
    .filter((_, i) => i !== selfIndex)
    .map((a) => String(a.flat_id))
    .filter(Boolean);
}
function usedSlotIds(assignments, selfIndex) {
  return assignments
    .filter((_, i) => i !== selfIndex)
    .flatMap((a) => a.parking_slots || [])
    .map(String)
    .filter(Boolean);
}

const fieldLabelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  marginBottom: 6,
};

function ParkingSlotPicker({ flatNumber, isApartment, selectedSlotIds, availableSlots, takenSlotIds, onChange }) {
  const freeSlots = availableSlots.filter(
    (s) => !takenSlotIds.includes(String(s.id)) || selectedSlotIds.includes(String(s.id))
  );

  const toggle = (slotId) => {
    const sid = String(slotId);
    onChange(
      selectedSlotIds.includes(sid)
        ? selectedSlotIds.filter((id) => id !== sid)
        : [...selectedSlotIds, sid]
    );
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: "10px 12px",
        borderRadius: 10,
        background: isApartment ? "rgba(107,70,193,0.05)" : "rgba(16,185,129,0.05)",
        border: `1px solid ${isApartment ? "rgba(107,70,193,0.18)" : "rgba(16,185,129,0.18)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isApartment ? "#9F87D7" : "#34d399" }}>
          Flat {flatNumber} — Parking
        </span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
          {selectedSlotIds.length === 0
            ? "none"
            : selectedSlotIds.length === 1
              ? "1 default slot"
              : `1 default + ${selectedSlotIds.length - 1} extra`}
        </span>
      </div>

      {freeSlots.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, opacity: 0.6 }}>
          No available parking slots.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px,1fr))",
            gap: 5,
          }}
        >
          {freeSlots.map((slot) => {
            const isSel = selectedSlotIds.includes(String(slot.id));
            const slotIdx = selectedSlotIds.indexOf(String(slot.id));
            const badge = slotIdx === 0 ? "DEFAULT" : slotIdx > 0 ? "EXTRA" : null;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => toggle(slot.id)}
                style={{
                  padding: "8px 4px",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                  outline: "none",
                  background: isSel ? "rgba(107,70,193,0.14)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <MdLocalParking
                  size={13}
                  style={{ color: isSel ? "#C0B0E5" : "var(--text-secondary)", display: "block", margin: "0 auto 2px" }}
                />
                <div style={{ fontSize: 10, fontWeight: 700, color: isSel ? "#C0B0E5" : "var(--text-primary)" }}>
                  {slot.slot_number}
                </div>
                {slot.vehicle_type && (
                  <div style={{ fontSize: 8, color: "var(--text-secondary)", marginTop: 1 }}>
                    {slot.vehicle_type}
                  </div>
                )}
                {badge && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      marginTop: 2,
                      color: badge === "DEFAULT" ? "#4ade80" : "#fbbf24",
                    }}
                  >
                    {badge}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected slot chips */}
      {selectedSlotIds.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {selectedSlotIds.map((sid, idx) => {
            const slotObj = availableSlots.find((s) => String(s.id) === sid);
            if (!slotObj) return null;
            return (
              <div
                key={sid}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  background: idx === 0 ? "rgba(74,222,128,0.10)" : "rgba(251,191,36,0.10)",
                  color: idx === 0 ? "#4ade80" : "#fbbf24",
                  border: `1px solid ${idx === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
                }}
              >
                <MdLocalParking size={10} />
                {slotObj.slot_number}
                <span style={{ fontWeight: 400, opacity: 0.7 }}>{idx === 0 ? "DEFAULT" : "EXTRA"}</span>
                <button
                  type="button"
                  onClick={() => toggle(slotObj.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0 }}
                >
                  <MdClose size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FlatAssignCard({
  index,
  total,
  assignment,
  allUnassignedFlats,
  availableSlots,
  takenFlatIds,   // flat_ids chosen by OTHER cards
  takenSlotIds,   // slot_ids chosen by OTHER cards
  onChange,
  onRemove,
}) {
  const { propType, blockId, floorId, flat_id, flat_type, parking_slots = [] } = assignment;
  const isApartment = propType === "APARTMENT";

  /* ── Available blocks filtered by property type ── */
  const availableBlocks = (() => {
    const seen = new Set();
    const out = [];
    allUnassignedFlats.forEach((f) => {
      const isRH = f.floor_id == null;
      if (propType === "APARTMENT" && isRH) return;
      if (propType === "ROW_HOUSE" && !isRH) return;
      const bid = f.Block?.id || f.Floor?.Block?.id;
      const bname = f.Block?.name || f.Floor?.Block?.name;
      if (bid && !seen.has(bid)) {
        seen.add(bid);
        out.push({ id: bid, name: bname });
      }
    });
    return out;
  })();

  /* ── Available floors in selected block ── */
  const availableFloors = (() => {
    if (!isApartment || !blockId) return [];
    const seen = new Set();
    const out = [];
    allUnassignedFlats.forEach((f) => {
      if (f.floor_id == null) return;
      if (String(f.Floor?.Block?.id) !== String(blockId)) return;
      const fid = f.Floor?.id;
      const fnum = f.Floor?.floor_number;
      if (fid && !seen.has(fid)) {
        seen.add(fid);
        out.push({ id: fid, number: fnum });
      }
    });
    return out.sort((a, b) => Number(a.number) - Number(b.number));
  })();

  /* ── Available flats: exclude those taken by OTHER cards ── */
  const availableFlats = (() => {
    if (!blockId) return [];
    return allUnassignedFlats.filter((f) => {
      // exclude flats already selected by other cards
      if (takenFlatIds.includes(String(f.id))) return false;
      if (isApartment) {
        if (f.floor_id == null) return false;
        if (String(f.Floor?.Block?.id) !== String(blockId)) return false;
        if (floorId && String(f.Floor?.id) !== String(floorId)) return false;
        return true;
      } else {
        if (f.floor_id != null) return false;
        return String(f.Block?.id) === String(blockId);
      }
    });
  })();

  /* ── Free parking slots: exclude those taken by OTHER cards ── */
  const freeSlots = availableSlots.filter(
    (s) => !takenSlotIds.includes(String(s.id))
  );

  const selectedBlock = availableBlocks.find((b) => String(b.id) === String(blockId));
  const selectedFloor = availableFloors.find((f) => String(f.id) === String(floorId));

  const set = (patch) => onChange({ ...assignment, ...patch });
  const handlePropType = (t) =>
    set({ propType: t, blockId: "", floorId: "", flat_id: "", flat_type: "2BHK", parking_slots: [] });
  const handleBlock = (bid) =>
    set({ blockId: bid, floorId: "", flat_id: "", flat_type: "2BHK", parking_slots: [] });
  const handleFloor = (fid) =>
    set({ floorId: fid, flat_id: "", flat_type: "2BHK", parking_slots: [] });
  const handleFlat = (fid) => {
    const flat = allUnassignedFlats.find((f) => String(f.id) === String(fid));
    set({ flat_id: fid, flat_type: flat?.flat_type || "2BHK", parking_slots: [] });
  };

  /* ── Toggle slot selection.
        parking_slots[0] → DEFAULT for this flat
        parking_slots[1..] → EXTRA for this flat                ── */
  const toggleSlot = (slotId) => {
    const sid = String(slotId);
    set({
      parking_slots: parking_slots.includes(sid)
        ? parking_slots.filter((id) => id !== sid)
        : [...parking_slots, sid],
    });
  };

  /* ── Summary line shown in card header ── */
  const summaryLine = flat_id
    ? `Flat ${allUnassignedFlats.find((f) => String(f.id) === String(flat_id))?.flat_number || "?"
    }${selectedBlock ? ` · Block ${selectedBlock.name}` : ""}${isApartment && selectedFloor ? ` · Floor ${selectedFloor.number}` : ""
    }${isApartment ? ` · ${flat_type}` : ""}`
    : `Flat ${index + 1}`;

  return (
    <div
      style={{
        borderRadius: 14,
        border: flat_id
          ? "1.5px solid rgba(34,197,94,0.30)"
          : "1.5px solid rgba(255,255,255,0.10)",
        background: flat_id ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.03)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "all 0.2s",
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: flat_id ? "rgba(34,197,94,0.15)" : "rgba(107,70,193,0.12)",
              border: `1.5px solid ${flat_id ? "rgba(34,197,94,0.35)" : "rgba(107,70,193,0.25)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: flat_id ? "#4ade80" : "#9F87D7",
            }}
          >
            {flat_id ? <MdCheckCircle size={12} /> : index + 1}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: flat_id ? "#4ade80" : "var(--text-primary)" }}>
            {summaryLine}
          </span>
          {/* DEFAULT slot badge for this flat */}
          {flat_id && parking_slots.length > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(74,222,128,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.25)",
              }}
            >
              {parking_slots.length === 1
                ? "1 default slot"
                : `1 default + ${parking_slots.length - 1} extra`}
            </span>
          )}
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 2, borderRadius: 6 }}
          >
            <MdClose size={14} />
          </button>
        )}
      </div>

      {/* Property type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { value: "APARTMENT", label: "Apartment", icon: MdApartment, color: "#6B46C1", bg: "rgba(107,70,193,0.10)" },
          { value: "ROW_HOUSE", label: "Row House", icon: MdHomeWork, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
        ].map((opt) => {
          const active = propType === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePropType(opt.value)}
              style={{
                padding: "9px 10px",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s",
                outline: "none",
                background: active ? opt.bg : "rgba(255,255,255,0.03)",
                border: `2px solid ${active ? opt.color : "rgba(255,255,255,0.08)"}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon size={15} style={{ color: active ? opt.color : "var(--text-secondary)", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? opt.color : "var(--text-primary)" }}>
                {opt.label}
              </span>
              {active && <MdCheckCircle size={11} style={{ color: opt.color, marginLeft: "auto", flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Block selector */}
      {propType && (
        <div>
          <label style={fieldLabelStyle}>Select Block</label>
          <Select className="input w-full" value={blockId} onChange={(e) => handleBlock(e.target.value)}>
            <option value="">— Choose a block —</option>
            {availableBlocks.map((b) => (
              <option key={b.id} value={b.id}>Block {b.name}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Floor selector (apartment only) */}
      {isApartment && blockId && (
        <div>
          <label style={fieldLabelStyle}>Select Floor</label>
          <Select className="input w-full" value={floorId} onChange={(e) => handleFloor(e.target.value)}>
            <option value="">— Choose a floor —</option>
            {availableFloors.map((f) => (
              <option key={f.id} value={f.id}>Floor {f.number}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Flat grid */}
      {((isApartment && floorId) || (!isApartment && blockId)) && (
        <div>
          <label style={fieldLabelStyle}>Select {isApartment ? "Flat" : "House"}</label>
          {availableFlats.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "8px 0", margin: 0 }}>
              No vacant units available.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))",
                gap: 6,
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {availableFlats.map((f) => {
                const isSel = String(flat_id) === String(f.id);
                const color = isApartment ? "#9F87D7" : "#34d399";
                const bg = isApartment ? "rgba(107,70,193,0.12)" : "rgba(16,185,129,0.12)";
                const borderC = isApartment ? "#6B46C1" : "#10b981";
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFlat(f.id)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: 9,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.16s",
                      outline: "none",
                      background: isSel ? bg : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isSel ? borderC : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {isApartment ? (
                      <MdMeetingRoom size={15} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 3px" }} />
                    ) : (
                      <MdHomeWork size={15} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 3px" }} />
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? color : "var(--text-primary)" }}>
                      {f.flat_number}
                    </div>
                    {isSel && <MdCheckCircle size={11} style={{ color, marginTop: 2 }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BHK selector (apartment + flat chosen) */}
      {isApartment && flat_id && (
        <div>
          <label style={fieldLabelStyle}>Flat Size (BHK)</label>
          <div style={{ display: "flex", gap: 7 }}>
            {["1BHK", "2BHK", "3BHK"].map((opt) => {
              const active = flat_type === opt;
              const s = BHK_STYLES[opt];
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set({ flat_type: opt })}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    transition: "all 0.18s",
                    outline: "none",
                    background: active ? s.bg : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${active ? s.border : "rgba(255,255,255,0.08)"}`,
                    color: active ? s.color : "var(--text-secondary)",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Parking slot picker ─────────────────────────────────────────
          parking_slots[0] → DEFAULT for this flat
          parking_slots[1..n] → EXTRA for this flat
          Hint label makes this crystal-clear to the admin.
      ── */}
      {flat_id && (
        <div>
          <label style={fieldLabelStyle}>
            Parking Slots
            <span style={{ fontWeight: 400, color: "var(--text-secondary)", textTransform: "none", letterSpacing: 0, fontSize: 10, marginLeft: 6 }}>
              (1st selected = <span style={{ color: "#4ade80" }}>Default</span> for this flat · extra = EXTRA)
            </span>
          </label>

          {freeSlots.length === 0 && parking_slots.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, padding: "8px 0", opacity: 0.7 }}>
              No available parking slots.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6, maxHeight: 160, overflowY: "auto" }}>
              {[
                ...freeSlots,
                // also show already-selected slots from THIS card so they remain visible
                ...availableSlots.filter(
                  (s) =>
                    parking_slots.includes(String(s.id)) &&
                    !freeSlots.some((fs) => fs.id === s.id)
                ),
              ].map((slot) => {
                const isSel = parking_slots.includes(String(slot.id));
                const slotIndex = parking_slots.indexOf(String(slot.id));
                // index 0 = DEFAULT for this flat; 1+ = EXTRA
                const badgeLabel =
                  slotIndex === 0 ? "DEFAULT" : slotIndex > 0 ? "EXTRA" : null;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot.id)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: 9,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.16s",
                      outline: "none",
                      fontWeight: 700,
                      fontSize: 11,
                      background: isSel ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}`,
                      color: isSel ? "#C0B0E5" : "var(--text-primary)",
                    }}
                  >
                    <MdLayers
                      size={14}
                      style={{ margin: "0 auto 3px", display: "block", color: isSel ? "#C0B0E5" : "var(--text-secondary)" }}
                    />
                    <div>{slot.slot_number}</div>
                    {slot.vehicle_type && (
                      <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>
                        {slot.vehicle_type}
                      </div>
                    )}
                    {badgeLabel && (
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: badgeLabel === "DEFAULT" ? "#4ade80" : "#fbbf24",
                          marginTop: 2,
                        }}
                      >
                        {badgeLabel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected slot chips */}
          {parking_slots.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
              {parking_slots.map((pId, idx) => {
                const slotObj = availableSlots.find((s) => String(s.id) === String(pId));
                if (!slotObj) return null;
                // idx===0 → DEFAULT for this flat; idx>0 → EXTRA
                const badgeLabel = idx === 0 ? "DEFAULT" : "EXTRA";
                return (
                  <div
                    key={pId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 12px",
                      borderRadius: 9,
                      background: "rgba(107,70,193,0.07)",
                      border: "1px solid rgba(107,70,193,0.18)",
                    }}
                  >
                    <MdLayers size={13} style={{ color: "#C0B0E5", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#C0B0E5", flex: 1 }}>
                      Slot {slotObj.slot_number}
                      {slotObj.vehicle_type ? ` · ${slotObj.vehicle_type}` : ""}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: idx === 0 ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)",
                        color: idx === 0 ? "#4ade80" : "#fbbf24",
                        border: `1px solid ${idx === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
                      }}
                    >
                      {badgeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSlot(slotObj.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                    >
                      <MdClose size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MultiFlatAssignSection({ allUnassignedFlats, availableSlots, assignments, onChange }) {

  /* The new design stores shared context (propType, blockId, floorId) at the
     section level, and per-flat data (flat_id, flat_type, parking_slots) per
     selected flat.  We derive these from the existing assignments array so
     the parent's state shape stays identical.                                */

  // ── Shared context (take from first assignment, or empty) ──
  const first = assignments[0] || emptyAssignment();
  const propType = first.propType || "";
  const blockId = first.blockId || "";
  const floorId = first.floorId || "";
  const isApartment = propType === "APARTMENT";

  // ── Currently selected flat IDs across all assignments ──
  const selectedFlatIds = assignments.map((a) => String(a.flat_id)).filter(Boolean);

  // ── All slot IDs already assigned (across all cards) ──
  const allUsedSlotIds = assignments.flatMap((a) => a.parking_slots || []).map(String);

  // ── Derived lists ──────────────────────────────────────────
  const availableBlocks = (() => {
    const seen = new Set(); const out = [];
    allUnassignedFlats.forEach((f) => {
      const isRH = f.floor_id == null;
      if (propType === "APARTMENT" && isRH) return;
      if (propType === "ROW_HOUSE" && !isRH) return;
      const bid = f.Block?.id || f.Floor?.Block?.id;
      const bname = f.Block?.name || f.Floor?.Block?.name;
      if (bid && !seen.has(bid)) { seen.add(bid); out.push({ id: bid, name: bname }); }
    });
    return out;
  })();

  const availableFloors = (() => {
    if (!isApartment || !blockId) return [];
    const seen = new Set(); const out = [];
    allUnassignedFlats.forEach((f) => {
      if (f.floor_id == null) return;
      if (String(f.Floor?.Block?.id) !== String(blockId)) return;
      const fid = f.Floor?.id; const fnum = f.Floor?.floor_number;
      if (fid && !seen.has(fid)) { seen.add(fid); out.push({ id: fid, number: fnum }); }
    });
    return out.sort((a, b) => Number(a.number) - Number(b.number));
  })();

  const availableFlats = (() => {
    if (!blockId) return [];
    return allUnassignedFlats.filter((f) => {
      if (isApartment) {
        if (f.floor_id == null) return false;
        if (String(f.Floor?.Block?.id) !== String(blockId)) return false;
        if (floorId && String(f.Floor?.id) !== String(floorId)) return false;
        return true;
      } else {
        if (f.floor_id != null) return false;
        return String(f.Block?.id) === String(blockId);
      }
    });
  })();

  // ── Context setters — update ALL assignments at once ───────
  const setContext = (patch) => {
    // When context changes, clear all assignments and restart
    onChange([{ ...emptyAssignment(), ...patch }]);
  };

  const setPropType = (t) => setContext({ propType: t });

  const setBlock = (bid) => setContext({ propType, blockId: bid });

  const setFloor = (fid) => {
    // keep propType + blockId, reset floor + flats
    onChange([{ ...emptyAssignment(), propType, blockId, floorId: fid }]);
  };

  // ── Toggle flat selection ───────────────────────────────────
  const toggleFlat = (flatId) => {
    const sid = String(flatId);
    const flat = allUnassignedFlats.find((f) => String(f.id) === sid);

    if (selectedFlatIds.includes(sid)) {
      // Deselect: remove this flat's assignment, keep at least one stub
      const next = assignments.filter((a) => String(a.flat_id) !== sid);
      onChange(next.length > 0 ? next : [{ ...emptyAssignment(), propType, blockId, floorId }]);
    } else {
      // Select: add a new assignment for this flat
      const newAssignment = {
        ...emptyAssignment(),
        propType,
        blockId,
        floorId,
        flat_id: sid,
        flat_type: flat?.flat_type || "2BHK",
      };
      // Replace stub (no flat_id) or add
      const hasStub = assignments.some((a) => !a.flat_id);
      const next = hasStub
        ? assignments.map((a) => (!a.flat_id ? newAssignment : a))
        : [...assignments, newAssignment];
      onChange(next);
    }
  };

  // ── Update per-flat data ────────────────────────────────────
  const updateFlat = (flatId, patch) => {
    onChange(
      assignments.map((a) =>
        String(a.flat_id) === String(flatId) ? { ...a, ...patch } : a
      )
    );
  };

  // ── Slot IDs used by OTHER flats (not this flat) ───────────
  const takenSlotIdsFor = (flatId) =>
    assignments
      .filter((a) => String(a.flat_id) !== String(flatId))
      .flatMap((a) => a.parking_slots || [])
      .map(String);

  // ── Stats ───────────────────────────────────────────────────
  const completedCount = selectedFlatIds.length;
  const defaultSlotCount = assignments.filter(
    (a) => a.flat_id && a.parking_slots.length > 0
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Step 1: Property Type ── */}
      <div>
        <p style={fieldLabelStyle}>Property Type</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { value: "APARTMENT", label: "Apartment", sub: "Multi-floor building", icon: MdApartment, color: "#6B46C1", bg: "rgba(107,70,193,0.10)" },
            { value: "ROW_HOUSE", label: "Row House", sub: "Ground-level villa/house", icon: MdHomeWork, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
          ].map((opt) => {
            const active = propType === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPropType(opt.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s",
                  outline: "none",
                  background: active ? opt.bg : "rgba(255,255,255,0.03)",
                  border: `2px solid ${active ? opt.color : "rgba(255,255,255,0.08)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? opt.bg : "rgba(255,255,255,0.05)",
                    border: `1px solid ${active ? opt.color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <Icon size={17} style={{ color: active ? opt.color : "var(--text-secondary)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? opt.color : "var(--text-primary)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>{opt.sub}</div>
                </div>
                {active && <MdCheckCircle size={14} style={{ color: opt.color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: Block ── */}
      {propType && (
        <div>
          <label style={fieldLabelStyle}>Block</label>
          {availableBlocks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              No blocks with vacant {isApartment ? "flats" : "houses"}.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px,1fr))", gap: 7 }}>
              {availableBlocks.map((block) => {
                const active = String(blockId) === String(block.id);
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setBlock(block.id)}
                    style={{
                      padding: "11px 8px",
                      borderRadius: 11,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.16s",
                      outline: "none",
                      background: active
                        ? isApartment ? "rgba(107,70,193,0.12)" : "rgba(16,185,129,0.12)"
                        : "rgba(255,255,255,0.04)",
                      border: `2px solid ${active
                          ? isApartment ? "#6B46C1" : "#10b981"
                          : "rgba(255,255,255,0.08)"
                        }`,
                    }}
                  >
                    {isApartment
                      ? <MdApartment size={20} style={{ color: active ? "#9F87D7" : "var(--text-secondary)", display: "block", margin: "0 auto 5px" }} />
                      : <MdHomeWork size={20} style={{ color: active ? "#34d399" : "var(--text-secondary)", display: "block", margin: "0 auto 5px" }} />
                    }
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? (isApartment ? "#9F87D7" : "#34d399") : "var(--text-primary)" }}>
                      Block {block.name}
                    </div>
                    {active && <MdCheckCircle size={11} style={{ color: isApartment ? "#9F87D7" : "#34d399", marginTop: 3 }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Floor (apartment only) ── */}
      {isApartment && blockId && (
        <div>
          <label style={fieldLabelStyle}>Floor</label>
          {availableFloors.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>No floors with vacant flats.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 7 }}>
              {availableFloors.map((floor) => {
                const active = String(floorId) === String(floor.id);
                return (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => setFloor(floor.id)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.16s",
                      outline: "none",
                      background: active ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)",
                      border: `2px solid ${active ? "#6B46C1" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <MdLayers size={18} style={{ color: active ? "#9F87D7" : "var(--text-secondary)", display: "block", margin: "0 auto 4px" }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#9F87D7" : "var(--text-primary)" }}>
                      Floor {floor.number}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Multi-select Flats ── */}
      {((isApartment && floorId) || (!isApartment && blockId)) && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>
              Select {isApartment ? "Flats" : "Houses"}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10, marginLeft: 6, color: "var(--text-secondary)" }}>
                (tap to select multiple)
              </span>
            </label>
            {completedCount > 0 && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 999,
                  background: "rgba(34,197,94,0.10)",
                  color: "#4ade80",
                  border: "1px solid rgba(34,197,94,0.22)",
                }}
              >
                {completedCount} selected
              </span>
            )}
          </div>

          {availableFlats.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>No vacant units available.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))",
                gap: 7,
                maxHeight: 200,
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {availableFlats.map((flat) => {
                const isSel = selectedFlatIds.includes(String(flat.id));
                const color = isApartment ? "#9F87D7" : "#34d399";
                const bg = isApartment ? "rgba(107,70,193,0.14)" : "rgba(16,185,129,0.14)";
                const borderC = isApartment ? "#6B46C1" : "#10b981";
                return (
                  <button
                    key={flat.id}
                    type="button"
                    onClick={() => toggleFlat(flat.id)}
                    style={{
                      padding: "11px 6px",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s",
                      outline: "none",
                      background: isSel ? bg : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isSel ? borderC : "rgba(255,255,255,0.08)"}`,
                      boxShadow: isSel ? `0 0 0 1px ${borderC}33` : "none",
                      position: "relative",
                    }}
                  >
                    {/* Selection checkmark overlay */}
                    {isSel && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: borderC,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MdCheck size={9} color="#fff" />
                      </div>
                    )}
                    {isApartment
                      ? <MdMeetingRoom size={17} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 4px" }} />
                      : <MdHomeWork size={17} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 4px" }} />
                    }
                    <div style={{ fontSize: 12, fontWeight: 700, color: isSel ? color : "var(--text-primary)" }}>
                      {flat.flat_number}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Per-flat config (BHK + parking) ── */}
      {selectedFlatIds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
          <p style={{ ...fieldLabelStyle, marginBottom: 2 }}>
            Configure selected {selectedFlatIds.length === 1 ? "flat" : `${selectedFlatIds.length} flats`}
          </p>

          {assignments.filter((a) => a.flat_id).map((assignment, cardIdx) => {
            const flat = allUnassignedFlats.find((f) => String(f.id) === String(assignment.flat_id));
            const color = isApartment ? "#9F87D7" : "#34d399";
            const borderC = isApartment ? "rgba(107,70,193,0.22)" : "rgba(16,185,129,0.22)";
            const bgCard = isApartment ? "rgba(107,70,193,0.06)" : "rgba(16,185,129,0.06)";

            return (
              <div
                key={assignment._id}
                style={{
                  borderRadius: 12,
                  border: `1.5px solid ${borderC}`,
                  background: bgCard,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {/* Flat header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: isApartment ? "rgba(107,70,193,0.15)" : "rgba(16,185,129,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        color,
                      }}
                    >
                      {cardIdx + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>
                      {isApartment ? "Flat" : "House"} {flat?.flat_number}
                    </span>
                    {assignment.parking_slots.length > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                        {assignment.parking_slots.length === 1 ? "1 default" : `1 default +${assignment.parking_slots.length - 1} extra`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFlat(assignment.flat_id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 2 }}
                    title="Remove this flat"
                  >
                    <MdClose size={14} />
                  </button>
                </div>

                {/* BHK selector (apartment only) */}
                {isApartment && (
                  <div>
                    <label style={fieldLabelStyle}>Flat Size</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["1BHK", "2BHK", "3BHK"].map((opt) => {
                        const active = assignment.flat_type === opt;
                        const s = BHK_STYLES[opt];
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateFlat(assignment.flat_id, { flat_type: opt })}
                            style={{
                              flex: 1, padding: "7px 4px", borderRadius: 8,
                              cursor: "pointer", fontSize: 11, fontWeight: 700,
                              transition: "all 0.15s", outline: "none",
                              background: active ? s.bg : "rgba(255,255,255,0.04)",
                              border: `1.5px solid ${active ? s.border : "rgba(255,255,255,0.08)"}`,
                              color: active ? s.color : "var(--text-secondary)",
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Parking slot picker for this flat */}
                <ParkingSlotPicker
                  flatNumber={flat?.flat_number}
                  isApartment={isApartment}
                  selectedSlotIds={assignment.parking_slots}
                  availableSlots={availableSlots}
                  takenSlotIds={takenSlotIdsFor(assignment.flat_id)}
                  onChange={(slots) => updateFlat(assignment.flat_id, { parking_slots: slots })}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Summary bar ── */}
      {completedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.18)",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MdCheckCircle size={14} style={{ color: "#4ade80", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>
              {completedCount} flat{completedCount !== 1 ? "s" : ""} ready to assign
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                background: "rgba(74,222,128,0.12)", color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.25)",
              }}
            >
              🅿️ {defaultSlotCount} default slot{defaultSlotCount !== 1 ? "s" : ""}
            </span>
            {allUsedSlotIds.length - defaultSlotCount > 0 && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                  background: "rgba(251,191,36,0.10)", color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.22)",
                }}
              >
                +{allUsedSlotIds.length - defaultSlotCount} extra
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDIT FLAT SECTION
═══════════════════════════════════════════ */
function EditFlatSection({ allUnassignedFlats, availableSlots, currentFlats, currentSlot, editFlatData, onChange }) {
  const { selectedExistingFlatId, propType, blockId, floorId, flat_id, flat_type, parking_slot_id, revokeParking } = editFlatData;
  const isApartment = propType === "APARTMENT";
  const isMultiFlat = currentFlats && currentFlats.length > 1;

  const availableBlocks = (() => {
    const seen = new Set(); const out = [];
    allUnassignedFlats.forEach((f) => {
      const isRH = f.floor_id == null;
      if (propType === "APARTMENT" && isRH) return;
      if (propType === "ROW_HOUSE" && !isRH) return;
      const bid = f.Block?.id || f.Floor?.Block?.id;
      const bname = f.Block?.name || f.Floor?.Block?.name;
      if (bid && !seen.has(bid)) { seen.add(bid); out.push({ id: bid, name: bname }); }
    });
    return out;
  })();

  const availableFloors = (() => {
    if (!isApartment || !blockId) return [];
    const seen = new Set(); const out = [];
    allUnassignedFlats.forEach((f) => {
      if (f.floor_id == null) return;
      if (String(f.Floor?.Block?.id) !== String(blockId)) return;
      const fid = f.Floor?.id; const fnum = f.Floor?.floor_number;
      if (fid && !seen.has(fid)) { seen.add(fid); out.push({ id: fid, number: fnum }); }
    });
    return out.sort((a, b) => Number(a.number) - Number(b.number));
  })();

  const availableFlats = (() => {
    if (!blockId) return [];
    return allUnassignedFlats.filter((f) => {
      if (isApartment) {
        if (f.floor_id == null) return false;
        if (String(f.Floor?.Block?.id) !== String(blockId)) return false;
        if (floorId && String(f.Floor?.id) !== String(floorId)) return false;
        return true;
      } else {
        if (f.floor_id != null) return false;
        return String(f.Block?.id) === String(blockId);
      }
    });
  })();

  const selectedFlatObj = allUnassignedFlats.find((f) => String(f.id) === String(flat_id));
  const selectedBlock = availableBlocks.find((b) => String(b.id) === String(blockId));
  const selectedFloor = availableFloors.find((f) => String(f.id) === String(floorId));
  const selectedSlotObj = availableSlots.find((s) => String(s.id) === String(parking_slot_id));

  const set = (patch) => onChange({ ...editFlatData, ...patch });
  const handlePropType = (t) => set({ propType: t, blockId: "", floorId: "", flat_id: "", flat_type: "2BHK", parking_slot_id: "", revokeParking: false });
  const handleBlock = (bid) => set({ blockId: bid, floorId: "", flat_id: "", flat_type: "2BHK" });
  const handleFloor = (fid) => set({ floorId: fid, flat_id: "", flat_type: "2BHK" });
  const handleFlat = (fid) => {
    const flat = allUnassignedFlats.find((f) => String(f.id) === String(fid));
    set({ flat_id: fid, flat_type: flat?.flat_type || flat_type || "2BHK" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {isMultiFlat && (
        <div>
          <label style={fieldLabelStyle}>Which flat to modify?</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentFlats.map((flat) => {
              const isSel = String(selectedExistingFlatId) === String(flat.id);
              return (
                <button key={flat.id} type="button" onClick={() => set({ selectedExistingFlatId: String(flat.id), propType: "", blockId: "", floorId: "", flat_id: "", flat_type: "2BHK", parking_slot_id: "", revokeParking: false })}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left", background: isSel ? "rgba(107,70,193,0.10)" : "rgba(255,255,255,0.03)", border: `2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}`, transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? "rgba(107,70,193,0.15)" : "rgba(255,255,255,0.05)" }}>
                      <MdHome size={15} style={{ color: isSel ? "#9F87D7" : "var(--text-secondary)" }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSel ? "#9F87D7" : "var(--text-primary)" }}>Flat {flat.flat_number}</p>
                      {flat.flat_type && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>{flat.flat_type}</p>}
                    </div>
                  </div>
                  {isSel && <MdCheckCircle size={16} style={{ color: "#9F87D7", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
          {!selectedExistingFlatId && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, opacity: 0.7 }}>↑ Select a flat above to modify its assignment or parking</p>}
        </div>
      )}

      {(!isMultiFlat || selectedExistingFlatId) && (
        <>
          {!isMultiFlat && currentFlats && currentFlats.length > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(107,70,193,0.07)", border: "1px solid rgba(107,70,193,0.18)", fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ fontWeight: 700, color: "#9F87D7" }}>Currently assigned: </span>
              {currentFlats.map((f) => f.flat_number).join(", ")}
              <span style={{ fontSize: 11, display: "block", marginTop: 3, opacity: 0.7 }}>Selecting a new flat below will replace this flat.</span>
            </div>
          )}

          {currentSlot && !revokeParking && !parking_slot_id && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.22)" }}>
              <MdLocalParking size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#4ade80" }}>Current Slot: {currentSlot.slot_number}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>{currentSlot.vehicle_type}{currentSlot.parking_floor ? ` · Level ${currentSlot.parking_floor}` : ""}</p>
              </div>
              <button type="button" onClick={() => set({ revokeParking: true, parking_slot_id: "" })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 8, cursor: "pointer", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 11, fontWeight: 700 }}>
                <MdClose size={12} /> Revoke
              </button>
            </div>
          )}

          {revokeParking && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
              <MdClose size={14} style={{ color: "#f87171", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171", flex: 1 }}>Slot will be freed on save</span>
              <button type="button" onClick={() => set({ revokeParking: false })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}>Undo</button>
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>Replace with new flat? (optional)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { value: "APARTMENT", label: "Apartment", icon: MdApartment, color: "#6B46C1", bg: "rgba(107,70,193,0.10)" },
                { value: "ROW_HOUSE", label: "Row House", icon: MdHomeWork, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
              ].map((opt) => {
                const active = propType === opt.value;
                const Icon = opt.icon;
                return (
                  <button key={opt.value} type="button" onClick={() => handlePropType(opt.value)}
                    style={{ padding: "9px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.18s", outline: "none", background: active ? opt.bg : "rgba(255,255,255,0.03)", border: `2px solid ${active ? opt.color : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon size={15} style={{ color: active ? opt.color : "var(--text-secondary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? opt.color : "var(--text-primary)" }}>{opt.label}</span>
                    {active && <MdCheckCircle size={11} style={{ color: opt.color, marginLeft: "auto", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {propType && (
            <div>
              <label style={fieldLabelStyle}>Select Block</label>
              <Select className="input w-full" value={blockId} onChange={(e) => handleBlock(e.target.value)}>
                <option value="">— Choose a block —</option>
                {availableBlocks.map((b) => <option key={b.id} value={b.id}>Block {b.name}</option>)}
              </Select>
            </div>
          )}

          {isApartment && blockId && (
            <div>
              <label style={fieldLabelStyle}>Select Floor</label>
              <Select className="input w-full" value={floorId} onChange={(e) => handleFloor(e.target.value)}>
                <option value="">— Choose a floor —</option>
                {availableFloors.map((f) => <option key={f.id} value={f.id}>Floor {f.number}</option>)}
              </Select>
            </div>
          )}

          {((isApartment && floorId) || (!isApartment && blockId)) && (
            <div>
              <label style={fieldLabelStyle}>Select {isApartment ? "Flat" : "House"}</label>
              {availableFlats.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "8px 0", margin: 0 }}>No vacant units in this location.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {availableFlats.map((f) => {
                    const isSel = String(flat_id) === String(f.id);
                    const color = isApartment ? "#9F87D7" : "#34d399";
                    const bg = isApartment ? "rgba(107,70,193,0.12)" : "rgba(16,185,129,0.12)";
                    const borderC = isApartment ? "#6B46C1" : "#10b981";
                    return (
                      <button key={f.id} type="button" onClick={() => handleFlat(f.id)}
                        style={{ padding: "10px 6px", borderRadius: 9, cursor: "pointer", textAlign: "center", transition: "all 0.16s", outline: "none", background: isSel ? bg : "rgba(255,255,255,0.04)", border: `2px solid ${isSel ? borderC : "rgba(255,255,255,0.08)"}` }}>
                        {isApartment ? <MdMeetingRoom size={15} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 3px" }} /> : <MdHomeWork size={15} style={{ color: isSel ? color : "var(--text-secondary)", display: "block", margin: "0 auto 3px" }} />}
                        <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? color : "var(--text-primary)" }}>{f.flat_number}</div>
                        {isSel && <MdCheckCircle size={11} style={{ color, marginTop: 2 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isApartment && flat_id && (
            <div>
              <label style={fieldLabelStyle}>Flat Size (BHK)</label>
              <div style={{ display: "flex", gap: 7 }}>
                {["1BHK", "2BHK", "3BHK"].map((opt) => {
                  const active = flat_type === opt;
                  const s = BHK_STYLES[opt];
                  return (
                    <button key={opt} type="button" onClick={() => set({ flat_type: opt })}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.18s", outline: "none", background: active ? s.bg : "rgba(255,255,255,0.04)", border: `1.5px solid ${active ? s.border : "rgba(255,255,255,0.08)"}`, color: active ? s.color : "var(--text-secondary)" }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {flat_id && selectedFlatObj && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isApartment ? "rgba(107,70,193,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${isApartment ? "rgba(107,70,193,0.20)" : "rgba(16,185,129,0.20)"}` }}>
              {isApartment ? <MdApartment size={17} style={{ color: "#9F87D7", flexShrink: 0 }} /> : <MdHomeWork size={17} style={{ color: "#34d399", flexShrink: 0 }} />}
              <span style={{ fontWeight: 700, fontSize: 13, color: isApartment ? "#9F87D7" : "#34d399" }}>
                {isApartment ? "Flat" : "House"} {selectedFlatObj.flat_number}
                {selectedBlock && ` · Block ${selectedBlock.name}`}
                {isApartment && selectedFloor && ` · Floor ${selectedFloor.number}`}
                {isApartment && flat_type && ` · ${flat_type}`}
              </span>
              <button type="button" onClick={() => set({ flat_id: "", blockId: "", floorId: "", propType: "" })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", marginLeft: "auto" }}>
                <MdClose size={13} />
              </button>
            </div>
          )}

          {!revokeParking && (
            <div>
              <label style={fieldLabelStyle}>{currentSlot ? "Replace Slot" : "Parking Slot"}<span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10 }}> (optional)</span></label>
              {availableSlots.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, opacity: 0.7 }}>No available parking slots.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6, maxHeight: 140, overflowY: "auto" }}>
                  {availableSlots.map((slot) => {
                    const isSel = String(parking_slot_id) === String(slot.id);
                    return (
                      <button key={slot.id} type="button" onClick={() => set({ parking_slot_id: isSel ? "" : slot.id, revokeParking: false })}
                        style={{ padding: "10px 6px", borderRadius: 9, cursor: "pointer", textAlign: "center", transition: "all 0.16s", outline: "none", fontWeight: 700, fontSize: 11, background: isSel ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)", border: `2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}`, color: isSel ? "#C0B0E5" : "var(--text-primary)" }}>
                        <MdLocalParking size={14} style={{ margin: "0 auto 3px", display: "block", color: isSel ? "#C0B0E5" : "var(--text-secondary)" }} />
                        <div>{slot.slot_number}</div>
                        {slot.vehicle_type && <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>{slot.vehicle_type}</div>}
                        {isSel && <MdCheckCircle size={11} style={{ color: "#C0B0E5", marginTop: 2 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
              {parking_slot_id && selectedSlotObj && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(107,70,193,0.07)", border: "1px solid rgba(107,70,193,0.18)" }}>
                  <MdLocalParking size={15} style={{ color: "#C0B0E5", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#C0B0E5", flex: 1 }}>Slot {selectedSlotObj.slot_number}{selectedSlotObj.vehicle_type ? ` · ${selectedSlotObj.vehicle_type}` : ""}</span>
                  <button type="button" onClick={() => set({ parking_slot_id: "" })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                    <MdClose size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const LIMIT = 10;

const EMPTY_FORM = {
  name: "", email: "", password: "", phone: "",
  resident_type: "OWNER",
  flat_assignments: [emptyAssignment()],
  vehicle_count: 0,
  occupant_count: 1,
  emergency_contact: { name: "", phone: "" },
};

const EMPTY_EDIT_FLAT = {
  selectedExistingFlatId: "",
  propType: "", blockId: "", floorId: "",
  flat_id: "", flat_type: "2BHK",
  parking_slot_id: "",
  revokeParking: false,
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function Resident() {
  const { t } = useLang();

  const [residents, setResidents] = useState([]);
  const [totalAll, setTotalAll] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [editFlatData, setEditFlatData] = useState(EMPTY_EDIT_FLAT);
  const [editCurrentFlats, setEditCurrentFlats] = useState([]);

  const [assignModal, setAssignModal] = useState(null);

  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  const [allUnassignedFlats, setAllUnassignedFlats] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [confirmId, setConfirmId] = useState(null);

  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN";
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter");
    return (saved === "ALL" || !saved) ? "" : saved;
  });
  const [filterBlockId, setFilterBlockId] = useState("");
  const [filterFloorId, setFilterFloorId] = useState("");
  const [filterFlatId, setFilterFlatId] = useState("");
  const [allSocietyFlats, setAllSocietyFlats] = useState([]);
  const [formSocietyId, setFormSocietyId] = useState("");

  // 1. Fetch Societies if Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies").then(res => setSocietiesList(res.data || [])).catch(console.error);
    }
  }, [isSuperAdmin]);

  // 2. Fetch all flats for the selected society to build filter dropdowns
  useEffect(() => {
    const socId = isSuperAdmin ? filterSocietyId : user?.society_id;
    if (socId) {
      API.get("/flats", { headers: { "x-society-id": socId } })
        .then((res) => {
          const data = res.data?.data || res.data || [];
          setAllSocietyFlats(Array.isArray(data) ? data : []);
        })
        .catch(console.error);
    } else {
      setAllSocietyFlats([]);
    }
    setFilterBlockId(""); setFilterFloorId(""); setFilterFlatId("");
  }, [filterSocietyId, isSuperAdmin, user?.society_id]);

  // 3. Initialize formSocietyId for new residents when form opens
  useEffect(() => {
    if (showForm && !editingId && isSuperAdmin && filterSocietyId) {
      setFormSocietyId(filterSocietyId);
    }
  }, [showForm, editingId, isSuperAdmin]);

  // 4. Derive unique Blocks from society flats
  const blocksList = useMemo(() => {
    const blocks = new Map();
    allSocietyFlats.forEach(f => {
      const bId = f.Floor?.Block?.id || f.Block?.id || f.block_id;
      const bName = f.Floor?.Block?.name || f.Block?.name || `Block ${f.block_id}`;
      if (bId && !blocks.has(bId)) blocks.set(bId, { id: bId, name: bName });
    });
    return Array.from(blocks.values());
  }, [allSocietyFlats]);

  // 5. Derive unique Floors based on selected Block
  const floorsList = useMemo(() => {
    if (!filterBlockId) return [];
    const floors = new Map();
    allSocietyFlats.forEach(f => {
      const bId = f.Floor?.Block?.id || f.Block?.id;
      if (String(bId) === String(filterBlockId) && f.Floor) {
        floors.set(f.Floor.id, { id: f.Floor.id, number: f.Floor.floor_number });
      }
    });
    return Array.from(floors.values()).sort((a, b) => Number(a.number) - Number(b.number));
  }, [allSocietyFlats, filterBlockId]);

  // 6. Derive Flats based on selected Block & Floor
  const flatsList = useMemo(() => {
    if (!filterBlockId) return [];
    return allSocietyFlats.filter(f => {
      const bId = f.Floor?.Block?.id || f.Block?.id;
      if (String(bId) !== String(filterBlockId)) return false;
      if (filterFloorId && String(f.floor_id) !== String(filterFloorId)) return false;
      return true;
    });
  }, [allSocietyFlats, filterBlockId, filterFloorId]);

  // 7. Load unassigned flats & parking slots for the form
  useEffect(() => {
    if (!showForm) return;
    setLoadingFlats(true);
    setLoadingSlots(true);
    const headers = (isSuperAdmin && formSocietyId) ? { "x-society-id": formSocietyId } : {};
    API.get("/flats/unassigned", { headers })
      .then((res) => setAllUnassignedFlats(res.data || []))
      .catch(console.error)
      .finally(() => setLoadingFlats(false));
    API.get("/parking-slots/available", { headers })
      .then((res) => setAvailableSlots(res.data || []))
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [showForm, formSocietyId, isSuperAdmin]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormError("");
    setAadharFile(null);
    setPanFile(null);
    setEditingId(null);
    setEditFlatData(EMPTY_EDIT_FLAT);
    setEditCurrentFlats([]);
    setFormSocietyId("");
  };

  const loadResidents = useCallback(
    async (pageNum, currentSearch, isInitial = false) => {
      if (isInitial) setInitialLoad(true);
      else setFetching(true);
      try {
        const params = new URLSearchParams({
          page: pageNum,
          limit: LIMIT,
          ...(currentSearch ? { search: currentSearch } : {}),
          ...(filterSocietyId ? { society_id: filterSocietyId } : {}),
          ...(filterBlockId ? { block_id: filterBlockId } : {}),
          ...(filterFloorId ? { floor_id: filterFloorId } : {}),
          ...(filterFlatId ? { flat_id: filterFlatId } : {}),
        });
        const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
        const res = await API.get(`/users/resident?${params}`, { headers });
        const data = res.data.data || [];
        setResidents(data);
        setTotalAll(res.data.totalAll ?? res.data.pagination?.totalItems ?? 0);
        setTotalPages(res.data.pagination?.totalPages ?? 1);
        setTotalItems(res.data.pagination?.totalItems ?? 0);
        setPage(pageNum);
      } catch (err) {
        console.error("Load residents failed", err);
      } finally {
        setInitialLoad(false);
        setFetching(false);
      }
    },
    [filterSocietyId, filterBlockId, filterFloorId, filterFlatId, isSuperAdmin],
  );

  const promoteCommittee = async (userId) => {
    try {
      await API.post("/users/committee/promote", { userId });
      loadResidents(page, debouncedSearch);
      toast.success("Promoted to committee member");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to promote"); }
  };

  const removeCommittee = async (userId) => {
    try {
      await API.post("/users/committee/remove", { userId });
      loadResidents(page, debouncedSearch);
      toast.success("Removed from committee");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to remove"); }
  };

  useEffect(() => { loadResidents(1, "", true); }, [loadResidents]);
  useEffect(() => { if (initialLoad) return; loadResidents(1, debouncedSearch); }, [debouncedSearch, initialLoad, loadResidents]);

  const handlePageChange = (p) => loadResidents(p, debouncedSearch);

  const handleEdit = (resident) => {
    setFormData({ name: resident.name, email: resident.email, password: "", phone: resident.phone || "", resident_type: resident.resident_type || "OWNER", flat_assignments: [], vehicle_count: resident.vehicle_count ?? 0, occupant_count: resident.occupant_count ?? 1, emergency_contact: { name: resident.emergency_contact?.name || "", phone: resident.emergency_contact?.phone || "" } });
    setEditCurrentFlats(resident.flats || []);
    setEditFlatData(EMPTY_EDIT_FLAT);
    setEditingId(resident.id);
    setFormSocietyId(resident.society_id || "");
    setShowForm(true);
    setAssignModal(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!editingId && (!aadharFile || !panFile)) {
      setFormError("Both Aadhar and PAN documents are required.");
      return;
    }

    const ec = formData.emergency_contact;
    const ecFilled = ec.name?.trim() || ec.phone?.trim();
    if (ecFilled && (!ec.name?.trim() || !ec.phone?.trim())) {
      setFormError("Emergency contact requires both a name and phone.");
      return;
    }

    if (!editingId) {
      const completedAssignments = formData.flat_assignments.filter(a => a.flat_id);
      if (completedAssignments.length === 0) {
        setFormError("Please assign at least one flat before creating the resident.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const headers = (isSuperAdmin && formSocietyId) ? { "x-society-id": formSocietyId } : {};

      if (editingId) {
        const payload = {
          name: formData.name,
          phone: formData.phone || undefined,
          resident_type: formData.resident_type,
          vehicle_count: formData.vehicle_count,
          occupant_count: formData.occupant_count,
          emergency_contact: ecFilled ? { name: ec.name.trim(), phone: ec.phone.trim() } : undefined,
        };
        if (editFlatData.flat_id) {
          payload.flat_id = Number(editFlatData.flat_id);
          payload.flat_type = editFlatData.propType === "APARTMENT" ? editFlatData.flat_type : null;
          if (editFlatData.selectedExistingFlatId) payload.old_flat_id = Number(editFlatData.selectedExistingFlatId);
        }
        if (editFlatData.parking_slot_id) {
          payload.parking_slot_id = Number(editFlatData.parking_slot_id);
        }
        if (editFlatData.revokeParking) {
          payload.revoke_parking_slot = true;
          if (editFlatData.selectedExistingFlatId) payload.revoke_flat_id = Number(editFlatData.selectedExistingFlatId);
        }
        await API.put(`/users/resident/${editingId}`, payload, { headers });
        toast.success("Resident updated successfully");
      } else {
        const flatAssignments = formData.flat_assignments
          .filter((a) => a.flat_id)
          .map((a) => ({
            flat_id: Number(a.flat_id),
            resident_type: "OWNER",
            flat_type: a.propType === "APARTMENT" ? a.flat_type : null,
            parking_slots: (a.parking_slots || []).map((id, idx) => ({
              slot_id: Number(id),
              parking_type: idx === 0 ? "DEFAULT" : "EXTRA",
            })),
          }));

        const residentRes = await API.post("/users/resident", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          resident_type: "OWNER",
          flat_assignments: flatAssignments,
          vehicle_count: formData.vehicle_count,
          occupant_count: formData.occupant_count,
          emergency_contact: ecFilled ? { name: ec.name.trim(), phone: ec.phone.trim() } : undefined,
        }, { headers });

        const newUserId =
          residentRes.data?.user?.id ||
          residentRes.data?.id ||
          residentRes.data?.resident?.id;

        const docForm = new FormData();
        docForm.append("aadhar", aadharFile);
        docForm.append("pan", panFile);
        await API.post(
          `/user-documents${newUserId ? `?userId=${newUserId}` : ""}`,
          docForm,
          { headers: { ...headers, "Content-Type": "multipart/form-data" } },
        );

        toast.success("Resident created successfully");
      }

      resetForm();
      setShowForm(false);
      loadResidents(page, debouncedSearch);
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${editingId ? "update" : "create"} resident.`;
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/users/resident/${id}`);
      setConfirmId(null);
      loadResidents(page, debouncedSearch);
      toast.success("Resident deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || t("residentDeleteFail"));
      setConfirmId(null);
    }
  };

  const AVATAR_COLORS = [
    "linear-gradient(135deg,#6B46C1,#6B46C1)",
    "linear-gradient(135deg,#669696,#7AB2B2)",
    "linear-gradient(135deg,#F0845D,#F5AF96)",
    "linear-gradient(135deg,#f43f5e,#fb7185)",
    "linear-gradient(135deg,#10b981,#34d399)",
    "linear-gradient(135deg,#6B46C1,#9F87D7)",
    "linear-gradient(135deg,#4C76C9,#94B5F5)",
  ];
  const avatarColor = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

  const completedFlats = formData.flat_assignments.filter(a => a.flat_id).length;
  const missingFlat = !editingId && completedFlats === 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {assignModal && (
        <AssignFlatModal
          residentId={assignModal.id}
          residentName={assignModal.name}
          societyId={assignModal.society_id}
          onClose={() => setAssignModal(null)}
          onSuccess={() => { setAssignModal(null); loadResidents(page, debouncedSearch); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#6B46C1,#6B46C1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(107,70,193,0.3)" }}>
            <MdPerson size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{t("residentTitle")}</h2>
            <p className="text-secondary text-xs mt-0.5">{initialLoad ? "—" : totalAll} {t("residentTitle")?.toLowerCase()}</p>
          </div>
        </div>

        <button
          onClick={() => {
            const next = !showForm;
            setShowForm(next);
            if (next) setFormSocietyId(filterSocietyId);
            setConfirmId(null);
            setAssignModal(null);
            if (showForm) resetForm();
          }}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center shrink-0"
          style={{ borderRadius: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(107,70,193,0.3)" }}>
          <MdPersonAdd size={18} />
          {t("residentAddBtn")}
        </button>
      </div>

      {/* Add / Edit Form */}
      {(showForm || editingId) && (
        <div className="bg-card rounded-2xl animate-scaleIn" style={{ padding: "24px", maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                {editingId ? "Edit Resident" : t("residentAddTitle")}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "3px 0 0" }}>
                {editingId ? "Update resident info, flat & parking" : "Create a new resident account"}
              </p>
            </div>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
              <MdClose size={17} />
            </button>
          </div>

          {formError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
              <MdClose size={14} style={{ flexShrink: 0 }} /> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Society (Super Admin Only) */}
            {isSuperAdmin && (
              <Field label="Society" required>
                <Select
                  className="input w-full"
                  value={formSocietyId}
                  onChange={(e) => setFormSocietyId(e.target.value)}
                  disabled={!!editingId}
                  required
                >
                  <option value="">— Select Society —</option>
                  {societiesList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                {editingId && (
                  <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4 }}>
                    Society cannot be changed after creation.
                  </p>
                )}
              </Field>
            )}

            <SectionDivider icon={MdPerson} label="Personal Info" />
            <Field label={t("residentName")} required>
              <input className="input w-full" placeholder="Full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </Field>
            <Field label={t("residentEmail")} required>
              <input className="input w-full" placeholder="email@example.com" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={!!editingId} style={editingId ? { opacity: 0.6, cursor: "not-allowed" } : {}} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Phone">
                <input className="input w-full" placeholder="10-digit number" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </Field>
              {!editingId && (
                <Field label={t("residentPassword")} required>
                  <input className="input w-full" placeholder="Set password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                </Field>
              )}
            </div>

            <SectionDivider icon={MdPerson} label="Resident Role" />
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1.5px solid rgba(16,185,129,0.22)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>🏠</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Owner</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Admins register Owners only. Owners register Tenants via the Resident App.</div>
              </div>
            </div>

            <SectionDivider icon={MdPeople} label="Household Details" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="No. of Vehicles">
                <CounterField value={formData.vehicle_count} onChange={(v) => setFormData((f) => ({ ...f, vehicle_count: v }))} min={0} max={99} />
              </Field>
              <Field label="Family Members">
                <CounterField value={formData.occupant_count} onChange={(v) => setFormData((f) => ({ ...f, occupant_count:v }))} min={1} max={99} />
              </Field>
            </div>

            <SectionDivider icon={MdContactPhone} label="Emergency Contact (Optional)" />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, marginTop: -4 }}>
              <MdPhone size={15} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Both name and phone are required if filled.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Contact Name">
                <input className="input w-full" placeholder="e.g. Ramesh Sharma" value={formData.emergency_contact.name} onChange={(e) => setFormData((f) => ({ ...f, emergency_contact: { ...f.emergency_contact, name: e.target.value } }))} />
              </Field>
              <Field label="Contact Phone">
                <input className="input w-full" placeholder="10-digit number" type="tel" value={formData.emergency_contact.phone} onChange={(e) => setFormData((f) => ({ ...f, emergency_contact: { ...f.emergency_contact, phone: e.target.value } }))} />
              </Field>
            </div>

            {!editingId && (
              <>
                <SectionDivider icon={MdUploadFile} label="KYC Documents" />
                <DocumentUploadField label="Aadhar Card" icon={MdBadge} accept="application/pdf,image/*" file={aadharFile} onChange={setAadharFile} required />
                <DocumentUploadField label="PAN Card" icon={MdCreditCard} accept="application/pdf,image/*" file={panFile} onChange={setPanFile} required />

                <SectionDivider icon={MdHome} label="Flat Assignment" required />

                {missingFlat && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
                    <MdWarning size={15} style={{ color: "#f87171", flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: "#f87171", margin: 0, fontWeight: 600 }}>
                      A flat must be assigned to create a resident. Select the property type below to begin.
                    </p>
                  </div>
                )}

                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: -8, marginBottom: 2 }}>
                  <span style={{ color: "#fbbf24" }}>Parking slots assigned here go to the flat directly — residents add their vehicles themselves.</span>
                </p>

                {loadingFlats || loadingSlots ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13, padding: "10px 0" }}>
                    <Spinner small /> Loading available units…
                  </div>
                ) : (
                  <MultiFlatAssignSection
                    allUnassignedFlats={allUnassignedFlats}
                    availableSlots={availableSlots}
                    assignments={formData.flat_assignments}
                    onChange={(assignments) => setFormData((f) => ({ ...f, flat_assignments: assignments }))}
                  />
                )}
              </>
            )}

            {editingId && (
              <>
                <SectionDivider icon={MdHome} label="Reassign Flat & Parking (Optional)" />
                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: -8, marginBottom: 2 }}>Leave blank to keep the current flat unchanged.</p>
                {loadingFlats || loadingSlots ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13, padding: "10px 0" }}>
                    <Spinner small /> Loading available units…
                  </div>
                ) : (
                  <EditFlatSection
                    allUnassignedFlats={allUnassignedFlats}
                    availableSlots={availableSlots}
                    currentFlats={editCurrentFlats}
                    editFlatData={editFlatData}
                    onChange={setEditFlatData}
                  />
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button
                type="submit"
                disabled={submitting || missingFlat}
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  opacity: submitting || missingFlat ? 0.55 : 1,
                  cursor: submitting || missingFlat ? "not-allowed" : "pointer",
                  borderRadius: 12,
                  fontWeight: 700,
                  background: missingFlat ? "rgba(255,255,255,0.06)" : undefined,
                  color: missingFlat ? "var(--text-secondary)" : undefined,
                  border: missingFlat ? "1px solid rgba(255,255,255,0.10)" : undefined,
                  boxShadow: missingFlat ? "none" : undefined,
                }}>
                {submitting ? (
                  <><Spinner small /> {editingId ? "Updating…" : "Creating…"}</>
                ) : missingFlat
                  ? <><MdWarning size={15} /> Assign a flat to continue</>
                  : editingId
                    ? "Update Resident"
                    : t("residentCreate")}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-muted" style={{ borderRadius: 12 }}>{t("cancel")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl overflow-hidden">

        {/* Cascading Filter Bar */}
        <div style={{ display: "flex", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--divider)", flexWrap: "wrap", background: "rgba(0,0,0,0.02)" }}>
          {isSuperAdmin && (
            <Select className="input" style={{ flex: 1, minWidth: 140, padding: "8px 12px" }}
              value={filterSocietyId} onChange={(e) => setFilterSocietyId(e.target.value)}>
              <option value="">{t("allSocieties") || "All Societies"}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
          <Select className="input" style={{ flex: 1, minWidth: 140, padding: "8px 12px" }}
            value={filterBlockId} onChange={(e) => { setFilterBlockId(e.target.value); setFilterFloorId(""); setFilterFlatId(""); }}
            disabled={!blocksList.length}>
            <option value="">{t("allBlocks") || "All Blocks"}</option>
            {blocksList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select className="input" style={{ flex: 1, minWidth: 140, padding: "8px 12px" }}
            value={filterFloorId} onChange={(e) => { setFilterFloorId(e.target.value); setFilterFlatId(""); }}
            disabled={!filterBlockId || !floorsList.length}>
            <option value="">{t("allFloors") || "All Floors"}</option>
            {floorsList.map(f => <option key={f.id} value={f.id}>Floor {f.number}</option>)}
          </Select>
          <Select className="input" style={{ flex: 1, minWidth: 140, padding: "8px 12px" }}
            value={filterFlatId} onChange={(e) => setFilterFlatId(e.target.value)}
            disabled={!filterBlockId || !flatsList.length}>
            <option value="">{t("allUnits") || "All Units"}</option>
            {flatsList.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
          </Select>
          <button onClick={() => loadResidents(1, search)} className="btn-primary" style={{ padding: "8px 16px", borderRadius: 8 }}>
            {t("reportApply") || "Apply Filter"}
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--divider)", flexWrap: "wrap" }}>
          <p className="text-xs text-secondary shrink-0">
            {initialLoad ? "—" : `${totalItems} ${t("residentTitle")?.toLowerCase()}`}
            {search && !initialLoad && ` matching "${search}"`}
          </p>
          <div className="relative" style={{ maxWidth: 260, width: "100%" }}>
            <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input className="input h-9 text-xs w-full" style={{ paddingLeft: 32, borderRadius: 10 }} placeholder={t("colSearchPlaceholder") || "Search name or email…"} value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {fetching ? <Spinner small /> : search ? <button onClick={() => setSearch("")} className="text-secondary"><MdClose size={13} /></button> : null}
            </div>
          </div>
        </div>

        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary"><Spinner /><p className="text-sm">Loading…</p></div>
        )}

        {!initialLoad && totalAll === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MdPerson size={28} style={{ opacity: 0.3 }} />
            </div>
            <p className="text-sm">{t("residentEmpty")}</p>
          </div>
        )}

        {!initialLoad && totalAll > 0 && residents.length === 0 && !fetching && (
          <div className="flex flex-col items-center gap-2 py-16 text-secondary">
            <MdSearch size={32} className="opacity-20" />
            <p className="text-sm">No residents match your search.</p>
            <button onClick={() => setSearch("")} style={{ fontSize: 12, color: "#9F87D7", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>Clear search</button>
          </div>
        )}

        {!initialLoad && residents.length > 0 && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--divider)" }}>
                    {[
                      "#",
                      t("colResident") || "Resident",
                      t("colContact") || "Contact",
                      t("colType") || "Type",
                      t("colUnits") || "Units",
                      t("colHousehold") || "Household",
                      t("colEmergency") || "Emergency",
                      t("colActions") || "Actions"
                    ].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 7 ? "right" : "left", padding: "12px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--divider)", verticalAlign: "top", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, width: 40 }}>{(page - 1) * LIMIT + idx + 1}</td>
                      <td style={{ padding: "14px 16px", minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: avatarColor(idx), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
                            {r.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{r.name}</div>
                            {r.roles?.includes("COMMITTEE_MEMBER") && <span className="res-committee-badge" style={{ marginTop: 3, display: "inline-flex" }}>★ {t("colCommittee") || "Committee"}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", minWidth: 170 }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.email}</div>
                        {r.phone && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><MdPhone size={11} style={{ opacity: 0.5 }} /> {r.phone}</div>}
                      </td>
                      <td style={{ padding: "14px 16px" }}><ResidentTypeBadge type={r.resident_type} /></td>
                      <td style={{ padding: "14px 16px", minWidth: 200 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {r.flats && r.flats.length > 0 ? r.flats.map((flat, fIdx) => {
                            const isRH = flatIsRowHouse(flat);
                            const block = flatBlockName(flat);
                            const floor = flatFloorNumber(flat);
                            return (
                              <div key={flat.id || fIdx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(34,197,94,0.10)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.22)" }}>
                                    {isRH ? <MdHomeWork size={11} /> : <MdHome size={11} />} {flat.flat_number}
                                  </span>
                                  {!isRH && <BhkBadge type={flat.flat_type} />}
                                </div>
                                {(floor != null || block) && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{floor != null ? `${t("floorLabel") || "Floor"} ${floor}` : ""}{floor != null && block ? " · " : ""}{block ? `${t("blockLabel") || "Block"} ${block}` : ""}</p>}
                              </div>
                            );
                          }) : <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.45 }}>{t("colNoUnit") || "No unit assigned"}</span>}
                          <button type="button" onClick={() => setAssignModal({ id: r.id, name: r.name, society_id: r.society_id })}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, background: "rgba(107,70,193,0.08)", border: "1px dashed rgba(107,70,193,0.35)", color: "#9F87D7", cursor: "pointer", marginTop: 4, alignSelf: "flex-start", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(107,70,193,0.14)"; e.currentTarget.style.borderColor = "#6B46C1"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(107,70,193,0.08)"; e.currentTarget.style.borderColor = "rgba(107,70,193,0.35)"; }}>
                            <MdAdd size={13} /> {t("colAssignFlat") || "Assign Flat"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(251,191,36,0.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.22)" }}><MdDirectionsCar size={12} /> {r.vehicle_count ?? 0} {t("colVehicles") || "Vehicles"}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(52,211,153,0.10)", color: "#34d399", border: "1px solid rgba(52,211,153,0.22)" }}><MdPeople size={12} /> {r.occupant_count ?? 1} {t("colOccupants") || "Family Members"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", minWidth: 140 }}>
                        {r.emergency_contact?.name ? (
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{r.emergency_contact.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 3 }}><MdPhone size={10} style={{ opacity: 0.5 }} /> {r.emergency_contact.phone}</p>
                          </div>
                        ) : <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.35 }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div className="res-actions" style={{ justifyContent: "flex-end" }}>
                          {r.flats && r.flats.length > 0 && !r.roles?.includes("SOCIETY_ADMIN") && (
                            r.roles?.includes("COMMITTEE_MEMBER") ? (
                              <button onClick={() => removeCommittee(r.id)} className="res-btn res-btn--remove">{t("colRemove") || "Remove"}</button>
                            ) : (
                              <button onClick={() => promoteCommittee(r.id)} className="res-btn res-btn--promote">{t("colCommittee") || "Committee"}</button>
                            )
                          )}
                          <button onClick={() => handleEdit(r)}
                            style={{ background: "rgba(91,141,239,0.10)", color: "#94B5F5", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(91,141,239,0.20)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,141,239,0.18)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(91,141,239,0.10)")}>
                            <MdEdit size={13} /> {t("colEdit") || "Edit"}
                          </button>
                          {confirmId === r.id ? (
                            <span className="res-confirm">
                              <span className="res-confirm-label">{t("billSure") || "Sure?"}</span>
                              <button onClick={() => handleDelete(r.id)} className="res-confirm-yes">{t("billYesDelete") || "Yes"}</button>
                              <button onClick={() => setConfirmId(null)} className="res-confirm-cancel">{t("cancel")}</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmId(r.id)} className="res-btn-delete"><MdDelete size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {residents.map((r, idx) => (
                <div key={r.id} className="animate-fadeIn" style={{ padding: "14px 16px", borderBottom: "1px solid var(--divider)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: avatarColor(idx), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
                      {r.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{r.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{r.email}</p>
                      {r.phone && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0", display: "flex", alignItems: "center", gap: 3 }}><MdPhone size={10} style={{ opacity: 0.5 }} /> {r.phone}</p>}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                        <ResidentTypeBadge type={r.resident_type} />
                        {r.flats?.map((flat, fIdx) => {
                          const isRH = flatIsRowHouse(flat);
                          return (
                            <span key={flat.id || fIdx} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.10)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.22)" }}>
                              {isRH ? <MdHomeWork size={10} /> : <MdHome size={10} />} {flat.flat_number}
                            </span>
                          );
                        })}
                        {r.roles?.includes("COMMITTEE_MEMBER") && <span className="res-committee-badge">★ {t("colCommittee") || "Committee"}</span>}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "rgba(251,191,36,0.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.20)" }}><MdDirectionsCar size={10} /> {r.vehicle_count ?? 0}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "rgba(52,211,153,0.10)", color: "#34d399", border: "1px solid rgba(52,211,153,0.20)" }}><MdPeople size={10} /> {r.occupant_count ?? 1}</span>
                      </div>
                      {r.emergency_contact?.name && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "5px 0 0", display: "flex", alignItems: "center", gap: 4 }}><MdContactPhone size={11} style={{ color: "#f87171" }} />{r.emergency_contact.name} · {r.emergency_contact.phone}</p>}
                      <button type="button" onClick={() => setAssignModal({ id: r.id, name: r.name, society_id: r.society_id })}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, background: "rgba(107,70,193,0.08)", border: "1px dashed rgba(107,70,193,0.35)", color: "#9F87D7", cursor: "pointer", marginTop: 8 }}>
                        <MdAdd size={13} /> {t("colAssignFlat") || "Assign Flat"}
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleEdit(r)} style={{ background: "rgba(91,141,239,0.10)", color: "#94B5F5", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(91,141,239,0.20)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
                        <MdEdit size={13} /> {t("colEdit") || "Edit"}
                      </button>
                      {r.flats && r.flats.length > 0 && !r.roles?.includes("SOCIETY_ADMIN") && (
                        r.roles?.includes("COMMITTEE_MEMBER") ? (
                          <button onClick={() => removeCommittee(r.id)} className="res-btn res-btn--remove res-btn--compact">{t("colRemove") || "Remove"}</button>
                        ) : (
                          <button onClick={() => promoteCommittee(r.id)} className="res-btn res-btn--promote res-btn--compact">+ {t("colCommittee") || "Committee"}</button>
                        )
                      )}
                      {confirmId === r.id ? (
                        <div className="res-confirm res-confirm--mobile">
                          <button onClick={() => handleDelete(r.id)} className="res-confirm-yes">{t("billYesDelete") || "Delete"}</button>
                          <button onClick={() => setConfirmId(null)} className="res-confirm-cancel">{t("cancel")}</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} className="res-btn-delete"><MdDelete size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 20px", borderTop: "1px solid var(--divider)" }}>
              <p className="text-xs text-secondary">{t("colShowing") || "Showing"} {residents.length} {t("colOf") || "of"} {totalItems}</p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}