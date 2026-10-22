import React, { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import {
  MdApartment, MdAdd, MdDelete, MdSearch, MdClose,
  MdLinkOff, MdHome, MdPerson, MdCheckCircle, MdLock,
  MdChevronLeft, MdChevronRight, MdOutlineInbox,
  MdGridView, MdArrowForwardIos, MdLayers, MdHomeWork, MdSquareFoot, MdCheck,
  MdDoneAll, MdAutoFixHigh, MdSpeed, MdTune, MdCheckCircleOutline, MdOutlineVilla,
  MdArrowDownward, MdContentCopy, MdRefresh, MdFilterList
} from "react-icons/md";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import StatCard from "../../components/common/StatCard";
import { getNumberError, getPositiveAmountError } from "../../utils/validators";
import "./Admin.css";

import Pagination from "../../components/common/Pagination";

/* ── helpers ── */
function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function useDebounce(v, d = 450) {
  const [dv, setDv] = useState(v);
  useEffect(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t); }, [v, d]);
  return dv;
}

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

/* ── utility: get society_id from JWT or localStorage ── */
function getSocietyId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.society_id;
  } catch { return null; }
}

/* ── utility: safe number parse — returns NaN if invalid ── */
function safeNum(val) {
  if (val == null || val === "") return NaN;
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? NaN : n;
}

function propertyTypeLabel(type, t) {
  if (type === "ROW_HOUSE") return t("mpTypeRowHouse");
  if (type === "COMMERCIAL") return t("mpTypeCommercial");
  return t("mpTypeApartment");
}

/* ══════════════════════════════════════════════
  MAIN COMPONENT
══════════════════════════════════════════════ */
export default function ManageProperty() {
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t }     = useLang();
  const isMobile  = useIsMobile();
  const { user }  = useContext(AuthContext);
  const isSuperAdmin = (user?.activeRole || user?.role) === "SUPER_ADMIN";
  const canEdit   = isSuperAdmin || hasPermission(user, "property", "edit") || hasPermission(user, "property", "create") || hasPermission(user, "property", "view");
  const [tab, setTab] = useState("blocks");
  const [search, setSearch] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);

  // ── SuperAdmin Society Selection ──
  const [societies, setSocieties] = useState([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);

  const querySocId = searchParams.get("societyId");
  const storedSocFilter = localStorage.getItem("superadmin_society_filter");
  const initialSocId = querySocId || (storedSocFilter && storedSocFilter !== "ALL" ? storedSocFilter : "") || "";
  const [selectedSocietyId, setSelectedSocietyId] = useState(initialSocId);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingSocieties(true);
      API.get("/societies")
        .then((res) => {
          const list = res.data || [];
          setSocieties(list);
          if (!selectedSocietyId && list.length > 0) {
            const firstId = String(list[0].id);
            setSelectedSocietyId(firstId);
            localStorage.setItem("superadmin_society_filter", firstId);
            setSearchParams({ societyId: firstId });
          }
        })
        .catch((err) => console.error("Failed to load societies", err))
        .finally(() => setLoadingSocieties(false));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (querySocId && querySocId !== selectedSocietyId) {
      setSelectedSocietyId(querySocId);
      localStorage.setItem("superadmin_society_filter", querySocId);
    }
  }, [querySocId]);

  const handleSocietyChange = (newSocId) => {
    setSelectedSocietyId(newSocId);
    if (newSocId) {
      localStorage.setItem("superadmin_society_filter", newSocId);
      setSearchParams({ societyId: newSocId });
    } else {
      localStorage.removeItem("superadmin_society_filter");
      setSearchParams({});
    }
  };

  const activeSocietyId = isSuperAdmin ? selectedSocietyId : (user?.society_id || getSocietyId());

  const TABS = [
    { key: "blocks",  label: t("mpTabBlocks") || "Blocks & Floors",  icon: MdGridView   },
    { key: "flats",   label: t("mpTabFlats") || "All Properties",    icon: MdApartment  },
  ];

  const handleOpenCreateBlock = () => {
    if (isSuperAdmin && !activeSocietyId) {
      toast.warning(t("mpSelectSocietyFirst") || "Please select a society first to create a block.");
      return;
    }
    setShowBlockForm(true);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearch("");
  };

  return (
    <div className="mp-page space-y-5 animate-fadeIn">
      {/* ── Page Header (Title, Society Dropdown, Create Button, Search, Tabs in Same Row) ── */}
      <div className="mp-page-head">
        <div className="mp-page-head__title">
          <div className="ad-page-icon">
            <MdHome size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{t("mpTitle") || "Manage Property"}</h2>
            <p className="text-secondary text-xs mt-0.5">{t("mpSubtitle")}</p>
          </div>
        </div>

        <div className="mp-page-head__tools">
          {/* SuperAdmin Society Selector in the SAME ROW near the Create button */}
          {isSuperAdmin && (
            <div style={{ minWidth: 180, maxWidth: 260 }} className="shrink-0">
              <Select
                value={selectedSocietyId}
                onChange={(e) => handleSocietyChange(e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 10, fontSize: 13, fontWeight: 700 }}
              >
                <option value="">Select Society...</option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {canEdit && tab === "blocks" && (
            <GlobalButton
              variant="add"
              borderDraw
              onClick={handleOpenCreateBlock}
              icon={MdAdd}
              className="mp-page-head__cta shrink-0"
              style={{ fontWeight: 700 }}
            >
              {t("createBlock")}
            </GlobalButton>
          )}

          <ExpandableSearch
            value={search}
            onChange={setSearch}
            placeholder={
              tab === "blocks"
                ? t("mpSearchPhases")
                : t("mpSearchProperty")
            }
          />

          <div className="mp-page-head__tabs">
            <SlidingTabs
              fullWidth={isMobile}
              value={tab}
              onChange={handleTabChange}
              items={TABS.map(({ key, label, icon: Icon }) => ({
                id: key,
                label,
                icon: <Icon size={16} />,
              }))}
            />
          </div>
        </div>
      </div>

      {/* ── Body: Ask to select society if not selected ── */}
      {isSuperAdmin && !activeSocietyId ? (
        <div className="card" style={{ padding: 48, textAlign: "center", borderRadius: 18, border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "rgba(160, 90, 255, 0.12)",
            border: "1px solid rgba(160, 90, 255, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            margin: "0 auto 16px"
          }}>
            <MdApartment size={28} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Select a Society</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 440, margin: "8px auto 0" }}>
            Please select a society from the dropdown above in the header to view and configure its blocks, floors, flats, and layouts.
          </p>
        </div>
      ) : (
        <>
          {/* ── Tab panels ── */}
          {tab === "blocks"  && (
            <BlocksTab
              isMobile={isMobile}
              t={t}
              canEdit={canEdit}
              search={search}
              setSearch={setSearch}
              showForm={showBlockForm}
              setShowForm={setShowBlockForm}
              societyId={activeSocietyId}
            />
          )}
          {tab === "flats"   && (
            <FlatsTab
              isMobile={isMobile}
              t={t}
              canEdit={canEdit}
              search={search}
              setSearch={setSearch}
              societyId={activeSocietyId}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   AREA ASSIGN MODAL (Dual-Mode: Make All Same & Separate Filling)
══════════════════════════════════════════════ */
export function AreaAssignModal({
  flats,
  values,
  setValues,
  onSave,
  onSkip,
  saving,
  isMobile,
  initialMode = "SAME",
  blockName = ""
}) {
  const { t } = useLang();
  const [activeMode, setActiveMode] = useState(initialMode || "SAME"); // "SAME" | "SEPARATE"
  const [bulkVal, setBulkVal] = useState("");
  const [emptyFillVal, setEmptyFillVal] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // "ALL" | "EMPTY" | "CONFIGURED"
  const inputRefs = useRef({});

  const PRESETS = [1000, 1200, 1500, 1800, 2000, 2400, 3000];

  const configuredCount = useMemo(() => {
    return flats.filter(f => {
      const v = values[f.id];
      return v !== "" && v != null && !isNaN(Number(v)) && Number(v) > 0;
    }).length;
  }, [flats, values]);

  const emptyCount = flats.length - configuredCount;

  const totalArea = useMemo(() => {
    return flats.reduce((sum, f) => {
      const v = Number(values[f.id]);
      return !isNaN(v) && v > 0 ? sum + v : sum;
    }, 0);
  }, [flats, values]);

  const percent = flats.length ? Math.round((configuredCount / flats.length) * 100) : 0;
  const firstVal = flats.length > 0 && values[flats[0].id] ? values[flats[0].id] : "";

  // Filtered flats for Separate Filling mode
  const filteredFlats = useMemo(() => {
    return flats.filter(f => {
      const val = values[f.id];
      const hasArea = val !== "" && val != null && !isNaN(Number(val)) && Number(val) > 0;
      if (filterType === "EMPTY" && hasArea) return false;
      if (filterType === "CONFIGURED" && !hasArea) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!f.flat_number.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [flats, values, filterType, search]);

  // Apply bulk value to ALL houses
  const applyBulk = (valToApply) => {
    const v = valToApply !== undefined ? valToApply : bulkVal;
    if (v === "" || v === null || isNaN(Number(v)) || Number(v) < 0) {
      toast.error(t("mpValidArea"));
      return;
    }
    const str = String(v);
    const updated = {};
    flats.forEach(f => { updated[f.id] = str; });
    setValues(updated);
    setBulkVal(str);
    toast.success(t("mpAppliedAll", { area: str, n: flats.length }));
  };

  // Apply to ONLY empty / unfilled houses (enables using both options together!)
  const applyToEmpty = (valToApply) => {
    const v = valToApply !== undefined ? valToApply : emptyFillVal;
    if (v === "" || v === null || isNaN(Number(v)) || Number(v) < 0) {
      toast.error(t("mpValidArea"));
      return;
    }
    const str = String(v);
    let count = 0;
    const updated = { ...values };
    flats.forEach(f => {
      const cur = values[f.id];
      if (cur === "" || cur == null || isNaN(Number(cur)) || Number(cur) <= 0) {
        updated[f.id] = str;
        count++;
      }
    });
    if (count === 0) {
      toast.info(t("mpAllConfigured"));
      return;
    }
    setValues(updated);
    setEmptyFillVal("");
    toast.success(t("mpFilledEmpty", { count, area: str }));
  };

  // Clear all values
  const clearAll = () => {
    if (!window.confirm(t("mpConfirmClearAreas"))) return;
    const updated = {};
    flats.forEach(f => { updated[f.id] = ""; });
    setValues(updated);
    toast.info(t("mpClearedAreas"));
  };

  // Copy value from previous house in the list
  const copyFromPrev = (flatIndexInFlats) => {
    if (flatIndexInFlats <= 0) return;
    const prevFlat = flats[flatIndexInFlats - 1];
    const prevVal = values[prevFlat.id];
    if (!prevVal || isNaN(Number(prevVal)) || Number(prevVal) <= 0) {
      toast.warn(t("mpPrevNoArea", { num: prevFlat.flat_number }));
      return;
    }
    const currFlat = flats[flatIndexInFlats];
    setValues(p => ({ ...p, [currFlat.id]: String(prevVal) }));
    toast.success(t("mpCopiedFrom", { area: prevVal, num: prevFlat.flat_number }));
  };

  // Fill down from this house to all subsequent houses
  const fillDown = (flatIndexInFlats) => {
    const currFlat = flats[flatIndexInFlats];
    const currVal = values[currFlat.id];
    if (!currVal || isNaN(Number(currVal)) || Number(currVal) <= 0) {
      toast.warn(t("mpSetAreaFirst", { num: currFlat.flat_number }));
      return;
    }
    const updated = { ...values };
    let count = 0;
    for (let i = flatIndexInFlats + 1; i < flats.length; i++) {
      updated[flats[i].id] = String(currVal);
      count++;
    }
    setValues(updated);
    toast.success(t("mpFilledDown", { area: currVal, count }));
  };

  // Keyboard navigation on Enter or Arrows
  const handleKeyDown = (e, indexInFiltered) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextFlat = filteredFlats[indexInFiltered + 1];
      if (nextFlat && inputRefs.current[nextFlat.id]) {
        inputRefs.current[nextFlat.id].focus();
        inputRefs.current[nextFlat.id].select?.();
      }
    } else if (e.key === "ArrowUp" && indexInFiltered > 0) {
      e.preventDefault();
      const prevFlat = filteredFlats[indexInFiltered - 1];
      if (prevFlat && inputRefs.current[prevFlat.id]) {
        inputRefs.current[prevFlat.id].focus();
        inputRefs.current[prevFlat.id].select?.();
      }
    }
  };

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
      className="global-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0, 0, 0, 0.68)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 8 : 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sa-modal global-modal-container mp-area-modal"
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : 720,
          maxHeight: isMobile ? "min(92dvh, calc(100vh - 16px))" : "min(90vh, 820px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: isMobile ? 16 : 20,
          background: "var(--modal-bg)",
          border: "1.5px solid var(--glass-border)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--acct-purple-rgb), 0.22)",
          overflow: "hidden",
          animation: "adminModalPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          className="sa-modal-header sa-modal-er"
          style={{ flexShrink: 0, padding: isMobile ? "16px 16px 14px" : "18px 20px 16px", gap: 12 }}
        >
          <div
            className="sa-modal-icon"
            style={{
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
              boxShadow: "0 6px 16px rgba(var(--acct-purple-rgb),0.32)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <MdHomeWork size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="sa-modal-title" style={{ margin: 0, lineHeight: 1.25, overflowWrap: "anywhere" }}>
              {t("mpAssignAreaTitle")}
            </h3>
            <p className="sa-modal-subtitle" style={{ margin: "4px 0 0", lineHeight: 1.45 }}>
              {t("mpAssignAreaHint")}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {blockName && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(91,141,239,0.15)", color: "#94B5F5", border: "1px solid rgba(91,141,239,0.3)" }}>
                  {blockName}
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(var(--acct-purple-rgb),0.14)", color: "var(--accent-light)", border: "1px solid rgba(var(--acct-purple-rgb),0.3)" }}>
                {t("mpHousesN", { n: flats.length })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="sa-modal-close"
            title={t("close")}
            style={{ flexShrink: 0 }}
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Dual Mode Switcher & "Use Both" Guidance Bar */}
        <div style={{
          padding: isMobile ? "10px 16px 12px" : "10px 20px 12px",
          borderBottom: "1px solid var(--glass-border)",
          background: "rgba(255, 255, 255, 0.015)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex",
            background: "var(--card-inner-bg)",
            padding: 4,
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            gap: 4,
            width: "100%",
          }}>
            <button
              type="button"
              onClick={() => setActiveMode("SAME")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isMobile ? "8px 6px" : "8px 14px",
                borderRadius: 9,
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                flex: 1,
                minWidth: 0,
                background: activeMode === "SAME" ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "transparent",
                color: activeMode === "SAME" ? "#fff" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: activeMode === "SAME" ? "0 3px 12px rgba(var(--acct-purple-rgb),0.35)" : "none"
              }}
            >
              <MdDoneAll size={15} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap", textAlign: "center", lineHeight: 1.25 }}>⚡ {t("mpOptionMakeAllSame")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("SEPARATE")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isMobile ? "8px 6px" : "8px 14px",
                borderRadius: 9,
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                flex: 1,
                minWidth: 0,
                background: activeMode === "SEPARATE" ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "transparent",
                color: activeMode === "SEPARATE" ? "#fff" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: activeMode === "SEPARATE" ? "0 3px 12px rgba(var(--acct-purple-rgb),0.35)" : "none"
              }}
            >
              <MdTune size={15} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap", textAlign: "center", lineHeight: 1.25 }}>✍️ {t("mpOptionSeparate")}</span>
            </button>
          </div>

          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(var(--acct-purple-rgb),0.09)",
            border: "1px solid rgba(var(--acct-purple-rgb),0.22)",
            fontSize: 11,
            color: "var(--text-secondary)",
            width: "100%",
            boxSizing: "border-box",
          }}>
            <span style={{
              padding: "2px 6px",
              borderRadius: 5,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 9,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              marginTop: 1,
              flexShrink: 0,
            }}>
              {t("mpUseBothBadge")}
            </span>
            <span style={{ lineHeight: 1.4, minWidth: 0 }}>
              {t("mpUseBothGuide")}
            </span>
          </div>
        </div>

        {/* Progress & Total Area Summary Strip */}
        <div style={{
          padding: isMobile ? "8px 16px" : "8px 20px",
          borderBottom: "1px solid var(--glass-border)",
          background: "rgba(0, 0, 0, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{t("mpProgress")}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: configuredCount === flats.length ? "var(--accent)" : "var(--text-primary)" }}>
                {t("mpConfiguredPct", { configured: configuredCount, total: flats.length, percent })}
              </span>
            </div>

            <div style={{ width: isMobile ? "100%" : 110, maxWidth: 160, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ width: `${percent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--accent), var(--accent-light))", transition: "width 0.3s ease" }} />
            </div>

            {emptyCount > 0 ? (
              <span style={{ fontSize: 11, color: "var(--stat-amber-color, #fbbf24)", fontWeight: 600 }}>
                {emptyCount === 1 ? t("mpHouseUnset", { n: emptyCount }) : t("mpHousesUnset", { n: emptyCount })}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                <MdCheck size={12} /> {t("mpAllHousesReady")}
              </span>
            )}
          </div>

          {totalArea > 0 && (
            <div style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{t("mpTotalBuiltUp")} </span>
              <strong style={{ color: "var(--accent)" }}>{t("mpValueSqft", { n: totalArea.toLocaleString() })}</strong>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div
          className="sa-modal-body modal-scroll-thin"
          style={{
            padding: isMobile ? "14px 16px" : "16px 20px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >

          {/* ══════════════════════════════════════════════
              OPTION 1 VIEW: MAKE ALL SAME
          ══════════════════════════════════════════════ */}
          {activeMode === "SAME" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Uniform Setting Hero Card */}
              <div style={{
                background: "linear-gradient(135deg, rgba(var(--acct-purple-rgb),0.12) 0%, rgba(var(--acct-purple-rgb),0.05) 100%)",
                border: "1px solid rgba(var(--acct-purple-rgb),0.28)",
                borderRadius: 14,
                padding: isMobile ? "14px" : "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(var(--acct-purple-rgb),0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                      <MdAutoFixHigh size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {t("mpSetUniformTitle", { n: flats.length })}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(var(--acct-purple-rgb),0.2)", color: "var(--accent)" }}>
                          {t("mpOneClickFill")}
                        </span>
                      </h4>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                        {t("mpSetUniformHint")}
                      </p>
                    </div>
                  </div>

                  {firstVal && (
                    <button
                      type="button"
                      onClick={() => applyBulk(firstVal)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5
                      }}
                      title={t("mpCopyHouse1Title")}
                    >
                      <MdDoneAll size={14} style={{ color: "var(--accent)" }} />
                      {t("mpCopyHouseToAll", { num: flats[0]?.flat_number, area: firstVal })}
                    </button>
                  )}
                </div>

                {/* Presets & Input Bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {t("mpCommonSizes")}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {PRESETS.map(p => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => applyBulk(p)}
                          style={{
                            padding: "5px 11px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            background: Number(bulkVal) === p ? "var(--accent)" : "var(--card-bg)",
                            color: Number(bulkVal) === p ? "#fff" : "var(--text-primary)",
                            border: Number(bulkVal) === p ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {t("mpValueSqft", { n: p.toLocaleString() })}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Input + Apply Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      background: "var(--card-bg)",
                      border: "1px solid rgba(var(--acct-purple-rgb),0.35)",
                      borderRadius: 10,
                      padding: "0 10px",
                      height: 38,
                      minWidth: 0,
                      overflow: "hidden",
                      flex: isMobile ? "1 1 100%" : "0 1 auto",
                    }}>
                      <MdSquareFoot size={16} style={{ color: "var(--accent)", marginRight: 6, flexShrink: 0 }} />
                      <input
                        className="mp-bare-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t("mpCustomSqftPh")}
                        value={bulkVal}
                        onChange={e => setBulkVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyBulk(); } }}
                        style={{
                          width: isMobile ? "100%" : 110,
                          minWidth: 0,
                          flex: 1,
                          border: "none",
                          background: "transparent",
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontWeight: 700,
                          outline: "none"
                        }}
                      />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, flexShrink: 0 }}>{t("mpSqft")}</span>
                    </div>

                    <GlobalButton
                      type="button"
                      variant="add"
                      icon={MdDoneAll}
                      size="sm"
                      onClick={() => applyBulk()}
                    >
                      {t("mpApplyToAll", { n: flats.length })}
                    </GlobalButton>

                    {emptyCount > 0 && configuredCount > 0 && (
                      <button
                        type="button"
                        onClick={() => applyToEmpty(bulkVal)}
                        style={{
                          height: 38,
                          padding: "0 14px",
                          borderRadius: 10,
                          background: "rgba(var(--acct-purple-rgb),0.14)",
                          border: "1px solid rgba(var(--acct-purple-rgb),0.3)",
                          color: "var(--accent)",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                        title={t("mpFillEmptyTitle")}
                      >
                        <MdCheckCircleOutline size={15} />
                        <span>{t("mpFillOnlyEmpty", { n: emptyCount })}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Grid with Instant Switcher Callout */}
              <div style={{
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: 14,
                padding: isMobile ? "12px" : "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {t("mpLivePreview", { n: flats.length })}
                    </h5>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                      {t("mpLivePreviewHint")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveMode("SEPARATE")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 8,
                      background: "rgba(91,141,239,0.12)",
                      border: "1px solid rgba(91,141,239,0.25)",
                      color: "#94B5F5",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    <MdTune size={14} />
                    <span>{t("mpCustomizeSeparate")}</span>
                  </button>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}>
                  {flats.map(f => {
                    const v = values[f.id];
                    const hasArea = v !== "" && v != null && !isNaN(Number(v)) && Number(v) > 0;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setActiveMode("SEPARATE")}
                        style={{
                          background: hasArea ? "rgba(var(--acct-purple-rgb),0.06)" : "var(--card-bg)",
                          border: hasArea ? "1px solid rgba(var(--acct-purple-rgb),0.25)" : "1px solid var(--glass-border)",
                          borderRadius: 10,
                          padding: "8px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        title={t("mpClickSeparateTitle")}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                            #{f.flat_number}
                          </span>
                          {hasArea ? (
                            <MdCheck size={12} color="var(--accent)" />
                          ) : (
                            <span style={{ fontSize: 9, color: "var(--text-secondary)", opacity: 0.6 }}>{t("mpUnset")}</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: hasArea ? "var(--accent)" : "var(--text-secondary)" }}>
                          {hasArea ? t("mpValueSqft", { n: Number(v).toLocaleString() }) : t("mpDashSqft")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              OPTION 2 VIEW: SEPARATE FILLING
          ══════════════════════════════════════════════ */}
          {activeMode === "SEPARATE" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Separate Mode Control Bar: Search + Filter Tabs + Quick Fill-Remainder */}
              <div style={{
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: 14,
                padding: isMobile ? "10px 12px" : "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                flexWrap: "wrap",
                gap: 10
              }}>
                {/* Search */}
                <div style={{ position: "relative", minWidth: isMobile ? 0 : 180, flex: "1 1 160px", maxWidth: isMobile ? "100%" : 260 }}>
                  <MdSearch size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
                  <input
                    className="input search-input mp-search-field"
                    placeholder={t("mpSearchHousePh")}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 34, height: 36, fontSize: 12, borderRadius: 10, width: "100%", boxSizing: "border-box" }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                      <MdClose size={13} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <SlidingTabs
                  value={filterType}
                  onChange={setFilterType}
                  items={[
                    { id: "ALL", label: t("mpFilterAllN", { n: flats.length }) },
                    { id: "EMPTY", label: t("mpFilterEmptyN", { n: emptyCount }) },
                    { id: "CONFIGURED", label: t("mpFilterConfiguredN", { n: configuredCount }) },
                  ]}
                />

                {/* Quick Remainder-Fill Tool (Using Both seamlessly) */}
                {emptyCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
                      {t("mpFillRemaining", { n: emptyCount })}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--card-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "0 8px", height: 32, overflow: "hidden" }}>
                      <input
                        className="mp-bare-input"
                        type="number"
                        min="0"
                        placeholder={t("mpSqft")}
                        value={emptyFillVal}
                        onChange={e => setEmptyFillVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyToEmpty(); } }}
                        style={{ width: 65, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, outline: "none" }}
                      />
                      <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t("mpSqft")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyToEmpty()}
                      style={{ padding: "0 10px", height: 32, borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      {t("mpApplyToEmpty")}
                    </button>
                  </div>
                )}

                {/* Clear All */}
                {configuredCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    style={{ padding: "5px 10px", borderRadius: 8, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#fca5a5", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    title={t("mpResetAreasTitle")}
                  >
                    <MdRefresh size={13} />
                    {t("mpReset")}
                  </button>
                )}
              </div>

              {/* Grid of House Cards for Separate Entry */}
              {filteredFlats.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)", fontSize: 13 }}>
                  {t("mpNoHousesMatch")}
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 10,
                }}>
                  {filteredFlats.map((f, idxInFiltered) => {
                    const val = values[f.id] ?? "";
                    const hasArea = val !== "" && !isNaN(Number(val)) && Number(val) > 0;
                    const flatIdxInAll = flats.findIndex(item => item.id === f.id);
                    const prevFlat = flatIdxInAll > 0 ? flats[flatIdxInAll - 1] : null;
                    const prevVal = prevFlat ? values[prevFlat.id] : "";

                    return (
                      <div
                        key={f.id}
                        style={{
                          background: hasArea ? "rgba(var(--acct-purple-rgb), 0.05)" : "var(--card-inner-bg)",
                          border: hasArea ? "1px solid rgba(var(--acct-purple-rgb), 0.35)" : "1px solid var(--glass-border)",
                          borderRadius: 14,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          transition: "all 0.18s ease"
                        }}
                      >
                        {/* Card Header: House Number + Status */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: hasArea ? "rgba(var(--acct-purple-rgb),0.18)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: hasArea ? "var(--accent)" : "var(--text-secondary)" }}>
                              <MdOutlineVilla size={16} />
                            </div>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>
                                {t("mpHouseNum", { num: f.flat_number })}
                              </span>
                              {f.resident_id && (
                                <span style={{ fontSize: 9, marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#86efac", fontWeight: 700 }}>
                                  {t("mpOccupied")}
                                </span>
                              )}
                            </div>
                          </div>

                          {hasArea ? (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(var(--acct-purple-rgb),0.16)", color: "var(--accent-light)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <MdCheck size={12} /> {t("mpReady")}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                              {t("mpEmpty")}
                            </span>
                          )}
                        </div>

                        {/* Input Field with Auto-Advance on Enter */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          background: "var(--card-bg)",
                          border: `1px solid ${hasArea ? "rgba(var(--acct-purple-rgb),0.3)" : "var(--glass-border)"}`,
                          borderRadius: 9,
                          padding: "0 10px",
                          height: 38,
                          overflow: "hidden",
                        }}>
                          <input
                            ref={el => { inputRefs.current[f.id] = el; }}
                            className="mp-bare-input"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={t("mpEnterAreaPh")}
                            value={val}
                            onChange={e => setValues(p => ({ ...p, [f.id]: e.target.value }))}
                            onKeyDown={e => handleKeyDown(e, idxInFiltered)}
                            style={{
                              flex: 1,
                              border: "none",
                              background: "transparent",
                              color: "var(--text-primary)",
                              fontSize: 13,
                              fontWeight: 700,
                              outline: "none",
                              width: "100%"
                            }}
                          />
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, marginLeft: 4 }}>
                            {t("mpSqft")}
                          </span>
                        </div>

                        {/* Card Footer Quick Actions (Copy Prev & Fill Down) */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, paddingTop: 2, borderTop: "1px dashed var(--glass-border)" }}>
                          {prevFlat && prevVal ? (
                            <button
                              type="button"
                              onClick={() => copyFromPrev(flatIdxInAll)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: "2px 4px",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#94B5F5",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 3
                              }}
                              title={t("mpCopyPrevTitle", { area: prevVal, num: prevFlat.flat_number })}
                            >
                              <MdContentCopy size={11} />
                              <span>{t("mpCopyPrev", { num: prevFlat.flat_number })}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.5 }}>
                              {flatIdxInAll === 0 ? t("mpFirstHouse") : t("mpNoPrevArea")}
                            </span>
                          )}

                          {hasArea && flatIdxInAll < flats.length - 1 && (
                            <button
                              type="button"
                              onClick={() => fillDown(flatIdxInAll)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: "2px 4px",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--accent)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                marginLeft: "auto"
                              }}
                              title={t("mpFillDownTitle", { area: val })}
                            >
                              <MdArrowDownward size={11} />
                              <span>{t("mpFillDown")}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Keyboard navigation tip */}
              <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", padding: "2px 4px 4px", lineHeight: 1.45 }}>
                💡 <strong>{t("mpSpeedTip")}</strong> {t("mpSpeedTipBody")}
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer */}
        <div
          className="sa-modal-footer"
          style={{
            flexShrink: 0,
            padding: isMobile ? "12px 14px calc(12px + env(safe-area-inset-bottom))" : "14px 20px 16px",
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            flexDirection: isMobile ? "column" : "row",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
            <span>{t("mpConfiguredOf", { configured: configuredCount, total: flats.length })}</span>
            {totalArea > 0 && <span>· {t("mpTotalSqft", { area: totalArea.toLocaleString() })}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto", marginLeft: isMobile ? 0 : "auto" }}>
            <GlobalButton
              type="button"
              variant="cancel"
              onClick={onSkip}
              fullWidth={isMobile}
            >
              {t("mpSkipForNow")}
            </GlobalButton>
            <GlobalButton
              type="button"
              variant="add"
              icon={MdCheck}
              loading={saving}
              borderDraw
              onClick={onSave}
              fullWidth={isMobile}
            >
              {t("mpSaveAreas")}
            </GlobalButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════════════
  TAB 1 — BLOCKS
══════════════════════════════════════════════ */
function BlocksTab({
  isMobile,
  t,
  canEdit = true,
  search: externalSearch,
  setSearch: setExternalSearch,
  showForm: externalShowForm,
  setShowForm: setExternalShowForm,
  societyId,
}) {
  const [blocks,        setBlocks]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [name,          setName]          = useState("");
  const [propertyType,  setPropertyType]  = useState("APARTMENT");
  const [floorCount,    setFloorCount]    = useState("");
  const [flatsPerFloor, setFlatsPerFloor] = useState("");
  const [totalHouses,   setTotalHouses]   = useState("");
  const [commonArea,    setCommonArea]    = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [localShowForm, setLocalShowForm] = useState(false);
  const showForm = externalShowForm !== undefined ? externalShowForm : localShowForm;
  const setShowForm = setExternalShowForm !== undefined ? setExternalShowForm : setLocalShowForm;

  const activeSocId = societyId || getSocietyId();

  // ── 3-Tier BHK Draft Configuration State ──
  const [blockDefaultBhk, setBlockDefaultBhk] = useState("2BHK");
  const [floorsLayout, setFloorsLayout]       = useState([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [dimWarning, setDimWarning]           = useState("");
  const prevDimsRef = useRef({ floors: 0, units: 0, hasCustom: false });

  const [confirmId,     setConfirmId]     = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);
  const [localSearch,   setLocalSearch]   = useState("");
  const search = externalSearch !== undefined ? externalSearch : localSearch;
  const setSearch = setExternalSearch !== undefined ? setExternalSearch : setLocalSearch;

  const [error,         setError]         = useState("");
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [areaAssignFlats, setAreaAssignFlats] = useState(null);
  const [areaAssignValues, setAreaAssignValues] = useState({});
  const [areaAssignInitialMode, setAreaAssignInitialMode] = useState("SAME");
  const [areaAssignBlockName, setAreaAssignBlockName] = useState("");
  const [areaStrategy, setAreaStrategy] = useState("BOTH"); // "SAME" | "SEPARATE" | "BOTH"
  const [savingAreas, setSavingAreas] = useState(false);
  const [refreshFlatsKey, setRefreshFlatsKey] = useState(0);

  useEffect(() => {
    if (activeSocId) {
      loadBlocks();
    } else {
      setBlocks([]);
      setLoading(false);
    }
  }, [activeSocId]);

  // ── Synchronize draft floor and flat layout when inputs change ──
  useEffect(() => {
    if (propertyType !== "APARTMENT") {
      setFloorsLayout([]);
      setDimWarning("");
      return;
    }
    const fc = parseInt(floorCount, 10);
    const fp = parseInt(flatsPerFloor, 10);
    if (isNaN(fc) || fc < 1 || isNaN(fp) || fp < 1) {
      setFloorsLayout([]);
      setDimWarning("");
      return;
    }

    if (
      prevDimsRef.current.hasCustom &&
      (fc < prevDimsRef.current.floors || fp < prevDimsRef.current.units)
    ) {
      setDimWarning("Notice: Decreasing floor or unit count removes configured flats from the draft layout.");
    } else {
      setDimWarning("");
    }

    setFloorsLayout((prevFloors) => {
      const blockPrefix = (name || "").trim() || "Wing";
      const newFloors = [];

      for (let f = 1; f <= fc; f++) {
        const existingFloor = prevFloors[f - 1];
        const floorDefault = existingFloor?.floorDefaultBhk || blockDefaultBhk || "2BHK";
        const mode = existingFloor?.mode || "DEFAULT";

        const newFlats = [];
        for (let u = 1; u <= fp; u++) {
          const flatNum = `${blockPrefix}-${f}${u.toString().padStart(2, "0")}`;
          const existingFlat = existingFloor?.flats?.[u - 1];

          if (existingFlat) {
            newFlats.push({
              flat_number: flatNum,
              flat_type: existingFlat.flat_type || floorDefault,
              isOverridden: !!existingFlat.isOverridden,
            });
          } else {
            newFlats.push({
              flat_number: flatNum,
              flat_type: floorDefault,
              isOverridden: false,
            });
          }
        }

        const mixedCounts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
        newFlats.forEach((fl) => {
          if (mixedCounts[fl.flat_type] !== undefined) {
            mixedCounts[fl.flat_type]++;
          }
        });

        newFloors.push({
          floor_number: f,
          mode,
          floorDefaultBhk: floorDefault,
          mixedCounts: existingFloor?.mode === "MIXED" && existingFloor.mixedCounts ? existingFloor.mixedCounts : mixedCounts,
          flats: newFlats,
        });
      }

      const isCustom = newFloors.some(f => f.mode === "MIXED" || f.flats.some(fl => fl.isOverridden || fl.flat_type !== blockDefaultBhk));
      prevDimsRef.current = { floors: fc, units: fp, hasCustom: isCustom };

      return newFloors;
    });
  }, [propertyType, floorCount, flatsPerFloor, name]);

  // Level 1: Change block default
  const handleBlockDefaultChange = (newBhk) => {
    setBlockDefaultBhk(newBhk);
    setFloorsLayout(prev => prev.map(floor => {
      if (floor.mode === "DEFAULT") {
        const updatedFlats = floor.flats.map(fl =>
          fl.isOverridden ? fl : { ...fl, flat_type: newBhk }
        );
        const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
        updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
        return {
          ...floor,
          floorDefaultBhk: newBhk,
          flats: updatedFlats,
          mixedCounts: counts,
        };
      }
      return floor;
    }));
  };

  // Level 2: Change floor default
  const handleFloorDefaultChange = (floorIndex, newBhk) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const updatedFlats = floor.flats.map(fl =>
        fl.isOverridden ? fl : { ...fl, flat_type: newBhk }
      );
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return {
        ...floor,
        mode: "DEFAULT",
        floorDefaultBhk: newBhk,
        flats: updatedFlats,
        mixedCounts: counts,
      };
    }));
  };

  // Level 2: Switch floor mode
  const handleFloorModeChange = (floorIndex, newMode) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      let updatedFlats = [...floor.flats];
      if (newMode === "DEFAULT") {
        const fallback = floor.floorDefaultBhk || blockDefaultBhk || "2BHK";
        updatedFlats = updatedFlats.map(fl => fl.isOverridden ? fl : { ...fl, flat_type: fallback });
      }
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return { ...floor, mode: newMode, flats: updatedFlats, mixedCounts: counts };
    }));
  };

  // Level 2: Mixed distribution stepper change
  const handleMixedCountChange = (floorIndex, bhkType, delta) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const currentCount = floor.mixedCounts?.[bhkType] || 0;
      const newCount = Math.max(0, currentCount + delta);
      const newCounts = { ...(floor.mixedCounts || {}), [bhkType]: newCount };
      const totalRequested = (newCounts["1BHK"] || 0) + (newCounts["2BHK"] || 0) + (newCounts["3BHK"] || 0);
      const numFlats = floor.flats.length;

      let updatedFlats = [...floor.flats];
      if (totalRequested === numFlats) {
        const targetTypes = [
          ...Array(newCounts["1BHK"] || 0).fill("1BHK"),
          ...Array(newCounts["2BHK"] || 0).fill("2BHK"),
          ...Array(newCounts["3BHK"] || 0).fill("3BHK"),
        ];
        updatedFlats = updatedFlats.map((fl, fIdx) => ({
          ...fl,
          flat_type: targetTypes[fIdx] || fl.flat_type,
        }));
      }

      return {
        ...floor,
        mode: "MIXED",
        mixedCounts: newCounts,
        flats: updatedFlats,
      };
    }));
  };

  // Level 3: Individual flat BHK override
  const handleFlatBhkChange = (floorIndex, flatIndex, newBhk) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const updatedFlats = floor.flats.map((fl, fIdx) => {
        if (fIdx !== flatIndex) return fl;
        return {
          ...fl,
          flat_type: newBhk,
          isOverridden: true,
        };
      });
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return {
        ...floor,
        flats: updatedFlats,
        mixedCounts: counts,
      };
    }));
  };

  // Level 3: Revert individual flat override
  const handleRevertFlatOverride = (floorIndex, flatIndex) => {
    setFloorsLayout(prev => prev.map((floor, idx) => {
      if (idx !== floorIndex) return floor;
      const fallbackBhk = floor.floorDefaultBhk || blockDefaultBhk || "2BHK";
      const updatedFlats = floor.flats.map((fl, fIdx) => {
        if (fIdx !== flatIndex) return fl;
        return {
          ...fl,
          flat_type: fallbackBhk,
          isOverridden: false,
        };
      });
      const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0 };
      updatedFlats.forEach(fl => { if (counts[fl.flat_type] !== undefined) counts[fl.flat_type]++; });
      return {
        ...floor,
        flats: updatedFlats,
        mixedCounts: counts,
      };
    }));
  };

  // Validation of the draft layout
  const layoutValidation = useMemo(() => {
    if (propertyType !== "APARTMENT") {
      return { isValid: true, errors: [] };
    }
    const fc = parseInt(floorCount, 10);
    const fp = parseInt(flatsPerFloor, 10);
    if (!fc || fc < 1 || !fp || fp < 1) {
      return { isValid: false, errors: ["Please enter valid floor and unit counts."] };
    }
    if (!floorsLayout.length || floorsLayout.length !== fc) {
      return { isValid: false, errors: ["Layout preview is generating..."] };
    }

    const errors = [];
    floorsLayout.forEach((floor, idx) => {
      const fNum = floor.floor_number || (idx + 1);
      if (floor.mode === "MIXED") {
        const sum = (floor.mixedCounts?.["1BHK"] || 0) + (floor.mixedCounts?.["2BHK"] || 0) + (floor.mixedCounts?.["3BHK"] || 0);
        if (sum !== fp) {
          errors.push(`Floor ${fNum} mixed distribution sum (${sum}) must equal ${fp} units.`);
        }
      }
      floor.flats.forEach(fl => {
        if (!fl.flat_type || !["1BHK", "2BHK", "3BHK"].includes(fl.flat_type)) {
          errors.push(`Unit ${fl.flat_number} must have a valid BHK type.`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [propertyType, floorCount, flatsPerFloor, floorsLayout]);

  // Overall BHK Breakdown summary
  const overallBhkSummary = useMemo(() => {
    const counts = { "1BHK": 0, "2BHK": 0, "3BHK": 0, total: 0 };
    floorsLayout.forEach(floor => {
      floor.flats.forEach(fl => {
        if (counts[fl.flat_type] !== undefined) {
          counts[fl.flat_type]++;
        }
        counts.total++;
      });
    });
    return counts;
  }, [floorsLayout]);

  const loadBlocks = async () => {
    if (!activeSocId) {
      setBlocks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/blocks/${activeSocId}`, {
        headers: { "x-society-id": activeSocId }
      });
      setBlocks(res.data || []);
    } catch { setError(t("mpFailedLoadBlocks") || "Failed to load blocks"); }
    finally { setLoading(false); }
  };

  const openAreaModalForFlats = (flatsList, bName = "") => {
    const vals = {};
    flatsList.forEach(f => {
      vals[f.id] = f.area_sqft != null ? String(f.area_sqft) : "";
    });
    setAreaAssignValues(vals);
    setAreaAssignFlats(flatsList);
    setAreaAssignBlockName(bName);
    setAreaAssignInitialMode("SAME");
  };

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!activeSocId) {
      return setError(t("mpSelectSocietyFirst") || "Please select a society first.");
    }
    let payload = { name, society_id: activeSocId, property_type: propertyType };

    if (!name || !String(name).trim()) {
      return setError(t("mpPhaseNameRequired", "Phase / Block name is required."));
    }

    if (propertyType === "ROW_HOUSE") {
      const housesError = getNumberError(totalHouses, t("mpTotalHousesLabel"), { min: 1, allowZero: false, allowDecimal: false });
      if (housesError) return setError(housesError);
      payload.flats_per_floor = Number(totalHouses);
      if (areaStrategy !== "SEPARATE") {
        const areaError = getPositiveAmountError(commonArea, t("mpBuiltUpAreaLabel"));
        if (areaError) return setError(areaError);
        payload.area_sqft = Number(commonArea);
      }
    } else {
      const floorCountError = getNumberError(floorCount, t("mpFloorCountLabel"), { min: 1, allowZero: false, allowDecimal: false });
      if (floorCountError) return setError(floorCountError);
      const flatsPerFloorError = getNumberError(flatsPerFloor, t("mpUnitsPerFloorLabel"), { min: 1, allowZero: false, allowDecimal: false });
      if (flatsPerFloorError) return setError(flatsPerFloorError);
      payload.floor_count     = Number(floorCount);
      payload.flats_per_floor = Number(flatsPerFloor);

      // Validate and attach the full floor/flat BHK layout
      if (!layoutValidation.isValid) {
        return setError(layoutValidation.errors[0] || "Invalid BHK layout configuration.");
      }
      payload.floors = floorsLayout.map(f => ({
        floor_number: f.floor_number,
        flats: f.flats.map(fl => ({
          flat_number: fl.flat_number,
          flat_type: fl.flat_type,
        })),
      }));
    }

    setSubmitting(true); setError("");
    try {
      const res = await API.post("/blocks", payload);
      const createdBlockName = name;
      setName(""); setFloorCount(""); setFlatsPerFloor(""); setTotalHouses("");
      const initialCommonArea = commonArea;
      setCommonArea("");
      setPropertyType("APARTMENT");
      setBlockDefaultBhk("2BHK");
      setFloorsLayout([]);
      setActiveFloorIndex(0);
      setShowForm(false);

      // For ROW_HOUSE: show area assignment modal popup
      if (propertyType === "ROW_HOUSE") {
        const blockId = res.data?.block?.id;
        if (blockId) {
          const flatsRes = await API.get(`/flats/list?blockId=${blockId}`);
          const newFlats = flatsRes.data || [];
          setAreaAssignFlats(newFlats);
          setAreaAssignBlockName(createdBlockName);
          const vals = {};
          newFlats.forEach(f => {
            vals[f.id] = (areaStrategy !== "SEPARATE" && initialCommonArea)
              ? initialCommonArea
              : (f.area_sqft != null ? String(f.area_sqft) : "");
          });
          setAreaAssignValues(vals);
          // Set initial mode based on admin choice
          setAreaAssignInitialMode(areaStrategy === "SEPARATE" || areaStrategy === "BOTH" ? "SEPARATE" : "SAME");
        }
      }

      loadBlocks();
    } catch (err) { setError(err.response?.data?.message || t("mpFailedCreateBlock")); }
    finally { setSubmitting(false); }
  };

  const saveAreaAssignments = async () => {
    setSavingAreas(true); setError("");
    try {
      const updates = Object.entries(areaAssignValues)
        .filter(([, v]) => v !== "" && v !== null && !isNaN(Number(v)))
        .map(([id, area_sqft]) => ({ flat_id: Number(id), area_sqft: Number(area_sqft) }));
      if (updates.length === 0) { setAreaAssignFlats(null); return; }
      await API.put("/flats/bulk-update", { flats: updates });
      toast.success(t("mpSavedRowHouses", { n: updates.length }));
      setAreaAssignFlats(null);
      setAreaAssignValues({});
      setRefreshFlatsKey(k => k + 1);
      loadBlocks();
    } catch (err) { setError(err?.response?.data?.message || t("mpFailedSaveAreas")); }
    finally { setSavingAreas(false); }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await API.delete(`/blocks/${id}`);
      setBlocks(p => p.filter(b => b.id !== id));
      setConfirmId(null);
      if (selectedBlock?.id === id) setSelectedBlock(null);
    } catch { setError(t("mpFailedDeleteBlock") || "Failed to delete block"); }
    finally { setDeletingId(null); }
  };

  const filtered = blocks.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.property_type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && !showForm && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--stat-red-color)" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}><MdClose size={15} /></button>
        </div>
      )}

      <GlobalModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setError(""); }}
        title={t("mpCreateNewBlock")}
        subtitle={t("mpCreatePhaseHint")}
        icon={MdAdd}
        size={isMobile ? "md" : "xl"}
        showFooter
        submitLabel={t("mpCreate")}
        cancelLabel={t("cancel")}
        onSubmit={handleCreate}
        submitLoading={submitting}
        submitDisabled={submitting || (propertyType === "APARTMENT" && (!layoutValidation.isValid || floorsLayout.length === 0))}
        submitIcon={MdAdd}
        submitVariant="add"
        submitBorderDraw
        bodyClassName="modal-scroll-thin"
      >
        {error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--stat-red-color)", marginBottom: 14 }}>
            {error}
            <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}><MdClose size={15} /></button>
          </div>
        )}
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  {t("mpPhaseName")}
                </label>
                <input
                  className="input"
                  placeholder={t("mpPhaseNamePh")}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  {t("mpPropertyType")}
                </label>
                <Select
                  className="input"
                  value={propertyType}
                  onChange={e => {
                    setPropertyType(e.target.value);
                    setFloorCount(""); setFlatsPerFloor(""); setTotalHouses(""); setCommonArea("");
                  }}
                  rootStyle={{ width: "100%" }}
                  style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%" }}
                >
                  <option value="APARTMENT">🏢 {t("mpTypeApartmentFull")}</option>
                  <option value="ROW_HOUSE">🏡 {t("mpTypeRowHouseFull")}</option>
                </Select>
              </div>
            </div>

            {propertyType === "ROW_HOUSE" ? (
              <div style={{
                background: "rgba(var(--acct-purple-rgb),0.06)",
                border: "1px solid rgba(var(--acct-purple-rgb),0.25)",
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(var(--acct-purple-rgb),0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                      <MdHomeWork size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                        {t("mpRowHouseConfig")}
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                        {t("mpRowHouseConfigHint")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Houses Input */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    {t("mpTotalHouses")}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    placeholder={t("mpTotalHousesPh")}
                    value={totalHouses}
                    onChange={e => setTotalHouses(e.target.value)}
                    style={{ height: 42, borderRadius: 10, fontSize: 13, background: "var(--card-bg)", width: "100%", boxSizing: "border-box" }}
                    required
                  />
                </div>

                {/* Strategy Selector (3 Choices: Both, Same, Separate) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("mpAreaStrategy")}
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
                    {/* Choice 1: Use Both */}
                    <div
                      onClick={() => setAreaStrategy("BOTH")}
                      style={{
                        background: areaStrategy === "BOTH" ? "rgba(var(--acct-purple-rgb),0.15)" : "var(--card-bg)",
                        border: areaStrategy === "BOTH" ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "all 0.18s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: areaStrategy === "BOTH" ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                          <MdSpeed size={14} /> 🔄 {t("mpUseBoth")}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "var(--accent)", color: "#fff" }}>
                          {t("mpPopular")}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                        {t("mpUseBothHint")}
                      </p>
                    </div>

                    {/* Choice 2: Make All Same */}
                    <div
                      onClick={() => setAreaStrategy("SAME")}
                      style={{
                        background: areaStrategy === "SAME" ? "rgba(var(--acct-purple-rgb),0.15)" : "var(--card-bg)",
                        border: areaStrategy === "SAME" ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "all 0.18s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: areaStrategy === "SAME" ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                          <MdDoneAll size={14} /> ⚡ {t("mpAllSame")}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                        {t("mpAllSameHint")}
                      </p>
                    </div>

                    {/* Choice 3: Separate Filling */}
                    <div
                      onClick={() => setAreaStrategy("SEPARATE")}
                      style={{
                        background: areaStrategy === "SEPARATE" ? "rgba(var(--acct-purple-rgb),0.15)" : "var(--card-bg)",
                        border: areaStrategy === "SEPARATE" ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "all 0.18s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: areaStrategy === "SEPARATE" ? "var(--accent)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                          <MdTune size={14} /> ✍️ {t("mpSeparate")}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                        {t("mpSeparateHint")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strategy Specific Input Panel */}
                {areaStrategy !== "SEPARATE" ? (
                  <div style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {areaStrategy === "BOTH" ? t("mpCommonBaseArea") : t("mpUniformArea")}
                      </label>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {areaStrategy === "BOTH" ? t("mpWillPrefill") : t("mpAppliesEqually")}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", background: "var(--card-inner-bg)", border: "1px solid rgba(var(--acct-purple-rgb),0.3)", borderRadius: 10, padding: "0 12px", height: 42, overflow: "hidden" }}>
                      <MdSquareFoot size={18} style={{ color: "var(--accent)", marginRight: 8, flexShrink: 0 }} />
                      <input
                        className="mp-bare-input"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="1500"
                        value={commonArea}
                        onChange={e => setCommonArea(e.target.value)}
                        style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 13, fontWeight: 700, outline: "none" }}
                      />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>{t("mpSqft")}</span>
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{t("mpQuickPresets")}</span>
                      {[1000, 1200, 1500, 1800, 2000, 2400].map(val => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setCommonArea(String(val))}
                          style={{
                            padding: "3px 9px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            background: commonArea === String(val) ? "var(--accent)" : "var(--card-inner-bg)",
                            color: commonArea === String(val) ? "#fff" : "var(--text-secondary)",
                            border: "1px solid var(--glass-border)",
                            cursor: "pointer"
                          }}
                        >
                          {t("mpValueSqft", { n: val })}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(var(--acct-purple-rgb),0.08)",
                    border: "1px solid rgba(var(--acct-purple-rgb),0.22)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                  }}>
                    <MdTune size={20} color="var(--accent)" />
                    <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                      {t("mpSeparateModeHint")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                      {t("mpFloorCount")}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      placeholder={t("mpFloorCountPh")}
                      value={floorCount}
                      onChange={e => setFloorCount(e.target.value)}
                      style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                      {t("mpUnitsPerFloor")}
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      placeholder={t("mpUnitsPerFloorPh")}
                      value={flatsPerFloor}
                      onChange={e => setFlatsPerFloor(e.target.value)}
                      style={{ height: 42, borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }}
                      required
                    />
                  </div>
                </div>

                {/* ── INTERACTIVE BHK DRAFT PREVIEW & 3-TIER CONFIGURATION ── */}
                {floorsLayout.length > 0 && (
                  <div style={{
                    background: "rgba(var(--acct-purple-rgb, 139,92,246), 0.04)",
                    border: "1px solid rgba(var(--acct-purple-rgb, 139,92,246), 0.2)",
                    borderRadius: 16,
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    marginTop: 4,
                  }}>
                    {/* Section Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa" }}>
                          <MdLayers size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                            BHK Layout & Interactive Draft Preview
                          </span>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                            Configure block defaults, floor distributions, or customize individual units
                          </p>
                        </div>
                      </div>

                      {/* Live Balance / Validity Pill */}
                      {layoutValidation.isValid ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                          background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)"
                        }}>
                          <MdCheckCircle size={13} /> Layout Balanced & Ready
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                          background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)"
                        }}>
                          Incomplete / Imbalanced
                        </span>
                      )}
                    </div>

                    {/* Notice if dimensions decreased */}
                    {dimWarning && (
                      <div style={{
                        padding: "8px 12px", borderRadius: 10,
                        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                        color: "#fbbf24", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6
                      }}>
                        <span>⚠️</span> {dimWarning}
                      </div>
                    )}

                    {/* Level 1: Block-wide Default Controls */}
                    <div style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10
                    }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Level 1: Block-Wide Default
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                          Applies to all eligible floors and flats in {name.trim() || "this block"}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {["1BHK", "2BHK", "3BHK"].map(bhk => {
                          const isSelected = blockDefaultBhk === bhk;
                          return (
                            <button
                              key={bhk}
                              type="button"
                              onClick={() => handleBlockDefaultChange(bhk)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.16s ease",
                                background: isSelected ? "var(--accent)" : "var(--card-inner-bg)",
                                color: isSelected ? "#fff" : "var(--text-primary)",
                                border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}`,
                                boxShadow: isSelected ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
                              }}
                            >
                              {bhk}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Overall Stats Summary Bar */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                      gap: 8,
                    }}>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Total Flats</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{overallBhkSummary.total}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" }}>
                        <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, textTransform: "uppercase" }}>1BHK Total</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#818cf8", marginTop: 2 }}>{overallBhkSummary["1BHK"]}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", textAlign: "center" }}>
                        <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>2BHK Total</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#a78bfa", marginTop: 2 }}>{overallBhkSummary["2BHK"]}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", textAlign: "center" }}>
                        <span style={{ fontSize: 10, color: "#f472b6", fontWeight: 700, textTransform: "uppercase" }}>3BHK Total</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#f472b6", marginTop: 2 }}>{overallBhkSummary["3BHK"]}</div>
                      </div>
                    </div>

                    {/* Floor Navigation Pills / Tabs */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Level 2 & 3: Floor & Flat Configuration
                        </label>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          Select a floor to customize its distribution and individual units
                        </span>
                      </div>

                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        overflowX: "auto",
                        paddingBottom: 4,
                        scrollbarWidth: "thin",
                      }}>
                        {floorsLayout.map((flr, idx) => {
                          const isActive = idx === activeFloorIndex;
                          const fp = parseInt(flatsPerFloor, 10) || 0;
                          const sum = (flr.mixedCounts?.["1BHK"] || 0) + (flr.mixedCounts?.["2BHK"] || 0) + (flr.mixedCounts?.["3BHK"] || 0);
                          const hasFloorDiscrepancy = flr.mode === "MIXED" && sum !== fp;

                          return (
                            <button
                              key={flr.floor_number}
                              type="button"
                              onClick={() => setActiveFloorIndex(idx)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                transition: "all 0.16s ease",
                                background: isActive ? "rgba(var(--acct-purple-rgb, 139,92,246), 0.18)" : "var(--card-inner-bg)",
                                border: `1.5px solid ${isActive ? "var(--accent)" : hasFloorDiscrepancy ? "#ef4444" : "var(--glass-border)"}`,
                                color: isActive ? "var(--accent)" : hasFloorDiscrepancy ? "#ef4444" : "var(--text-primary)",
                              }}
                            >
                              <span>Floor {flr.floor_number}</span>
                              {hasFloorDiscrepancy ? (
                                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                                  !
                                </span>
                              ) : flr.mode === "MIXED" ? (
                                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                                  Mixed
                                </span>
                              ) : (
                                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                                  {flr.floorDefaultBhk}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Floor Detail Card */}
                    {floorsLayout[activeFloorIndex] && (() => {
                      const currentFloor = floorsLayout[activeFloorIndex];
                      const fp = parseInt(flatsPerFloor, 10) || 0;
                      const sum = (currentFloor.mixedCounts?.["1BHK"] || 0) + (currentFloor.mixedCounts?.["2BHK"] || 0) + (currentFloor.mixedCounts?.["3BHK"] || 0);
                      const isFloorBalanced = currentFloor.mode === "DEFAULT" || sum === fp;

                      return (
                        <div style={{
                          background: "var(--card-bg)",
                          border: `1.5px solid ${isFloorBalanced ? "var(--glass-border)" : "rgba(239,68,68,0.4)"}`,
                          borderRadius: 14,
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 14,
                        }}>
                          {/* Floor Header & Mode Switch */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                                  Floor {currentFloor.floor_number} Controls
                                </span>
                                <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--card-inner-bg)", padding: "2px 8px", borderRadius: 6 }}>
                                  {currentFloor.flats.length} Flats
                                </span>
                              </div>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                                {currentFloor.mode === "DEFAULT"
                                  ? "All non-overridden units on this floor inherit the floor default"
                                  : "Mixed distribution: specify counts of 1BHK, 2BHK, and 3BHK"}
                              </p>
                            </div>

                            {/* Mode Switch (Uniform vs Mixed) */}
                            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--card-inner-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--glass-border)" }}>
                              <button
                                type="button"
                                onClick={() => handleFloorModeChange(activeFloorIndex, "DEFAULT")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "none",
                                  background: currentFloor.mode === "DEFAULT" ? "var(--accent)" : "transparent",
                                  color: currentFloor.mode === "DEFAULT" ? "#fff" : "var(--text-secondary)",
                                }}
                              >
                                Uniform
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFloorModeChange(activeFloorIndex, "MIXED")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "none",
                                  background: currentFloor.mode === "MIXED" ? "var(--accent)" : "transparent",
                                  color: currentFloor.mode === "MIXED" ? "#fff" : "var(--text-secondary)",
                                }}
                              >
                                Mixed
                              </button>
                            </div>
                          </div>

                          {/* Mode Configuration Body */}
                          {currentFloor.mode === "DEFAULT" ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "10px 12px", background: "var(--card-inner-bg)", borderRadius: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                                Floor {currentFloor.floor_number} Default BHK:
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {["1BHK", "2BHK", "3BHK"].map(bhk => (
                                  <button
                                    key={bhk}
                                    type="button"
                                    onClick={() => handleFloorDefaultChange(activeFloorIndex, bhk)}
                                    style={{
                                      padding: "5px 12px",
                                      borderRadius: 6,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      border: `1.5px solid ${currentFloor.floorDefaultBhk === bhk ? "var(--accent)" : "var(--glass-border)"}`,
                                      background: currentFloor.floorDefaultBhk === bhk ? "rgba(139,92,246,0.18)" : "var(--card-bg)",
                                      color: currentFloor.floorDefaultBhk === bhk ? "var(--accent)" : "var(--text-primary)",
                                    }}
                                  >
                                    {bhk}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", background: "var(--card-inner-bg)", borderRadius: 10, border: isFloorBalanced ? "1px solid var(--glass-border)" : "1px solid rgba(239,68,68,0.3)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                  Distribution Steppers (Sum must equal {fp})
                                </span>
                                <span style={{
                                  fontSize: 11, fontWeight: 700,
                                  color: isFloorBalanced ? "#4ade80" : "#f87171",
                                  display: "flex", alignItems: "center", gap: 4
                                }}>
                                  {isFloorBalanced ? <MdCheckCircle size={13} /> : "⚠️"} Sum: {sum} / {fp}
                                </span>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
                                {["1BHK", "2BHK", "3BHK"].map(bhk => {
                                  const cnt = currentFloor.mixedCounts?.[bhk] || 0;
                                  return (
                                    <div key={bhk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--glass-border)" }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{bhk}</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <button
                                          type="button"
                                          onClick={() => handleMixedCountChange(activeFloorIndex, bhk, -1)}
                                          disabled={cnt <= 0}
                                          style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", fontWeight: 800, cursor: cnt <= 0 ? "not-allowed" : "pointer", opacity: cnt <= 0 ? 0.4 : 1 }}
                                        >
                                          -
                                        </button>
                                        <span style={{ fontSize: 13, fontWeight: 800, minWidth: 20, textAlign: "center", color: "var(--text-primary)" }}>{cnt}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleMixedCountChange(activeFloorIndex, bhk, 1)}
                                          disabled={sum >= fp}
                                          style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", fontWeight: 800, cursor: sum >= fp ? "not-allowed" : "pointer", opacity: sum >= fp ? 0.4 : 1 }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Level 3: Individual Units Grid */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Individual Units on Floor {currentFloor.floor_number}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                Click BHK on any unit card to override individually
                              </span>
                            </div>

                            <div style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(130px, 1fr))",
                              gap: 8,
                              maxHeight: 220,
                              overflowY: "auto",
                              paddingRight: 4,
                            }}>
                              {currentFloor.flats.map((fl, uIdx) => {
                                const isOverridden = !!fl.isOverridden;
                                const bhkStyle = fl.flat_type === "1BHK"
                                  ? { bg: "rgba(99,102,241,0.12)", color: "#818cf8", border: "rgba(99,102,241,0.25)" }
                                  : fl.flat_type === "2BHK"
                                  ? { bg: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "rgba(139,92,246,0.25)" }
                                  : { bg: "rgba(236,72,153,0.12)", color: "#f472b6", border: "rgba(236,72,153,0.25)" };

                                return (
                                  <div
                                    key={fl.flat_number}
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: 10,
                                      background: "var(--card-inner-bg)",
                                      border: `1px solid ${isOverridden ? "rgba(139,92,246,0.4)" : "var(--glass-border)"}`,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 6,
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                                        {fl.flat_number}
                                      </span>
                                      {isOverridden && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevertFlatOverride(activeFloorIndex, uIdx)}
                                          title="Revert override to floor default"
                                          style={{
                                            border: "none",
                                            background: "rgba(139,92,246,0.15)",
                                            color: "#a78bfa",
                                            borderRadius: 4,
                                            padding: "1px 5px",
                                            fontSize: 10,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                          }}
                                        >
                                          ↺ Reset
                                        </button>
                                      )}
                                    </div>

                                    {/* BHK Selector Pills */}
                                    <div style={{ display: "flex", gap: 3 }}>
                                      {["1BHK", "2BHK", "3BHK"].map(bhkOpt => {
                                        const isMatch = fl.flat_type === bhkOpt;
                                        return (
                                          <button
                                            key={bhkOpt}
                                            type="button"
                                            onClick={() => handleFlatBhkChange(activeFloorIndex, uIdx, bhkOpt)}
                                            style={{
                                              flex: 1,
                                              padding: "3px 0",
                                              borderRadius: 5,
                                              fontSize: 10,
                                              fontWeight: 700,
                                              cursor: "pointer",
                                              border: isMatch ? `1px solid ${bhkStyle.border}` : "1px solid var(--glass-border)",
                                              background: isMatch ? bhkStyle.bg : "var(--card-bg)",
                                              color: isMatch ? bhkStyle.color : "var(--text-secondary)",
                                              transition: "all 0.12s ease",
                                            }}
                                          >
                                            {bhkOpt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </form>
      </GlobalModal>

      {/* Area assignment modal popup for row houses */}
      {areaAssignFlats && (
        <AreaAssignModal
          flats={areaAssignFlats}
          values={areaAssignValues}
          setValues={setAreaAssignValues}
          onSave={saveAreaAssignments}
          onSkip={() => setAreaAssignFlats(null)}
          saving={savingAreas}
          isMobile={isMobile}
          initialMode={areaAssignInitialMode}
          blockName={areaAssignBlockName}
        />
      )}

      {/* blocks list */}
      <div className="data-table-wrap">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdOutlineInbox size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>
              {search ? t("mpNoBlocksMatch") || "No properties match" : t("mpNoBlocksYet") || "No properties added"}
            </p>
          </div>
        ) : isMobile ? (
          /* mobile block cards */
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {filtered.map(b => {
              const isRowHouse = b.property_type === "ROW_HOUSE";
              const blockId = safeNum(b.id);
              return (
                <div key={b.id} className="inner-card animate-fadeIn" style={{ borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ height: 3, background: isRowHouse ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#4C76C9,#5A3BA2)" }} />
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isRowHouse ? "rgba(16,185,129,0.12)" : "rgba(107,70,193,0.12)", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(107,70,193,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: isRowHouse ? "#10b981" : "#9F87D7", flexShrink: 0 }}>
                          {isRowHouse ? <MdHomeWork size={18} /> : <MdGridView size={18} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</p>
                          <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 6px", borderRadius: "4px", background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(91,141,239,0.1)", color: isRowHouse ? "#10b981" : "#5B8DEF", display: "inline-block", marginTop: 4 }}>
                            {propertyTypeLabel(b.property_type, t)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedBlock(selectedBlock?.id === b.id ? null : b)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(91,141,239,0.10)", border: "1px solid rgba(91,141,239,0.22)", color: "#94B5F5", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                      >
                        {isRowHouse ? t("mpHouses") : t("mpFloors")} <MdArrowForwardIos size={10} style={{ transform: selectedBlock?.id === b.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                    </div>

                    {selectedBlock?.id === b.id && !isNaN(blockId) && (
                      isRowHouse
                        ? <InlineFlats blockId={blockId} isMobile={true} t={t} onOpenAreaModal={openAreaModalForFlats} blockName={b.name} refreshKey={refreshFlatsKey} canEdit={canEdit} />
                        : <InlineFloors blockId={blockId} isMobile={true} t={t} canEdit={canEdit} />
                    )}

                    {canEdit && (
                      <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 8, display: "flex", justifyContent: "flex-end" }}>
                        {confirmId === b.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpDeleteBlock") || "Delete?"}</span>
                            <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                              {deletingId === b.id ? <Spinner size={12} /> : t("mpYes") || "Yes"}
                            </button>
                            <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmId(b.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "1px solid var(--stat-red-border)", cursor: "pointer" }}>
                            <MdDelete size={14} /> {t("mpDelete") || "Delete"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* desktop block table */
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>{t("srNo")}</th>
                  <th>{t("mpBlockName")}</th>
                  <th>{t("mpType")}</th>
                  <th style={{ textAlign: "right" }}>{t("mpActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => {
                  const isRowHouse = b.property_type === "ROW_HOUSE";
                  const blockId = safeNum(b.id);
                  return (
                    <React.Fragment key={b.id}>
                      <tr>
                        <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: isRowHouse ? "rgba(16,185,129,0.12)" : "rgba(107,70,193,0.12)", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(107,70,193,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: isRowHouse ? "#10b981" : "#9F87D7", flexShrink: 0 }}>
                              {isRowHouse ? <MdHomeWork size={15} /> : <MdGridView size={15} />}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{b.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: "600", padding: "4px 8px", borderRadius: "6px", background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(91,141,239,0.1)", color: isRowHouse ? "#10b981" : "#5B8DEF" }}>
                            {propertyTypeLabel(b.property_type, t)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                            <button
                              onClick={() => setSelectedBlock(selectedBlock?.id === b.id ? null : b)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(107,70,193,0.12)", color: "var(--accent)", border: "1px solid rgba(107,70,193,0.25)", cursor: "pointer" }}
                            >
                              {isRowHouse ? <MdHomeWork size={13} /> : <MdLayers size={13} />}
                              {selectedBlock?.id === b.id ? t("mpHide") : (isRowHouse ? t("mpHouses") : t("mpFloors"))}
                            </button>
                            {canEdit && (
                              <>
                                {confirmId === b.id ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpSure") || "Sure?"}</span>
                                    <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                                      {deletingId === b.id ? <Spinner size={12} /> : t("mpYes") || "Yes"}
                                    </button>
                                    <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setConfirmId(b.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "1px solid var(--stat-red-border)", cursor: "pointer" }}>
                                    <MdDelete size={13} /> {t("mpDelete") || "Delete"}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {selectedBlock?.id === b.id && !isNaN(blockId) && (
                        <tr key={`expand-${b.id}`}>
                          <td colSpan={4} style={{ padding: "0 0 16px 48px", background: "rgba(255,255,255,0.015)" }}>
                            {isRowHouse
                              ? <InlineFlats blockId={blockId} isMobile={false} t={t} onOpenAreaModal={openAreaModalForFlats} blockName={b.name} refreshKey={refreshFlatsKey} canEdit={canEdit} />
                              : <InlineFloors blockId={blockId} isMobile={false} t={t} canEdit={canEdit} />
                            }
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer">
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("mpPhasesOf", { n: filtered.length, total: blocks.length })}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Inline Floors sub-panel (For Apartments / Commercial) ── */
function InlineFloors({ blockId, isMobile, t, canEdit = true }) {
  const [floors,          setFloors]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  const safeBlockId = safeNum(blockId);

  useEffect(() => {
    if (isNaN(safeBlockId) || safeBlockId <= 0) {
      setError(t("mpInvalidBlockId"));
      setLoading(false);
      return;
    }
    API.get(`/floors/${safeBlockId}`)
      .then(r => setFloors(r.data || []))
      .catch(err => {
        console.error("InlineFloors fetch error:", err?.response?.status, err?.response?.data);
        setError(err?.response?.data?.message || t("mpFailedLoadFloors"));
      })
      .finally(() => setLoading(false));
  }, [safeBlockId]);

  if (loading) return <div style={{ padding: "14px 0" }}><Spinner size={15} /></div>;
  if (error)   return <p style={{ fontSize: 12, color: "var(--stat-red-color)", padding: "10px 0" }}>{error}</p>;
  if (!floors.length) return <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "10px 0" }}>{t("mpNoFloorsFound")}</p>;

  return (
    <div style={{ marginTop: 10, padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{t("mpFloorsInBlock")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {floors.map(floor => {
          const floorId    = safeNum(floor.id);
          const isSelected = selectedFloorId === floor.id;
          return (
            <div key={floor.id ?? floor.floor_number}>
              <div
                onClick={() => setSelectedFloorId(isSelected ? null : floor.id)}
                style={{ padding: "8px 14px", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  <MdLayers size={14} style={{ display: "inline", marginRight: 6, color: "var(--accent)" }} />
                  {t("mpFloorN", { n: floor.floor_number })}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  {isSelected ? t("mpHideUnits") : t("mpViewUnits")}
                  <MdArrowForwardIos size={10} style={{ transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </span>
              </div>
              {/* ✅ Only render InlineFlats when BOTH blockId and floorId are valid numbers */}
              {isSelected && !isNaN(safeBlockId) && safeBlockId > 0 && !isNaN(floorId) && floorId > 0 && (
                <InlineFlats blockId={safeBlockId} floorId={floorId} isMobile={isMobile} t={t} canEdit={canEdit} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Inline flats sub-panel (Universal: floors + row houses) ── */
function InlineFlats({ floorId, blockId, isMobile, t, onOpenAreaModal, blockName = "", refreshKey = 0, canEdit = true }) {
  const [flats,      setFlats]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [confirmId,  setConfirmId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error,      setError]      = useState("");
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaValue, setAreaValue] = useState("");
  const [savingArea, setSavingArea] = useState(false);
  const [showBatchArea, setShowBatchArea] = useState(false);
  const [batchAreaVal, setBatchAreaVal] = useState("");
  const [savingBatchArea, setSavingBatchArea] = useState(false);

  useEffect(() => {
    const safeBlockId = safeNum(blockId);
    const safeFloorId = safeNum(floorId);

    // ✅ Hard stop — never fire the API call with an invalid blockId
    if (isNaN(safeBlockId) || safeBlockId <= 0) {
      setError(t("mpInvalidBlockId"));
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("blockId", safeBlockId);

    // Only attach floorId when it is a valid positive number
    if (!isNaN(safeFloorId) && safeFloorId > 0) {
      params.set("floorId", safeFloorId);
    }

    API.get(`/flats/list?${params.toString()}`)
      .then(r => setFlats(r.data || []))
      .catch((err) => {
        console.error("InlineFlats fetch error:", err?.response?.status, err?.response?.data);
        setError(err?.response?.data?.message || t("mpFailedLoadFlats") || "Failed to load units");
      })
      .finally(() => setLoading(false));
  }, [floorId, blockId, refreshKey]);

  const deleteFlat = async (id) => {
    setDeletingId(id);
    try {
      await API.delete(`/flats/delete/${id}`);
      setFlats(p => p.filter(f => f.id !== id));
      setConfirmId(null);
    } catch (err) { setError(err?.response?.data?.message || t("mpDeleteFailed") || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const isRowHouseContext = !floorId;

  const saveArea = async (flatId) => {
    setSavingArea(true);
    try {
      const numVal = areaValue !== "" ? Number(areaValue) : null;
      if (numVal !== null && (isNaN(numVal) || numVal < 0)) {
        setError(t("mpAreaNonNegative"));
        return;
      }
      await API.put(`/flats/update/${flatId}`, { area_sqft: numVal });
      setFlats(p => p.map(f => f.id === flatId ? { ...f, area_sqft: numVal } : f));
      setEditingAreaId(null);
      setAreaValue("");
    } catch (err) {
      setError(err?.response?.data?.message || t("mpFailedUpdateArea"));
    } finally {
      setSavingArea(false);
    }
  };

  const saveBatchArea = async () => {
    const num = Number(batchAreaVal);
    if (!batchAreaVal || isNaN(num) || num < 0) {
      toast.error(t("mpValidPositiveArea"));
      return;
    }
    setSavingBatchArea(true);
    try {
      const updates = flats.map(f => ({ flat_id: f.id, area_sqft: num }));
      await API.put("/flats/bulk-update", { flats: updates });
      setFlats(p => p.map(f => ({ ...f, area_sqft: num })));
      setShowBatchArea(false);
      setBatchAreaVal("");
      toast.success(t("mpSetAllHouses", { area: num, n: flats.length }));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("mpFailedUpdateAreas"));
    } finally {
      setSavingBatchArea(false);
    }
  };

  if (loading) return <div style={{ padding: "14px 0", marginLeft: isRowHouseContext ? 0 : 10 }}><Spinner size={15} /></div>;
  if (error)   return <p style={{ fontSize: 12, color: "var(--stat-red-color)", padding: "10px 0", marginLeft: isRowHouseContext ? 0 : 10 }}>{error}</p>;
  if (!flats.length) return <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "10px 0", marginLeft: isRowHouseContext ? 0 : 10 }}>{t("mpNoUnitsFound")}</p>;

  return (
    <div style={{
      marginTop: 8,
      marginLeft: (isMobile || isRowHouseContext) ? 0 : 20,
      background: isRowHouseContext ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
      border: isRowHouseContext ? "1px solid var(--glass-border)" : "1px dashed var(--glass-border)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{ padding: "8px 14px", borderBottom: isRowHouseContext ? "1px solid var(--glass-border)" : "1px dashed var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {isRowHouseContext
            ? <MdHomeWork size={13} style={{ color: "#10b981" }} />
            : <MdApartment size={13} style={{ color: "var(--stat-blue-color,#B9CFF8)" }} />
          }
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            {isRowHouseContext ? t("mpHouseCount", { n: flats.length }) : t("mpUnitCount", { n: flats.length })}
          </span>
        </div>

        {canEdit && isRowHouseContext && flats.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {onOpenAreaModal && (
              <button
                type="button"
                onClick={() => onOpenAreaModal(flats, blockName)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.14)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  color: "#10b981",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                title={t("mpManageAreasTitle")}
              >
                <MdTune size={14} />
                {t("mpManageAreas")}
              </button>
            )}

            {showBatchArea ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  className="mp-compact-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("mpAreaSqftPh")}
                  value={batchAreaVal}
                  onChange={e => setBatchAreaVal(e.target.value)}
                  style={{ width: 85, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 11 }}
                  onKeyDown={e => { if (e.key === "Enter") saveBatchArea(); if (e.key === "Escape") setShowBatchArea(false); }}
                  autoFocus
                />
                <button
                  onClick={saveBatchArea}
                  disabled={savingBatchArea}
                  style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#10b981", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                >
                  {savingBatchArea ? "..." : t("mpSetAll")}
                </button>
                <button
                  onClick={() => setShowBatchArea(false)}
                  style={{ padding: "2px 5px", borderRadius: 6, fontSize: 11, background: "none", color: "var(--text-secondary)", border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBatchArea(true)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                title={t("mpQuickSetAllTitle")}
              >
                <MdDoneAll size={13} />
                {t("mpQuickSetAll")}
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? (isRowHouseContext ? "1fr" : "1fr 1fr") : "repeat(auto-fill, minmax(160px,1fr))", gap: 8, padding: 10 }}>
        {flats.map(f => {
          const occupied = !!f.resident_id;
          return (
            <div key={f.id} style={{ background: "var(--card-bg)", border: `1px solid ${occupied ? "rgba(34,197,94,0.22)" : "var(--glass-border)"}`, borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {isRowHouseContext
                    ? <MdHomeWork size={13} style={{ color: occupied ? "var(--stat-green-color,#86efac)" : "var(--text-secondary)" }} />
                    : <MdApartment size={13} style={{ color: occupied ? "var(--stat-green-color,#86efac)" : "var(--text-secondary)" }} />
                  }
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{f.flat_number}</span>
                  {f.flat_type && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6,
                      background: f.flat_type === "1BHK" ? "rgba(99,102,241,0.12)" : f.flat_type === "2BHK" ? "rgba(139,92,246,0.12)" : "rgba(236,72,153,0.12)",
                      color: f.flat_type === "1BHK" ? "#818cf8" : f.flat_type === "2BHK" ? "#a78bfa" : "#f472b6",
                      border: `1px solid ${f.flat_type === "1BHK" ? "rgba(99,102,241,0.25)" : f.flat_type === "2BHK" ? "rgba(139,92,246,0.25)" : "rgba(236,72,153,0.25)"}`
                    }}>
                      {f.flat_type}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: occupied ? "rgba(34,197,94,0.12)" : "rgba(114,105,136,0.10)", color: occupied ? "var(--stat-green-color,#86efac)" : "var(--text-secondary)", border: `1px solid ${occupied ? "rgba(34,197,94,0.22)" : "rgba(114,105,136,0.15)"}` }}>
                    {occupied ? t("mpOcc") || "Occ" : t("mpVac") || "Vac"}
                  </span>
                </div>
                {confirmId === f.id && canEdit ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => deleteFlat(f.id)} disabled={deletingId === f.id} style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                      {deletingId === f.id ? <Spinner size={10} /> : t("mpYes") || "Yes"}
                    </button>
                    <button onClick={() => setConfirmId(null)} style={{ padding: "2px 6px", borderRadius: 5, fontSize: 10, background: "var(--card-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>✕</button>
                  </div>
                ) : canEdit && (
                  <button onClick={() => setConfirmId(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--stat-red-color,#fca5a5)", display: "flex", padding: 2 }}><MdDelete size={14} /></button>
                )}
              </div>
              {isRowHouseContext && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid var(--glass-border)", paddingTop: 6 }}>
                  {editingAreaId === f.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                      <input
                        className="mp-compact-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={areaValue}
                        onChange={e => setAreaValue(e.target.value)}
                        placeholder={t("mpAreaPh")}
                        autoFocus
                        style={{ flex: 1, minWidth: 0, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--glass-border)", background: "var(--card-inner-bg)", color: "var(--text-primary)", fontSize: 11 }}
                        onKeyDown={e => { if (e.key === "Enter") saveArea(f.id); if (e.key === "Escape") setEditingAreaId(null); }}
                      />
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{t("mpSqft")}</span>
                      <button onClick={() => saveArea(f.id)} disabled={savingArea} style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#10b981", color: "#fff", border: "none", cursor: "pointer" }}>
                        {savingArea ? "..." : t("mpSave")}
                      </button>
                      <button onClick={() => setEditingAreaId(null)} style={{ padding: "1px 4px", borderRadius: 4, fontSize: 10, background: "none", color: "var(--text-secondary)", border: "none", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                        {f.area_sqft ? <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{f.area_sqft}</span> : <span style={{ opacity: 0.5 }}>{t("mpNoArea")}</span>} {t("mpSqft")}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => { setEditingAreaId(f.id); setAreaValue(f.area_sqft || ""); }}
                          style={{ marginLeft: "auto", padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: "rgba(91,141,239,0.10)", border: "1px solid rgba(91,141,239,0.22)", color: "#94B5F5", cursor: "pointer" }}
                        >
                          {t("mpEdit")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
  TAB 2 — ALL FLATS
══════════════════════════════════════════════ */
function FlatsTab({
  isMobile,
  t,
  canEdit = true,
  search: externalSearch,
  setSearch: setExternalSearch,
  societyId,
}) {
  const [flats,        setFlats]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [localSearch,  setLocalSearch]  = useState("");
  const search = externalSearch !== undefined ? externalSearch : localSearch;
  const setSearch = setExternalSearch !== undefined ? setExternalSearch : setLocalSearch;

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [confirmId,    setConfirmId]    = useState(null);
  const [deletingId,   setDeletingId]   = useState(null);
  const [error,        setError]        = useState("");
  const [page,         setPage]         = useState(1);
  const [limit,        setLimit]        = useState(10);

  const activeSocId = societyId || getSocietyId();

  useEffect(() => {
    if (activeSocId) {
      loadFlats();
    } else {
      setFlats([]);
      setLoading(false);
    }
  }, [activeSocId]);

  const loadFlats = async () => {
    setLoading(true); setError("");
    try {
      const headers = activeSocId ? { "x-society-id": activeSocId } : {};
      const params = activeSocId ? { society_id: activeSocId } : {};
      const res = await API.get("/flats/getall", { headers, params });
      setFlats(res.data || []);
    } catch { setError(t("mpFailedLoadFlats") || "Failed to load flats"); }
    finally { setLoading(false); }
  };

  const deleteFlat = async (id) => {
    setDeletingId(id); setError("");
    try {
      await API.delete(`/flats/delete/${id}`);
      setFlats(p => p.filter(f => f.id !== id));
      setConfirmId(null);
    } catch (err) { setError(err?.response?.data?.message || t("mpDeleteFailed") || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const counts = {
    ALL:      flats.length,
    OCCUPIED: flats.filter(f => !!f.resident_id).length,
    VACANT:   flats.filter(f => !f.resident_id).length,
  };

  const filtered = flats.filter(f => {
    const q = search.toLowerCase();
    const blockName = f.Block?.name || f.Floor?.Block?.name || "";
    const ms = f.flat_number?.toLowerCase().includes(q) || blockName.toLowerCase().includes(q);
    const mf = filterStatus === "ALL" ? true : filterStatus === "OCCUPIED" ? !!f.resident_id : !f.resident_id;
    return ms && mf;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageItems = filtered.slice((page - 1) * limit, page * limit);
  const rangeStart = filtered.length ? (page - 1) * limit + 1 : 0;
  const rangeEnd = Math.min(page * limit, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const FILTER_TABS = [
    { id: "ALL",      label: t("mpAll") || "All",           badge: counts.ALL },
    { id: "OCCUPIED", label: t("mpOccupied") || "Occupied", badge: counts.OCCUPIED },
    { id: "VACANT",   label: t("mpVacant") || "Vacant",     badge: counts.VACANT },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: isMobile ? 8 : 12 }}>
          {[
            { label: t("mpTotal") || "Total Units",       val: counts.ALL,      tone: "brand",   icon: MdApartment,     subtext: "Total registered properties" },
            { label: t("mpOccupied") || "Occupied Units",  val: counts.OCCUPIED, tone: "success", icon: MdCheckCircle,   subtext: `${counts.ALL ? Math.round((counts.OCCUPIED / counts.ALL) * 100) : 0}% occupancy rate` },
            { label: t("mpVacant") || "Vacant Units",      val: counts.VACANT,   tone: "info",    icon: MdHomeWork,      subtext: `${counts.VACANT} units ready for move-in` },
          ].map(s => (
            <StatCard key={s.label} tone={s.tone} value={s.val} label={s.label} icon={s.icon} subtext={s.subtext} />
          ))}
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--stat-red-color)" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}><MdClose size={15} /></button>
        </div>
      )}

      <div className="data-table-wrap">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <SlidingTabs
            fullWidth
            value={filterStatus}
            onChange={setFilterStatus}
            items={FILTER_TABS}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdOutlineInbox size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>
              {search || filterStatus !== "ALL" ? (t("mpNoFlatsMatchFilter") || "No properties match") : (t("mpNoFlatsFound") || "No properties found")}
            </p>
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 12 }}>
            {pageItems.map((f, idx) => {
              const occ = !!f.resident_id;
              const isRowHouse = !f.Floor && f.Block;
              const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "—");
              return (
                <div key={f.id} className="inner-card animate-fadeIn" style={{ animationDelay: `${idx * 25}ms`, borderRadius: 13, overflow: "hidden" }}>
                  <div style={{ height: 3, background: occ ? "#22c55e" : "#3B82F6" }} />
                  <div style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: occ ? "var(--stat-green-bg)" : "var(--stat-amber-bg)", border: `1px solid ${occ ? "var(--stat-green-border)" : "var(--stat-amber-border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isRowHouse
                        ? <MdHomeWork size={17} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                        : <MdApartment size={17} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{f.flat_number}</p>
                        {f.flat_type && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6,
                            background: f.flat_type === "1BHK" ? "rgba(99,102,241,0.12)" : f.flat_type === "2BHK" ? "rgba(139,92,246,0.12)" : "rgba(236,72,153,0.12)",
                            color: f.flat_type === "1BHK" ? "#818cf8" : f.flat_type === "2BHK" ? "#a78bfa" : "#f472b6",
                            border: `1px solid ${f.flat_type === "1BHK" ? "rgba(99,102,241,0.25)" : f.flat_type === "2BHK" ? "rgba(139,92,246,0.25)" : "rgba(236,72,153,0.25)"}`
                          }}>
                            {f.flat_type}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0" }}>
                        {f.Floor ? t("mpFlBlkLine", { n: f.Floor.floor_number, name: blockName }) : t("mpBlkLine", { name: blockName })} · {occ ? t("mpOccupied") : t("mpVacant")}
                      </p>
                    </div>
                    {canEdit && (confirmId === f.id ? (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => deleteFlat(f.id)} disabled={deletingId === f.id} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                          {deletingId === f.id ? <Spinner size={11} /> : (t("mpYes") || "Yes")}
                        </button>
                        <button onClick={() => setConfirmId(null)} style={{ padding: "4px 7px", borderRadius: 6, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(f.id)} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", color: "var(--stat-red-color)", cursor: "pointer" }}><MdDelete size={14} /></button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <table className="data-table mp-property-list-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 64 }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "18%" }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>{t("srNo")}</th>
                  <th>{t("mpUnit")}</th>
                  <th>{t("mpLocation")}</th>
                  <th>{t("mpStatus")}</th>
                  <th style={{ textAlign: "right" }}>{t("mpAction")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((f, idx) => {
                  const occ = !!f.resident_id;
                  const isRowHouse = !f.Floor && f.Block;
                  const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "—");
                  return (
                    <tr key={f.id}>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{(page - 1) * limit + idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: occ ? "var(--stat-green-bg)" : "var(--stat-amber-bg)", border: `1px solid ${occ ? "var(--stat-green-border)" : "var(--stat-amber-border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isRowHouse
                              ? <MdHomeWork size={15} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                              : <MdApartment size={15} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                            }
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{f.flat_number}</span>
                          {f.flat_type && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                              background: f.flat_type === "1BHK" ? "rgba(99,102,241,0.12)" : f.flat_type === "2BHK" ? "rgba(139,92,246,0.12)" : "rgba(236,72,153,0.12)",
                              color: f.flat_type === "1BHK" ? "#818cf8" : f.flat_type === "2BHK" ? "#a78bfa" : "#f472b6",
                              border: `1px solid ${f.flat_type === "1BHK" ? "rgba(99,102,241,0.25)" : f.flat_type === "2BHK" ? "rgba(139,92,246,0.25)" : "rgba(236,72,153,0.25)"}`
                            }}>
                              {f.flat_type}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t("mpBlockNameLine", { name: blockName })}</span>
                          {!isRowHouse && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpFloorLine", { n: f.Floor?.floor_number })}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={occ ? "status-pill status-pill--resolved" : "status-pill status-pill--pending"}>
                          {occ ? <MdCheckCircle size={11} /> : <MdLock size={11} />}
                          {occ ? (t("mpOccupied") || "Occupied") : (t("mpVacant") || "Vacant")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {canEdit && (confirmId === f.id ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpSure") || "Sure?"}</span>
                            <button onClick={() => deleteFlat(f.id)} disabled={deletingId === f.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                              {deletingId === f.id ? <Spinner size={12} /> : (t("mpYes") || "Yes")}
                            </button>
                            <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmId(f.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "1px solid var(--stat-red-border)", cursor: "pointer" }}>
                            <MdDelete size={13} /> {t("mpDelete") || "Delete"}
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-footer" style={{ flexDirection: "column", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("mpShowing") || "Showing"} {rangeStart}–{rangeEnd} {t("mpOf") || "of"} {filtered.length}
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={limit}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
  TAB 3 — ASSIGN FLATS
══════════════════════════════════════════════ */


function AssignTab({
  isMobile,
  t,
  canEdit = true,
  search: externalSearch,
  setSearch: setExternalSearch,
}) {
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flats,      setFlats]      = useState([]);
  const [residents,  setResidents]  = useState([]);
  const [flatSearch, setFlatSearch] = useState("");
  const [flatId,     setFlatId]     = useState("");
  const [residentId, setResidentId] = useState("");

  const [assigned,   setAssigned]   = useState([]);
  const [totalAll,   setTotalAll]   = useState(0);
  const [initLoad,   setInitLoad]   = useState(true);
  const [fetching,   setFetching]   = useState(false);
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [localSearch, setLocalSearch] = useState("");
  const search = externalSearch !== undefined ? externalSearch : localSearch;
  const setSearch = setExternalSearch !== undefined ? setExternalSearch : setLocalSearch;
  const dSearch                     = useDebounce(search, 450);
  const [confirmId,  setConfirmId]  = useState(null);

  const loadDropdowns = async () => {
    try {
      const [uf, ur] = await Promise.all([
        API.get("/flats/unassigned"),
        API.get("/users/resident/unassigned"),
      ]);
      setFlats(uf.data || []);
      setResidents(ur.data || []);
    } catch {}
  };

  const loadAssigned = useCallback(async (pg, q, init = false) => {
    if (init) setInitLoad(true); else setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: limitRef.current, ...(q ? { search: q } : {}) });
      const res = await API.get(`/flats/assigned?${params}`);
      setAssigned(res.data.data || []);
      setTotalAll(res.data.totalAll ?? res.data.pagination.totalItems);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pg);
    } catch {}
    finally { setInitLoad(false); setFetching(false); }
  }, []);

  useEffect(() => { loadDropdowns(); loadAssigned(1, "", true); }, []);
  useEffect(() => { if (!initLoad) loadAssigned(1, dSearch); }, [dSearch]);

  const handleAssign = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await API.put(`/flats/assign/${flatId}`, { resident_id: residentId });
      setFlatId(""); setResidentId(""); setFlatSearch(""); setShowForm(false);
      loadDropdowns(); loadAssigned(1, dSearch);
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleUnassign = async (id) => {
    try {
      await API.put(`/flats/unassign/${id}`);
      setConfirmId(null); loadDropdowns();
      const np = assigned.length === 1 && page > 1 ? page - 1 : page;
      loadAssigned(np, dSearch);
    } catch { setConfirmId(null); }
  };

  const filteredDropdown = flats.filter(f => {
    const searchLow = flatSearch.toLowerCase();
    const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "");
    return f.flat_number.toString().toLowerCase().includes(searchLow) || blockName.toLowerCase().includes(searchLow);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {canEdit && showForm && (
        <div className="bg-card animate-scaleIn" style={{ padding: isMobile ? "16px 14px" : "20px 22px", borderRadius: 18, maxWidth: 520, width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(76,118,201,0.12)", border: "1px solid rgba(76,118,201,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B8DEF" }}><MdAdd size={17} /></div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t("mpAssignResident") || "Assign Resident"}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{t("mpOnlyUnassigned") || "Only unassigned units are shown"}</p>
            </div>
          </div>
          <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{t("mpSearchUnit")}</label>
              <input className="input search-input" style={{ height: 40, width: "100%", boxSizing: "border-box" }} placeholder={t("mpSearchUnitPh")} value={flatSearch} onChange={e => setFlatSearch(e.target.value)} />
            </div>
            <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{t("mpSelectUnit")}</label>
                <Select className="input" rootStyle={{ width: "100%" }} style={{ height: 40, width: "100%" }} value={flatId} onChange={e => setFlatId(e.target.value)} required>
                  <option value="">{t("mpChooseUnit")}</option>
                  {filteredDropdown.map(f => {
                    const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : t("mpUnknownBlock"));
                    return <option key={f.id} value={f.id}>{f.flat_number} ({t("mpBlkShort")} {blockName})</option>;
                  })}
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{t("mpSelectResident")}</label>
                <Select className="input" rootStyle={{ width: "100%" }} style={{ height: 40, width: "100%" }} value={residentId} onChange={e => setResidentId(e.target.value)} required>
                  <option value="">{t("mpChooseResident")}</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 4, flexWrap: "wrap" }}>
              <GlobalButton
                type="submit"
                variant="add"
                icon={MdAdd}
                loading={submitting}
                borderDraw
                fullWidth={isMobile}
                style={{ flex: 1, fontWeight: 700 }}
              >
                {t("mpAssign")}
              </GlobalButton>
              <GlobalButton
                type="button"
                variant="cancel"
                onClick={() => setShowForm(false)}
                fullWidth={isMobile}
                style={{ flex: 1 }}
              >
                {t("cancel")}
              </GlobalButton>
            </div>
          </form>
        </div>
      )}

      <div className="data-table-wrap">

        {initLoad ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}><Spinner /></div>
        ) : totalAll === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdHome size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>{t("mpNoFlatsAssigned")}</p>
          </div>
        ) : assigned.length === 0 && !fetching ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdSearch size={36} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>{t("mpNoMatches") || "No matches"}</p>
            <button onClick={() => setSearch("")} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>{t("mpClearSearch") || "Clear search"}</button>
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {assigned.map(flat => {
              const isRowHouse = !flat.Floor && flat.Block;
              const blockName  = flat.Block?.name || (flat.Floor ? flat.Floor.Block?.name : "—");
              return (
                <div key={flat.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(91,141,239,0.10)", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(91,141,239,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isRowHouse
                        ? <MdHomeWork size={18} style={{ color: "#10b981" }} />
                        : <MdHome size={18} style={{ color: "#94B5F5" }} />
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{flat.flat_number}</p>
                      <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: 0, opacity: 0.8 }}>
                        {flat.Floor ? t("mpFlBlkLine", { n: flat.Floor.floor_number, name: blockName }) : t("mpBlkLine", { name: blockName })}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <MdPerson size={11} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flat.User?.name || "—"}</p>
                      </div>
                    </div>
                  </div>
                  {canEdit && (confirmId === flat.id ? (
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                      <button onClick={() => handleUnassign(flat.id)} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>{t("mpYes") || "Yes"}</button>
                      <button onClick={() => setConfirmId(null)} style={{ padding: "4px 7px", borderRadius: 6, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(flat.id)} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", cursor: "pointer" }}>
                      <MdLinkOff size={16} />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>{t("srNo")}</th>
                <th>{t("mpUnit")}</th>
                <th>{t("mpResident")}</th>
                <th style={{ textAlign: "right" }}>{t("mpAction")}</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((flat, idx) => {
                const isRowHouse = !flat.Floor && flat.Block;
                const blockName  = flat.Block?.name || (flat.Floor ? flat.Floor.Block?.name : "—");
                return (
                  <tr key={flat.id}>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{(page - 1) * limit + idx + 1}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(91,141,239,0.10)", color: isRowHouse ? "#10b981" : "#94B5F5", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(91,141,239,0.22)" }}>
                        {isRowHouse ? <MdHomeWork size={13} /> : <MdHome size={13} />} {flat.flat_number}
                      </span>
                      <p className="text-xs text-secondary mt-1 ml-1" style={{ opacity: 0.8, fontSize: 11 }}>
                        {flat.Floor ? t("mpFloorBlockLine", { n: flat.Floor.floor_number, name: blockName }) : t("mpBlockOnlyLine", { name: blockName })}
                      </p>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(107,70,193,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#9F87D7", flexShrink: 0 }}>
                          {flat.User?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{flat.User?.name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {canEdit && (confirmId === flat.id ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpSure") || "Sure?"}</span>
                          <button onClick={() => handleUnassign(flat.id)} style={{ padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>{t("mpYes") || "Yes"}</button>
                          <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(flat.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)", cursor: "pointer" }}>
                          <MdLinkOff size={13} /> {t("mpUnassign") || "Unassign"}
                        </button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!initLoad && assigned.length > 0 && (
          <div style={{ borderTop: "1px solid var(--glass-border)", padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{t("mpShowing") || "Showing"} {assigned.length} {t("mpOf") || "of"} {totalItems}</p>
            <Pagination page={page} totalPages={totalPages} onChange={(p) => loadAssigned(p, dSearch)} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); loadAssigned(1, dSearch); }} />
          </div>
        )}
      </div>
    </div>
  );
}