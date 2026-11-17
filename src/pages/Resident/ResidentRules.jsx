import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  MdGavel,
  MdPictureAsPdf,
  MdImage,
  MdCheckCircle,
  MdWarning,
  MdSearch,
  MdRefresh,
  MdClose,
} from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import API from "../../services/api";
import PdfViewer from "../../components/common/PdfViewer";


function getCategoryBadgeStyle(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("security") || cat.includes("gate")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/25",
      dot: "bg-amber-500",
      accent: "#f59e0b",
    };
  }
  if (cat.includes("parking") || cat.includes("vehicle")) {
    return {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-500/25",
      dot: "bg-cyan-500",
      accent: "#06b6d4",
    };
  }
  if (cat.includes("amenit") || cat.includes("clubhouse") || cat.includes("pool")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/25",
      dot: "bg-purple-500",
      accent: "#a855f7",
    };
  }
  if (cat.includes("maintenance") || cat.includes("due") || cat.includes("bill")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/25",
      dot: "bg-emerald-500",
      accent: "#10b981",
    };
  }
  if (cat.includes("pet")) {
    return {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/25",
      dot: "bg-rose-500",
      accent: "#f43f5e",
    };
  }
  if (cat.includes("waste") || cat.includes("clean")) {
    return {
      bg: "bg-teal-500/10 dark:bg-teal-500/15",
      text: "text-teal-600 dark:text-teal-400",
      border: "border-teal-500/25",
      dot: "bg-teal-500",
      accent: "#14b8a6",
    };
  }
  if (cat.includes("noise") || cat.includes("peace")) {
    return {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/25",
      dot: "bg-indigo-500",
      accent: "#6366f1",
    };
  }
  return {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/25",
    dot: "bg-blue-500",
    accent: "#3b82f6",
  };
}

export default function ResidentRules() {
  const { user } = useContext(AuthContext);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activePdfUrl, setActivePdfUrl] = useState("");
  const [activePdfTitle, setActivePdfTitle] = useState("");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const fetchRules = useCallback(async () => {
    if (!user?.society_id) return;
    try {
      setLoading(true);
      const res = await API.get(`/rules?society_id=${user.society_id}&is_active=true`);
      setRules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load rules:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.society_id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleAcknowledge = async (versionId) => {
    try {
      setAcknowledgingId(versionId);
      await API.post("/rules/acknowledge", {
        version_ids: [versionId],
        source: "PORTAL",
      });
      fetchRules();
    } catch (err) {
      console.error("Failed to acknowledge rule:", err);
      alert(err.response?.data?.message || "Failed to record acknowledgement");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const categories = ["ALL", ...new Set(rules.map((r) => r.category).filter(Boolean))];

  const filteredRules = rules.filter((r) => {
    if (selectedCategory !== "ALL" && r.category !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = (r.title || "").toLowerCase().includes(q);
      const matchCat = (r.category || "").toLowerCase().includes(q);
      const matchDesc = (r.description || "").toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--divider)] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <MdGavel className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Society Rules & Regulations
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Review published society bylaws, parking guidelines, amenities policies, and mandatory notices.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRules}
          disabled={loading}
          className="p-2.5 rounded-xl border border-[var(--divider)] bg-[var(--card-bg)] hover:bg-[var(--card-inner-bg-hover)] text-[var(--text-secondary)] transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh"
        >
          <MdRefresh className={`text-xl ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--divider)]">
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 440 }}>
          <MdSearch
            size={18}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-secondary)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          <input
            type="text"
            placeholder="Search rules by title, category, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: 42,
              paddingRight: searchTerm ? 36 : 14,
              height: 40,
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
            }}
            className="input search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search"
            >
              <MdClose size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--divider)] text-xs text-[var(--text-primary)] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-secondary)]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading rules...
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="p-12 text-center bg-[var(--card-bg)] rounded-2xl border border-[var(--divider)]">
          <MdGavel className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No rules published yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Check back later for official announcements and bylaws from your society management.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => {
            const current = rule.current_version;
            const isAcknowledged = rule.is_acknowledged;
            const catStyle = getCategoryBadgeStyle(rule.category);
            const isImg = Boolean((current?.document_name || current?.file_url || "").match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i));

            return (
              <div
                key={rule.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-[var(--card-bg)] border border-[var(--divider)] p-5 shadow-xs hover:shadow-xl hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-200 overflow-hidden"
              >
                {/* Subtle top accent gradient line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-200 opacity-75 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, ${catStyle.accent}, #6366f1, #8b5cf6)`,
                  }}
                />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                      {rule.category || "General"}
                    </span>

                    {rule.is_mandatory && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Mandatory
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-3.5 group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug">
                    {rule.title}
                  </h3>
                  {rule.description ? (
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      {rule.description}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]/50 italic mt-2">
                      No additional description provided.
                    </p>
                  )}

                  {/* Current Version & Document Info Inset */}
                  {current && (
                    <div className="mt-4 p-3.5 rounded-xl bg-[var(--card-inner-bg,var(--bg-main))] border border-[var(--divider)] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            v{current.version_number}
                          </span>
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                            Updated {new Date(current.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                          {isImg ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500">
                              <MdImage className="text-sm" /> Image
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500">
                              <MdPictureAsPdf className="text-sm" /> PDF
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5 text-xs">
                        <span className="text-[11px] text-[var(--text-secondary)] shrink-0">Document:</span>
                        <span className="truncate max-w-[200px] font-semibold text-[var(--text-primary)] text-[12px]" title={current.document_name}>
                          {current.document_name || (isImg ? "Rule Image Document" : "Rule Document.pdf")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3.5 border-t border-[var(--divider)] space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    {isAcknowledged ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                        <MdCheckCircle className="text-base" />
                        Acknowledged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500">
                        <MdWarning className="text-base animate-pulse" />
                        Pending Acceptance
                      </span>
                    )}

                    {current?.file_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePdfUrl(current.file_url);
                          setActivePdfTitle(current.document_name || rule.title);
                          setPdfViewerOpen(true);
                        }}
                        className="py-2 px-3.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 hover:shadow-md transition-all cursor-pointer"
                      >
                        {isImg ? <MdImage className="text-sm" /> : <MdPictureAsPdf className="text-sm" />}
                        {isImg ? "View Image" : "View PDF"}
                      </button>
                    )}
                  </div>

                  {!isAcknowledged && current && (
                    <button
                      type="button"
                      disabled={acknowledgingId === current.id}
                      onClick={() => handleAcknowledge(current.id)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <MdCheckCircle className="text-base" />
                      {acknowledgingId === current.id ? "Recording..." : "I Accept this Rule"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Viewer Popup Modal */}
      {pdfViewerOpen && activePdfUrl && (
        <PdfViewer
          url={activePdfUrl}
          name={activePdfTitle}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}
    </div>
  );
}

