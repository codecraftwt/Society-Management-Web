import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import { MdGavel, MdPictureAsPdf, MdImage, MdCheckCircle, MdWarning } from "react-icons/md";
import PdfViewer from "../common/PdfViewer";

function getCategoryBadgeStyle(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("security") || cat.includes("gate")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
      dot: "bg-amber-500",
      accent: "#f59e0b",
    };
  }
  if (cat.includes("parking") || cat.includes("vehicle")) {
    return {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-500/30",
      dot: "bg-cyan-500",
      accent: "#06b6d4",
    };
  }
  if (cat.includes("amenit") || cat.includes("clubhouse") || cat.includes("pool")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/30",
      dot: "bg-purple-500",
      accent: "#a855f7",
    };
  }
  if (cat.includes("maintenance") || cat.includes("due") || cat.includes("bill")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30",
      dot: "bg-emerald-500",
      accent: "#10b981",
    };
  }
  if (cat.includes("pet")) {
    return {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/30",
      dot: "bg-rose-500",
      accent: "#f43f5e",
    };
  }
  if (cat.includes("waste") || cat.includes("clean")) {
    return {
      bg: "bg-teal-500/10 dark:bg-teal-500/15",
      text: "text-teal-600 dark:text-teal-400",
      border: "border-teal-500/30",
      dot: "bg-teal-500",
      accent: "#14b8a6",
    };
  }
  return {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    accent: "#3b82f6",
  };
}

export default function RulesBlockingGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();

  const [pendingRules, setPendingRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState({});
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePdfName, setActivePdfName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // STRICT REQUIREMENT: Only pop up when actively inside the Resident or Family panel!
  // If the user is on /admin, /superadmin, /accountant, etc. (even if they also have resident status), DO NOT SHOW!
  const isResidentRoute =
    location.pathname.startsWith("/resident") ||
    location.pathname.startsWith("/family");

  const activeRole = user?.activeRole || user?.role || "";
  const isResidentRole =
    activeRole === "RESIDENT" ||
    activeRole === "FAMILY_MEMBER" ||
    user?.is_society_resident === true ||
    user?.resident_type === "OWNER" ||
    user?.resident_type === "TENANT";

  const targetSocietyId =
    user?.society_id || user?.activeSocietyId || user?.selectedSociety?.id;

  const fetchPendingRules = useCallback(async () => {
    if (!isResidentRoute || !isResidentRole || !targetSocietyId) return;
    try {
      setLoading(true);
      const res = await API.get("/rules/pending", {
        headers: { "x-society-id": targetSocietyId },
      });
      const rules = res.data?.pending_rules || [];
      setPendingRules(rules);
      if (rules.length === 0 && user?.has_pending_rules) {
        updateUser({ has_pending_rules: false });
      }
    } catch (err) {
      console.warn("[RulesBlockingGate] Failed to fetch pending rules:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [isResidentRoute, isResidentRole, targetSocietyId, user?.has_pending_rules, updateUser]);

  useEffect(() => {
    if (isResidentRoute && isResidentRole) {
      fetchPendingRules();
    }
  }, [isResidentRoute, isResidentRole, fetchPendingRules]);

  // If not on resident route, or not a resident role, or no pending rules, hide popup
  if (!isResidentRoute || !isResidentRole || pendingRules.length === 0) {
    return null;
  }

  const allAccepted =
    pendingRules.length > 0 &&
    pendingRules.every((rule) => checkedIds[rule.version_id]);

  const handleToggleCheck = (versionId) => {
    setCheckedIds((prev) => ({
      ...prev,
      [versionId]: !prev[versionId],
    }));
  };

  const handleAcknowledgeSingle = async (versionId) => {
    try {
      setSubmitting(true);
      setErrorMsg("");
      await API.post("/rules/acknowledge", {
        version_ids: [versionId],
        source: "LOGIN_GATE",
      });
      const remaining = pendingRules.filter((r) => r.version_id !== versionId);
      setPendingRules(remaining);
      if (remaining.length === 0) {
        updateUser({ has_pending_rules: false });
      }
    } catch (err) {
      console.error("[RulesBlockingGate] Acknowledge error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to record acknowledgement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeAll = async () => {
    if (!allAccepted || submitting) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      const versionIds = pendingRules.map((r) => r.version_id);
      await API.post("/rules/acknowledge", {
        version_ids: versionIds,
        source: "LOGIN_GATE",
      });

      setPendingRules([]);
      updateUser({ has_pending_rules: false });
    } catch (err) {
      console.error("[RulesBlockingGate] Acknowledge error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to record acknowledgement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Sleek backdrop */}
      <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-[var(--card-bg,#ffffff)] text-[var(--text-primary,#0f172a)] border border-[var(--divider,rgba(0,0,0,0.1))] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {/* Top amber warning glow stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

          {/* Header */}
          <div className="flex items-start gap-4 pb-5 border-b border-[var(--divider)]">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
              <MdWarning className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Mandatory Society Rules & Regulations
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                Your society management has updated official mandatory policies. Please review the attached documents and accept them to maintain active resident access.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-semibold flex items-center gap-2">
              <MdWarning className="text-base shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rules List */}
          <div className="mt-5 space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
            {pendingRules.map((rule) => {
              const isChecked = Boolean(checkedIds[rule.version_id]);
              const catStyle = getCategoryBadgeStyle(rule.category);
              const isImg = Boolean((rule.document_name || rule.file_url || "").match(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i));

              return (
                <div
                  key={rule.version_id}
                  className={`group relative rounded-2xl border transition-all duration-200 p-4.5 overflow-hidden ${
                    isChecked
                      ? "bg-emerald-500/5 border-emerald-500/40 shadow-xs"
                      : "bg-[var(--card-inner-bg)] border-[var(--divider)] hover:border-blue-500/40"
                  }`}
                >
                  {/* Subtle top category accent stripe */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: catStyle.accent }}
                  />

                  {/* Header of Item */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                        {rule.category || "General"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        Version {rule.version_number}
                      </span>
                    </div>

                    {rule.file_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePdfUrl(rule.file_url);
                          setActivePdfName(rule.document_name || rule.title);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                      >
                        {isImg ? <MdImage className="text-sm" /> : <MdPictureAsPdf className="text-sm" />}
                        {isImg ? "View Image" : "View Document"}
                      </button>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-base text-[var(--text-primary)] mt-3 leading-snug">
                    {rule.title}
                  </h3>
                  {rule.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                      {rule.description}
                    </p>
                  )}

                  {rule.change_summary && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <span className="font-bold shrink-0">Updates:</span>
                      <span className="italic">{rule.change_summary}</span>
                    </div>
                  )}

                  {/* Acknowledge Action Row */}
                  <div className="mt-3.5 pt-3 border-t border-[var(--divider)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(rule.version_id)}
                        className="w-4 h-4 rounded text-blue-600 border-[var(--divider)] focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        I have read, understood, and accept this policy.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAcknowledgeSingle(rule.version_id)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/20 hover:shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <MdCheckCircle className="text-sm" />
                      Mark as Read & Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-5 border-t border-[var(--divider)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">
                {Object.values(checkedIds).filter(Boolean).length} of {pendingRules.length} rules selected
              </span>
              <span className="text-gray-400">•</span>
              <button
                type="button"
                onClick={() => navigate("/resident/rules")}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Browse All Rules & Bylaws →
              </button>
            </div>

            <button
              type="button"
              disabled={!allAccepted || submitting}
              onClick={handleAcknowledgeAll}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                allAccepted && !submitting
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-blue-500/25"
                  : "bg-[var(--card-inner-bg)] text-[var(--text-secondary)] border border-[var(--divider)] cursor-not-allowed opacity-60"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <MdCheckCircle className="text-base" />
                  Accept All Selected & Continue
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PDF / Image Lightbox Popup */}
      {activePdfUrl && (
        <PdfViewer
          url={activePdfUrl}
          name={activePdfName}
          onClose={() => setActivePdfUrl(null)}
        />
      )}
    </>
  );
}
