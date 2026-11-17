import React, { useState, useEffect } from "react";
import {
  MdClose,
  MdShield,
  MdCheckCircle,
  MdFingerprint,
  MdPerson,
  MdAccessTime,
  MdPictureAsPdf,
  MdImage,
  MdOpenInNew,
  MdExpandMore,
  MdExpandLess,
  MdTextFields,
  MdVerified,
} from "react-icons/md";
import GlobalModal from "../../../components/common/GlobalModal";
import PdfViewer from "../../../components/common/PdfViewer";
import { Spinner } from "../amenityHelpers.jsx";
import { getBookingAcceptedTerms } from "../../../services/amenityService";

const TYPE_CONFIG = {
  TEXT: { label: "Text Policy", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: MdTextFields },
  IMAGE: { label: "Image Policy", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: MdImage },
  PDF: { label: "PDF Document", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", icon: MdPictureAsPdf },
};

function parseRuleClauseLine(rawLine) {
  if (!rawLine) return null;
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  const cleanLine = trimmed.replace(/^[•\-\*]\s*/, "").trim();
  if (!cleanLine) return null;

  const numberMatch = cleanLine.match(
    /^(\(?\d+[\.\)\:\-]?\)?|\b(?:Rule|Clause|Section|Point)\s*\d+[\.\:\-]?)\s*(.+)$/i
  );
  if (numberMatch) {
    const rawNum = numberMatch[1].trim();
    const cleanNum = rawNum.replace(/[^0-9]/g, "") || rawNum;
    return {
      type: "number",
      label: cleanNum,
      rawPrefix: rawNum,
      text: numberMatch[2].trim(),
    };
  }

  const isHeadingEnding = cleanLine.endsWith(":");
  const isShortTitle = cleanLine.length < 55 && !/[.,;]$/.test(cleanLine);
  const isAllCaps = cleanLine.length > 3 && cleanLine === cleanLine.toUpperCase() && /[A-Z]/.test(cleanLine);

  if (isHeadingEnding || isAllCaps || (isShortTitle && !/\d/.test(cleanLine.slice(0, 3)))) {
    return {
      type: "heading",
      text: cleanLine.replace(/:$/, "").trim(),
    };
  }

  return {
    type: "bullet",
    text: cleanLine,
  };
}

export default function AcceptedTermsModal({ bookingId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfName, setActivePdfName] = useState("");
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    if (!isOpen || !bookingId) return;
    let mounted = true;
    setLoading(true);
    setError("");

    getBookingAcceptedTerms(bookingId)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.message || "No acceptance record found.");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || "Failed to load accepted terms.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const acceptance = data?.acceptance;
  const rulesSnapshot = Array.isArray(acceptance?.rules_snapshot) ? acceptance.rules_snapshot : [];

  return (
    <>
      <GlobalModal
        isOpen={isOpen}
        onClose={onClose}
        title="Verified Amenities Terms Acceptance"
        subtitle={`Historical snapshot of terms accepted at the time of booking request #${bookingId}.`}
        icon={MdShield}
        size="lg"
        bodyStyle={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overflowY: "auto",
          maxHeight: "calc(90vh - 80px)",
        }}
        bodyClassName="[&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-col gap-4 text-left font-sans">
          {/* Top Audit Badge */}
          <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <MdCheckCircle size={13} /> Immutable Audit Record
              </span>
              <span className="text-xs text-secondary">
                Booking Reference #{bookingId}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-rose-500 bg-rose-500/10 rounded-xl">
              {error}
            </div>
          ) : !acceptance ? (
            <div className="p-6 text-center text-xs text-secondary bg-black/5 dark:bg-white/5 rounded-xl">
              No acceptance record was required or found for this booking.
            </div>
          ) : (
            <>
              {/* Audit Metadata Cards (Clean 3-Column Grid without IP Address) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Accepted By */}
                <div
                  className="p-3.5 rounded-2xl border flex flex-col justify-between gap-1.5"
                  style={{
                    background: "var(--card-inner-bg)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-secondary flex items-center gap-1">
                    <MdPerson size={13} className="text-accent" /> Accepted By
                  </span>
                  <div className="mt-0.5">
                    <span className="text-xs sm:text-sm font-bold block truncate" style={{ color: "var(--text-primary)" }}>
                      {acceptance.user_name_snapshot || "Resident"}
                    </span>
                    <span
                      className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {acceptance.user_role_snapshot || "RESIDENT"}
                    </span>
                  </div>
                </div>

                {/* 2. Accepted Date & Time */}
                <div
                  className="p-3.5 rounded-2xl border flex flex-col justify-between gap-1.5"
                  style={{
                    background: "var(--card-inner-bg)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-secondary flex items-center gap-1">
                    <MdAccessTime size={13} className="text-emerald-500" /> Accepted At
                  </span>
                  <div className="mt-0.5">
                    <span className="text-xs sm:text-sm font-semibold block" style={{ color: "var(--text-primary)" }}>
                      {acceptance.accepted_at ? new Date(acceptance.accepted_at).toLocaleDateString() : "—"}
                    </span>
                    <span className="text-[11px] text-secondary">
                      {acceptance.accepted_at ? new Date(acceptance.accepted_at).toLocaleTimeString() : ""}
                    </span>
                  </div>
                </div>

                {/* 3. Ruleset Hash / Version */}
                <div
                  className="p-3.5 rounded-2xl border flex flex-col justify-between gap-1.5"
                  style={{
                    background: "var(--card-inner-bg)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-secondary flex items-center gap-1">
                    <MdFingerprint size={13} className="text-indigo-500" /> Ruleset Version
                  </span>
                  <div className="mt-0.5">
                    <span
                      className="font-mono text-xs font-semibold block truncate"
                      style={{ color: "var(--text-primary)" }}
                      title={acceptance.ruleset_version || ""}
                    >
                      {acceptance.ruleset_version || "—"}
                    </span>
                    <span className="text-[10px] text-secondary">Cryptographic Hash</span>
                  </div>
                </div>
              </div>

              {/* Frozen Ruleset Snapshot */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Accepted Rules Snapshot ({rulesSnapshot.length})
                  </span>
                  <span className="text-[10px] text-secondary">
                    As frozen on booking creation
                  </span>
                </div>

                {rulesSnapshot.map((rule, idx) => {
                  const rawType = (rule.rule_type || "TEXT").toUpperCase();
                  const typeKey =
                    rawType === "IMG" || rawType === "IMAGE"
                      ? "IMAGE"
                      : rawType === "PDF"
                      ? "PDF"
                      : "TEXT";
                  const typeCfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.TEXT;
                  const TypeIcon = typeCfg.icon;
                  const attachments = rule.attachments || [];
                  const isExpanded = expandedId === (rule.id || idx) || (expandedId === null && idx === 0);

                  const parsedClauses = rule.formatted_content
                    ? rule.formatted_content
                        .split("\n")
                        .map(parseRuleClauseLine)
                        .filter(Boolean)
                    : [];

                  return (
                    <div
                      key={rule.id || idx}
                      className="rounded-2xl border transition-all duration-200 overflow-hidden"
                      style={{
                        background: "var(--card-inner-bg)",
                        borderColor: isExpanded ? "rgba(99, 102, 241, 0.35)" : "var(--glass-border)",
                      }}
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleExpand(rule.id || idx)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                            style={{ background: typeCfg.bg, color: typeCfg.color }}
                          >
                            <TypeIcon size={11} /> {typeCfg.label}
                          </span>
                          <span className="text-xs sm:text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {rule.title}
                          </span>
                          {rule.is_mandatory && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                              style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
                            >
                              <MdVerified size={10} /> Mandatory
                            </span>
                          )}
                        </div>

                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition"
                          style={{
                            background: isExpanded ? "rgba(99, 102, 241, 0.1)" : "transparent",
                            color: isExpanded ? "#6366f1" : "var(--text-secondary)",
                          }}
                        >
                          {isExpanded ? <MdExpandLess size={19} /> : <MdExpandMore size={19} />}
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div
                          className="px-4 pb-4 pt-2 border-t space-y-3"
                          style={{ borderColor: "var(--glass-border)" }}
                        >
                          {/* Rule Content Summary */}
                          {rule.content ? (
                            <div
                              className="text-xs sm:text-[13px] leading-relaxed"
                              style={{ color: "var(--text-primary)", whiteSpace: "pre-line" }}
                            >
                              {rule.content}
                            </div>
                          ) : null}

                          {/* Formatted Clauses */}
                          {parsedClauses.length > 0 && (
                            <div
                              className="p-3.5 rounded-xl border space-y-1.5"
                              style={{
                                background: "var(--card-bg)",
                                borderColor: "var(--glass-border)",
                              }}
                            >
                              {parsedClauses.map((item, cIdx) => {
                                if (item.type === "heading") {
                                  return (
                                    <div
                                      key={cIdx}
                                      className="pt-2 pb-1 text-xs font-bold tracking-wide uppercase flex items-center gap-2"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      <span className="w-1.5 h-3 rounded-full bg-accent" />
                                      <span>{item.text}</span>
                                    </div>
                                  );
                                }

                                if (item.type === "number") {
                                  return (
                                    <div key={cIdx} className="flex items-start gap-2.5 py-1">
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                                        style={{
                                          background: "rgba(99, 102, 241, 0.12)",
                                          color: "#6366f1",
                                        }}
                                      >
                                        {item.label}
                                      </span>
                                      <span
                                        className="text-xs sm:text-[13px] leading-relaxed flex-1"
                                        style={{ color: "var(--text-primary)" }}
                                      >
                                        {item.text}
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={cIdx} className="flex items-start gap-2.5 py-1">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                                      style={{ background: "#6366f1" }}
                                    />
                                    <span
                                      className="text-xs sm:text-[13px] leading-relaxed flex-1"
                                      style={{ color: "var(--text-secondary)" }}
                                    >
                                      {item.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Attachments */}
                          {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {attachments.map((att, aIdx) => {
                                const isPdf =
                                  att.file_type === "PDF" ||
                                  (att.file_name && att.file_name.toLowerCase().endsWith(".pdf"));
                                return (
                                  <button
                                    key={aIdx}
                                    type="button"
                                    onClick={() => {
                                      if (isPdf) {
                                        setActivePdfUrl(att.file_url);
                                        setActivePdfName(att.file_name || "Accepted Policy");
                                      } else {
                                        setActiveImage(att);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-accent transition cursor-pointer"
                                    style={{
                                      background: "var(--card-bg)",
                                      borderColor: "var(--glass-border)",
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    {isPdf ? (
                                      <MdPictureAsPdf className="text-rose-500 shrink-0" size={15} />
                                    ) : (
                                      <MdImage className="text-blue-500 shrink-0" size={15} />
                                    )}
                                    <span className="truncate max-w-[140px]">
                                      {att.file_name}
                                    </span>
                                    <MdOpenInNew size={12} className="text-secondary" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Image Inline Preview */}
          {activeImage && (
            <div
              className="p-3 rounded-xl border relative"
              style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
            >
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {activeImage.file_name || "Attached Policy Image"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveImage(null)}
                  className="p-1 rounded text-secondary hover:text-primary"
                >
                  <MdClose size={16} />
                </button>
              </div>
              <img
                src={activeImage.file_url || activeImage}
                alt={activeImage.file_name || "Policy"}
                className="max-h-72 w-auto mx-auto rounded-lg object-contain shadow"
              />
            </div>
          )}

          {/* Footer Close */}
          <div className="pt-3 border-t flex justify-end" style={{ borderColor: "var(--glass-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
              style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
            >
              Close
            </button>
          </div>
        </div>
      </GlobalModal>

      {/* Embedded PDF Viewer Modal */}
      {activePdfUrl && (
        <PdfViewer
          fileUrl={activePdfUrl}
          fileName={activePdfName}
          onClose={() => {
            setActivePdfUrl(null);
            setActivePdfName("");
          }}
        />
      )}
    </>
  );
}
