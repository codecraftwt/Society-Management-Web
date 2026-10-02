import { useState, useMemo } from "react";
import { MdClose, MdSearch, MdCheck, MdClear } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";

export default function SocietyFilterModal({
  isOpen,
  onClose,
  societies = [],
  selectedSocietyId = "",
  onSelectSociety,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSocieties = useMemo(() => {
    if (!searchTerm.trim()) return societies;
    const term = searchTerm.toLowerCase().trim();
    return societies.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(term) ||
        (s.city || "").toLowerCase().includes(term) ||
        (s.address || "").toLowerCase().includes(term) ||
        String(s.id).includes(term)
    );
  }, [societies, searchTerm]);

  if (!isOpen) return null;

  const isAllSelected = !selectedSocietyId || selectedSocietyId === "ALL" || selectedSocietyId === "";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1300,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl animate-scaleIn bg-card border overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
        style={{
          borderColor: "var(--glass-border)",
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter by Society"
      >
        {/* Header */}
        <div
          className="p-5 border-b relative shrink-0 flex items-center justify-between gap-3"
          style={{
            borderColor: "var(--glass-border)",
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: "rgba(124, 58, 237, 0.18)",
                border: "1.5px solid rgba(124, 58, 237, 0.3)",
                color: "#a78bfa",
              }}
            >
              <FaBuilding size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary m-0">
                Filter Parcels by Society
              </h2>
              <p className="text-xs text-secondary mt-0.5 m-0">
                Select a society to view its parcels or select All Societies for global oversight.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-inner transition-colors cursor-pointer"
            aria-label="Close"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: "var(--glass-border)" }}>
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border"
            style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
          >
            <MdSearch size={18} className="text-secondary shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search society by name, city, ID…"
              className="w-full bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-secondary hover:text-primary p-1"
              >
                <MdClear size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Societies List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Option: All Societies */}
          <button
            type="button"
            onClick={() => {
              onSelectSociety("ALL");
              onClose();
            }}
            className="w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer hover:shadow-md"
            style={{
              background: isAllSelected
                ? "rgba(124, 58, 237, 0.12)"
                : "var(--card-inner-bg)",
              borderColor: isAllSelected ? "var(--accent)" : "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isAllSelected ? "var(--accent)" : "rgba(148, 163, 184, 0.15)",
                  color: isAllSelected ? "#ffffff" : "var(--text-secondary)",
                }}
              >
                <FaBuilding size={18} />
              </span>
              <div>
                <h4 className="text-sm font-bold text-primary m-0">All Societies</h4>
                <p className="text-xs text-secondary mt-0.5 m-0">
                  View parcels across all registered societies
                </p>
              </div>
            </div>
            {isAllSelected && (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--accent)", color: "#ffffff" }}
              >
                <MdCheck size={16} />
              </span>
            )}
          </button>

          {/* Individual Societies */}
          {filteredSocieties.length === 0 ? (
            <div className="py-8 text-center text-secondary text-sm">
              No societies match &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {filteredSocieties.map((soc) => {
                const isSelected = String(soc.id) === String(selectedSocietyId);
                return (
                  <button
                    key={soc.id}
                    type="button"
                    onClick={() => {
                      onSelectSociety(String(soc.id));
                      onClose();
                    }}
                    className="text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 cursor-pointer hover:shadow-md"
                    style={{
                      background: isSelected
                        ? "rgba(124, 58, 237, 0.12)"
                        : "var(--card-inner-bg)",
                      borderColor: isSelected ? "var(--accent)" : "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--card-bg)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ID #{soc.id}
                      </span>
                      {isSelected && (
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "var(--accent)", color: "#ffffff" }}
                        >
                          <MdCheck size={14} />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary truncate m-0">
                        {soc.name}
                      </h4>
                      <p className="text-xs text-secondary line-clamp-1 mt-0.5 m-0">
                        {soc.city || soc.address || "Society Community"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <span className="text-xs text-secondary">
            {societies.length} societies registered
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
            style={{
              borderColor: "var(--glass-border)",
              background: "var(--card-inner-bg)",
              color: "var(--text-primary)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
