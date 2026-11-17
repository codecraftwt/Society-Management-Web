import React, { useState } from "react";
import {
  MdClose,
  MdGavel,
  MdPictureAsPdf,
  MdImage,
  MdOpenInNew,
  MdFileDownload,
  MdVerified,
  MdShield,
  MdTextFields,
} from "react-icons/md";
import GlobalModal from "../../../components/common/GlobalModal";
import PdfViewer from "../../../components/common/PdfViewer";

const TYPE_CONFIG = {
  TEXT: { label: "Text Rule", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: MdTextFields },
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

export default function AmenityRulePreviewModal({ rule, onClose }) {
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfName, setActivePdfName] = useState("");
  const [activeImage, setActiveImage] = useState(null);

  if (!rule) return null;

  const rawType = (rule.rule_type || "TEXT").toUpperCase();
  const typeKey = rawType === "IMG" || rawType === "IMAGE" ? "IMAGE" : rawType === "PDF" ? "PDF" : "TEXT";
  const typeCfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.TEXT;
  const TypeIcon = typeCfg.icon;
  const attachments = rule.attachments || [];

  const parsedClauses = rule.formatted_content
    ? rule.formatted_content
        .split("\n")
        .map(parseRuleClauseLine)
        .filter(Boolean)
    : [];

  return (
    <>
      <GlobalModal
        isOpen={!!rule}
        onClose={onClose}
        title={rule.title}
        subtitle="Society Amenities Common Policy"
        icon={MdGavel}
        size="lg"
        bodyStyle={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overflowY: "auto",
        }}
        bodyClassName="[&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-col gap-4 text-left font-sans">
          {/* Badges Bar */}
          <div className="flex items-center gap-2 flex-wrap pb-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: typeCfg.bg, color: typeCfg.color }}
            >
              <TypeIcon size={12} /> {typeCfg.label}
            </span>

            {rule.is_mandatory && (
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
              >
                <MdShield size={11} /> Mandatory
              </span>
            )}
          </div>

          {/* Description */}
          {rule.content ? (
            <div
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: "var(--text-primary)", whiteSpace: "pre-line" }}
            >
              {rule.content}
            </div>
          ) : null}

          {/* Formatted Content if available */}
          {parsedClauses.length > 0 && (
            <div
              className="p-3.5 rounded-xl border space-y-2"
              style={{
                background: "var(--card-inner-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="font-bold text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-primary)" }}>
                Detailed Guidelines:
              </div>
              {parsedClauses.map((item, idx) => {
                if (item.type === "heading") {
                  return (
                    <div
                      key={idx}
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
                    <div key={idx} className="flex items-start gap-2.5 py-1">
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
                  <div key={idx} className="flex items-start gap-2.5 py-1">
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
            <div className="space-y-2 border-t pt-3" style={{ borderColor: "var(--glass-border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Policy Documents & Attachments ({attachments.length}):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => {
                  const isPdf =
                    att.file_type === "PDF" ||
                    (att.file_name && att.file_name.toLowerCase().endsWith(".pdf"));

                  return (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
                      style={{
                        background: "var(--card-inner-bg)",
                        borderColor: "var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isPdf ? (
                          <MdPictureAsPdf className="text-rose-500 shrink-0" size={18} />
                        ) : (
                          <MdImage className="text-blue-500 shrink-0" size={18} />
                        )}
                        <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                          {att.file_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isPdf ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePdfUrl(att.file_url);
                              setActivePdfName(att.file_name);
                            }}
                            className="p-1 rounded text-accent hover:bg-accent/10 transition"
                            title="View PDF"
                          >
                            <MdOpenInNew size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveImage(att)}
                            className="p-1 rounded text-accent hover:bg-accent/10 transition"
                            title="View Image"
                          >
                            <MdOpenInNew size={16} />
                          </button>
                        )}
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-1 rounded text-secondary hover:text-primary transition"
                          title="Download"
                        >
                          <MdFileDownload size={16} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Image inline preview if selected */}
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
                className="max-h-72 w-auto mx-auto rounded-lg object-contain shadow"
              />
            </div>
          )}

          {/* Footer Close */}
          <div className="pt-3 border-t flex justify-end" style={{ borderColor: "var(--glass-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
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
