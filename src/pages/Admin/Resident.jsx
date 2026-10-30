
import { useEffect, useState, useCallback, useRef, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdPersonAdd, MdSearch, MdClose, MdHome,
  MdChevronLeft, MdChevronRight, MdPerson, MdApartment,
  MdLayers, MdAdd, MdHomeWork, MdMeetingRoom, MdCheckCircle,
  MdUploadFile, MdBadge, MdCreditCard, MdCheck, MdDirectionsCar,
  MdPeople, MdPhone, MdContactPhone, MdEdit, MdArrowBack,
  MdArrowForward, MdLocalParking, MdWarning, MdMoreVert, MdBlock,
  MdVisibility, MdVisibilityOff, MdGroups, MdCalculate,
  MdEmail, MdOpenInNew, MdOutlineLocationOn, MdLock,
} from "react-icons/md";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import { hasPermission } from "../../utils/permissions";
import { getTitleError, getEmailError, getMobileError } from "../../utils/validators";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import { useCustomAlert } from "../../context/CustomAlertContext";

import Pagination from "../../components/common/Pagination";
import UserAvatar from "../../components/common/UserAvatar";
import StatCard from "../../components/common/StatCard";
import ProfilePictureUploader from "../../components/common/ProfilePictureUploader";
import ResidentDetailsModal from "./ResidentDetailsModal";

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
  TENANT: { bg: "rgba(160,90,255,0.12)", color: "var(--accent)", border: "rgba(160,90,255,0.25)", label: "Tenant" },
};
const BHK_STYLES = {
  "1BHK": { bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" },
  "2BHK": { bg: "rgba(167, 139, 250, 0.14)", color: "#c084fc", border: "rgba(167, 139, 250, 0.3)" },
  "3BHK": { bg: "rgba(244, 114, 182, 0.14)", color: "#f472b6", border: "rgba(244, 114, 182, 0.3)" },
};

function ResidentTypeBadge({ type }) {
  const { t } = useLang();
  if (!type) return null;
  const s = RESIDENT_TYPE_STYLES[type] || RESIDENT_TYPE_STYLES.OWNER;
  const label = type === "TENANT" ? t("colTenant") : t("colOwner");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: "0.02em" }}>
      {label}
    </span>
  );
}

function BhkBadge({ type }) {
  if (!type) return null;
  const s = BHK_STYLES[type] || { bg: "rgba(160,90,255,0.12)", color: "var(--accent)", border: "rgba(160,90,255,0.25)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: "0.02em" }}>
      {type}
    </span>
  );
}

function PendingApprovalBadge() {
  const { t } = useLang();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "var(--accent)", border: "1px solid rgba(251,191,36,0.28)", letterSpacing: "0.02em" }}>
      <MdWarning size={11} />
      {t("resPendingApproval", "Pending Approval")}
    </span>
  );
}

/* ─────────────────────────────────────────
   RESIDENT ACTION MENU (three-dot kebab)
   ───────────────────────────────────────── */
function ResidentActionMenu({ onViewDetails, onAssignFlat, onEdit, isCommittee, isAccountant, isSocietyAdmin, isTenant, onPromote, onRemoveCommittee, onDeactivateAccountant, onToggleStatus, isPendingApproval, isRejected, isInactive, onApprove, onReject, t }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  /* The card wrapper is overflow:hidden and the table is overflow-x:auto,
     so the menu is portalled to <body> and positioned as fixed. */
  const computePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(r.width, 150);
    let left = r.right - w;
    let top = r.bottom + 6;
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    if (top + 250 > window.innerHeight - 8) top = Math.max(8, r.top - 256);
    setPos({ top, left, minWidth: w });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    computePos();
    const reposition = () => computePos();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, computePos]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const act = (fn) => { setOpen(false); fn(); };

  /* A rejected registration is read-only until an admin re-approves it: no flat,
     no profile edit, no committee/accountant role. The API enforces the same rule
     (ensureAssignable / ensureNotRejected), so this is a UX guard, not the only
     line of defence. Delete stays available so a rejected record can still be
     cleaned up. */
  const blocked = isRejected
    ? t("resActionBlockedRejected", "Approve this registration first to perform this action.")
    : undefined;
  const gate = (fn) => { if (!isRejected) act(fn); };
  const gatedClass = isRejected ? "sa-action-item sa-action-item-disabled" : "sa-action-item";

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button ref={triggerRef} onClick={() => setOpen(p => !p)} className="sa-action-dots" aria-label="Resident actions" aria-haspopup="menu" aria-expanded={open}>
        <MdMoreVert size={20} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="sa-action-dropdown sa-action-dropdown--fixed"
          role="menu"
          style={pos ? { top: pos.top, left: pos.left, minWidth: pos.minWidth } : { visibility: "hidden" }}
        >
          {isPendingApproval && (
            <>
              <button role="menuitem" className="sa-action-item" onClick={() => act(onApprove)} style={{ color: "#4ade80" }}>
                <MdCheck size={15} />
                {t("resApproveActivate", "Approve & Activate")}
              </button>
              <button role="menuitem" className="sa-action-item sa-action-item-danger" onClick={() => act(onReject)}>
                <MdClose size={15} />
                {t("reject") || "Reject"}
              </button>
              <div className="sa-action-divider" />
            </>
          )}
          {isRejected && (
            <>
              {/* Rejected residents can only be re-approved; the API refuses to
                  place them in a flat or grant them a role until that happens. */}
              <button role="menuitem" className="sa-action-item" onClick={() => act(onApprove)} style={{ color: "#4ade80" }}>
                <MdCheck size={15} />
                {t("resReapprove", "Re-approve & Activate")}
              </button>
              <div className="sa-action-divider" />
            </>
          )}
          <button
            role="menuitem"
            className="sa-action-item"
            onClick={() => act(onViewDetails)}
          >
            <MdVisibility size={15} style={{ color: "var(--accent)" }} />
            {t("resViewDetails", "View Details")}
          </button>
          <button
            role="menuitem"
            className={gatedClass}
            onClick={() => gate(onAssignFlat)}
            aria-disabled={isRejected}
            title={blocked}
          >
            <MdAdd size={15} />
            {t("colAssignFlat") || "Assign Unit"}
          </button>
          <button
            role="menuitem"
            className={gatedClass}
            onClick={() => gate(onEdit)}
            aria-disabled={isRejected}
            title={blocked}
          >
            <MdEdit size={15} />
            {t("colEdit") || "Edit"}
          </button>
          {!isSocietyAdmin && !isTenant && (
            <>
              <div className="sa-action-divider" />
              {isCommittee ? (
                <button role="menuitem" className="sa-action-item" onClick={() => act(onRemoveCommittee)}>
                  <MdPerson size={15} />
                  {t("resRemoveCommittee")}
                </button>
              ) : isAccountant ? (
                <button role="menuitem" className="sa-action-item" onClick={() => act(onDeactivateAccountant)}>
                  <MdBlock size={15} style={{ color: "#f87171" }} />
                  {t("resDeactivateAcct")}
                </button>
              ) : (
                <button
                  role="menuitem"
                  className={gatedClass}
                  onClick={() => gate(onPromote)}
                  aria-disabled={isRejected}
                  title={blocked}
                >
                  <MdPersonAdd size={15} />
                  {t("resAddCommittee")}
                </button>
              )}
            </>
          )}
          <div className="sa-action-divider" />
          {isInactive ? (
            <button role="menuitem" className="sa-action-item" onClick={() => act(onToggleStatus)} style={{ color: "#4ade80" }}>
              <MdCheckCircle size={15} />
              {t("resReactivate", "Reactivate")}
            </button>
          ) : (
            <button role="menuitem" className="sa-action-item sa-action-item-danger" onClick={() => act(onToggleStatus)}>
              <MdBlock size={15} />
              {t("resDeactivate", "Deactivate")}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
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

function DocumentUploadField({ label, icon: Icon, accept, file, onChange, required, existingUrl }) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const preview = file?.type?.startsWith("image/") ? URL.createObjectURL(file) : null;
  const isImageExisting = existingUrl && !existingUrl.toLowerCase().split("?")[0].endsWith(".pdf");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)", margin: 0 }}>
          {label} {required && <span style={{ color: "#f87171" }}>*</span>}
        </label>
        {existingUrl && !file && (
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <MdVisibility size={14} /> View Current
          </a>
        )}
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const dropped = e.dataTransfer.files?.[0]; if (dropped) onChange(dropped); }}
        style={{
          borderRadius: 12,
          border: `2px dashed ${file ? "rgba(34,197,94,0.5)" : existingUrl ? "rgba(16,185,129,0.4)" : dragging ? "rgba(107,70,193,0.6)" : "rgba(255,255,255,0.12)"}`,
          background: file ? "rgba(34,197,94,0.06)" : existingUrl ? "rgba(16,185,129,0.04)" : dragging ? "rgba(107,70,193,0.06)" : "var(--card-inner-bg)",
          padding: "14px 16px",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: 64,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: file ? "rgba(34,197,94,0.12)" : existingUrl ? "rgba(16,185,129,0.12)" : "rgba(107,70,193,0.10)", border: `1px solid ${file ? "rgba(34,197,94,0.25)" : existingUrl ? "rgba(16,185,129,0.25)" : "rgba(107,70,193,0.20)"}` }}>
          {file ? <MdCheck size={20} style={{ color: "#4ade80" }} /> : existingUrl ? <MdCheckCircle size={20} style={{ color: "#10b981" }} /> : <Icon size={20} style={{ color: "#9F87D7" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {file ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{(file.size / 1024).toFixed(1)} KB · {t("rcaClickReplace", "Click to replace")}</p>
            </>
          ) : existingUrl ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Current document on file</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>Click or drag to upload a replacement photo</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{t("rcaClickDrag")}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{t("rcaPdfOrImage")}</p>
            </>
          )}
        </div>
        {file && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", flexShrink: 0 }}>
            <MdClose size={16} />
          </button>
        )}
        {preview ? (
          <img src={preview} alt="preview" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)" }} />
        ) : (existingUrl && isImageExisting) ? (
          <img src={existingUrl} alt="current" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(16,185,129,0.3)" }} />
        ) : null}
        <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STEP INDICATOR
═══════════════════════════════════════════ */
function StepIndicator({ step, total, labels, onStepClick }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 20 }}>
      {labels.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < total - 1 ? 1 : "none" }}>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: done ? "pointer" : "default" }}
              onClick={() => {
                if (done && onStepClick) onStepClick(num);
              }}
            >
              <div
                className={!done && !active ? "res-step-circle-inactive" : ""}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  transition: "all 0.3s",
                  background: done ? "#34d399" : active ? "linear-gradient(135deg, var(--accent), #8b5cf6)" : "var(--card-inner-bg)",
                  border: `2px solid ${done ? "#34d399" : active ? "var(--accent)" : "var(--glass-border)"}`,
                  color: done || active ? "#fff" : "var(--text-secondary)",
                  boxShadow: active ? "0 4px 12px rgba(107,70,193,0.35)" : "none",
                }}
              >
                {done ? <MdCheckCircle size={14} /> : num}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: active ? "var(--accent)" : done ? "#34d399" : "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className={!done ? "res-step-line" : ""}
                style={{
                  flex: 1,
                  height: 3,
                  margin: "0 6px",
                  marginBottom: 16,
                  background: done ? "#34d399" : "var(--glass-border)",
                  border: "0.5px solid rgba(107, 70, 193, 0.2)",
                  transition: "all 0.3s",
                  borderRadius: 999,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectionCard({ icon, title, subtitle, selected, onClick, color = "var(--accent)", colorBg = "rgba(160,90,255,0.12)" }) {
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", padding: "14px 16px", borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.18s ease", display: "flex", alignItems: "center", gap: 14, outline: "none", background: selected ? colorBg : "var(--card-inner-bg)", border: `2px solid ${selected ? color : "var(--glass-border)"}`, boxShadow: selected ? `0 4px 14px ${color}25` : "none" }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? colorBg : "var(--card-bg)", border: `1px solid ${selected ? color : "var(--glass-border)"}` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: selected ? color : "var(--text-primary)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: selected ? color : "transparent", border: `2px solid ${selected ? color : "var(--text-secondary)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
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
  const { t } = useLang();
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN";
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [allFlats, setAllFlats] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Society selection for SuperAdmin
  const [selectedSocietyId, setSelectedSocietyId] = useState(() => (societyId ? String(societyId) : ""));
  const [societiesList, setSocietiesList] = useState([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);

  const [propertyType, setPropertyType] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [flatType, setFlatType] = useState("2BHK");
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [bhkFilter, setBhkFilter] = useState("ALL");

  const isApartment = propertyType === "APARTMENT";
  const totalSteps = isApartment ? 4 : 3;
  const stepLabels = isApartment ? ["Type", "Block", "Floor", "Unit & Parking"] : ["Type", "Block", "Unit & Parking"];
  const flatStep = isApartment ? 4 : 3;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fetch societies list for SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingSocieties(true);
      API.get("/public/societies")
        .then((res) => {
          const list = res.data || [];
          setSocietiesList(list);
          if (!selectedSocietyId && societyId) {
            setSelectedSocietyId(String(societyId));
          }
        })
        .catch(() => {
          API.get("/societies")
            .then((res) => setSocietiesList(res.data || []))
            .catch(console.error);
        })
        .finally(() => setLoadingSocieties(false));
    }
  }, [isSuperAdmin]);

  // Keep in sync if prop changes
  useEffect(() => {
    if (societyId) {
      setSelectedSocietyId(String(societyId));
    }
  }, [societyId]);

  // Reset steps and sub-selections when society changes
  const handleSocietyChange = (newSocId) => {
    setSelectedSocietyId(newSocId);
    setPropertyType("");
    setSelectedBlockId("");
    setSelectedFloorId("");
    setSelectedFlatId("");
    setSelectedFlat(null);
    setSelectedSlotIds([]);
    setBhkFilter("ALL");
    setStep(1);
    setFormError("");
  };

  const effectiveSocId = isSuperAdmin ? selectedSocietyId : (societyId || user?.society_id);

  // Fetch unassigned flats and available parking slots for the chosen society
  useEffect(() => {
    if (isSuperAdmin && !selectedSocietyId) {
      setAllFlats([]);
      setAvailableSlots([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const headers = effectiveSocId ? { "x-society-id": String(effectiveSocId) } : {};
    const params = effectiveSocId ? { society_id: String(effectiveSocId) } : {};
    Promise.all([
      API.get("/flats/unassigned", { headers, params }),
      API.get("/parking-slots/available", { headers, params }),
    ])
      .then(([fRes, sRes]) => {
        setAllFlats(fRes.data || []);
        setAvailableSlots(sRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load units:", err);
        setAllFlats([]);
        setAvailableSlots([]);
      })
      .finally(() => setLoadingData(false));
  }, [residentId, effectiveSocId, isSuperAdmin, selectedSocietyId]);

  const availableBlocks = useMemo(() => {
    const seen = new Set();
    const out = [];
    allFlats.forEach((f) => {
      const isRH = f.floor_id == null;
      if (propertyType === "APARTMENT" && isRH) return;
      if (propertyType === "ROW_HOUSE" && !isRH) return;
      const bid = f.Block?.id || f.Floor?.Block?.id;
      const bname = f.Block?.name || f.Floor?.Block?.name;
      if (bid && !seen.has(bid)) {
        seen.add(bid);
        const count = allFlats.filter(flat => {
          const flatRH = flat.floor_id == null;
          if (propertyType === "APARTMENT" && flatRH) return false;
          if (propertyType === "ROW_HOUSE" && !flatRH) return false;
          const b = flat.Block?.id || flat.Floor?.Block?.id;
          return String(b) === String(bid);
        }).length;
        out.push({ id: bid, name: bname, count });
      }
    });
    return out;
  }, [allFlats, propertyType]);

  const availableFloors = useMemo(() => {
    if (!isApartment || !selectedBlockId) return [];
    const seen = new Set();
    const out = [];
    allFlats.forEach((f) => {
      if (f.floor_id == null) return;
      if (String(f.Floor?.Block?.id) !== String(selectedBlockId)) return;
      const fid = f.Floor?.id;
      const fnum = f.Floor?.floor_number;
      if (fid && !seen.has(fid)) {
        seen.add(fid);
        const count = allFlats.filter(flat => {
          return flat.floor_id != null &&
            String(flat.Floor?.Block?.id) === String(selectedBlockId) &&
            String(flat.Floor?.id) === String(fid);
        }).length;
        out.push({ id: fid, number: fnum, count });
      }
    });
    return out.sort((a, b) => Number(a.number) - Number(b.number));
  }, [allFlats, isApartment, selectedBlockId]);

  const availableFlats = useMemo(() => {
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
  }, [allFlats, isApartment, selectedBlockId, selectedFloorId]);

  const availableBhkTypes = useMemo(() => {
    if (!isApartment) return [];
    const set = new Set(availableFlats.map(f => f.flat_type).filter(Boolean));
    return ["1BHK", "2BHK", "3BHK"].filter(t => set.has(t));
  }, [availableFlats, isApartment]);

  const displayedFlats = useMemo(() => {
    if (!isApartment || bhkFilter === "ALL") return availableFlats;
    return availableFlats.filter(f => f.flat_type === bhkFilter);
  }, [availableFlats, bhkFilter, isApartment]);

  const selectedBlock = availableBlocks.find((b) => String(b.id) === String(selectedBlockId));
  const selectedFloor = availableFloors.find((f) => String(f.id) === String(selectedFloorId));

  const canGoNext = () => {
    if (isSuperAdmin && !selectedSocietyId) return false;
    if (step === 1) return !!propertyType;
    if (step === 2) return !!selectedBlockId;
    if (step === 3 && isApartment) return !!selectedFloorId;
    return !!selectedFlatId;
  };

  const goBack = () => {
    setFormError("");
    if (step === 2) {
      setSelectedBlockId("");
      setSelectedFloorId("");
      setSelectedFlatId("");
      setSelectedFlat(null);
      setBhkFilter("ALL");
    }
    if (step === 3 && isApartment) {
      setSelectedFloorId("");
      setSelectedFlatId("");
      setSelectedFlat(null);
      setBhkFilter("ALL");
    }
    if (step === flatStep) {
      setSelectedFlatId("");
      setSelectedFlat(null);
      setBhkFilter("ALL");
    }
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
    if (isSuperAdmin && !selectedSocietyId) {
      setFormError("Please select a society.");
      return;
    }
    if (!selectedFlatId) {
      setFormError("Please select a unit.");
      return;
    }
    setSubmitting(true);
    try {
      const parkingSlots = selectedSlotIds.map((id, idx) => ({
        slot_id: Number(id),
        parking_type: idx === 0 ? "DEFAULT" : "EXTRA",
      }));
      const payload = {
        resident_id: Number(residentId),
        resident_type: "OWNER",
        flat_type: isApartment ? (selectedFlat?.flat_type || null) : null,
        parking_slots: parkingSlots,
        ...(selectedSocietyId ? { society_id: Number(selectedSocietyId) } : {}),
      };
      const headers = selectedSocietyId ? { "x-society-id": String(selectedSocietyId) } : {};
      await API.put(`/flats/assign/${selectedFlatId}`, payload, { headers });
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

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(10, 14, 26, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 620,
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: 24,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 28px 85px rgba(0,0,0,0.65), 0 0 35px rgba(160,90,255,0.18)",
          animation: "saAssignModalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 18px",
          borderBottom: "1px solid var(--glass-border)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(160,90,255,0.35)",
              color: "#fff",
              flexShrink: 0,
            }}>
              <MdHome size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Assign Unit
                </h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(160,90,255,0.12)",
                  color: "var(--accent)",
                  border: "1px solid rgba(160,90,255,0.25)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Step {step} of {totalSteps}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Assigning to:</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#4BCBEB",
                  background: "rgba(75, 203, 235, 0.1)",
                  padding: "1px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(75, 203, 235, 0.22)",
                }}>
                  {residentName}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              background: "var(--card-inner-bg)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              transition: "all 0.18s ease",
            }}
            title="Close"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* SuperAdmin Society Selection Banner */}
        {isSuperAdmin && (
          <div style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, rgba(160,90,255,0.08) 0%, rgba(99,102,241,0.04) 100%)",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(160,90,255,0.18)",
                border: "1px solid rgba(160,90,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0,
              }}>
                <MdApartment size={18} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                  Target Society <span style={{ color: "#f87171" }}>*</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  Assigning unit from selected society
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
              <select
                value={selectedSocietyId}
                onChange={(e) => handleSocietyChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-inner-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Choose Society --</option>
                {societiesList.map((soc) => (
                  <option key={soc.id} value={soc.id}>
                    {soc.name} {soc.city ? `(${soc.city})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Stepper Progress Bar */}
        <div style={{ padding: "16px 24px 0", background: "var(--card-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            {stepLabels.map((label, idx) => {
              const num = idx + 1;
              const isCompleted = step > num;
              const isActive = step === num;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: idx === stepLabels.length - 1 ? 0 : 1, position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        transition: "all 0.25s ease",
                        background: isCompleted
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                          : isActive
                            ? "linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)"
                            : "var(--card-inner-bg)",
                        border: `2px solid ${isCompleted ? "#10b981" : isActive ? "var(--accent)" : "var(--glass-border)"}`,
                        color: isCompleted || isActive ? "#fff" : "var(--text-secondary)",
                        boxShadow: isActive ? "0 4px 14px rgba(160,90,255,0.4)" : isCompleted ? "0 4px 10px rgba(160,90,255,0.3)" : "none",
                      }}
                    >
                      {isCompleted ? <MdCheck size={14} color="#fff" /> : num}
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? "var(--accent)" : isCompleted ? "#10b981" : "var(--text-secondary)",
                      marginTop: 4,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.02em",
                    }}>
                      {label}
                    </span>
                  </div>

                  {idx < stepLabels.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: 3,
                      margin: "0 8px 16px",
                      background: isCompleted ? "linear-gradient(90deg, #10b981, #10b981)" : "var(--glass-border)",
                      borderRadius: 99,
                      transition: "all 0.3s ease",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{
          padding: "20px 24px 24px",
          overflowY: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {isSuperAdmin && !selectedSocietyId ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "48px 16px",
              textAlign: "center",
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "rgba(160,90,255,0.12)",
                border: "1px solid rgba(160,90,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}>
                <MdApartment size={28} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Please Select a Society
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 360 }}>
                Choose the society from the dropdown above to load available blocks, floors, vacant flats, and parking slots.
              </div>
            </div>
          ) : loadingData ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "50px 0", color: "var(--text-secondary)" }}>
              <Spinner />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Loading available units and blocks…</span>
            </div>
          ) : (
            <>
              {formError && (
                <div style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 12,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  animation: "fadeIn 0.2s ease",
                }}>
                  <MdClose size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Property Type */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {allFlats.length === 0 && (
                    <div style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.22)",
                      color: "#f87171",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <MdWarning size={18} style={{ flexShrink: 0 }} />
                      <span>No unassigned vacant units currently exist in this society. Please select another society or create blocks and units first.</span>
                    </div>
                  )}

                  <div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                      Select Property Category
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      Choose whether you are assigning a multi-floor apartment flat or an independent row house
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => { setPropertyType("APARTMENT"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); setBhkFilter("ALL"); }}
                      style={{
                        padding: "16px 18px",
                        borderRadius: 16,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        background: propertyType === "APARTMENT"
                          ? "linear-gradient(135deg, rgba(160,90,255,0.14) 0%, rgba(99,102,241,0.08) 100%)"
                          : "var(--card-inner-bg)",
                        border: `2px solid ${propertyType === "APARTMENT" ? "var(--accent)" : "var(--glass-border)"}`,
                        boxShadow: propertyType === "APARTMENT" ? "0 6px 20px rgba(160,90,255,0.2)" : "none",
                        transform: propertyType === "APARTMENT" ? "translateY(-1px)" : "none",
                      }}
                    >
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: propertyType === "APARTMENT" ? "rgba(160,90,255,0.25)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${propertyType === "APARTMENT" ? "var(--accent)" : "var(--glass-border)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: propertyType === "APARTMENT" ? "#c084fc" : "#4BCBEB",
                        flexShrink: 0,
                      }}>
                        <MdApartment size={26} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: propertyType === "APARTMENT" ? "var(--accent)" : "var(--text-primary)" }}>
                            Apartment / Tower Flat
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                            Multi-Storey
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                          Tower block structure organized by floors with individual BHK configurations (1BHK, 2BHK, 3BHK).
                        </p>
                      </div>
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: `2px solid ${propertyType === "APARTMENT" ? "var(--accent)" : "var(--glass-border)"}`,
                        background: propertyType === "APARTMENT" ? "var(--accent)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                      }}>
                        {propertyType === "APARTMENT" && <MdCheck size={14} color="#fff" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPropertyType("ROW_HOUSE"); setSelectedBlockId(""); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); setBhkFilter("ALL"); }}
                      style={{
                        padding: "16px 18px",
                        borderRadius: 16,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        background: propertyType === "ROW_HOUSE"
                          ? "linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(5,150,105,0.08) 100%)"
                          : "var(--card-inner-bg)",
                        border: `2px solid ${propertyType === "ROW_HOUSE" ? "#10b981" : "var(--glass-border)"}`,
                        boxShadow: propertyType === "ROW_HOUSE" ? "0 6px 20px rgba(16,185,129,0.2)" : "none",
                        transform: propertyType === "ROW_HOUSE" ? "translateY(-1px)" : "none",
                      }}
                    >
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: propertyType === "ROW_HOUSE" ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${propertyType === "ROW_HOUSE" ? "#10b981" : "var(--glass-border)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#34d399",
                        flexShrink: 0,
                      }}>
                        <MdHomeWork size={26} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: propertyType === "ROW_HOUSE" ? "#34d399" : "var(--text-primary)" }}>
                            Row House / Villa
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
                            Independent
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                          Ground-level independent residence with direct private entrance and standalone compound.
                        </p>
                      </div>
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: `2px solid ${propertyType === "ROW_HOUSE" ? "#10b981" : "var(--glass-border)"}`,
                        background: propertyType === "ROW_HOUSE" ? "#10b981" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                      }}>
                        {propertyType === "ROW_HOUSE" && <MdCheck size={14} color="#fff" />}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Block */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                        Select Building Block
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                        Choose from blocks with available vacant units
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                      {availableBlocks.length} Block{availableBlocks.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {availableBlocks.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, borderRadius: 16, background: "var(--card-inner-bg)", border: "1px dashed var(--glass-border)" }}>
                      {t("resNoBlocksAvailable") || "No blocks with vacant units available in this category."}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                      {availableBlocks.map((block) => {
                        const active = String(selectedBlockId) === String(block.id);
                        const activeColor = isApartment ? "var(--accent)" : "#10b981";
                        return (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() => { setSelectedBlockId(block.id); setSelectedFloorId(""); setSelectedFlatId(""); setSelectedFlat(null); setBhkFilter("ALL"); }}
                            style={{
                              padding: "16px 12px",
                              borderRadius: 16,
                              cursor: "pointer",
                              textAlign: "center",
                              transition: "all 0.18s ease",
                              outline: "none",
                              background: active
                                ? (isApartment ? "linear-gradient(135deg, rgba(160,90,255,0.18), rgba(99,102,241,0.1))" : "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.1))")
                                : "var(--card-inner-bg)",
                              border: `2px solid ${active ? activeColor : "var(--glass-border)"}`,
                              boxShadow: active ? `0 6px 20px ${isApartment ? "rgba(160,90,255,0.25)" : "rgba(16,185,129,0.25)"}` : "none",
                              transform: active ? "translateY(-2px)" : "none",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              background: active
                                ? (isApartment ? "rgba(160,90,255,0.25)" : "rgba(16,185,129,0.25)")
                                : "rgba(255,255,255,0.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: active ? activeColor : "var(--text-secondary)",
                            }}>
                              {isApartment ? <MdApartment size={22} /> : <MdHomeWork size={22} />}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: active ? activeColor : "var(--text-primary)" }}>
                              Block {block.name}
                            </div>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: active ? (isApartment ? "rgba(160,90,255,0.2)" : "rgba(16,185,129,0.2)") : "rgba(255,255,255,0.06)",
                              color: active ? activeColor : "var(--text-secondary)",
                            }}>
                              {block.count} vacant unit{block.count === 1 ? "" : "s"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Floor (Apartment Only) */}
              {step === 3 && isApartment && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                        Select Floor — <span style={{ color: "var(--accent)" }}>Block {selectedBlock?.name}</span>
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                        Pick the floor to view available apartment flats
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                      {availableFloors.length} Floor{availableFloors.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {availableFloors.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, borderRadius: 16, background: "var(--card-inner-bg)", border: "1px dashed var(--glass-border)" }}>
                      {t("resNoFloorsVacant") || "No floors with vacant flats in this block."}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                      {availableFloors.map((floor) => {
                        const active = String(selectedFloorId) === String(floor.id);
                        return (
                          <button
                            key={floor.id}
                            type="button"
                            onClick={() => { setSelectedFloorId(floor.id); setSelectedFlatId(""); setSelectedFlat(null); setBhkFilter("ALL"); }}
                            style={{
                              padding: "16px 10px",
                              borderRadius: 16,
                              cursor: "pointer",
                              textAlign: "center",
                              transition: "all 0.18s ease",
                              outline: "none",
                              background: active
                                ? "linear-gradient(135deg, rgba(160,90,255,0.18), rgba(99,102,241,0.1))"
                                : "var(--card-inner-bg)",
                              border: `2px solid ${active ? "var(--accent)" : "var(--glass-border)"}`,
                              boxShadow: active ? "0 6px 20px rgba(160,90,255,0.25)" : "none",
                              transform: active ? "translateY(-2px)" : "none",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              background: active ? "rgba(160,90,255,0.25)" : "rgba(255,255,255,0.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: active ? "var(--accent)" : "var(--text-secondary)",
                            }}>
                              <MdLayers size={20} />
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: active ? "var(--accent)" : "var(--text-primary)" }}>
                              Floor {floor.number}
                            </div>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: active ? "rgba(160,90,255,0.2)" : "rgba(255,255,255,0.06)",
                              color: active ? "var(--accent)" : "var(--text-secondary)",
                            }}>
                              {floor.count} vacant flat{floor.count === 1 ? "" : "s"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4 (or 3): Units + BHK Display + Parking */}
              {step === flatStep && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                          Select {isApartment ? "Flat Unit" : "Row House"}
                        </h4>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                          {isApartment
                            ? `Showing units in Block ${selectedBlock?.name} • Floor ${selectedFloor?.number}`
                            : `Showing units in Block ${selectedBlock?.name}`}
                        </p>
                      </div>

                      {/* BHK Filter Chips if multiple BHKs exist */}
                      {isApartment && availableBhkTypes.length > 1 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <button
                            type="button"
                            onClick={() => setBhkFilter("ALL")}
                            style={{
                              padding: "3px 9px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              outline: "none",
                              border: bhkFilter === "ALL" ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                              background: bhkFilter === "ALL" ? "rgba(160,90,255,0.18)" : "var(--card-inner-bg)",
                              color: bhkFilter === "ALL" ? "var(--text-primary)" : "var(--text-secondary)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            All ({availableFlats.length})
                          </button>
                          {availableBhkTypes.map((type) => {
                            const count = availableFlats.filter(f => f.flat_type === type).length;
                            const isAct = bhkFilter === type;
                            const s = BHK_STYLES[type] || BHK_STYLES["2BHK"];
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setBhkFilter(type)}
                                style={{
                                  padding: "3px 9px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  outline: "none",
                                  border: isAct ? `1px solid ${s.color}` : "1px solid var(--glass-border)",
                                  background: isAct ? s.bg : "var(--card-inner-bg)",
                                  color: isAct ? s.color : "var(--text-secondary)",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {type} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {displayedFlats.length === 0 ? (
                      <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, borderRadius: 16, background: "var(--card-inner-bg)", border: "1px dashed var(--glass-border)" }}>
                        {t("resNoUnitsAvailable") || "No vacant units matching your filter."}
                      </div>
                    ) : (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
                        gap: 10,
                        maxHeight: 210,
                        overflowY: "auto",
                        padding: "4px 2px",
                      }}>
                        {displayedFlats.map((flat) => {
                          const isSel = String(selectedFlatId) === String(flat.id);
                          const activeColor = isApartment ? "var(--accent)" : "#10b981";
                          const bhkStyle = BHK_STYLES[flat.flat_type] || BHK_STYLES["2BHK"];
                          return (
                            <button
                              key={flat.id}
                              type="button"
                              onClick={() => handleFlatSelect(flat.id)}
                              style={{
                                position: "relative",
                                padding: "12px 8px 10px",
                                borderRadius: 14,
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                outline: "none",
                                background: isSel
                                  ? (isApartment ? "linear-gradient(145deg, rgba(160,90,255,0.18), rgba(99,102,241,0.12))" : "linear-gradient(145deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))")
                                  : "var(--card-inner-bg)",
                                border: isSel
                                  ? `2px solid ${activeColor}`
                                  : "1px solid var(--glass-border)",
                                boxShadow: isSel
                                  ? `0 6px 20px ${isApartment ? "rgba(160,90,255,0.28)" : "rgba(16,185,129,0.25)"}`
                                  : "none",
                                transform: isSel ? "translateY(-2px)" : "none",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {isSel && (
                                <div style={{
                                  position: "absolute",
                                  top: 5,
                                  right: 5,
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  background: activeColor,
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}>
                                  <MdCheck size={11} />
                                </div>
                              )}

                              <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                background: isSel
                                  ? (isApartment ? "rgba(160,90,255,0.25)" : "rgba(16,185,129,0.25)")
                                  : "rgba(255,255,255,0.04)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isSel ? activeColor : "var(--text-secondary)",
                                marginBottom: 2,
                              }}>
                                {isApartment ? <MdMeetingRoom size={18} /> : <MdHomeWork size={18} />}
                              </div>

                              <div style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: isSel ? activeColor : "var(--text-primary)",
                                letterSpacing: "-0.01em",
                              }}>
                                {flat.flat_number}
                              </div>

                              {isApartment ? (
                                flat.flat_type ? (
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    background: bhkStyle.bg,
                                    color: bhkStyle.color,
                                    border: `1px solid ${bhkStyle.border}`,
                                    letterSpacing: "0.02em",
                                    marginTop: 2,
                                  }}>
                                    {flat.flat_type}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 9, color: "var(--text-secondary)", fontStyle: "italic", marginTop: 2 }}>
                                    —
                                  </span>
                                )
                              ) : (
                                <span style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 5,
                                  background: "rgba(16,185,129,0.12)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16,185,129,0.22)",
                                  marginTop: 2,
                                }}>
                                  Villa
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Flat Confirmation Showcase */}
                  {selectedFlat && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "14px 18px",
                      borderRadius: 16,
                      background: isApartment
                        ? "linear-gradient(135deg, rgba(160,90,255,0.12) 0%, rgba(99,102,241,0.06) 100%)"
                        : "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)",
                      border: `1.5px solid ${isApartment ? "rgba(160,90,255,0.25)" : "rgba(16,185,129,0.25)"}`,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: isApartment ? "rgba(160,90,255,0.22)" : "rgba(16,185,129,0.22)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isApartment ? "#c084fc" : "#34d399",
                          flexShrink: 0,
                        }}>
                          {isApartment ? <MdApartment size={24} /> : <MdHomeWork size={24} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                              {isApartment ? "Flat" : "House"} {selectedFlat.flat_number}
                            </span>
                            {isApartment && selectedFlat?.flat_type && (
                              <BhkBadge type={selectedFlat.flat_type} />
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "3px 0 0" }}>
                            {selectedBlock && `Block ${selectedBlock.name}`}
                            {isApartment && selectedFloor && ` • Floor ${selectedFloor.number}`}
                            {selectedSlotIds.length > 0 && ` • ${selectedSlotIds.length} slot(s)`}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(16,185,129,0.14)",
                        color: "#34d399",
                        border: "1px solid rgba(16,185,129,0.3)",
                        whiteSpace: "nowrap",
                      }}>
                        <MdCheckCircle size={13} /> Selected
                      </span>
                    </div>
                  )}

                  {/* Parking Slots Section */}
                  {selectedFlatId && availableSlots.length > 0 && (
                    <div style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: "var(--card-inner-bg)",
                      border: "1px solid var(--glass-border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Assign Parking Slots (Optional)
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                          1st = <span style={{ color: "#4ade80", fontWeight: 700 }}>Default</span> · others = <span style={{ color: "var(--accent)", fontWeight: 700 }}>Extra</span>
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                        {availableSlots.map((s) => {
                          const isSel = selectedSlotIds.includes(String(s.id));
                          const selIdx = selectedSlotIds.indexOf(String(s.id));
                          const badgeLabel = selIdx === 0 ? "DEFAULT" : selIdx > 0 ? "EXTRA" : null;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSlot(s.id)}
                              style={{
                                padding: "8px 6px",
                                borderRadius: 10,
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.16s ease",
                                outline: "none",
                                background: isSel ? "rgba(160,90,255,0.14)" : "var(--card-bg)",
                                border: `2px solid ${isSel ? "var(--accent)" : "var(--glass-border)"}`,
                              }}
                            >
                              <MdLocalParking size={16} style={{ color: isSel ? "#4BCBEB" : "var(--text-secondary)", display: "block", margin: "0 auto 2px" }} />
                              <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? "#4BCBEB" : "var(--text-primary)" }}>{s.slot_number}</div>
                              {s.vehicle_type && <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>{s.vehicle_type}</div>}
                              {badgeLabel && (
                                <div style={{ fontSize: 9, fontWeight: 800, color: badgeLabel === "DEFAULT" ? "#4ade80" : "var(--accent)", marginTop: 2 }}>
                                  {badgeLabel}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {selectedSlotIds.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                          {selectedSlotIds.map((sid, idx) => {
                            const slotObj = availableSlots.find(s => String(s.id) === sid);
                            if (!slotObj) return null;
                            return (
                              <div key={sid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(160,90,255,0.08)", border: "1px solid rgba(160,90,255,0.2)" }}>
                                <MdLocalParking size={13} style={{ color: "#4BCBEB", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                                  {slotObj.slot_number}{slotObj.vehicle_type ? ` • ${slotObj.vehicle_type}` : ""}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: idx === 0 ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)", color: idx === 0 ? "#4ade80" : "var(--accent)", border: `1px solid ${idx === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}` }}>
                                  {idx === 0 ? "DEFAULT" : "EXTRA"}
                                </span>
                                <button type="button" onClick={() => toggleSlot(slotObj.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 2 }}>
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
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderTop: "1px solid var(--glass-border)",
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.02) 100%)",
        }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                transition: "all 0.18s ease",
              }}
            >
              <MdArrowBack size={16} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: "transparent",
                border: "1px solid transparent",
                color: "var(--text-secondary)",
                transition: "all 0.18s ease",
              }}
            >
              Cancel
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step < flatStep ? (
              <button
                type="button"
                onClick={() => { setFormError(""); setStep((s) => s + 1); }}
                disabled={!canGoNext()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: canGoNext() ? "pointer" : "not-allowed",
                  opacity: canGoNext() ? 1 : 0.5,
                  background: "linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)",
                  border: "none",
                  color: "#fff",
                  boxShadow: canGoNext() ? "0 6px 20px rgba(160,90,255,0.35)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                <span>Continue</span>
                <MdArrowForward size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !selectedFlatId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: submitting || !selectedFlatId ? "not-allowed" : "pointer",
                  opacity: submitting || !selectedFlatId ? 0.5 : 1,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "#fff",
                  boxShadow: submitting || !selectedFlatId ? "none" : "0 6px 20px rgba(16,185,129,0.35)",
                  transition: "all 0.18s ease",
                }}
              >
                {submitting ? (
                  <>
                    <Spinner small />
                    <span>Assigning Unit…</span>
                  </>
                ) : (
                  <>
                    <MdCheckCircle size={17} />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes saAssignModalIn {
          0% { transform: scale(0.92) translateY(14px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
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
  const { t } = useLang();
  const vehicleLabel = (type) => (type === "CAR" ? t("parkCar") : type === "BIKE" ? t("parkBike") : type);
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
          {t("rcaFlatParking", { number: flatNumber })}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
          {selectedSlotIds.length === 0
            ? t("rcaNone")
            : selectedSlotIds.length === 1
              ? t("rcaOneDefaultSlot")
              : t("rcaOneDefaultPlusN", { count: selectedSlotIds.length - 1 })}
        </span>
      </div>

      {freeSlots.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, opacity: 0.6 }}>
          {t("rcaNoParking")}
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
            const badge = slotIdx === 0 ? t("rcaDefault") : slotIdx > 0 ? t("rcaExtra") : null;

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
                    {vehicleLabel(slot.vehicle_type)}
                  </div>
                )}
                {badge && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      marginTop: 2,
                      color: slotIdx === 0 ? "#4ade80" : "var(--accent)",
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
                  color: idx === 0 ? "#4ade80" : "var(--accent)",
                  border: `1px solid ${idx === 0 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
                }}
              >
                <MdLocalParking size={10} />
                {slotObj.slot_number}
                <span style={{ fontWeight: 400, opacity: 0.7 }}>{idx === 0 ? t("rcaDefault") : t("rcaExtra")}</span>
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
                    {isApartment && f.flat_type && (
                      <div style={{ marginTop: 2 }}>
                        <BhkBadge type={f.flat_type} />
                      </div>
                    )}
                    {isSel && <MdCheckCircle size={11} style={{ color, marginTop: 2 }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BHK badge (apartment + flat chosen) */}
      {isApartment && flat_id && (
        <div>
          <label style={fieldLabelStyle}>Flat Size (BHK)</label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Property Attribute</span>
            {flat_type ? (
              <BhkBadge type={flat_type} />
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>Not configured</span>
            )}
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
                          color: badgeLabel === "DEFAULT" ? "#4ade80" : "var(--accent)",
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
                        color: idx === 0 ? "#4ade80" : "var(--accent)",
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
  const { t } = useLang();

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
        <p style={fieldLabelStyle}>{t("rcaPropertyType")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { value: "APARTMENT", label: t("rcaApartment"), sub: t("rcaApartmentSub"), icon: MdApartment, color: "#6B46C1", bg: "rgba(107,70,193,0.10)" },
            { value: "ROW_HOUSE", label: t("rcaRowHouse"), sub: t("rcaRowHouseSub"), icon: MdHomeWork, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
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
          <label style={fieldLabelStyle}>{t("rcaBlock")}</label>
          {availableBlocks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              {t(isApartment ? "rcaNoBlocksFlats" : "rcaNoBlocksHouses")}
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
                      {t("rcaBlockName", { name: block.name })}
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
          <label style={fieldLabelStyle}>{t("rcaFloor")}</label>
          {availableFloors.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{t("rcaNoFloors")}</p>
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
                      {t("rcaFloorName", { number: floor.number })}
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
              {t(isApartment ? "rcaSelectFlats" : "rcaSelectHouses")}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10, marginLeft: 6, color: "var(--text-secondary)" }}>
                {t("rcaTapMultiple")}
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
                {t("rcaSelectedCount", { count: completedCount })}
              </span>
            )}
          </div>

          {availableFlats.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{t("rcaNoVacantUnits")}</p>
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
                    {isApartment && flat.flat_type && (
                      <div style={{ marginTop: 3 }}>
                        <BhkBadge type={flat.flat_type} />
                      </div>
                    )}
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
            {selectedFlatIds.length === 1 ? t("rcaConfigureFlat") : t("rcaConfigureFlats", { count: selectedFlatIds.length })}
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
                      {t(isApartment ? "rcaFlatLabel" : "rcaHouseLabel", { number: flat?.flat_number })}
                    </span>
                    {assignment.parking_slots.length > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                        {assignment.parking_slots.length === 1 ? t("rcaOneDefault") : t("rcaDefaultPlusExtra", { count: assignment.parking_slots.length - 1 })}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFlat(assignment.flat_id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 2 }}
                    title={t("rcaRemoveFlat")}
                  >
                    <MdClose size={14} />
                  </button>
                </div>

                {/* BHK display (apartment only) */}
                {isApartment && (
                  <div>
                    <label style={fieldLabelStyle}>{t("rcaFlatSize") || "Flat Size (BHK)"}</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Configured BHK</span>
                      {assignment.flat_type ? (
                        <BhkBadge type={assignment.flat_type} />
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>Not configured</span>
                      )}
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
              {t(completedCount === 1 ? "rcaFlatsReady" : "rcaFlatsReadyPlural", { count: completedCount })}
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
              🅿️ {t(defaultSlotCount === 1 ? "rcaDefaultSlots" : "rcaDefaultSlotsPlural", { count: defaultSlotCount })}
            </span>
            {allUsedSlotIds.length - defaultSlotCount > 0 && (
              <span
                style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                  background: "rgba(251,191,36,0.10)", color: "var(--accent)",
                  border: "1px solid rgba(251,191,36,0.22)",
                }}
              >
                {t("rcaExtraCount", { count: allUsedSlotIds.length - defaultSlotCount })}
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
  const { t } = useLang();
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
          <label style={fieldLabelStyle}>{t("rcaWhichFlat")}</label>
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
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSel ? "#9F87D7" : "var(--text-primary)" }}>{t("rcaFlatLabel", { number: flat.flat_number })}</p>
                      {flat.flat_type && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>{flat.flat_type}</p>}
                    </div>
                  </div>
                  {isSel && <MdCheckCircle size={16} style={{ color: "#9F87D7", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
          {!selectedExistingFlatId && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, opacity: 0.7 }}>{t("rcaSelectFlatHint")}</p>}
        </div>
      )}

      {(!isMultiFlat || selectedExistingFlatId) && (
        <>
          {!isMultiFlat && currentFlats && currentFlats.length > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(107,70,193,0.07)", border: "1px solid rgba(107,70,193,0.18)", fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ fontWeight: 700, color: "#9F87D7" }}>{t("rcaCurrentlyAssigned")} </span>
              {currentFlats.map((f) => f.flat_number).join(", ")}
              <span style={{ fontSize: 11, display: "block", marginTop: 3, opacity: 0.7 }}>{t("rcaReplaceHint")}</span>
            </div>
          )}

          {currentSlot && !revokeParking && !parking_slot_id && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.22)" }}>
              <MdLocalParking size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#4ade80" }}>{t("rcaCurrentSlot", { slot: currentSlot.slot_number })}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>{currentSlot.vehicle_type === "CAR" ? t("parkCar") : currentSlot.vehicle_type === "BIKE" ? t("parkBike") : currentSlot.vehicle_type}{currentSlot.parking_floor ? ` · ${t("rcaLevel", { floor: currentSlot.parking_floor })}` : ""}</p>
              </div>
              <button type="button" onClick={() => set({ revokeParking: true, parking_slot_id: "" })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 8, cursor: "pointer", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 11, fontWeight: 700 }}>
                <MdClose size={12} /> {t("rcaRevoke")}
              </button>
            </div>
          )}

          {revokeParking && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
              <MdClose size={14} style={{ color: "#f87171", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171", flex: 1 }}>{t("rcaSlotFreed")}</span>
              <button type="button" onClick={() => set({ revokeParking: false })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}>{t("rcaUndo")}</button>
            </div>
          )}

          <div>
            <label style={fieldLabelStyle}>{t("rcaReplaceNewFlat")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { value: "APARTMENT", label: t("rcaApartment"), icon: MdApartment, color: "#6B46C1", bg: "rgba(107,70,193,0.10)" },
                { value: "ROW_HOUSE", label: t("rcaRowHouse"), icon: MdHomeWork, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
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
              <label style={fieldLabelStyle}>{t("rcaSelectBlock")}</label>
              <Select className="input w-full" value={blockId} onChange={(e) => handleBlock(e.target.value)}>
                <option value="">{t("rcaChooseBlock")}</option>
                {availableBlocks.map((b) => <option key={b.id} value={b.id}>{t("rcaBlockName", { name: b.name })}</option>)}
              </Select>
            </div>
          )}

          {isApartment && blockId && (
            <div>
              <label style={fieldLabelStyle}>{t("rcaSelectFloor")}</label>
              <Select className="input w-full" value={floorId} onChange={(e) => handleFloor(e.target.value)}>
                <option value="">{t("rcaChooseFloor")}</option>
                {availableFloors.map((f) => <option key={f.id} value={f.id}>{t("rcaFloorName", { number: f.number })}</option>)}
              </Select>
            </div>
          )}

          {((isApartment && floorId) || (!isApartment && blockId)) && (
            <div>
              <label style={fieldLabelStyle}>{t(isApartment ? "rcaSelectFlat" : "rcaSelectHouse")}</label>
              {availableFlats.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "8px 0", margin: 0 }}>{t("rcaNoVacantLocation")}</p>
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
              <label style={fieldLabelStyle}>{t("rcaFlatSizeBhk")}</label>
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
                {t(isApartment ? "rcaFlatLabel" : "rcaHouseLabel", { number: selectedFlatObj.flat_number })}
                {selectedBlock && ` · ${t("rcaBlockName", { name: selectedBlock.name })}`}
                {isApartment && selectedFloor && ` · ${t("rcaFloorName", { number: selectedFloor.number })}`}
                {isApartment && flat_type && ` · ${flat_type}`}
              </span>
              <button type="button" onClick={() => set({ flat_id: "", blockId: "", floorId: "", propType: "" })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", marginLeft: "auto" }}>
                <MdClose size={13} />
              </button>
            </div>
          )}

          {!revokeParking && (
            <div>
              <label style={fieldLabelStyle}>{currentSlot ? t("rcaReplaceSlot") : t("rcaParkingSlot")}<span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10 }}> {t("rcaOptional")}</span></label>
              {availableSlots.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, opacity: 0.7 }}>{t("rcaNoParking")}</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6, maxHeight: 140, overflowY: "auto" }}>
                  {availableSlots.map((slot) => {
                    const isSel = String(parking_slot_id) === String(slot.id);
                    return (
                      <button key={slot.id} type="button" onClick={() => set({ parking_slot_id: isSel ? "" : slot.id, revokeParking: false })}
                        style={{ padding: "10px 6px", borderRadius: 9, cursor: "pointer", textAlign: "center", transition: "all 0.16s", outline: "none", fontWeight: 700, fontSize: 11, background: isSel ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.04)", border: `2px solid ${isSel ? "#6B46C1" : "rgba(255,255,255,0.08)"}`, color: isSel ? "#C0B0E5" : "var(--text-primary)" }}>
                        <MdLocalParking size={14} style={{ margin: "0 auto 3px", display: "block", color: isSel ? "#C0B0E5" : "var(--text-secondary)" }} />
                        <div>{slot.slot_number}</div>
                        {slot.vehicle_type && <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>{slot.vehicle_type === "CAR" ? t("parkCar") : slot.vehicle_type === "BIKE" ? t("parkBike") : slot.vehicle_type}</div>}
                        {isSel && <MdCheckCircle size={11} style={{ color: "#C0B0E5", marginTop: 2 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
              {parking_slot_id && selectedSlotObj && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(107,70,193,0.07)", border: "1px solid rgba(107,70,193,0.18)" }}>
                  <MdLocalParking size={15} style={{ color: "#C0B0E5", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#C0B0E5", flex: 1 }}>{t("rcaSlotLabel", { number: selectedSlotObj.slot_number })}{selectedSlotObj.vehicle_type ? ` · ${selectedSlotObj.vehicle_type === "CAR" ? t("parkCar") : selectedSlotObj.vehicle_type === "BIKE" ? t("parkBike") : selectedSlotObj.vehicle_type}` : ""}</span>
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


const DEFAULT_RESIDENT_PASSWORD = "Admin@123";

/* ─── Password rule checks (matching Register.jsx) ─── */
const PW_RULES = [
  { id: "len", label: "At least 8 chars", test: (p) => Boolean(p && p.length >= 8) },
  { id: "upper", label: "One uppercase (A-Z)", test: (p) => /[A-Z]/.test(p || "") },
  { id: "lower", label: "One lowercase (a-z)", test: (p) => /[a-z]/.test(p || "") },
  { id: "digit", label: "One number (0-9)", test: (p) => /\d/.test(p || "") },
  { id: "spec", label: "One special char (!@#)", test: (p) => /[\W_]/.test(p || "") },
];

function pwStrength(p) {
  if (!p) return 0;
  return PW_RULES.filter((r) => r.test(p)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Moderate", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["", "#ef4444", "#3b82f6", "#eab308", "#22c55e", "#10b981"];

const EMPTY_FORM = {
  name: "", email: "", password: DEFAULT_RESIDENT_PASSWORD, phone: "",
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
  const [roleCounts, setRoleCounts] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const limitRef = useRef(limit);
  limitRef.current = limit;
const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formStep, setFormStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [emailCheckState, setEmailCheckState] = useState({
    status: "idle", // "idle" | "checking" | "not_found" | "already_member" | "exists_other"
    user: null,
    message: "",
  });
  const [useExistingAccount, setUseExistingAccount] = useState(false);

  const [editFlatData, setEditFlatData] = useState(EMPTY_EDIT_FLAT);
  const [editCurrentFlats, setEditCurrentFlats] = useState([]);

  const [assignModal, setAssignModal] = useState(null);

  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [residentDocs, setResidentDocs] = useState(null);

  const [allUnassignedFlats, setAllUnassignedFlats] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [committeeConfirm, setCommitteeConfirm] = useState(null);
  const [accountantConfirm, setAccountantConfirm] = useState(null);
  const [flatDetailModal, setFlatDetailModal] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const { user } = useContext(AuthContext);
  const { showUnauthorized, showError } = useCustomAlert();
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN";
  const canManageResidents =
    hasPermission(user, "resident", "create") ||
    hasPermission(user, "resident", "edit") ||
    hasPermission(user, "resident", "delete");
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter");
    return (saved === "ALL" || !saved) ? "" : saved;
  });

  const isResidentPending = (r) => {
    if (!r) return false;
    if (isSuperAdmin && !filterSocietyId) {
      return String(r.approval_status || "").toUpperCase() === "PENDING" || Boolean(r.has_pending_approval);
    }
    return String(r.approval_status || "").toUpperCase() === "PENDING";
  };
  const [filterBlockId, setFilterBlockId] = useState("");
  const [filterFloorId, setFilterFloorId] = useState("");
  const [filterFlatId, setFilterFlatId] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [allSocietyFlats, setAllSocietyFlats] = useState([]);
  const [formSocietyId, setFormSocietyId] = useState("");

  // 1. Fetch Societies for selection (both Super Admin & Society Admin)
  useEffect(() => {
    API.get("/public/societies")
      .then((res) => setSocietiesList(res.data || []))
      .catch(() => {
        API.get("/societies")
          .then((res) => setSocietiesList(res.data || []))
          .catch(console.error);
      });
  }, []);

  const [societySearch, setSocietySearch] = useState("");

  const filteredSocieties = useMemo(() => {
    const q = (societySearch || "").trim().toLowerCase();
    if (!q) return societiesList;
    return societiesList.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [societiesList, societySearch]);

  const currentSocietyObj = useMemo(() => {
    const targetId = formSocietyId || (isSuperAdmin ? filterSocietyId : user?.society_id);
    if (!targetId) return null;
    const match = societiesList.find((s) => String(s.id) === String(targetId));
    if (match) return match;
    return {
      id: targetId,
      name: user?.society_name || `Society #${targetId}`,
      address: user?.society_address || "",
    };
  }, [formSocietyId, filterSocietyId, user, societiesList, isSuperAdmin]);

  // 2. Fetch all flats for the selected society to build filter dropdowns
  useEffect(() => {
    const socId = isSuperAdmin ? filterSocietyId : user?.society_id;
    const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
    if (socId || !isSuperAdmin) {
      API.get("/flats", { headers })
        .then((res) => {
          const data = res.data?.data || res.data || [];
          setAllSocietyFlats(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to load flats for filter dropdowns", err);
          setAllSocietyFlats([]);
        });
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
  }, [showForm, editingId, isSuperAdmin, filterSocietyId]);

  // 4. Derive unique Blocks from society flats
  const blocksList = useMemo(() => {
    const blocks = new Map();
    allSocietyFlats.forEach(f => {
      const bId = f.Floor?.Block?.id || f.Block?.id || f.block_id;
      const bName = f.Floor?.Block?.name || f.Block?.name || (bId ? `Block ${bId}` : null);
      if (bId && !blocks.has(bId)) blocks.set(bId, { id: bId, name: bName });
    });
    return Array.from(blocks.values());
  }, [allSocietyFlats]);

  // 5. Derive unique Floors based on selected Block
  const floorsList = useMemo(() => {
    if (!filterBlockId) return [];
    const floors = new Map();
    allSocietyFlats.forEach(f => {
      const bId = f.Floor?.Block?.id || f.Block?.id || f.block_id;
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
      const bId = f.Floor?.Block?.id || f.Block?.id || f.block_id;
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
    setPhotoFile(null);
    setResidentDocs(null);
    setEditingId(null);
    setEditFlatData(EMPTY_EDIT_FLAT);
    setEditCurrentFlats([]);
    const defaultSocId = isSuperAdmin ? (filterSocietyId || "") : (user?.society_id ? String(user.society_id) : "");
    setFormSocietyId(defaultSocId);
    setSocietySearch("");
    setFormStep(1);
    setShowPassword(false);
    setEmailCheckState({ status: "idle", user: null, message: "" });
    setUseExistingAccount(false);
  };

  const handleCheckEmail = async () => {
    setFormError("");
    const emailToTest = (formData.email || "").trim();
    if (!emailToTest) {
      setFormError(t("rcaErrEmailRequired", "Email is required."));
      return;
    }
    const err = getEmailError(emailToTest);
    if (err) {
      setFormError(t("rcaErrEmailInvalid", "Please enter a valid email address."));
      return;
    }
    const socId = isSuperAdmin ? formSocietyId : user?.society_id;
    if (isSuperAdmin && !socId) {
      setFormError(t("rcaErrSelectSociety", "Please select a target society first."));
      return;
    }

    setEmailCheckState({ status: "checking", user: null, message: "Checking email..." });
    try {
      const headers = (isSuperAdmin && socId) ? { "x-society-id": socId } : {};
      const res = await API.get("/users/resident/check-email", {
        params: { email: emailToTest, society_id: socId },
        headers,
      });
      const data = res.data;
      if (!data.exists) {
        setEmailCheckState({
          status: "not_found",
          user: null,
          message: data.message || "Email is available. New account will be created.",
        });
        setUseExistingAccount(false);
      } else if (data.alreadyMember) {
        setEmailCheckState({
          status: "already_member",
          user: data.user,
          message: data.message || "Resident is already registered in this society.",
        });
        setUseExistingAccount(false);
      } else {
        setEmailCheckState({
          status: "exists_other",
          user: data.user,
          message: data.message || "An existing resident account was found with this email.",
        });
      }
    } catch (apiErr) {
      console.error("Email check failed", apiErr);
      setEmailCheckState({
        status: "idle",
        user: null,
        message: apiErr.response?.data?.message || "Failed to check email status.",
      });
      setFormError(apiErr.response?.data?.message || "Failed to check email status.");
    }
  };

  const handleApplyExistingUser = (existingUser) => {
    if (!existingUser) return;
    setFormData((prev) => ({
      ...prev,
      name: existingUser.name || prev.name,
      phone: existingUser.phone || prev.phone,
      profile_picture: existingUser.profile_picture || null,
      profile_picture_url: existingUser.profile_picture || null,
      occupant_count: existingUser.occupant_count != null ? existingUser.occupant_count : prev.occupant_count,
      vehicle_count: existingUser.vehicle_count != null ? existingUser.vehicle_count : prev.vehicle_count,
      emergency_contact: existingUser.emergency_contact
        ? {
            name: existingUser.emergency_contact.name || "",
            phone: existingUser.emergency_contact.phone || "",
          }
        : prev.emergency_contact,
    }));
    if (existingUser.documents) {
      setResidentDocs(existingUser.documents);
    }
    setUseExistingAccount(true);
    toast.info(`Reusing account for ${existingUser.name}. All existing profile, household details, and KYC documents linked.`);
  };

  /* Unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showForm || !!editingId);
  const requestCloseForm = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else { setShowForm(false); resetForm(); }
  };

  const loadResidents = useCallback(
    async (pageNum, currentSearch, isInitial = false) => {
      if (isInitial) setInitialLoad(true);
      else setFetching(true);
      try {
        const params = new URLSearchParams({
          page: pageNum,
          limit: limitRef.current,
          ...(currentSearch ? { search: currentSearch } : {}),
          ...(filterSocietyId ? { society_id: filterSocietyId } : {}),
          ...(filterBlockId ? { block_id: filterBlockId } : {}),
          ...(filterFloorId ? { floor_id: filterFloorId } : {}),
          ...(filterFlatId ? { flat_id: filterFlatId } : {}),
          ...(filterRole ? { role: filterRole } : {}),
        });
        const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
        const res = await API.get(`/users/resident?${params}`, { headers });
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.residents)
          ? res.data.residents
          : [];
        setResidents(data);
        setTotalAll(res.data.totalAll ?? res.data.pagination?.totalItems ?? 0);
        setRoleCounts(res.data?.roleCounts || null);
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
    [filterSocietyId, filterBlockId, filterFloorId, filterFlatId, filterRole, isSuperAdmin],
  );

  const displayedResidents = useMemo(() => {
    if (!filterRole) return residents;
    return residents.filter((r) => {
      const roles = Array.isArray(r.roles)
        ? r.roles.map((role) => String(role).toUpperCase())
        : typeof r.roles === "string"
        ? [r.roles.toUpperCase()]
        : [];

      const residentType = (r.resident_type || "").toUpperCase();

      switch (filterRole) {
        case "COMMITTEE_MEMBER":
          return roles.includes("COMMITTEE_MEMBER");
        case "ACCOUNTANT":
          return roles.includes("ACCOUNTANT");
        case "ADMIN":
          return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
        case "SOCIETY_ADMIN":
          return roles.includes("SOCIETY_ADMIN");
        case "RESIDENT":
          // "Resident" means a regular member: everyone except the committee
          // and accountant buckets shown by the KPI cards above the table.
          if (roles.includes("COMMITTEE_MEMBER") || roles.includes("ACCOUNTANT")) return false;
          return residentType === "OWNER" || roles.includes("RESIDENT") || (residentType !== "TENANT" && !roles.includes("TENANT"));
        case "TENANT":
          return residentType === "TENANT" || roles.includes("TENANT");
        default:
          return true;
      }
    });
  }, [residents, filterRole]);

  /* KPI card values. `roleCounts` is returned by GET /users/resident and is
     computed from the whole filtered set (not just the current page), so the
     four cards stay accurate no matter the page size. The reduce below is only
     a fallback if the server did not send the breakdown. */
  const cardStats = useMemo(() => {
    const fallbackCounts = residents.reduce(
      (acc, r) => {
        const roles = Array.isArray(r.roles) ? r.roles : typeof r.roles === "string" ? [r.roles] : [];
        if (roles.includes("COMMITTEE_MEMBER")) acc.committee += 1;
        else if (roles.includes("ACCOUNTANT")) acc.accountant += 1;
        else acc.resident += 1;
        return acc;
      },
      { resident: 0, committee: 0, accountant: 0 },
    );
    const counts = roleCounts || fallbackCounts;
    return {
      total: roleCounts?.total ?? totalAll,
      resident: counts.resident ?? 0,
      committee: counts.committee ?? 0,
      accountant: counts.accountant ?? 0,
    };
  }, [roleCounts, residents, totalAll]);

  const handleOpenAddResident = () => {
    if (!showForm && !hasPermission(user, "resident", "create")) {
      showUnauthorized("You do not have permission to add residents.");
      return;
    }
    const next = !showForm;
    setShowForm(next);
    if (next) {
      resetForm();
      setFormSocietyId(filterSocietyId);
    }
    setAssignModal(null);
    if (showForm) resetForm();
  };

  const handleOpenAssignModal = (resident) => {
    if (!hasPermission(user, "property", "edit")) {
      showUnauthorized("You do not have permission to assign units.");
      return;
    }
    const defaultSocId = resident.society_id || (resident.societies && resident.societies[0]?.id) || (isSuperAdmin ? filterSocietyId : user?.society_id) || "";
    setAssignModal({ id: resident.id, name: resident.name, society_id: defaultSocId });
  };

  const handleApproveResident = async (resident, societyId) => {
    if (!hasPermission(user, "tenant_management", "approve")) {
      showUnauthorized("You do not have permission to approve residents.");
      return;
    }
    try {
      const pendingSoc = resident.societies?.find((s) => s.membership_status === "PENDING");
      const targetSocId = societyId || (user.activeRole !== "SUPER_ADMIN" ? user.society_id : (pendingSoc?.id || resident.society_id));
      await API.put(`/admin/approve-resident/${resident.id}`, { society_id: targetSocId });
      toast.success(`${resident.name} approved & activated`);
      loadResidents(page, debouncedSearch);
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Approval restricted");
      } else {
        toast.error(err.response?.data?.message || "Failed to approve resident");
      }
    }
  };

  const confirmRejectResident = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error(t("rejectionReasonRequired"));
      return;
    }
    setRejectLoading(true);
    try {
      const pendingSoc = rejectTarget.societies?.find((s) => s.membership_status === "PENDING");
      const targetSocId = rejectTarget._targetSocietyId || (user.activeRole !== "SUPER_ADMIN" ? user.society_id : (pendingSoc?.id || rejectTarget.society_id));
      const { data } = await API.put(`/admin/reject-resident/${rejectTarget.id}`, { reason, society_id: targetSocId });
      toast.success(t("residentRejected", { name: rejectTarget.name }));
      // The API persists the rejection even if SMTP fails, so warn separately.
      if (data && data.emailSent === false) {
        toast.warning(t("rejectionEmailFailed", { name: rejectTarget.name }));
      }
      setRejectTarget(null);
      setRejectReason("");
      loadResidents(page, debouncedSearch);
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Rejection restricted");
      } else {
        toast.error(err.response?.data?.message || "Failed to reject resident");
      }
    } finally {
      setRejectLoading(false);
    }
  };

  const promoteCommittee = async (userId, societyId) => {
    if (!hasPermission(user, "resident", "promote")) {
      showUnauthorized("You do not have permission to promote committee members.");
      setCommitteeConfirm(null);
      return;
    }
    try {
      const res = await API.post("/users/committee/promote", { userId, societyId });
      setCommitteeConfirm(null);
      loadResidents(page, debouncedSearch);
      toast.success(res.data?.message || "Promoted to committee member");
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        toast.error(err.response?.data?.message || "Failed to promote");
      }
    }
  };

  const removeCommittee = async (userId, societyId) => {
    if (!hasPermission(user, "resident", "promote")) {
      showUnauthorized("You do not have permission to manage committee members.");
      setCommitteeConfirm(null);
      return;
    }
    try {
      const res = await API.post("/users/committee/remove", { userId, societyId });
      setCommitteeConfirm(null);
      loadResidents(page, debouncedSearch);
      toast.success(res.data?.message || "Removed from committee");
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        toast.error(err.response?.data?.message || "Failed to remove");
      }
    }
  };

  const deactivateAccountant = async (userId) => {
    if (!hasPermission(user, "accountant", "toggle_status")) {
      showUnauthorized("You do not have permission to change accountant status.");
      setAccountantConfirm(null);
      return;
    }
    try {
      await API.patch(`/accountant/${userId}/status`, { status: "INACTIVE" });
      setAccountantConfirm(null);
      loadResidents(page, debouncedSearch);
      toast.success(t("resAcctDeactivated"));
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        toast.error(err.response?.data?.message || "Failed to deactivate accountant");
      }
    }
  };

  const hasActiveFilters = Boolean(filterBlockId || filterFloorId || filterFlatId || filterRole || (isSuperAdmin && filterSocietyId) || search);

  const handleClearFilters = () => {
    setFilterBlockId("");
    setFilterFloorId("");
    setFilterFlatId("");
    setFilterRole("");
    if (isSuperAdmin) {
      setFilterSocietyId("");
      localStorage.setItem("superadmin_society_filter", "ALL");
      window.dispatchEvent(new Event("superadmin-society-scope-change"));
    }
    setSearch("");
  };

  useEffect(() => { loadResidents(1, "", true); }, [loadResidents]);
  useEffect(() => { if (initialLoad) return; loadResidents(1, debouncedSearch); }, [debouncedSearch, filterSocietyId, filterBlockId, filterFloorId, filterFlatId, filterRole, initialLoad, loadResidents]);

  const handlePageChange = (p) => loadResidents(p, debouncedSearch);

  const handleEdit = (resident) => {
    if (!hasPermission(user, "resident", "edit")) {
      showUnauthorized("You do not have permission to edit resident details.");
      return;
    }
    const pic = resident.profile_picture || resident.avatar || resident.profile_picture_url || null;
    setFormData({
      name: resident.name,
      email: resident.email,
      password: "",
      phone: resident.phone || "",
      resident_type: resident.resident_type || "OWNER",
      flat_assignments: [],
      vehicle_count: resident.vehicle_count ?? 0,
      occupant_count: resident.occupant_count ?? 1,
      emergency_contact: {
        name: resident.emergency_contact?.name || "",
        phone: resident.emergency_contact?.phone || "",
      },
      profile_picture: pic,
      profile_picture_url: pic,
      profile_picture_file: null,
    });
    setPhotoFile(null);
    setAadharFile(null);
    setPanFile(null);
    setResidentDocs(resident.documents || null);
    setEditCurrentFlats(resident.flats || []);
    setEditFlatData(EMPTY_EDIT_FLAT);
    setEditingId(resident.id);
    setFormSocietyId(resident.society_id || "");
    setFormStep(1);
    setShowForm(true);
    setStatusTarget(null);
    setAssignModal(null);

    const socId = resident.society_id || (isSuperAdmin ? formSocietyId : user?.society_id);
    const headers = (isSuperAdmin && socId) ? { "x-society-id": socId } : {};
    API.get(`/user-documents/user/${resident.id}`, { headers })
      .then((res) => {
        if (res.data) setResidentDocs(res.data);
      })
      .catch((err) => console.error("Failed to load resident docs", err));
  };

  const handleNextStep = () => {
    setFormError("");

    // ── STEP 1: Society ──
    if (formStep === 1) {
      const targetSocId = formSocietyId || (isSuperAdmin ? filterSocietyId : user?.society_id);
      if (!targetSocId) {
        setFormError(t("rcaErrSelectSociety", "Please select a society to continue."));
        return;
      }
      if (!formSocietyId) setFormSocietyId(String(targetSocId));
      setFormStep(2);
      return;
    }

    // ── STEP 2: Account ──
    if (formStep === 2) {
      const emailErr = getEmailError(formData.email);
      if (emailErr) {
        setFormError(!formData.email?.trim() ? t("rcaErrEmailRequired", "Email is required.") : t("rcaErrEmailInvalid", "Please enter a valid email address."));
        return;
      }

      if (!editingId) {
        if (emailCheckState.status === "already_member") {
          setFormError("A resident with this email is already registered in this society.");
          return;
        }
        if (emailCheckState.status === "exists_other" && !useExistingAccount) {
          setFormError("An existing account with this email was found. Please click 'Use Existing Account' to reuse data, or use a different email.");
          return;
        }
      }

      if (!formData.name?.trim()) {
        setFormError(t("rcaErrNameRequired", "Full name is required."));
        return;
      }
      const nameErr = getTitleError(formData.name, "Full name");
      if (nameErr) { setFormError(t("rcaErrNameInvalid", "Name must contain only letters and spaces.")); return; }

      const phoneErr = formData.phone ? getMobileError(formData.phone, "Phone") : null;
      if (phoneErr) { setFormError(t("rcaErrPhoneInvalid", "Phone must be a valid 10-digit number.")); return; }

      if (!editingId && !useExistingAccount && !formData.password?.trim()) {
        setFormData((prev) => ({ ...prev, password: DEFAULT_RESIDENT_PASSWORD }));
      }
      setFormStep(3);
      return;
    }

    // ── STEP 3: Household ──
    if (formStep === 3) {
      if (Number(formData.occupant_count) < 1) {
        setFormError("Occupant count must be at least 1.");
        return;
      }
      const ec = formData.emergency_contact;
      const ecFilled = ec?.name?.trim() || ec?.phone?.trim();
      if (ecFilled && (!ec?.name?.trim() || !ec?.phone?.trim())) {
        setFormError(t("rcaErrEmergencyBoth", "Please provide both emergency contact name and phone, or leave both empty."));
        return;
      }
      if (ecFilled) {
        const ecNameErr = getTitleError(ec.name, "Emergency contact name");
        if (ecNameErr) { setFormError(t("rcaErrEcName", "Emergency contact name must be letters only.")); return; }
        const ecPhoneErr = getMobileError(ec.phone, "Emergency contact phone");
        if (ecPhoneErr) { setFormError(t("rcaErrEcPhone", "Emergency contact phone must be 10 digits.")); return; }
      }
      setFormStep(4);
      return;
    }

    // ── STEP 4: KYC ──
    if (formStep === 4) {
      if (!editingId && !useExistingAccount && (!aadharFile || !panFile)) {
        setFormError(t("rcaErrKyc", "Please upload both Aadhaar and PAN documents for verification."));
        return;
      }
      setFormStep(5);
      return;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!editingId && !useExistingAccount && (!aadharFile || !panFile)) {
      setFormError(t("rcaErrKyc"));
      return;
    }

    const ec = formData.emergency_contact;
    const ecFilled = ec.name?.trim() || ec.phone?.trim();
    if (ecFilled && (!ec.name?.trim() || !ec.phone?.trim())) {
      setFormError(t("rcaErrEmergencyBoth"));
      return;
    }
    if (ecFilled) {
      const ecNameErr = getTitleError(ec.name, "Emergency contact name");
      if (ecNameErr) { setFormError(t("rcaErrEcName")); return; }
      const ecPhoneErr = getMobileError(ec.phone, "Emergency contact phone");
      if (ecPhoneErr) { setFormError(t("rcaErrEcPhone")); return; }
    }
    const phoneErr = formData.phone ? getMobileError(formData.phone, "Phone") : null;
    if (phoneErr) { setFormError(t("rcaErrPhoneInvalid")); return; }
    if (!editingId) {
      const completedAssignments = formData.flat_assignments.filter(a => a.flat_id);
      if (completedAssignments.length === 0) {
        setFormError(t("rcaErrAssignFlat"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const headers = (isSuperAdmin && formSocietyId) ? { "x-society-id": formSocietyId } : {};

      if (editingId) {
        const payload = {
          name: formData.name.trim(),
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
        const editPhoto = formData.profile_picture_file || photoFile;
        if (editPhoto) {
          const fd = new FormData();
          Object.entries(payload).forEach(([k, v]) => {
            if (v !== undefined) {
              fd.append(k, typeof v === "object" && v !== null ? JSON.stringify(v) : String(v));
            }
          });
          fd.append("photo", editPhoto);
          await API.put(`/users/resident/${editingId}`, fd, { headers });
        } else {
          await API.put(`/users/resident/${editingId}`, payload, { headers });
        }

        if (aadharFile || panFile) {
          const docForm = new FormData();
          if (aadharFile) docForm.append("aadhar", aadharFile);
          if (panFile) docForm.append("pan", panFile);
          await API.post(
            `/user-documents?userId=${editingId}`,
            docForm,
            { headers: { ...headers, "Content-Type": "multipart/form-data" } },
          );
        }

        toast.success(t("rcaUpdateSuccess"));
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

        const residentPayload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: useExistingAccount ? undefined : (formData.password || DEFAULT_RESIDENT_PASSWORD),
          phone: formData.phone || undefined,
          resident_type: "OWNER",
          flat_assignments: flatAssignments,
          vehicle_count: formData.vehicle_count,
          occupant_count: formData.occupant_count,
          emergency_contact: ecFilled ? { name: ec.name.trim(), phone: ec.phone.trim() } : undefined,
          useExistingAccount: Boolean(useExistingAccount),
          society_id: formSocietyId || undefined,
        };

        let residentRes;
        const uploadPhoto = formData.profile_picture_file || photoFile;
        if (uploadPhoto && !useExistingAccount) {
          const fd = new FormData();
          Object.entries(residentPayload).forEach(([key, value]) => {
            if (value !== undefined) {
              fd.append(key, typeof value === "object" && value !== null ? JSON.stringify(value) : String(value));
            }
          });
          fd.append("photo", uploadPhoto);
          residentRes = await API.post("/users/resident", fd, { headers });
        } else {
          residentRes = await API.post("/users/resident", residentPayload, { headers });
        }

        const newUserId =
          residentRes.data?.user?.id ||
          residentRes.data?.id ||
          residentRes.data?.resident?.id;

        if (aadharFile || panFile) {
          const docForm = new FormData();
          if (aadharFile) docForm.append("aadhar", aadharFile);
          if (panFile) docForm.append("pan", panFile);
          await API.post(
            `/user-documents${newUserId ? `?userId=${newUserId}` : ""}`,
            docForm,
            { headers: { ...headers, "Content-Type": "multipart/form-data" } },
          );
        }

        toast.success(useExistingAccount ? "Resident added to society using existing account!" : t("rcaCreateSuccess"));
      }

      resetForm();
      setShowForm(false);
      loadResidents(page, debouncedSearch);
    } catch (err) {
      const msg = err.response?.data?.message || t(editingId ? "rcaUpdateFail" : "rcaCreateFail");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (resident) => {
    const target = resident;
    const activating = String(target.status || "").toUpperCase() === "INACTIVE";
    setStatusLoading(true);
    try {
      await API.patch(`/users/resident/${target.id}/status`, { status: activating ? "ACTIVE" : "INACTIVE" });
      setStatusTarget(null);
      loadResidents(page, debouncedSearch);
      toast.success(activating ? t("resReactivatedOk") : t("resDeactivatedOk"));
    } catch (err) {
      if (err.response?.status === 403) {
        showUnauthorized(err.response?.data?.message || "Operation restricted");
      } else {
        toast.error(err.response?.data?.message || t("residentStatusFail"));
      }
      setStatusTarget(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const AVATAR_COLORS = [
    "linear-gradient(135deg,#6B46C1,#6B46C1)",
    "linear-gradient(135deg,#669696,#7AB2B2)",
    "linear-gradient(135deg,var(--accent),var(--accent))",
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
          societyId={assignModal.society_id || (isSuperAdmin ? filterSocietyId : user?.society_id)}
          onClose={() => setAssignModal(null)}
          onSuccess={() => { setAssignModal(null); loadResidents(page, debouncedSearch); }}
        />
      )}

      {viewDetailsModal && (
        <ResidentDetailsModal
          resident={viewDetailsModal}
          onClose={() => setViewDetailsModal(null)}
          onEdit={(r) => {
            setViewDetailsModal(null);
            handleEdit(r);
          }}
          isSuperAdmin={isSuperAdmin}
          onUpdated={() => {
            loadResidents(page, debouncedSearch);
          }}
        />
      )}

      {flatDetailModal && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setFlatDetailModal(null)}>
          <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "28px 32px", minWidth: 340, maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", border: "1px solid var(--divider)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MdHome size={20} color="#4ade80" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{flatDetailModal.flat.flat_number}</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{t("colUnitDetails") || "Unit Details"}</p>
                </div>
              </div>
              <button onClick={() => setFlatDetailModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                <MdClose size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {flatDetailModal.flat.floor_number != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)", minWidth: 80 }}>{t("floorLabel") || "Floor"}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{flatDetailModal.flat.floor_number}</span>
                </div>
              )}
              {flatDetailModal.flat.block_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)", minWidth: 80 }}>{t("blockLabel") || "Block"}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{flatDetailModal.flat.block_name}</span>
                </div>
              )}
              {flatDetailModal.flat.flat_type && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)", minWidth: 80 }}>{t("colType") || "Type"}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{flatDetailModal.flat.flat_type}</span>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--divider)", margin: "4px 0" }} />

              {flatDetailModal.flat.owner && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <MdPerson size={14} color="#94a3b8" />
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{t("colOwner") || "Owner"}</span>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>{flatDetailModal.flat.owner.name}</p>
                  </div>
                </div>
              )}

              {flatDetailModal.flat.tenant && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <MdPerson size={14} color="var(--accent)" />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{t("colTenant") || "Tenant"}</span>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>{flatDetailModal.flat.tenant.name}</p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: flatDetailModal.flat.tenant.approval_status === "APPROVED" ? "rgba(34,197,94,0.12)" : flatDetailModal.flat.tenant.approval_status === "PENDING" ? "rgba(96,165,250,0.12)" : "rgba(248,113,113,0.12)",
                    color: flatDetailModal.flat.tenant.approval_status === "APPROVED" ? "#4ade80" : flatDetailModal.flat.tenant.approval_status === "PENDING" ? "#60a5fa" : "#f87171",
                  }}>
                    {flatDetailModal.flat.tenant.approval_status}
                  </span>
                </div>
              )}

              {!flatDetailModal.flat.tenant && flatDetailModal.resident.resident_type !== "TENANT" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.5 }}>
                  <MdPerson size={14} />
                  <span style={{ color: "var(--text-secondary)" }}>{t("colNoTenant") || "No tenant assigned"}</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdPerson size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{t("residentTitle")}</h2>
            <p className="text-secondary text-xs mt-0.5">{initialLoad ? "—" : totalAll} {t("residentTitle")?.toLowerCase()}</p>
          </div>
        </div>

        {canManageResidents && (
          <GlobalButton
            variant="add"
            borderDraw
            icon={showForm ? MdClose : MdPersonAdd}
            className="w-full sm:w-auto justify-center shrink-0"
            style={{ fontWeight: 700 }}
            onClick={handleOpenAddResident}
          >
            {showForm ? t("cancel") : t("residentAddBtn")}
          </GlobalButton>
        )}
      </div>

      {/* ── KPI STAT CARDS ──
          Same StatCard component, variant and semantic tones as /admin, so the
          global card style chosen in Settings → Theme & Branding applies here
          too (the style class comes from ThemeContext inside StatCard).
          Clicking a card applies the matching role filter above the table. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          variant="sheen"
          tone="brand"
          interactive
          selected={!filterRole}
          onClick={() => setFilterRole("")}
          icon={MdPeople}
          value={initialLoad ? "—" : cardStats.total}
          label={t("resStatTotal", "Total Residents")}
          description={
            <span className="hidden lg:block">{t("resStatTotalDesc", "All registered society members")}</span>
          }
        />

        <StatCard
          variant="sheen"
          tone="success"
          interactive
          selected={filterRole === "RESIDENT"}
          onClick={() => setFilterRole("RESIDENT")}
          icon={MdPerson}
          value={initialLoad ? "—" : cardStats.resident}
          label={t("roleResident", "Resident")}
          description={
            <span className="hidden lg:block">{t("resStatResidentDesc", "Owners & tenants without a role")}</span>
          }
        />

        <StatCard
          variant="sheen"
          tone="warning"
          interactive
          selected={filterRole === "COMMITTEE_MEMBER"}
          onClick={() => setFilterRole("COMMITTEE_MEMBER")}
          icon={MdGroups}
          value={initialLoad ? "—" : cardStats.committee}
          label={t("roleCommittee", "Committee Member")}
          description={
            <span className="hidden lg:block">{t("resStatCommitteeDesc", "Elected managing committee")}</span>
          }
        />

        <StatCard
          variant="sheen"
          tone="info"
          interactive
          selected={filterRole === "ACCOUNTANT"}
          onClick={() => setFilterRole("ACCOUNTANT")}
          icon={MdCalculate}
          value={initialLoad ? "—" : cardStats.accountant}
          label={t("roleAccountant", "Accountant")}
          description={
            <span className="hidden lg:block">{t("resStatAccountantDesc", "Appointed finance in-charge")}</span>
          }
        />
      </div>

      {/* Add / Edit Resident Modal Popup */}
      {(showForm || editingId) && createPortal(
        <div
          onClick={requestCloseForm}
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 660, background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: 20, maxHeight: "90vh", overflowY: "auto", backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 20px rgba(160,90,255,0.15)", animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)" }}
            className="modal-scroll-thin"
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent-light))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(160,90,255,0.35)", flexShrink: 0 }}>
                  <MdPersonAdd size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                    {editingId ? t("rcaEditTitle", "Edit Resident Details") : t("rcaCreateTitle", "Add New Resident")}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--accent)", margin: "2px 0 0", fontWeight: 600 }}>
                    {t("rcaStepOf", {
                      step: formStep,
                      total: 5,
                      label:
                        formStep === 1
                          ? t("rcaStepSociety", "Society Selection")
                          : formStep === 2
                          ? t("rcaStepPersonal", "Personal & Account Details")
                          : formStep === 3
                          ? t("rcaStepHousehold", "Household & Vehicles")
                          : formStep === 4
                          ? t("rcaStepKyc", "KYC Verification")
                          : t("rcaStepFlat", "Unit Assignment & Review"),
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={requestCloseForm}
                style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
              >
                <MdClose size={17} />
              </button>
            </div>

            <div style={{ padding: "16px 24px 0" }}>
              <StepIndicator
                step={formStep}
                total={5}
                labels={[
                  t("rcaTabSociety", "Society"),
                  t("rcaTabAccount", "Account"),
                  t("rcaTabHousehold", "Household"),
                  t("rcaTabKyc", "KYC"),
                  t("rcaTabUnit", "Unit"),
                ]}
                onStepClick={(targetStep) => {
                  setFormError("");
                  setFormStep(targetStep);
                }}
              />
            </div>

            <div style={{ height: 1, background: "var(--glass-border)", margin: "16px 0 0" }} />

            <div style={{ padding: "20px 24px 28px" }}>
              {formError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
                  <MdClose size={14} style={{ flexShrink: 0 }} /> {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* ═══════════════════════════════════════════════════════════
                    STEP 1: SOCIETY SELECTION (SAME AS REGISTER.JSX)
                   ═══════════════════════════════════════════════════════════ */}
                {formStep === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SectionDivider icon={MdApartment} label={isSuperAdmin ? t("rcaSelectTargetSociety", "Select Target Society") : t("rcaActiveSociety", "Active Society")} required />
                    {isSuperAdmin ? (
                      <>
                        <div style={{ position: "relative" }}>
                          <MdSearch size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                          <input
                            type="text"
                            placeholder="Search society by name or location…"
                            value={societySearch}
                            onChange={(e) => setSocietySearch(e.target.value)}
                            className="input w-full"
                            style={{ paddingLeft: 38, paddingRight: societySearch ? 36 : 14, height: 42, fontSize: 13 }}
                          />
                          {societySearch && (
                            <button
                              type="button"
                              onClick={() => setSocietySearch("")}
                              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, padding: 4 }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
                          {filteredSocieties.length === 0 ? (
                            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, background: "var(--card-inner-bg)", borderRadius: 12, border: "1px dashed var(--glass-border)" }}>
                              <MdApartment size={28} style={{ margin: "0 auto 6px", opacity: 0.5 }} />
                              No societies found matching "{societySearch}"
                            </div>
                          ) : (
                            filteredSocieties.map((soc) => {
                              const isSelected = String(formSocietyId) === String(soc.id);
                              return (
                                <div
                                  key={soc.id}
                                  onClick={() => {
                                    if (!editingId) {
                                      setFormSocietyId(String(soc.id));
                                      if (emailCheckState.status !== "idle") {
                                        setEmailCheckState({ status: "idle", user: null, message: "" });
                                        setUseExistingAccount(false);
                                      }
                                    }
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: 14,
                                    background: isSelected ? "rgba(var(--accent-rgb, 160, 90, 255), 0.12)" : "var(--card-inner-bg)",
                                    border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}`,
                                    cursor: editingId ? "not-allowed" : "pointer",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 10,
                                      background: isSelected ? "linear-gradient(135deg, var(--accent), var(--accent-light))" : "rgba(255,255,255,0.06)",
                                      color: isSelected ? "#fff" : "var(--accent)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <MdApartment size={20} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                      {soc.name}
                                    </h4>
                                    {soc.address && (
                                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                                        <MdOutlineLocationOn size={13} style={{ flexShrink: 0 }} /> {soc.address}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    {isSelected ? (
                                      <MdCheckCircle size={22} color="var(--accent)" />
                                    ) : (
                                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--glass-border)" }} />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {editingId && (
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                            {t("rcaSocietyLocked", "Society cannot be changed for an existing resident record.")}
                          </p>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "16px 18px",
                          borderRadius: 16,
                          background: "rgba(var(--accent-rgb, 160, 90, 255), 0.12)",
                          border: "1.5px solid var(--accent)",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <MdApartment size={24} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                              {currentSocietyObj?.name || user?.society_name || "Active Society"}
                            </h4>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                              Current Society
                            </span>
                          </div>
                          {(currentSocietyObj?.address || user?.society_address) && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                              <MdOutlineLocationOn size={14} style={{ flexShrink: 0 }} /> {currentSocietyObj?.address || user?.society_address}
                            </p>
                          )}
                        </div>
                        <MdCheckCircle size={24} color="var(--accent)" />
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    STEP 2: PERSONAL & ACCOUNT DETAILS (SAME AS REGISTER.JSX)
                   ═══════════════════════════════════════════════════════════ */}
                {formStep === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Email Verification Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 14, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                        <MdPerson size={16} color="var(--accent)" />
                        {t("residentEmail", "Resident Email")} <span style={{ color: "#f87171" }}>*</span>
                      </label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          className="input"
                          style={{ flex: 1, ...(editingId ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}
                          placeholder={t("rcaEmailPlaceholder", "resident@example.com")}
                          type="email"
                          value={formData.email}
                          disabled={!!editingId}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (emailCheckState.status !== "idle") {
                              setEmailCheckState({ status: "idle", user: null, message: "" });
                              setUseExistingAccount(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !editingId) {
                              e.preventDefault();
                              handleCheckEmail();
                            }
                          }}
                        />
                        {!editingId && (
                          <button
                            type="button"
                            onClick={handleCheckEmail}
                            disabled={emailCheckState.status === "checking" || !formData.email?.trim()}
                            className="btn"
                            style={{
                              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 12,
                              padding: "9px 16px",
                              borderRadius: 10,
                              border: "none",
                              cursor: !formData.email?.trim() ? "not-allowed" : "pointer",
                              opacity: !formData.email?.trim() ? 0.6 : 1,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexShrink: 0,
                              boxShadow: "0 4px 14px rgba(160,90,255,0.3)",
                            }}
                          >
                            {emailCheckState.status === "checking" ? <Spinner small /> : <MdSearch size={16} />}
                            {t("checkAccountBtn", "Check if Exists")}
                          </button>
                        )}
                      </div>

                      {emailCheckState.status === "checking" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                          <Spinner small /> <span>Checking if account already exists...</span>
                        </div>
                      )}

                      {emailCheckState.status === "not_found" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontSize: 12, fontWeight: 600 }}>
                          <MdCheckCircle size={16} />
                          <span>New Resident: No existing account found. Please fill in details to create account.</span>
                        </div>
                      )}

                      {emailCheckState.status === "already_member" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12, fontWeight: 600 }}>
                          <MdWarning size={16} />
                          <span>Already Registered: A resident with email "{formData.email}" already belongs to this society.</span>
                        </div>
                      )}

                      {emailCheckState.status === "exists_other" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(160,90,255,0.1)", border: "1px solid rgba(160,90,255,0.3)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <MdCheckCircle size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                Existing Account Found: {emailCheckState.user?.name}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                                Phone: {emailCheckState.user?.phone || "N/A"}. Reusing this account allows the resident to log in with their existing password and switch between societies.
                              </p>
                            </div>
                          </div>
                          {!useExistingAccount ? (
                            <button
                              type="button"
                              onClick={() => handleApplyExistingUser(emailCheckState.user)}
                              style={{
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 12,
                                padding: "8px 14px",
                                borderRadius: 8,
                                border: "none",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                alignSelf: "flex-start",
                                boxShadow: "0 4px 12px rgba(160,90,255,0.25)",
                              }}
                            >
                              <MdCheck size={16} />
                              Use Existing Account & Reuse Data
                            </button>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#10b981" }}>
                              <MdCheckCircle size={15} />
                              <span>✓ Existing Account Data Reused. Password & profile will remain unchanged.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <SectionDivider icon={MdPerson} label={t("personalInfo", "Personal Information")} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <Field label={t("residentName", "Full Name")} required>
                        <input className="input w-full" placeholder={t("rcaNamePlaceholder", "e.g. John Doe")} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      </Field>
                      <Field label={t("rcaPhone", "Phone Number")}>
                        <input className="input w-full" placeholder={t("rcaPhonePlaceholder", "10-digit mobile")} type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </Field>
                    </div>

                    {!editingId && (
                      <div className="grid grid-cols-1 gap-3.5">
                        {useExistingAccount ? (
                          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                            <MdCheckCircle size={16} color="#10b981" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}>
                              Reusing Existing Password: Resident will use their current login password.
                            </span>
                          </div>
                        ) : (
                          <Field label={t("residentPassword", "Password")} required>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <input
                                  type={showPassword ? "text" : "password"}
                                  className="input w-full"
                                  placeholder={t("rcaPasswordPlaceholder", "Enter password or use default")}
                                  value={formData.password}
                                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                  style={{ paddingRight: 80 }}
                                />
                                <div style={{ position: "absolute", right: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }}
                                    title={showPassword ? "Hide password" : "Show password"}
                                  >
                                    {showPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, password: DEFAULT_RESIDENT_PASSWORD })}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "3px 7px",
                                      borderRadius: 6,
                                      background: formData.password === DEFAULT_RESIDENT_PASSWORD ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
                                      color: formData.password === DEFAULT_RESIDENT_PASSWORD ? "#10b981" : "var(--text-secondary)",
                                      border: "1px solid var(--glass-border)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Default
                                  </button>
                                </div>
                              </div>

                              {formData.password ? (
                                <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                                      Password Strength:
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: STRENGTH_COLORS[pwStrength(formData.password)] || "#64748B" }}>
                                      {STRENGTH_LABELS[pwStrength(formData.password)] || "Too Weak"}
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", gap: 4, height: 4, marginBottom: 8 }}>
                                    {[1, 2, 3, 4, 5].map((seg) => {
                                      const active = pwStrength(formData.password) >= seg;
                                      return (
                                        <div
                                          key={seg}
                                          style={{
                                            flex: 1,
                                            height: "100%",
                                            borderRadius: 999,
                                            background: active ? STRENGTH_COLORS[pwStrength(formData.password)] : "rgba(255,255,255,0.1)",
                                            transition: "all 0.2s ease",
                                          }}
                                        />
                                      );
                                    })}
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                    {PW_RULES.map((rule) => {
                                      const passed = rule.test(formData.password);
                                      return (
                                        <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: passed ? "#10b981" : "var(--text-secondary)" }}>
                                          <MdCheck size={12} color={passed ? "#10b981" : "var(--text-secondary)"} style={{ opacity: passed ? 1 : 0.4 }} />
                                          <span>{rule.label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                                  Default password is <code style={{ fontWeight: 700, color: "var(--accent)" }}>{DEFAULT_RESIDENT_PASSWORD}</code>. Resident can change after login.
                                </p>
                              )}
                            </div>
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    STEP 3: HOUSEHOLD & VEHICLES (SAME AS REGISTER.JSX)
                   ═══════════════════════════════════════════════════════════ */}
                {formStep === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SectionDivider icon={MdPeople} label={t("rcaHousehold", "Household Details")} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label={t("rcaFamilyMembers", "Family Members / Occupants")}>
                        <CounterField value={formData.occupant_count} onChange={(v) => setFormData((f) => ({ ...f, occupant_count: v }))} min={1} max={99} />
                      </Field>
                      <Field label={t("rcaVehicleCount", "Number of Vehicles")}>
                        <CounterField value={formData.vehicle_count} onChange={(v) => setFormData((f) => ({ ...f, vehicle_count: v }))} min={0} max={99} />
                      </Field>
                    </div>

                    <SectionDivider icon={MdContactPhone} label={t("rcaEmergencyOptional", "Emergency Contact (Optional)")} />
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, marginTop: -4 }}>
                      <MdPhone size={15} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{t("rcaEmergencyHint", "Provide contact person in case of urgent alerts or emergency.")}</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label={t("rcaContactName", "Contact Person Name")}>
                        <input className="input w-full" placeholder={t("rcaContactNamePh", "e.g. Jane Doe")} value={formData.emergency_contact?.name || ""} onChange={(e) => setFormData((f) => ({ ...f, emergency_contact: { ...f.emergency_contact, name: e.target.value } }))} />
                      </Field>
                      <Field label={t("rcaContactPhone", "Contact Phone Number")}>
                        <input className="input w-full" placeholder={t("rcaPhonePlaceholder", "10-digit mobile")} type="tel" value={formData.emergency_contact?.phone || ""} onChange={(e) => setFormData((f) => ({ ...f, emergency_contact: { ...f.emergency_contact, phone: e.target.value } }))} />
                      </Field>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    STEP 4: PROFILE PHOTO & KYC (SAME AS REGISTER.JSX)
                   ═══════════════════════════════════════════════════════════ */}
                {formStep === 4 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SectionDivider icon={MdPerson} label={t("profilePicture", "Profile Photo (Optional)")} />
                    <div className="p-4 rounded-xl border border-glass bg-card-inner flex flex-col gap-2">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <label className="text-xs font-semibold text-secondary">{t("profilePicture", "Profile Photo")}</label>
                        {useExistingAccount && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>Reused from existing profile</span>
                        )}
                      </div>
                      <ProfilePictureUploader
                        name={formData.name || "Resident"}
                        currentUrl={formData.profile_picture_url || formData.profile_picture}
                        onFileSelect={(file, previewUrl) => {
                          setFormData((prev) => ({
                            ...prev,
                            profile_picture_file: file,
                            profile_picture_url: previewUrl,
                          }));
                        }}
                      />
                    </div>

                    <SectionDivider icon={MdUploadFile} label={t("rcaKycDocs", "KYC Verification Documents")} />
                    {useExistingAccount && (
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#10b981", fontWeight: 700 }}>
                          <MdCheckCircle size={16} /> Reusing Existing Verified Documents
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {residentDocs?.aadhar_url || emailCheckState?.user?.documents?.aadhar_url ? "✓ Aadhaar Card is on file." : "No previous Aadhaar on file."}{" "}
                          {residentDocs?.pan_url || emailCheckState?.user?.documents?.pan_url ? "✓ PAN Card is on file." : "No previous PAN on file."}
                          <span style={{ display: "block", marginTop: 4, fontStyle: "italic" }}>
                            Uploading new documents below is optional and will update the resident's records.
                          </span>
                        </div>
                      </div>
                    )}
                    {editingId && (
                      <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(107,70,193,0.08)", border: "1px solid rgba(107,70,193,0.25)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
                          <MdBadge size={16} /> KYC Verification Documents
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {residentDocs?.aadhar_url ? "✓ Current Aadhaar Card is on file." : "No Aadhaar on file."}{" "}
                          {residentDocs?.pan_url ? "✓ Current PAN Card is on file." : "No PAN on file."}
                          <span style={{ display: "block", marginTop: 4, fontStyle: "italic" }}>
                            You can view the current documents below or upload new files to replace them.
                          </span>
                        </div>
                      </div>
                    )}
                    <DocumentUploadField
                      label={t("rcaAadhar", "Aadhaar Card Photo / PDF")}
                      icon={MdBadge}
                      accept="application/pdf,image/*"
                      file={aadharFile}
                      onChange={setAadharFile}
                      required={!editingId && !useExistingAccount}
                      existingUrl={residentDocs?.aadhar_url || (useExistingAccount ? emailCheckState?.user?.documents?.aadhar_url : null)}
                    />
                    <DocumentUploadField
                      label={t("rcaPan", "PAN Card Photo / PDF")}
                      icon={MdCreditCard}
                      accept="application/pdf,image/*"
                      file={panFile}
                      onChange={setPanFile}
                      required={!editingId && !useExistingAccount}
                      existingUrl={residentDocs?.pan_url || (useExistingAccount ? emailCheckState?.user?.documents?.pan_url : null)}
                    />
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    STEP 5: UNIT ASSIGNMENT & REVIEW (SAME AS REGISTER.JSX)
                   ═══════════════════════════════════════════════════════════ */}
                {formStep === 5 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SectionDivider icon={MdHome} label={t("rcaFlatAssign", "Unit / Flat Assignment")} required />

                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                        Resident Type:
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["OWNER", "TENANT"].map((type) => {
                          const isSelected = (formData.resident_type || "OWNER") === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, resident_type: type }))}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}`,
                                background: isSelected ? "rgba(var(--accent-rgb, 160, 90, 255), 0.15)" : "transparent",
                                color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                            >
                              {type === "OWNER" ? "Owner" : "Tenant"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!editingId && (
                      <>
                        {missingFlat && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
                            <MdWarning size={15} style={{ color: "#f87171", flexShrink: 0 }} />
                            <p style={{ fontSize: 12, color: "#f87171", margin: 0, fontWeight: 600 }}>
                              {t("rcaMustAssignFlat", "Please assign at least one flat to proceed.")}
                            </p>
                          </div>
                        )}

                        {loadingFlats || loadingSlots ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13, padding: "10px 0" }}>
                            <Spinner small /> {t("rcaLoadingUnits", "Loading available units...")}
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
                        {loadingFlats || loadingSlots ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13, padding: "10px 0" }}>
                            <Spinner small /> {t("rcaLoadingUnits", "Loading available units...")}
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

                    {/* Registration Summary Card */}
                    <div style={{ padding: 14, borderRadius: 14, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", marginTop: 6 }}>
                      <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 }}>
                        <MdCheckCircle size={15} /> Registration Summary
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", fontSize: 11 }}>Target Society</span>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {currentSocietyObj?.name || (societiesList.find(s => String(s.id) === String(formSocietyId))?.name) || user?.society_name || "Society"}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", fontSize: 11 }}>Resident Type</span>
                          <span style={{ fontWeight: 700, color: formData.resident_type === "TENANT" ? "var(--accent)" : "#10b981" }}>
                            {formData.resident_type || "OWNER"}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", fontSize: 11 }}>Resident Name</span>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formData.name || "—"}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", fontSize: 11 }}>Email & Phone</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formData.email} {formData.phone ? `· ${formData.phone}` : ""}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", fontSize: 11 }}>Household</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formData.occupant_count} Member(s) · {formData.vehicle_count} Vehicle(s)</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", fontSize: 11 }}>Assigned Unit</span>
                          <span style={{ fontWeight: 700, color: completedFlats > 0 ? "#10b981" : "#f87171" }}>
                            {completedFlats > 0 ? `${completedFlats} Unit(s) selected` : "No unit assigned"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 16, borderTop: "1px solid var(--glass-border)", marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {formStep > 1 && (
                      <GlobalButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={MdArrowBack}
                        onClick={() => { setFormError(""); setFormStep(s => s - 1); }}
                      >
                        {t("rcaBack", "Back")}
                      </GlobalButton>
                    )}
                    <GlobalButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={MdClose}
                      onClick={requestCloseForm}
                    >
                      {t("cancel", "Cancel")}
                    </GlobalButton>
                  </div>
                  {formStep < 5 ? (
                    <GlobalButton
                      type="button"
                      variant="add"
                      borderDraw
                      icon={MdArrowForward}
                      iconPosition="right"
                      onClick={handleNextStep}
                      style={{ fontWeight: 700 }}
                    >
                      {t("rcaNextStep", "Next Step")}
                    </GlobalButton>
                  ) : (
                    <GlobalButton
                      type="submit"
                      variant="add"
                      borderDraw
                      icon={(!editingId && missingFlat) ? MdWarning : MdCheckCircle}
                      loading={submitting}
                      disabled={submitting || (!editingId && missingFlat)}
                      style={{ fontWeight: 700 }}
                    >
                      {submitting
                        ? (editingId ? t("updating", "Updating...") : t("rcaCreating", "Adding Resident..."))
                        : (!editingId && missingFlat)
                          ? t("rcaAssignFlatFirst", "Assign Unit First")
                          : (editingId ? t("rcaUpdateResident", "Save Changes") : t("rcaConfirmSave", "Add Resident"))}
                    </GlobalButton>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unsaved-changes discard confirm */}
      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); setShowForm(false); resetForm(); }}
      />

      {/* Table */}
      <div className="bg-card rounded-2xl overflow-hidden">

        {/* Cascading Filter & Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--divider)", flexWrap: "wrap", background: "rgba(0,0,0,0.02)" }}>
          {/* Animated Slider Expandable Search Bar */}
          <ExpandableSearch
            value={search}
            onChange={setSearch}
            placeholder={t("colSearchPlaceholder") || "Search name, email, phone…"}
          />

          {/* Role Filter */}
          <Select
            className="input"
            style={{ flex: 1, minWidth: 150, height: 42, padding: "8px 12px", borderRadius: 12, fontSize: 13 }}
            placeholder={t("selectTheRole", "Select the role")}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">{t("selectTheRole", "Select the role")}</option>
            <option value="SOCIETY_ADMIN">{t("roleSocietyAdmin")}</option>
            <option value="ACCOUNTANT">{t("roleAccountant")}</option>
            <option value="COMMITTEE_MEMBER">{t("roleCommittee")}</option>
            <option value="RESIDENT">{t("roleResident")}</option>
            <option value="TENANT">{t("roleTenant")}</option>
          </Select>

          {isSuperAdmin && (
            <Select
              className="input"
              style={{ flex: 1, minWidth: 140, height: 42, padding: "8px 12px", borderRadius: 12, fontSize: 13 }}
              value={filterSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val || "ALL");
              }}
            >
              <option value="">{t("allSocieties") || "All Societies"}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          <Select
            className="input"
            style={{ flex: 1, minWidth: 130, height: 42, padding: "8px 12px", borderRadius: 12, fontSize: 13 }}
            value={filterBlockId}
            onChange={(e) => { setFilterBlockId(e.target.value); setFilterFloorId(""); setFilterFlatId(""); }}
            disabled={!blocksList.length}
          >
            <option value="">{t("allBlocks") || "All Blocks"}</option>
            {blocksList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>

          <Select
            className="input"
            style={{ flex: 1, minWidth: 130, height: 42, padding: "8px 12px", borderRadius: 12, fontSize: 13 }}
            value={filterFloorId}
            onChange={(e) => { setFilterFloorId(e.target.value); setFilterFlatId(""); }}
            disabled={!filterBlockId || !floorsList.length}
          >
            <option value="">{t("allFloors") || "All Floors"}</option>
            {floorsList.map(f => <option key={f.id} value={f.id}>{t("afFloorName", { number: f.number })}</option>)}
          </Select>

          <Select
            className="input"
            style={{ flex: 1, minWidth: 130, height: 42, padding: "8px 12px", borderRadius: 12, fontSize: 13 }}
            value={filterFlatId}
            onChange={(e) => setFilterFlatId(e.target.value)}
            disabled={!filterBlockId || !flatsList.length}
          >
            <option value="">{t("allUnits") || "All Units"}</option>
            {flatsList.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
          </Select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 42,
                padding: "0 14px",
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.10)",
                border: "1px solid rgba(239, 68, 68, 0.22)",
                color: "#f87171",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.10)")}
              title={t("clearAllActiveFilters")}
            >
              <MdClose size={15} /> {t("colClearFilter") || "Clear Filter"}
            </button>
          )}
        </div>

        {/* Sub-bar with count and active filter indicators */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--divider)", fontSize: 12, color: "var(--text-secondary)", background: "rgba(0,0,0,0.01)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>
              {initialLoad ? "—" : `${displayedResidents.length} ${t("residentTitle")}`}
              {search && !initialLoad && ` ${t("matchingQuoted", { q: search })}`}
            </span>
            {filterRole && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(160,90,255,0.14)", color: "var(--accent)", border: "1px solid rgba(160,90,255,0.25)" }}>
                {t("rolePrefix")} {filterRole.replace(/_/g, " ")}
              </span>
            )}
          </div>
          {fetching && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--accent)" }}>
              <Spinner small /> {t("updating")}
            </span>
          )}
        </div>

        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary"><Spinner /><p className="text-sm">{t("loading")}</p></div>
        )}

        {!initialLoad && totalAll === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-secondary">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MdPerson size={28} style={{ opacity: 0.3 }} />
            </div>
            <p className="text-sm">{t("residentEmpty")}</p>
          </div>
        )}

        {!initialLoad && totalAll > 0 && displayedResidents.length === 0 && !fetching && (
          <div className="flex flex-col items-center gap-2 py-16 text-secondary">
            <MdSearch size={32} className="opacity-20" />
            <p className="text-sm">{t("residentNoMatch")}</p>
            <button onClick={handleClearFilters} style={{ fontSize: 12, color: "#9F87D7", background: "none", border: "none", cursor: "pointer", marginTop: 4, fontWeight: 700 }}>
              {t("residentClearFilters")}
            </button>
          </div>
        )}

        {!initialLoad && displayedResidents.length > 0 && (
          <div key={page} className="animate-slide-page">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm res-clean-table" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "transparent", borderBottom: "1px solid var(--divider)" }}>
                    {[
                      "#",
                      t("colResident") || "Resident",
                      t("colContact") || "Contact",
                      t("colType") || "Type",
                      t("colUnits") || "Units",
                      t("colSociety", "Society"),
                      ...(canManageResidents ? [t("colActions") || "Actions"] : []),
                    ].map((h, i, arr) => (
                      <th key={i} style={{ textAlign: (canManageResidents && i === arr.length - 1) ? "right" : "left", padding: "12px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedResidents.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--divider)", verticalAlign: "top", background: "transparent" }}>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, width: 40 }}>{(page - 1) * limit + idx + 1}</td>
                      <td style={{ padding: "14px 16px", minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <UserAvatar name={r.name} src={r.profile_picture} size={36} radius="50%" />
                          <div>
                            <div
                              onClick={() => setViewDetailsModal(r)}
                              style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", cursor: "pointer" }}
                              title="Click to view full resident details"
                              className="hover:underline"
                            >
                              {r.name}
                            </div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
                              {r.roles?.some((role) => String(role).toUpperCase() === "SOCIETY_ADMIN") && <span className="res-socadmin-badge" style={{ display: "inline-flex" }}>★ {t("roleSocietyAdmin")}</span>}
                              {r.roles?.some((role) => String(role).toUpperCase() === "COMMITTEE_MEMBER") && <span className="res-committee-badge" style={{ display: "inline-flex" }}>★ {t("colCommittee") || "Committee"}</span>}
                              {r.roles?.some((role) => String(role).toUpperCase() === "ACCOUNTANT") && <span className="res-accountant-badge" style={{ display: "inline-flex" }}>★ {t("resAccountantBadge")}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", minWidth: 170 }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.email}</div>
                        {r.phone && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><MdPhone size={11} style={{ opacity: 0.5 }} /> {r.phone}</div>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
                          {(r.is_vacated || r.occupancy_status === "VACATED") ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(245,158,11,0.16)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.35)",
                                textTransform: "uppercase",
                              }}
                            >
                              Left / Vacated
                            </span>
                          ) : (
                            <ResidentTypeBadge type={r.resident_type || (r.flats?.length > 0 || r.flat_id ? "OWNER" : null)} />
                          )}
                          {isResidentPending(r) && <PendingApprovalBadge />}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", minWidth: 140 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {r.flats && r.flats.length > 0 ? r.flats.map((flat, fIdx) => (
                            <div
                              key={flat.id || fIdx}
                              onClick={() => setFlatDetailModal({ flat, resident: r })}
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(34,197,94,0.10)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.22)", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.18)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.10)"; }}
                              title={`Flat ${flat.flat_number}`}
                            >
                              {flat.flat_number}
                            </div>
                          )) : (r.is_vacated || r.occupancy_status === "VACATED" || r.previous_flat) ? (
                            <div
                              onClick={() => setViewDetailsModal(r)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: "rgba(245,158,11,0.12)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.3)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                whiteSpace: "nowrap",
                              }}
                              title={`Left Flat ${r.previous_flat?.flat_number || r.occupancy_history?.[0]?.flat_number || ""}`}
                            >
                              Left Flat {r.previous_flat?.flat_number || r.occupancy_history?.[0]?.flat_number}
                            </div>
                          ) : <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.45 }}>{t("colNoUnit") || "No unit assigned"}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", minWidth: 160 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                          {r.societies && r.societies.length > 0 ? (
                            r.societies.map((soc, sIdx) => (
                              <span
                                key={soc.id || sIdx}
                                onClick={() => setViewDetailsModal(r)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 9px",
                                  borderRadius: 8,
                                  background: sIdx === 0 ? "rgba(107,70,193,0.12)" : "rgba(59,130,246,0.10)",
                                  color: sIdx === 0 ? "var(--accent)" : "#60a5fa",
                                  border: `1px solid ${sIdx === 0 ? "rgba(107,70,193,0.25)" : "rgba(59,130,246,0.22)"}`,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                                title={`${soc.name}${soc.flats?.length ? ` · ${soc.flats.length} flat(s)` : ""}`}
                              >
                                <MdApartment size={13} style={{ flexShrink: 0 }} />
                                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {soc.name}
                                </span>
                              </span>
                            ))
                          ) : r.society_name ? (
                            <span
                              onClick={() => setViewDetailsModal(r)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "3px 9px",
                                borderRadius: 8,
                                background: "rgba(107,70,193,0.12)",
                                color: "var(--accent)",
                                border: "1px solid rgba(107,70,193,0.25)",
                                cursor: "pointer",
                              }}
                            >
                              <MdApartment size={13} />
                              {r.society_name}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.5 }}>—</span>
                          )}
                        </div>
                      </td>
                      {canManageResidents && (
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <ResidentActionMenu
                          t={t}
                          onViewDetails={() => setViewDetailsModal(r)}
                          onAssignFlat={() => handleOpenAssignModal(r)}
                          onEdit={() => handleEdit(r)}
                          isCommittee={!!r.roles?.some((role) => String(role).toUpperCase() === "COMMITTEE_MEMBER")}
                          isAccountant={!!r.roles?.some((role) => String(role).toUpperCase() === "ACCOUNTANT")}
                          isSocietyAdmin={!!r.roles?.some((role) => String(role).toUpperCase() === "SOCIETY_ADMIN")}
                          isTenant={r.resident_type === "TENANT"}
                          isPendingApproval={isResidentPending(r)}
                          isRejected={String(r.approval_status || "").toUpperCase() === "REJECTED"}
                          onApprove={() => handleApproveResident(r)}
                          onReject={() => setRejectTarget(r)}
                          onPromote={() => {
                            const socList = r.societies && r.societies.length > 0 ? r.societies : (r.society_id ? [{ id: r.society_id, name: r.society_name }] : []);
                            setCommitteeConfirm({ type: "promote", id: r.id, name: r.name, societies: socList, selectedSocietyId: socList[0]?.id || r.society_id || null });
                          }}
                          onRemoveCommittee={() => {
                            const socList = r.societies && r.societies.length > 0 ? r.societies : (r.society_id ? [{ id: r.society_id, name: r.society_name }] : []);
                            const committeeSocs = socList.filter((s) => s.roles?.includes("COMMITTEE_MEMBER"));
                            setCommitteeConfirm({ type: "remove", id: r.id, name: r.name, societies: committeeSocs.length > 0 ? committeeSocs : socList, selectedSocietyId: (committeeSocs[0] || socList[0])?.id || r.society_id || null });
                          }}
                          isInactive={String(r.status || "").toUpperCase() === "INACTIVE"}
                          onToggleStatus={() => setStatusTarget(r)}
                        />
                      </div>
                         </td>
                       )}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>

             <div className="md:hidden">
               {displayedResidents.map((r) => (
                 <div key={r.id} className="animate-fadeIn" style={{ padding: "14px 16px", borderBottom: "1px solid var(--divider)" }}>
                   <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                     <div style={{ flex: 1, minWidth: 0 }}>
                       <p
                         onClick={() => setViewDetailsModal(r)}
                         style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0, cursor: "pointer" }}
                         className="hover:underline"
                       >
                         {r.name}
                       </p>
                       <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{r.email}</p>
                       {r.phone && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0", display: "flex", alignItems: "center", gap: 3 }}><MdPhone size={10} style={{ opacity: 0.5 }} /> {r.phone}</p>}
                       <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                         {(r.is_vacated || r.occupancy_status === "VACATED") ? (
                           <span
                             style={{
                               display: "inline-flex",
                               alignItems: "center",
                               gap: 3,
                               fontSize: 10,
                               fontWeight: 700,
                               padding: "2px 8px",
                               borderRadius: 6,
                               background: "rgba(245,158,11,0.16)",
                               color: "#f59e0b",
                               border: "1px solid rgba(245,158,11,0.35)",
                               textTransform: "uppercase",
                             }}
                           >
                             Left / Vacated
                           </span>
                         ) : (
                           <ResidentTypeBadge type={r.resident_type || (r.flats?.length > 0 || r.flat_id ? "OWNER" : null)} />
                         )}
                         {isResidentPending(r) && <PendingApprovalBadge />}
                         {r.flats && r.flats.length > 0 ? (
                           r.flats.map((flat, fIdx) => (
                             <span key={flat.id || fIdx} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.10)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.22)" }}>
                               {flat.flat_number}
                             </span>
                           ))
                         ) : (r.is_vacated || r.occupancy_status === "VACATED" || r.previous_flat) ? (
                           <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                             Left Flat {r.previous_flat?.flat_number || r.occupancy_history?.[0]?.flat_number}
                           </span>
                         ) : null}
                         {r.societies && r.societies.length > 0 ? (
                           r.societies.map((soc, sIdx) => (
                             <span key={soc.id || sIdx} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(107,70,193,0.12)", color: "var(--accent)", border: "1px solid rgba(107,70,193,0.25)" }}>
                               <MdApartment size={11} /> {soc.name}
                             </span>
                           ))
                         ) : r.society_name ? (
                           <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(107,70,193,0.12)", color: "var(--accent)", border: "1px solid rgba(107,70,193,0.25)" }}>
                             <MdApartment size={11} /> {r.society_name}
                           </span>
                         ) : null}
                         {r.roles?.some((role) => String(role).toUpperCase() === "SOCIETY_ADMIN") && <span className="res-socadmin-badge">★ {t("roleSocietyAdmin")}</span>}
                         {r.roles?.some((role) => String(role).toUpperCase() === "COMMITTEE_MEMBER") && <span className="res-committee-badge">★ {t("colCommittee") || "Committee"}</span>}
                         {r.roles?.some((role) => String(role).toUpperCase() === "ACCOUNTANT") && <span className="res-accountant-badge">★ {t("resAccountantBadge")}</span>}
                       </div>
                       <button
                         type="button"
                         onClick={() => setViewDetailsModal(r)}
                         style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "rgba(107,70,193,0.12)", color: "var(--accent)", border: "1px solid rgba(107,70,193,0.25)", cursor: "pointer", marginTop: 6 }}
                       >
                         <MdVisibility size={13} /> {t("resViewDetails", "View Details")}
                       </button>
                     </div>
                     {canManageResidents && (
                       <div style={{ flexShrink: 0 }}>
                         <ResidentActionMenu
                           t={t}
                           onViewDetails={() => setViewDetailsModal(r)}
                           onAssignFlat={() => handleOpenAssignModal(r)}
                           onEdit={() => handleEdit(r)}
                           isCommittee={!!r.roles?.some((role) => String(role).toUpperCase() === "COMMITTEE_MEMBER")}
                           isAccountant={!!r.roles?.some((role) => String(role).toUpperCase() === "ACCOUNTANT")}
                           isSocietyAdmin={!!r.roles?.some((role) => String(role).toUpperCase() === "SOCIETY_ADMIN")}
                           isTenant={r.resident_type === "TENANT"}
                           isPendingApproval={isResidentPending(r)}
                           isRejected={String(r.approval_status || "").toUpperCase() === "REJECTED"}
                           onApprove={() => handleApproveResident(r)}
                           onReject={() => setRejectTarget(r)}
                           onPromote={() => {
                             const socList = r.societies && r.societies.length > 0 ? r.societies : (r.society_id ? [{ id: r.society_id, name: r.society_name }] : []);
                             setCommitteeConfirm({ type: "promote", id: r.id, name: r.name, societies: socList, selectedSocietyId: socList[0]?.id || r.society_id || null });
                           }}
                           onRemoveCommittee={() => {
                             const socList = r.societies && r.societies.length > 0 ? r.societies : (r.society_id ? [{ id: r.society_id, name: r.society_name }] : []);
                             const committeeSocs = socList.filter((s) => s.roles?.includes("COMMITTEE_MEMBER"));
                             setCommitteeConfirm({ type: "remove", id: r.id, name: r.name, societies: committeeSocs.length > 0 ? committeeSocs : socList, selectedSocietyId: (committeeSocs[0] || socList[0])?.id || r.society_id || null });
                           }}
                            onDeactivateAccountant={() => setAccountantConfirm({ id: r.id, name: r.name })}
                            isInactive={String(r.status || "").toUpperCase() === "INACTIVE"}
                            onToggleStatus={() => setStatusTarget(r)}
                          />
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 20px", borderTop: "1px solid var(--divider)" }}>
              <p className="text-xs text-secondary">{t("colShowing") || "Showing"} {displayedResidents.length} {t("colOf") || "of"} {totalItems}</p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
            </div>
          </div>
        )}
      </div>

      {/* Committee Confirm Dialog */}
      {committeeConfirm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setCommitteeConfirm(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 440, background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: "24px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "saModalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: committeeConfirm.type === "promote" ? "rgba(160,90,255,0.14)" : "rgba(239,68,68,0.14)", border: `1px solid ${committeeConfirm.type === "promote" ? "rgba(160,90,255,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                {committeeConfirm.type === "promote" ? <MdPersonAdd size={22} style={{ color: "var(--accent)" }} /> : <MdPerson size={22} style={{ color: "#f87171" }} />}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {committeeConfirm.type === "promote" ? t("resAddCommittee") : t("resRemoveCommittee")}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{committeeConfirm.name}</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {committeeConfirm.type === "promote" ? t("resAddCommitteeBody") : t("resRemoveCommitteeBody")}
            </p>

            {/* Multiple Societies Selection */}
            {committeeConfirm.societies && committeeConfirm.societies.length > 1 && (
              <div style={{ marginTop: 14, marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                  Select Society:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                  {committeeConfirm.societies.map((soc) => {
                    const isSelected = String(committeeConfirm.selectedSocietyId) === String(soc.id);
                    const isAlreadyCommittee = soc.roles?.includes("COMMITTEE_MEMBER");
                    return (
                      <div
                        key={soc.id}
                        onClick={() => setCommitteeConfirm((prev) => ({ ...prev, selectedSocietyId: soc.id }))}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1.5px solid ${isSelected ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
                          background: isSelected ? "rgba(107,70,193,0.12)" : "rgba(255,255,255,0.02)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="radio"
                            name="committeeSocietySelection"
                            checked={isSelected}
                            onChange={() => setCommitteeConfirm((prev) => ({ ...prev, selectedSocietyId: soc.id }))}
                            style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                          />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                              {soc.name}
                            </div>
                            {soc.flats && soc.flats.length > 0 && (
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}>
                                Flats: {soc.flats.map((f) => f.flat_number).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAlreadyCommittee && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(160,90,255,0.15)", color: "var(--accent)" }}>
                            Committee Member
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {committeeConfirm.societies && committeeConfirm.societies.length === 1 && (
              <div style={{ marginTop: 12, marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(107,70,193,0.08)", border: "1px solid rgba(107,70,193,0.2)", fontSize: 12, color: "var(--text-secondary)" }}>
                Target Society: <strong style={{ color: "var(--text-primary)" }}>{committeeConfirm.societies[0].name}</strong>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button type="button" onClick={() => setCommitteeConfirm(null)} className="sa-btn sa-btn-ghost">
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="button"
                disabled={committeeConfirm.societies?.length > 1 && !committeeConfirm.selectedSocietyId}
                onClick={() => committeeConfirm.type === "promote"
                  ? promoteCommittee(committeeConfirm.id, committeeConfirm.selectedSocietyId)
                  : removeCommittee(committeeConfirm.id, committeeConfirm.selectedSocietyId)
                }
                className={committeeConfirm.type === "promote" ? "btn-primary" : "btn-danger"}
                style={{ borderRadius: 999, fontWeight: 700 }}
              >
                {committeeConfirm.type === "promote" ? (
                  <><MdPersonAdd size={16} /> <span>{t("resAddCommitteeBtn")}</span></>
                ) : (
                  <><MdPerson size={16} /> <span>{t("resRemoveMemberBtn")}</span></>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Accountant Deactivate Confirm Dialog */}
      {accountantConfirm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setAccountantConfirm(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: "24px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "saModalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <MdBlock size={22} style={{ color: "#f87171" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {t("resDeactivateAcct")}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{accountantConfirm.name}</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {t("resDeactivateAcctBody")}
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button type="button" onClick={() => setAccountantConfirm(null)} className="sa-btn sa-btn-ghost">
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => deactivateAccountant(accountantConfirm.id)}
                className="btn-danger"
                style={{ borderRadius: 999, fontWeight: 700 }}
              >
                <MdBlock size={16} /> <span>{t("resMakeInactive")}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reject Resident (Pending Approval) Modal */}
      {rejectTarget && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: "24px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "saModalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <MdWarning size={22} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {t("resRejectTitle", "Reject Registration")}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{rejectTarget.name}</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {t("resRejectBody", "This will mark the registration as rejected and deactivate the account. The resident will be notified by email.")}
            </p>

            <label style={{ display: "block", marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {t("resRejectReasonLabel", "Reason for rejection")}{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={3}
              maxLength={255}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("resRejectReasonPlaceholder", "e.g. Documents could not be verified. Please upload a clear photo of your ID proof.")}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
              {t("resRejectReasonHelp", "Required. This reason is emailed to the resident and shown on their login screen.")}{" "}
              <span style={{ opacity: 0.7 }}>{rejectReason.trim().length}/255</span>
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" onClick={() => setRejectTarget(null)} className="sa-btn sa-btn-ghost" disabled={rejectLoading}>
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmRejectResident}
                className="btn-danger"
                style={{ borderRadius: 999, fontWeight: 700 }}
                disabled={rejectLoading || !rejectReason.trim()}
              >
                {rejectLoading ? <>{t("rejecting", "Rejecting…")}</> : <><MdClose size={16} /> <span>{t("reject") || "Reject"}</span></>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Deactivate / Reactivate Resident Confirm Dialog */}
      {statusTarget && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setStatusTarget(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: "24px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "saModalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            {(() => {
              const activating = String(statusTarget.status || "").toUpperCase() === "INACTIVE";
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: activating ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)", border: `1px solid ${activating ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                      {activating ? <MdCheckCircle size={22} style={{ color: "#4ade80" }} /> : <MdBlock size={22} style={{ color: "#f87171" }} />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                        {activating ? t("resReactivateTitle", "Reactivate Resident") : t("resDeactivateTitle", "Deactivate Resident")}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{statusTarget.name}</p>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {activating
                      ? t("resReactivateBody", "This will restore the resident's access so they can sign in again. All their units, bills and history remain unchanged.")
                      : t("resDeactivateBody", "This will disable the resident's login and revoke their access. No data is deleted — units, bills and history stay intact, and you can reactivate them anytime.")}
                  </p>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
                    <button
                      type="button"
                      onClick={() => setStatusTarget(null)}
                      className="sa-btn sa-btn-ghost"
                      disabled={statusLoading}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 42, padding: "0 22px", whiteSpace: "nowrap", lineHeight: 1, fontSize: 14 }}
                    >
                      {t("cancel") || "Cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(statusTarget)}
                      className={activating ? "btn-primary" : "btn-danger"}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 42, padding: "0 22px", whiteSpace: "nowrap", lineHeight: 1, fontSize: 14, borderRadius: 999, fontWeight: 700 }}
                      disabled={statusLoading}
                    >
                      {statusLoading
                        ? <>{activating ? t("resReactivating", "Reactivating…") : t("resDeactivating", "Deactivating…")}</>
                        : activating
                          ? <><MdCheckCircle size={16} /> <span>{t("resReactivate", "Reactivate")}</span></>
                          : <><MdBlock size={16} /> <span>{t("resDeactivate", "Deactivate")}</span></>}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
