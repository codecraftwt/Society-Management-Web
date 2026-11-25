import { useState, useEffect, useMemo, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  MdCheck, MdClose, MdBadge, MdCreditCard, MdAccessTime,
  MdOpenInNew, MdWarning, MdSearch, MdFilterList,
  MdPerson, MdHome, MdCalendarToday, MdDirectionsCar,
  MdGroup, MdRefresh, MdVisibility, MdPeople, MdBusiness,
  MdChevronLeft, MdChevronRight, MdCheckCircle, MdCancel,
  MdArrowBack, MdZoomIn, MdZoomOut, MdRotateRight, MdFileDownload,
  MdRestartAlt
} from "react-icons/md";
import Select from "../../components/common/Select";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import StatCard from "../../components/common/StatCard";

import Pagination from "../../components/common/Pagination";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatFlatTitle(num) {
  if (!num) return "—";
  let str = String(num).trim();
  str = str.replace(/^(flat\s+)?block[\s_-]*/i, "");
  return str.trim() || String(num).trim();
}

function StatusBadge({ label }) {
  const map = {
    PENDING:    { bg: "rgba(251,191,36,0.12)", color: "#d97706", border: "rgba(251,191,36,0.25)" },
    APPROVED:   { bg: "rgba(34,197,94,0.12)",  color: "#16a34a", border: "rgba(34,197,94,0.25)" },
    REJECTED:   { bg: "rgba(239,68,68,0.12)",  color: "#dc2626", border: "rgba(239,68,68,0.25)" },
    LIVING:     { bg: "rgba(59,130,246,0.12)", color: "#2563eb", border: "rgba(59,130,246,0.25)" },
    EXPIRED:    { bg: "rgba(168,85,247,0.12)", color: "#9333ea", border: "rgba(168,85,247,0.25)" },
    REMOVED:    { bg: "rgba(239,68,68,0.12)",  color: "#dc2626", border: "rgba(239,68,68,0.25)" },
    UNKNOWN:    { bg: "var(--card-inner-bg)",  color: "var(--text-secondary)", border: "var(--glass-border)" },
  };
  const s = map[label] || map.UNKNOWN;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {label === "REMOVED" ? "MOVED OUT" : label}
    </span>
  );
}

function LeaseChip({ date }) {
  const { t } = useLang();
  if (!date) return <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: 12 }}>{t("noEndDate")}</span>;
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  let color = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (diff <= 0) color = "text-red-400 bg-red-400/10 border-red-400/20";
  else if (diff <= 30) color = "text-blue-400 bg-blue-400/10 border-blue-400/20";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${color}`}>
      {diff <= 0 ? t("expired") : diff <= 30 ? t("daysLeft", { n: diff }) : formatDate(date)}
    </span>
  );
}

function getTenantDocuments(tenant) {
  const docs = tenant?.documents || tenant?.UserDocuments || tenant?.UserDocument || {};
  return { aadhar: docs.aadhar_url || tenant?.aadhar_url || null, pan: docs.pan_url || tenant?.pan_url || null };
}

function DocumentStatus({ tenant }) {
  const docs = getTenantDocuments(tenant);
  const count = [docs.aadhar, docs.pan].filter(Boolean).length;
  const isComplete = count === 2;
  const isPartial = count === 1;

  const style = isComplete
    ? {
        color: "#059669",
        background: "rgba(16, 185, 129, 0.12)",
        border: "1px solid rgba(16, 185, 129, 0.25)",
      }
    : isPartial
    ? {
        color: "#d97706",
        background: "rgba(245, 158, 11, 0.12)",
        border: "1px solid rgba(245, 158, 11, 0.25)",
      }
    : {
        color: "var(--text-secondary, #64748b)",
        background: "rgba(100, 116, 139, 0.08)",
        border: "1px solid rgba(100, 116, 139, 0.18)",
      };

  return (
    <span
      className={`tm-document-status ${isComplete ? "is-complete" : isPartial ? "is-partial" : "is-empty"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        ...style,
      }}
    >
      <MdBadge size={13} style={{ flexShrink: 0 }} />
      <span>{count}/2 KYC</span>
    </span>
  );
}

function DocumentCard({ label, url, icon, onSelect }) {
  return (
    <div
      className="flex items-center justify-between gap-3 p-3.5 rounded-xl transition-all"
      style={{
        background: url ? "var(--card-bg, #ffffff)" : "rgba(0,0,0,0.02)",
        border: url ? "1px solid var(--divider, rgba(99, 102, 241, 0.16))" : "1px dashed var(--divider)",
        boxShadow: url ? "0 2px 6px rgba(0, 0, 0, 0.02)" : "none",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: url ? "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))" : "var(--card-inner-bg)",
            color: url ? "var(--accent, #6366f1)" : "var(--text-secondary)",
            border: url ? "1px solid rgba(99, 102, 241, 0.22)" : "1px solid var(--divider)",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs truncate m-0" style={{ color: "var(--text-primary)" }}>
            {label}
          </p>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium mt-0.5"
            style={{ color: url ? "#10b981" : "var(--text-secondary)" }}
          >
            {url ? "● Uploaded & verified" : "○ Not uploaded"}
          </span>
        </div>
      </div>
      {url ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition hover:opacity-90 active:scale-95 shrink-0 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#ffffff",
            border: "none",
            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
          }}
        >
          <MdVisibility size={14} /> View
        </button>
      ) : (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-secondary">Missing</span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   REJECTION MODAL
───────────────────────────────────────────── */
function RejectModal({ open, onClose, onSubmit, loading }) {
  const { t } = useLang();
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  if (!open) return null;

  const inputStyle = {
    background: "var(--card-inner-bg)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)", padding: "10px 12px",
    borderRadius: "10px", outline: "none",
    width: "100%", fontSize: "13px",
    resize: "vertical", minHeight: "100px",
  };

  return createPortal(
    <div
      className="tm-modal-overlay fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)", zIndex: 10000 }}
      onClick={() => !loading && onClose()}
    >
      <div
        className="tm-modal-panel rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: "var(--card-bg)", border: "1px solid rgba(239,68,68,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", color: "var(--accent)" }}>
            <MdWarning size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>{t("tmRejectTitle")}</h3>
            <p className="mt-0.5" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("tmRejectSub")}</p>
          </div>
          <button disabled={loading} onClick={onClose} style={{ color: "var(--text-secondary)", cursor: "pointer", background: "none", border: "none", padding: 4 }}>
            <MdClose size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 flex gap-2 text-sm text-red-400">
            <MdWarning size={16} className="shrink-0 mt-0.5" />
            <span>{t("tmRejectWarn")}</span>
          </div>
          <div>
            <label className="font-bold uppercase tracking-widest block mb-2" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {t("tmRejectReason")}
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t("tmRejectPlaceholder")}
              rows={4}
              disabled={loading}
              style={inputStyle}
            />
          </div>
        </div>
        <div className="tm-modal-actions p-5 flex gap-3" style={{ borderTop: "1px solid var(--divider)" }}>
          <button
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition disabled:opacity-40"
            style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          >
            {t("cancel")}
          </button>
          <button
            disabled={loading || !reason.trim()}
            onClick={() => onSubmit(reason)}
            className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <><MdAccessTime size={16} className="animate-spin" /> {t("tmRejecting")}</> : <><MdClose size={16} /> {t("confirm")}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────
   DETAIL MODAL (with inline KYC document viewer)
───────────────────────────────────────────── */
function DetailModal({ tenant, onClose, onApprove, onReject, isPending }) {
  const { t } = useLang();
  const [activeDocKey, setActiveDocKey] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [docLoading, setDocLoading] = useState(true);

  useEffect(() => {
    setActiveDocKey(null);
    setZoom(1);
    setRotation(0);
    setDocLoading(true);
  }, [tenant]);

  if (!tenant) return null;

  const docs = getTenantDocuments(tenant);
  const availableDocs = [
    { key: "aadhar", label: "Aadhaar Card", url: docs.aadhar, icon: <MdBadge size={19} /> },
    { key: "pan", label: "PAN Card", url: docs.pan, icon: <MdCreditCard size={19} /> },
  ];
  const activeDoc = availableDocs.find((d) => d.key === activeDocKey && d.url);
  const isPdf = activeDoc && (
    activeDoc.url.toLowerCase().split("?")[0].endsWith(".pdf") ||
    activeDoc.url.toLowerCase().includes("/raw/upload/") ||
    activeDoc.url.toLowerCase().includes("application/pdf")
  );

  return createPortal(
    <div
      className="tm-modal-overlay fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 9998 }}
      onClick={onClose}
    >
      <div
        className={`tm-modal-panel rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col ${
          activeDoc ? "max-h-[90vh] overflow-hidden" : "max-h-[92vh] overflow-y-auto"
        }`}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {activeDoc ? (
          /* ── KYC DOCUMENT VIEWER HEADER ── */
          <div
            className="tm-detail-header flex items-center justify-between gap-3 px-6 py-4 sticky top-0 z-10 flex-wrap"
            style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--divider)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveDocKey(null)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition hover:opacity-90 active:scale-95 shrink-0"
                style={{
                  background: "var(--accent-soft, rgba(99,102,241,0.12))",
                  color: "var(--accent, #6366f1)",
                  border: "1px solid rgba(99,102,241,0.28)",
                  cursor: "pointer",
                }}
              >
                <MdArrowBack size={16} />
                <span>{t("back") || "Back to Details"}</span>
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{
                    background: activeDoc.key === "aadhar" ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)",
                    color: activeDoc.key === "aadhar" ? "#10b981" : "#6366f1",
                    border: `1px solid ${activeDoc.key === "aadhar" ? "rgba(16,185,129,0.25)" : "rgba(99,102,241,0.25)"}`,
                  }}
                >
                  {activeDoc.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {activeDoc.label}
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
                      style={{
                        background: isPdf ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
                        color: isPdf ? "#ef4444" : "#3b82f6",
                        border: `1px solid ${isPdf ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`,
                      }}
                    >
                      {isPdf ? "PDF Document" : "KYC Image"}
                    </span>
                  </div>
                  <p className="truncate mt-0.5" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {tenant.tenant_name} · {tenant.flat_number ? `Flat ${tenant.flat_number}` : ""} · {tenant.society_name || "Society"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Document switcher if both uploaded */}
              {availableDocs.filter((d) => d.url).length > 1 && (
                <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                  {availableDocs.filter((d) => d.url).map((d) => {
                    const isCur = d.key === activeDocKey;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => {
                          setActiveDocKey(d.key);
                          setZoom(1);
                          setRotation(0);
                          setDocLoading(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        style={{
                          background: isCur ? "var(--accent, #6366f1)" : "transparent",
                          color: isCur ? "#fff" : "var(--text-secondary)",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {d.key === "aadhar" ? <MdBadge size={13} /> : <MdCreditCard size={13} />}
                        {d.label.replace(" Card", "")}
                      </button>
                    );
                  })}
                </div>
              )}

              <button onClick={onClose} className="hover:text-red-400 transition bg-white/5 p-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>
                <MdClose size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* ── REGULAR DETAIL HEADER ── */
          <div
            className="tm-detail-header flex items-center justify-between gap-3 px-6 py-4 sticky top-0 z-10"
            style={{
              background: "var(--card-bg)",
              borderBottom: "1px solid var(--divider, rgba(99, 102, 241, 0.1))",
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md shadow-accent/25 shrink-0"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                {tenant.tenant_name?.charAt(0)?.toUpperCase() || "T"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base truncate m-0" style={{ color: "var(--text-primary)" }}>
                    {tenant.tenant_name}
                  </h3>
                  <DocumentStatus tenant={tenant} />
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-secondary">
                  <span>{tenant.tenant_email}</span>
                  {tenant.tenant_phone && (
                    <>
                      <span>•</span>
                      <span>{tenant.tenant_phone}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-semibold" style={{ color: "var(--accent, #6366f1)" }}>
                    {tenant.society_name || "Society"}{tenant.flat_number ? ` · Flat ${formatFlatTitle(tenant.flat_number)}` : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge label={tenant.status_label} />
              <button
                onClick={onClose}
                className="hover:bg-black/5 dark:hover:bg-white/10 transition p-2 rounded-xl text-secondary hover:text-primary cursor-pointer border-0 bg-transparent"
                title="Close"
              >
                <MdClose size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL BODY ── */}
        {activeDoc ? (
          <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
            {/* Viewer Controls Toolbar (for Images) */}
            {!isPdf && (
              <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  Inspection & Zoom Canvas
                </span>
                <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}>
                  <button
                    type="button"
                    title="Zoom Out"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition"
                    style={{ color: "var(--text-primary)", border: "none", background: "none", cursor: "pointer" }}
                  >
                    <MdZoomOut size={17} />
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 700, minWidth: 42, textAlign: "center", color: "var(--text-secondary)" }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    title="Zoom In"
                    onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition"
                    style={{ color: "var(--text-primary)", border: "none", background: "none", cursor: "pointer" }}
                  >
                    <MdZoomIn size={17} />
                  </button>
                  <button
                    type="button"
                    title="Reset Zoom"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition"
                    style={{ color: "var(--text-primary)", border: "none", background: "none", cursor: "pointer" }}
                  >
                    <MdRestartAlt size={17} />
                  </button>
                  <button
                    type="button"
                    title="Rotate 90°"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition"
                    style={{ color: "var(--text-primary)", border: "none", background: "none", cursor: "pointer" }}
                  >
                    <MdRotateRight size={17} />
                  </button>
                  <div style={{ width: 1, height: 16, background: "var(--divider)", margin: "0 2px" }} />
                  <a
                    href={activeDoc.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download Document"
                    className="p-1.5 rounded-lg hover:bg-white/10 transition flex items-center"
                    style={{ color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    <MdFileDownload size={17} />
                  </a>
                </div>
              </div>
            )}

            {/* Document display viewport */}
            <div
              className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-2xl relative"
              style={{
                minHeight: "340px",
                maxHeight: "52vh",
                background: "rgba(0,0,0,0.45)",
                border: "1px solid var(--glass-border)",
                padding: isPdf ? 0 : "16px",
              }}
            >
              {isPdf ? (
                <iframe
                  src={activeDoc.url}
                  title={activeDoc.label}
                  className="w-full h-full rounded-2xl border-0"
                  style={{ minHeight: "340px", height: "100%", background: "#fff" }}
                />
              ) : (
                <>
                  {docLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Loading document...</span>
                    </div>
                  )}
                  <img
                    src={activeDoc.url}
                    alt={activeDoc.label}
                    onLoad={() => setDocLoading(false)}
                    onError={() => setDocLoading(false)}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "48vh",
                      objectFit: "contain",
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s ease",
                      borderRadius: "12px",
                      boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Left Column */}
            <div className="flex flex-col gap-4">
              {/* Personal Info */}
              <Section title={t("tmPersonalInfo")} icon={<MdPerson size={15} />}>
                <Row label={t("tmFullName")} value={tenant.tenant_name} />
                <Row label={t("tmEmail")} value={tenant.tenant_email} />
                <Row label={t("tmPhone")} value={tenant.tenant_phone || "—"} />
                {tenant.society_name && <Row label={t("tmSociety")} value={tenant.society_name} />}
                <Row label={t("tmType")}>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
                    {tenant.resident_type || "TENANT"}
                  </span>
                </Row>
              </Section>

              {/* Flat Assignment */}
              <Section title={t("tmFlatAssignment")} icon={<MdHome size={15} />}>
                <Row label={t("tmFlatNo")} value={tenant.flat_number ? `Flat ${formatFlatTitle(tenant.flat_number)}` : "—"} />
                <Row label={t("tmBlock")} value={tenant.block_name || "—"} />
                <Row label={t("tmOwner")} value={tenant.owner_name || "—"} />
                <Row label={t("tmOccupancy")}>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
                    {tenant.occupancy_status || "—"}
                  </span>
                </Row>
              </Section>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4">
              {/* Lease Period */}
              <Section title={t("tmLeasePeriod")} icon={<MdCalendarToday size={15} />}>
                <Row label={t("tmMoveIn")} value={formatDate(tenant.move_in_date)} />
                <Row label={t("tmMoveOut")}>
                  <LeaseChip date={tenant.move_out_date} />
                </Row>
              </Section>

              {/* Status Details */}
              <Section title={t("tmStatusDetails")} icon={<MdBadge size={15} />}>
                <Row label={t("tmApproval")}>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                    tenant.approval_status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : tenant.approval_status === "REJECTED"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}>
                    {tenant.approval_status || "—"}
                  </span>
                </Row>
                <Row label={t("tmUserStatus") || "User Account"}>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {tenant.user_status === "ACTIVE" ? "Active Account" : tenant.user_status || "—"}
                  </span>
                </Row>
                <Row label={t("tmCurrentlyStaying") || "Currently Staying"}>
                  {tenant.is_staying ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Yes (Residing)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      No (Moved Out)
                    </span>
                  )}
                </Row>
                <Row label={t("tmCurrentMembership") || "Tenancy Status"}>
                  {tenant.is_current ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Active Tenancy
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Ended (Past Tenant)
                    </span>
                  )}
                </Row>
                {tenant.approved_by_name && (
                  <Row label={t("tmApprovedBy")} value={`${tenant.approved_by_name} (${tenant.approved_by_role ? tenant.approved_by_role.replace('_', ' ') : t("roleAdmin")})`} />
                )}
              </Section>
            </div>

            {/* KYC Verification Documents (Wide: spans across both columns) */}
            <div className="col-span-full">
              <Section title="KYC Verification Documents" icon={<MdCreditCard size={15} />} wide>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5">
                  <DocumentCard
                    label="Aadhaar Card"
                    url={docs.aadhar}
                    icon={<MdBadge size={20} />}
                    onSelect={() => {
                      setActiveDocKey("aadhar");
                      setZoom(1);
                      setRotation(0);
                      setDocLoading(true);
                    }}
                  />
                  <DocumentCard
                    label="PAN Card"
                    url={docs.pan}
                    icon={<MdCreditCard size={20} />}
                    onSelect={() => {
                      setActiveDocKey("pan");
                      setZoom(1);
                      setRotation(0);
                      setDocLoading(true);
                    }}
                  />
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* Action buttons footer */}
        <div
          className="shrink-0 p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: "var(--card-bg)", borderTop: "1px solid var(--divider, rgba(99, 102, 241, 0.1))" }}
        >
          {activeDoc ? (
            <button
              type="button"
              onClick={() => setActiveDocKey(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition hover:opacity-80 active:scale-95"
              style={{
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <MdArrowBack size={15} /> Back to Details
            </button>
          ) : (
            <div />
          )}

          {isPending && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onReject(tenant.tenant_id)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-xs hover:bg-red-500/20 transition cursor-pointer"
              >
                <MdClose size={15} /> {t("reject")}
              </button>
              <button
                onClick={() => onApprove(tenant.tenant_id)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs hover:bg-emerald-500/20 transition cursor-pointer"
              >
                <MdCheck size={15} /> {t("approve")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, icon, children, wide }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-sm flex flex-col ${wide ? "tm-detail-section-wide col-span-full" : ""}`}
      style={{
        background: "var(--card-inner-bg, rgba(248, 250, 252, 0.8))",
        border: "1px solid var(--divider, rgba(99, 102, 241, 0.1))",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 font-bold text-xs tracking-wide"
        style={{
          borderBottom: "1px solid var(--divider, rgba(99, 102, 241, 0.08))",
          color: "var(--text-primary)",
          background: "rgba(99, 102, 241, 0.03)",
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(99, 102, 241, 0.1)", color: "var(--accent, #6366f1)" }}
        >
          {icon}
        </div>
        <span>{title}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ label, value, chip, icon, children }) {
  return (
    <div
      className="tm-detail-row flex items-center justify-between px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      style={{ borderBottom: "1px solid var(--divider, rgba(99, 102, 241, 0.06))" }}
    >
      <span className="font-semibold text-xs text-secondary flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {children ? children : (
        chip ? (
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-glass-border"
            style={{ background: "var(--card-inner-bg)", color: "var(--text-primary)" }}
          >
            {value}
          </span>
        ) : (
          <span className="text-xs font-bold text-primary">{value}</span>
        )
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STATUS TABS CONFIG
───────────────────────────────────────────── */
const STATUS_TABS = [
  { key: "ALL",       labelKey: "tmTabAll",      color: "var(--text-primary)",    icon: <MdPeople size={14} /> },
  { key: "PENDING",   labelKey: "tmTabPending",  color: "var(--accent)",               icon: <MdAccessTime size={14} /> },
  { key: "APPROVED",  labelKey: "tmTabApproved", color: "#22c55e",               icon: <MdCheck size={14} /> },
  { key: "LIVING",    labelKey: "tmTabLiving",   color: "#3b82f6",               icon: <MdPerson size={14} /> },
  { key: "REJECTED",  labelKey: "tmTabRejected", color: "#ef4444",               icon: <MdClose size={14} /> },
  { key: "EXPIRED",   labelKey: "tmTabExpired",  color: "#a855f7",               icon: <MdCalendarToday size={14} /> },
  { key: "REMOVED",   labelKey: "tmTabRemoved",  color: "#ef4444",               icon: <MdClose size={14} /> },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TenantManagement() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = (user?.activeRole ?? user?.role) === "SUPER_ADMIN";

  const [tenants, setTenants]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("ALL");

  // Filters
  const [search, setSearch]             = useState("");
  const [filterBlock, setFilterBlock]   = useState("ALL");

  // Society filter (Super Admin only)
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(
    () => localStorage.getItem("superadmin_society_filter") || "ALL"
  );
  const isGlobalView = isSuperAdmin && selectedSocietyId === "ALL";

  // Modals
  const [detailTenant, setDetailTenant] = useState(null);
  const [rejectModal, setRejectModal]   = useState({ open: false, userId: null });
  const [rejectLoading, setRejectLoading] = useState(false);

  /* ── Load from new endpoint ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedSocietyId && selectedSocietyId !== "ALL" ? { society_id: selectedSocietyId } : {};
      const res = await API.get(`/admin/tenant-history`, { params });
      const payload = res.data;
      setTenants(Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
    } catch {
      toast.error(t("tmLoadFail"));
    } finally {
      setLoading(false);
    }
  }, [selectedSocietyId, t]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Society options (Super Admin only) ── */
  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setSocieties(list);
      })
      .catch(() => setSocieties([]));
  }, [isSuperAdmin]);

  const handleSocietyChange = (id) => {
    setSelectedSocietyId(id);
    localStorage.setItem("superadmin_society_filter", id);
    setFilterBlock("ALL");   // blocks are society specific
    setDetailTenant(null);
  };

  /* ── Derived filter options ── */
  const blocks = useMemo(() => {
    const set = new Set();
    tenants.forEach(t => { if (t.block_name) set.add(t.block_name); });
    return [...set].sort();
  }, [tenants]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return tenants.filter(t => {
      if (activeTab !== "ALL" && t.status_label !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          t.tenant_name?.toLowerCase().includes(q) ||
          t.tenant_email?.toLowerCase().includes(q) ||
          t.tenant_phone?.includes(q) ||
          t.society_name?.toLowerCase().includes(q) ||
          t.flat_number?.toString().includes(q);
        if (!matches) return false;
      }
      if (filterBlock !== "ALL" && t.block_name !== filterBlock) return false;
      return true;
    });
  }, [tenants, activeTab, search, filterBlock]);

  /* ── 10 records per page ── */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  /* Clamp without an effect: after a reload shrinks the list (e.g. approving
     the last row on the last page) the old page would slice an empty array
     and the table would go blank. */
  const safePage = Math.min(page, totalPages);
  const pagedTenants = useMemo(() => {
    return filtered.slice((safePage - 1) * limit, safePage * limit);
  }, [filtered, safePage, limit]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, filterBlock, selectedSocietyId]);

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => {
    const counts = { ALL: tenants.length };
    STATUS_TABS.forEach(tab => {
      if (tab.key !== "ALL") {
        counts[tab.key] = tenants.filter(t => t.status_label === tab.key).length;
      }
    });
    return counts;
  }, [tenants]);

  /* ── Actions ── */
  const handleApprove = async (userId) => {
    try {
      await API.put(`/admin/approve-resident/${userId}`);
      toast.success(t("tmApproved"));
      setDetailTenant(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    }
  };

  const handleRejectSubmit = async (reason) => {
    setRejectLoading(true);
    try {
      await API.put(`/admin/reject-resident/${rejectModal.userId}`, { reason });
      toast.info(t("tmRejected"));
      setRejectModal({ open: false, userId: null });
      setDetailTenant(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    } finally {
      setRejectLoading(false);
    }
  };

  /* ── Render ── */
  if (loading) return (
    <div className="flex items-center justify-center p-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>{t("tmLoading")}</p>
      </div>
    </div>
  );

  return (
    <div className="tenant-management-page space-y-5 animate-fadeIn">
      {/* ── Page Header: Unified Single Row ── */}
      <div className="tm-page-header flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="tm-page-title flex items-center gap-3">
          <div className="ad-page-icon">
            <MdPeople size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>{t("tmTitle")}</h2>
            <p className="text-secondary text-xs mt-0.5">{t("tmSubtitle")}</p>
          </div>
        </div>

        <div className="tm-toolbar flex items-center gap-2.5 flex-wrap">
          {isSuperAdmin && (
            <FilterSelect
              icon={<MdBusiness size={13} />}
              value={selectedSocietyId}
              onChange={handleSocietyChange}
              options={[
                { value: "ALL", label: t("allSocietiesGlobalView") || "All Societies" },
                ...societies.map(s => ({ value: String(s.id), label: s.name })),
              ]}
            />
          )}

          <FilterSelect
            icon={<MdFilterList size={13} />}
            value={activeTab}
            onChange={setActiveTab}
            options={STATUS_TABS.map(tab => ({
              value: tab.key,
              label: `${t(tab.labelKey)} (${tabCounts[tab.key] || 0})`,
            }))}
          />

          <FilterSelect
            icon={<MdHome size={13} />}
            value={filterBlock}
            onChange={setFilterBlock}
            options={[{ value: "ALL", label: t("allBlocks") }, ...blocks.map(b => ({ value: b, label: t("afBlockName", { name: b }) }))]}
          />

          <ExpandableSearch
            className="tm-desktop-search"
            value={search}
            onChange={setSearch}
            placeholder={t("tmSearch")}
          />

          <label className="tm-mobile-search">
            <MdSearch size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("tmSearch")}
            />
          </label>

          <button
            onClick={() => load()}
            className="tm-refresh-btn flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition justify-center shrink-0"
            style={{ height: 42, minHeight: 42, color: "var(--text-secondary)", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
          >
            <MdRefresh size={16} /> {t("refresh")}
          </button>
        </div>
      </div>

      {/* ── Statistical KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          tone="brand"
          value={tabCounts.ALL || 0}
          label={t("tmTotalTenants") || "Total Tenants"}
          icon={MdPeople}
          subtext="All tenant applications"
        />
        <StatCard
          tone="success"
          value={tabCounts.APPROVED || 0}
          label={t("tmTabApproved") || "Approved"}
          icon={MdCheckCircle}
          subtext="Approved & active"
        />
        <StatCard
          tone="danger"
          value={tabCounts.REJECTED || 0}
          label={t("tmTabRejected") || "Rejected"}
          icon={MdCancel}
          subtext="Declined requests"
        />
        <StatCard
          tone="info"
          value={tabCounts.LIVING || 0}
          label={t("tmTabLiving") || "Living"}
          icon={MdHome}
          subtext="Currently residing"
        />
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"
          style={{ background: "var(--card-inner-bg)", borderRadius: "20px", border: "1px solid var(--glass-border)" }}>
          <MdPeople size={40} className="text-blue-400/40" />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {activeTab === "ALL" ? t("tmEmpty") : t("tmEmptyStatus", { status: t(STATUS_TABS.find(tab => tab.key === activeTab)?.labelKey || "tmTabAll") })}
          </p>
        </div>
      ) : (
        <div key={safePage} className="animate-slide-page">
          {/* ── Mobile Cards ── */}
          <div className="tm-mobile-list md:hidden flex flex-col gap-3">
            {pagedTenants.map((row, i) => (
              <div
                key={row.membership_id ? `m-${row.membership_id}` : `u-${row.tenant_id}`}
                className="tm-mobile-card animate-fadeIn rounded-2xl overflow-hidden cursor-pointer"
                style={{ animationDelay: `${i * 30}ms`, border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}
                onClick={() => setDetailTenant(row)}
              >
                <div className="p-4 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/12 text-blue-400 flex items-center justify-center font-black text-base shrink-0">
                    {row.tenant_name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{row.tenant_name}</p>
                    <p className="truncate" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{row.tenant_email}</p>
                    {isGlobalView && row.society_name && (
                      <p className="truncate" style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{row.society_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1"><StatusBadge label={row.status_label} /><DocumentStatus tenant={row} /></div>
                </div>
                <div className="px-4 pb-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{row.flat_number ? `${t("afFlat")} ${row.flat_number}` : "—"}</span>
                    {row.block_name && <span> · {t("afBlockName", { name: row.block_name })}</span>}
                  </span>
                  {row.move_in_date && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("tmMoveIn")}: {formatDate(row.move_in_date)}</span>}
                  {row.move_out_date && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("tmMoveOut")}: {formatDate(row.move_out_date)}</span>}
                </div>
                {row.status_label === "PENDING" && (
                  <div className="tm-mobile-actions p-4 pt-2.5 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailTenant(row)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl hover:bg-white/10 text-xs font-bold transition"
                      style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      <MdVisibility size={14} /> {t("view")}
                    </button>
                    <button
                      onClick={() => setRejectModal({ open: true, userId: row.tenant_id })}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      <MdClose size={14} /> {t("reject")}
                    </button>
                    <button
                      onClick={() => handleApprove(row.tenant_id)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition"
                    >
                      <MdCheck size={14} /> {t("approve")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-card rounded-2xl overflow-hidden">
            <div
              className="grid font-black uppercase tracking-widest px-4 py-3"
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                background: "var(--card-inner-bg)",
                borderBottom: "1px solid var(--divider)",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr .8fr 1fr auto",
                gap: "12px",
              }}
            >
              <span>{t("tmColTenant")}</span>
              <span>{t("tmColFlatBlock")}</span>
              <span>{t("tmColStatus")}</span>
              <span>{t("tmColMoveIn")}</span>
              <span>{t("tmColLeaseEnd")}</span>
              <span>KYC</span>
              <span>{t("tmColApproval")}</span>
              <span>{t("tmColActions")}</span>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
              {pagedTenants.map((row, i) => (
                <div
                  key={row.membership_id ? `m-${row.membership_id}` : `u-${row.tenant_id}`}
                  className="grid items-center px-4 py-3 hover:bg-white/2 transition group cursor-pointer"
                  style={{
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr .8fr 1fr auto",
                    gap: "12px",
                    borderBottom: i < pagedTenants.length - 1 ? "1px solid var(--divider)" : "none",
                    background: i % 2 === 0 ? "var(--card-inner-bg)" : "transparent",
                  }}
                  onClick={() => setDetailTenant(row)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/12 text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                      {row.tenant_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{row.tenant_name}</p>
                      <p className="truncate" style={{ fontSize: 10, color: "var(--text-secondary)" }}>{row.tenant_email}</p>
                      {isGlobalView && row.society_name && (
                        <p className="truncate" style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{row.society_name}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {row.flat_number ? `${t("afFlat")} ${row.flat_number}` : "—"}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>{row.block_name ? t("afBlockName", { name: row.block_name }) : "—"}</p>
                  </div>

                  <StatusBadge label={row.status_label} />

                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatDate(row.move_in_date)}</p>

                  <div><LeaseChip date={row.move_out_date} /></div>

                  <DocumentStatus tenant={row} />

                  <StatusBadge label={row.approval_status || "—"} />

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      title={t("viewDetails")}
                      onClick={() => setDetailTenant(row)}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
                      style={{ background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      <MdVisibility size={14} />
                    </button>
                    {row.status_label === "PENDING" && (
                      <>
                        <button
                          title={t("reject")}
                          onClick={() => setRejectModal({ open: true, userId: row.tenant_id })}
                          className="w-8 h-8 rounded-lg bg-red-500/8 text-red-400/60 hover:text-red-400 hover:bg-red-500/15 border border-red-500/10 flex items-center justify-center transition"
                        >
                          <MdClose size={14} />
                        </button>
                        <button
                          title={t("approve")}
                          onClick={() => handleApprove(row.tenant_id)}
                          className="w-8 h-8 rounded-lg bg-emerald-500/8 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 flex items-center justify-center transition"
                        >
                          <MdCheck size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="tm-pagination-footer">
            <span className="tm-pagination-summary">
              {t("afShowing", { shown: pagedTenants.length, total: filtered.length })}
            </span>
            <Pagination page={safePage} totalPages={totalPages} onChange={setPage} pageSize={limit} onPageSizeChange={(s) => { setLimit(s); setPage(1); }} />
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <DetailModal
        tenant={detailTenant}
        onClose={() => setDetailTenant(null)}
        onApprove={handleApprove}
        onReject={(id) => { setRejectModal({ open: true, userId: id }); }}
        isPending={detailTenant?.status_label === "PENDING"}
      />

      <RejectModal
        open={rejectModal.open}
        loading={rejectLoading}
        onClose={() => setRejectModal({ open: false, userId: null })}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILTER SELECT
───────────────────────────────────────────── */
function FilterSelect({ icon, value, onChange, options }) {
  return (
    <div className="tm-filter-select relative flex items-center">
      <span className="absolute left-3 pointer-events-none z-10" style={{ color: "var(--text-secondary)" }}>{icon}</span>
      <Select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "var(--card-inner-bg)",
          border: "1px solid var(--glass-border)",
          color: value === "ALL" ? "var(--text-secondary)" : "var(--text-primary)",
          padding: "9px 12px 9px 30px",
          borderRadius: "12px", outline: "none",
          fontSize: "12px", fontWeight: "700",
          cursor: "pointer",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}
