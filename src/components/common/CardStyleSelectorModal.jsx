import React, { useState } from "react";
import { MdStyle, MdCheck, MdClose } from "react-icons/md";
import GlobalModal from "./GlobalModal";
import GlobalButton from "./GlobalButton";
import { CARD_STYLES } from "../../utils/themeUtils";
import { useLang } from "../../context/LanguageContext";

/**
 * CardStyleSelectorModal
 *
 * Visual selector modal for choosing the global statistical card style.
 * Displays 8 distinct visual style families in a clean 4-cards-per-row grid.
 */
export default function CardStyleSelectorModal({
  isOpen,
  onClose,
  currentStyle = "glass",
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
      title={t("cardStyleModalTitle", "Choose Statistical Card Style")}
      subtitle={t(
        "cardStyleModalSubtitle",
        "Choose the visual style used by statistical cards across the society management system."
      )}
      icon={MdStyle}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CARD_STYLES.map((style) => {
            const isSelected = selected === style.id;
            const sampleToneMap = {
              default: { tone: "brand", label: "Residents", val: "1,248" },
              solid: { tone: "brand", label: "Revenue", val: "₹84.2K" },
              glass: { tone: "success", label: "Guards", val: "24 Active" },
              aurora: { tone: "info", label: "Alerts", val: "0 Reports" },
              floating: { tone: "warning", label: "Visitors", val: "56 Today" },
              neon: { tone: "danger", label: "Tickets", val: "18 Open" },
              gradient: { tone: "brand", label: "Collections", val: "₹1.4M" },
              neumorphic: { tone: "success", label: "Uptime", val: "99.9%" },
              "accent-rail": { tone: "warning", label: "Flats", val: "320 Total" },
              minimal: { tone: "brand", label: "Notices", val: "12 Active" },
            };
            const sample = sampleToneMap[style.id] || sampleToneMap.default;

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
                  className={`ui-stat-card ui-stat-card--tone-${sample.tone} card-style-${style.id} w-full p-2.5 rounded-xl flex flex-col gap-1 pointer-events-none`}
                  style={{ minHeight: 68 }}
                >
                  <span
                    className="text-[9px] font-extrabold uppercase tracking-wider"
                    style={{ color: "var(--accent)" }}
                  >
                    {sample.label}
                  </span>
                  <span className="text-sm font-black text-white leading-none">
                    {sample.val}
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
