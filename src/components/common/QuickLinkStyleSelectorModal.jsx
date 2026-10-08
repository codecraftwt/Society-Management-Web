import React, { useState } from "react";
import { MdStyle, MdCheck, MdClose, MdBolt } from "react-icons/md";
import GlobalModal from "./GlobalModal";
import GlobalButton from "./GlobalButton";
import { QUICK_LINK_STYLES } from "../../utils/themeUtils";
import { useLang } from "../../context/LanguageContext";

/**
 * QuickLinkStyleSelectorModal
 *
 * Visual selector modal for choosing the global quick link style.
 * Displays 8 distinct visual style families in a clean 4-cards-per-row grid.
 */
export default function QuickLinkStyleSelectorModal({
  isOpen,
  onClose,
  currentStyle = "solid",
  onSelectStyle,
}) {
  const { t } = useLang();
  const [selected, setSelected] = useState(currentStyle);

  const handleApply = () => {
    onSelectStyle?.(selected);
    onClose?.();
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("quickLinkStyleModalTitle", "Choose Quick Link Style")}
      subtitle={t(
        "quickLinkStyleModalSubtitle",
        "Choose the visual style used by quick links across the application."
      )}
      icon={MdStyle}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINK_STYLES.map((style) => {
            const isSelected = selected === style.id;
            const sampleColorMap = {
              default: { label: "Residents", color: "#2563EB" },
              solid: { label: "Payments", color: "#6366F1" },
              glass: { label: "Guards", color: "#10B981" },
              aurora: { label: "Alerts", color: "#06B6D4" },
              floating: { label: "Visitors", color: "#F59E0B" },
              neon: { label: "Notices", color: "#8B5CF6" },
              gradient: { label: "SOS Hotline", color: "#EC4899" },
              neumorphic: { label: "Amenities", color: "#14B8A6" },
              "accent-rail": { label: "Ledgers", color: "#10B981" },
              minimal: { label: "Settings", color: "#3B82F6" },
            };
            const sample = sampleColorMap[style.id] || sampleColorMap.default;

            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelected(style.id)}
                className={`group relative text-left p-3 rounded-2xl transition-all duration-200 border flex flex-col justify-between gap-2.5 cursor-pointer outline-none select-none backdrop-blur-md ${
                  isSelected
                    ? "border-2 border-[var(--accent)] shadow-md shadow-[rgba(var(--accent-rgb,160,90,255),0.2)] bg-[rgba(var(--accent-rgb,160,90,255),0.07)]"
                    : "border border-[var(--glass-border)] hover:border-[var(--accent)] hover:shadow-md hover:-translate-y-0.5 bg-[var(--card-bg)]/80"
                }`}
              >
                {/* Header label & check indicator */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {style.name}
                  </span>
                  {isSelected ? (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ background: "var(--accent)" }}
                    >
                      <MdCheck size={11} />
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-[var(--glass-border)] shrink-0 group-hover:border-[var(--accent)]" />
                  )}
                </div>

                {/* Compact Realistic Style Preview Mini-Tile */}
                <div
                  className={`quick-link quick-link-style-${style.id} w-full p-2.5 rounded-xl flex flex-col gap-1.5 pointer-events-none`}
                  style={{ minHeight: 68, "--ql-color": sample.color }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs shrink-0"
                      style={{ background: sample.color }}
                    >
                      <MdBolt size={14} />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {sample.label}
                    </span>
                  </div>
                  <span className="text-[9px] text-secondary truncate">
                    1-Click access
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--glass-border)]">
          <GlobalButton variant="secondary" size="sm" icon={MdClose} onClick={onClose}>
            {t("cancel", "Cancel")}
          </GlobalButton>
          <GlobalButton variant="primary" size="sm" icon={MdCheck} onClick={handleApply}>
            {t("applyStyle", "Apply Style")}
          </GlobalButton>
        </div>
      </div>
    </GlobalModal>
  );
}
