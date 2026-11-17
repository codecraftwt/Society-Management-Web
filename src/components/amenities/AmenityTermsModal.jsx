import React, { useState } from "react";
import {
  MdClose,
  MdShield,
  MdCheckCircle,
  MdPictureAsPdf,
  MdImage,
  MdOpenInNew,
  MdExpandMore,
  MdExpandLess,
  MdInfoOutline,
  MdTextFields,
  MdVerified,
} from "react-icons/md";
import GlobalModal from "../common/GlobalModal";
import PdfViewer from "../common/PdfViewer";

const TYPE_CONFIG = {
  TEXT: { label: "Text Policy", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: MdTextFields },
  IMAGE: { label: "Image Policy", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: MdImage },
  PDF: { label: "PDF Document", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", icon: MdPictureAsPdf },
};

/**
 * Intelligent clause parser:
 * - If numbering is present (e.g. "1.", "1)", "(1)", "Rule 1:"): returns type "number", NO bullet is added.
 * - If section heading is detected: returns type "heading", NO bullet is added.
 * - Otherwise: returns type "bullet" and displays a clean accent dot.
 */
function parseRuleClauseLine(rawLine) {
  if (!rawLine) return null;
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  // Strip leading bullet/dash if already present in text
  const cleanLine = trimmed.replace(/^[•\-\*]\s*/, "").trim();
  if (!cleanLine) return null;

  // Numbering detection (e.g. "1.", "1)", "(1)", "1 -", "1:", "Rule 1:", etc.)
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

  // Heading detection (e.g. "Society Amenities - Rules & Terms", short non-punctuated titles, or ending in ':')
  const isHeadingEnding = cleanLine.endsWith(":");
  const isShortTitle = cleanLine.length < 55 && !/[.,;]$/.test(cleanLine);
  const isAllCaps = cleanLine.length > 3 && cleanLine === cleanLine.toUpperCase() && /[A-Z]/.test(cleanLine);

  if (isHeadingEnding || isAllCaps || (isShortTitle && !/\d/.test(cleanLine.slice(0, 3)))) {
    return {
      type: "heading",
      text: cleanLine.replace(/:$/, "").trim(),
    };
  }

  // Default bullet item
  return {
    type: "bullet",
    text: cleanLine,
  };
}

export default function AmenityTermsModal({
  isOpen,
  onClose,
  rules = [],
  rulesetVersion = null,
  amenityName = "Amenity",
  onAccept,
  loading = false,
}) {
  const [accepted, setAccepted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfName, setActivePdfName] = useState("");
  const [activeImage, setActiveImage] = useState(null);

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleConfirm = () => {
    if (!accepted || loading) return;
    onAccept(rulesetVersion);
  };

  return (
    <>
      <GlobalModal
        isOpen={isOpen}
        onClose={onClose}
        title="Amenities Rules & Terms of Use"
        subtitle={`Request for ${amenityName} requires acceptance of society common rules.`}
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
          {/* Info Banner */}
          <div
            className="p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed"
            style={{
              background: "rgba(99, 102, 241, 0.05)",
              borderColor: "rgba(99, 102, 241, 0.2)",
              color: "var(--text-primary)",
            }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}
            >
              <MdInfoOutline size={15} />
            </div>
            <div>
              <p className="font-medium">
                These rules apply society-wide to all residents, tenants, and guests.
                Please review each rule, damage recovery policy, and usage guideline before confirming your booking request.
              </p>
            </div>
          </div>

          {/* Rules Accordion List */}
          <div className="space-y-3">
            {rules.map((rule, idx) => {
              const rawType = (rule.rule_type || "TEXT").toUpperCase();
              const typeKey =
                rawType === "IMG" || rawType === "IMAGE"
                  ? "IMAGE"
                  : rawType === "PDF"
                  ? "PDF"
                  : "TEXT";
              const typeCfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.TEXT;
              const TypeIcon = typeCfg.icon;
              const isExpanded = expandedId === rule.id || (expandedId === null && idx === 0);
              const attachments = rule.attachments || [];

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
                    boxShadow: isExpanded ? "0 4px 16px rgba(0, 0, 0, 0.04)" : "none",
                  }}
                >
                  {/* Rule Header Bar */}
                  <div
                    onClick={() => toggleExpand(rule.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Rule Type Badge */}
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5"
                        style={{ background: typeCfg.bg, color: typeCfg.color }}
                      >
                        <TypeIcon size={12} /> {typeCfg.label}
                      </span>

                      {/* Rule Title */}
                      <h4
                        className="text-sm font-bold truncate tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {rule.title}
                      </h4>

                      {/* Mandatory Tag */}
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
                      {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-2 border-t space-y-3"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      {/* Rule Summary / Primary Content */}
                      {rule.content ? (
                        <div
                          className="text-xs sm:text-sm leading-relaxed"
                          style={{
                            color: "var(--text-primary)",
                            whiteSpace: "pre-line",
                          }}
                        >
                          {rule.content}
                        </div>
                      ) : null}

                      {/* Formatted Clauses & Policy Points */}
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

                            // Bullet item
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

                      {/* Attachments Section */}
                      {attachments.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          {attachments.map((att) => {
                            const isPdf =
                              att.file_type === "PDF" ||
                              (att.file_name && att.file_name.toLowerCase().endsWith(".pdf"));

                            return (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => {
                                  if (isPdf) {
                                    setActivePdfUrl(att.file_url);
                                    setActivePdfName(att.file_name);
                                  } else {
                                    setActiveImage(att);
                                  }
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer hover:border-accent transition"
                                style={{
                                  background: "var(--card-bg)",
                                  borderColor: "var(--glass-border)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {isPdf ? (
                                  <MdPictureAsPdf className="text-rose-500 shrink-0" size={16} />
                                ) : (
                                  <MdImage className="text-blue-500 shrink-0" size={16} />
                                )}
                                <span className="truncate max-w-[150px]">{att.file_name}</span>
                                <MdOpenInNew size={13} className="text-secondary" />
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

          {/* Image Inline Preview */}
          {activeImage && (
            <div
              className="p-3 rounded-xl border relative"
              style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
            >
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {activeImage.file_name}
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
                src={activeImage.file_url}
                alt={activeImage.file_name}
                className="max-h-64 w-auto mx-auto rounded-lg object-contain shadow"
              />
            </div>
          )}

          {/* Acceptance Agreement Checkbox */}
          <label
            className="flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition select-none"
            style={{
              background: accepted ? "rgba(16, 185, 129, 0.08)" : "var(--card-inner-bg)",
              borderColor: accepted ? "#10b981" : "var(--glass-border)",
            }}
          >
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 cursor-pointer mt-1"
            />
            <div className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
              <span className="font-bold text-sm block mb-0.5">
                I have read, understood, and agree to abide by all the society amenities rules and terms.
              </span>
              <p className="text-[11px] text-secondary">
                I understand that violation of policies, improper usage, or damage to facility assets will incur recovery charges as defined above.
              </p>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="pt-2 border-t flex items-center justify-end gap-2.5" style={{ borderColor: "var(--glass-border)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
              style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!accepted || loading}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-md ${
                !accepted || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-95"
              }`}
              style={{ background: accepted ? "#10b981" : "var(--accent)" }}
            >
              <MdCheckCircle size={16} />
              <span>Accept & Proceed with Booking</span>
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
