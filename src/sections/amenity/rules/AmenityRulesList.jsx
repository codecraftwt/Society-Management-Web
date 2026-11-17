import React, { useState, useEffect, useMemo } from "react";
import {
  MdAdd,
  MdGavel,
  MdShield,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdPictureAsPdf,
  MdImage,
  MdSearch,
  MdOutlineInbox,
  MdCheckCircle,
  MdAttachFile,
  MdTextFields,
} from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { useCustomAlert } from "../../../context/CustomAlertContext";
import StatCard from "../../../components/common/StatCard";
import GlobalModal from "../../../components/common/GlobalModal";
import { Spinner } from "../amenityHelpers.jsx";
import {
  getAdminAmenityRules,
  deleteAmenityRule,
} from "../../../services/amenityService";
import AmenityRuleFormModal from "./AmenityRuleFormModal";
import AmenityRulePreviewModal from "./AmenityRulePreviewModal";

const TYPE_CONFIG = {
  TEXT: { label: "Text Rule", color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)", icon: MdTextFields },
  IMAGE: { label: "Image Policy", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", icon: MdImage },
  PDF: { label: "PDF Document", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", icon: MdPictureAsPdf },
};

export default function AmenityRulesList({
  canEdit = true,
  isMobile = false,
  activeSocietyId,
}) {
  const { t } = useLang();
  const { showSuccess, showError } = useCustomAlert();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [previewRule, setPreviewRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await getAdminAmenityRules(activeSocietyId);
      const data = Array.isArray(res) ? res : res?.rules || res?.data || [];
      setRules(data);
    } catch (err) {
      console.error(err);
      showError("Failed to load amenities rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [activeSocietyId]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const rType = (r.rule_type || "TEXT").toUpperCase();
      const matchType = typeFilter === "ALL" || rType === typeFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.content && r.content.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [rules, typeFilter, search]);

  const stats = useMemo(() => {
    const total = rules.length;
    const mandatory = rules.filter((r) => r.is_mandatory).length;
    const withDocs = rules.filter(
      (r) => r.attachments && r.attachments.length > 0
    ).length;
    return { total, mandatory, withDocs };
  }, [rules]);

  const handleDeleteConfirm = async () => {
    if (!deletingRule) return;
    setDeleting(true);
    try {
      await deleteAmenityRule(deletingRule.id);
      showSuccess("Amenity rule deactivated successfully.");
      setDeletingRule(null);
      loadRules();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Failed to delete amenity rule.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          icon={MdGavel}
          label="Total Society Rules"
          value={stats.total}
          subtext="Active across all amenities"
          color="accent"
        />
        <StatCard
          icon={MdShield}
          label="Mandatory Policies"
          value={stats.mandatory}
          subtext="Require resident agreement"
          color="rose"
        />
        <StatCard
          icon={MdAttachFile}
          label="Attached Documents"
          value={stats.withDocs}
          subtext="PDFs and policy images"
          color="sky"
        />
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 max-w-md"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--glass-border)",
          }}
        >
          <MdSearch size={18} className="text-secondary shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules, breakage policies, deposits..."
            className="w-full text-xs bg-transparent border-none outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {/* Filter Pills & Add Rule Button */}
        <div className="flex items-center gap-2">
          <div
            style={{
              display: "inline-flex",
              padding: 3,
              gap: 3,
              background: "var(--card-inner-bg)",
              border: "1.5px solid var(--glass-border)",
              borderRadius: 12,
            }}
          >
            {[
              { key: "ALL", label: "All" },
              { key: "TEXT", label: "Text" },
              { key: "IMAGE", label: "Images" },
              { key: "PDF", label: "PDFs" },
            ].map(({ key, label }) => {
              const active = typeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 9,
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.18s",
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#fff" : "var(--text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingRule(null);
                setFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer transition shadow-sm hover:opacity-95 shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <MdAdd size={16} />
              <span>Add Society Amenity Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Rules Content */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <Spinner />
        </div>
      ) : filteredRules.length === 0 ? (
        <div
          className="p-10 text-center rounded-2xl border"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--glass-border)",
          }}
        >
          <MdOutlineInbox size={42} className="text-secondary opacity-30 mx-auto mb-2" />
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            No Amenity Rules Defined Yet
          </h3>
          <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
            Society-wide rules apply automatically across all amenities (e.g., owner/tenant charges, damage recovery, cancellation policies).
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingRule(null);
                setFormOpen(true);
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-95"
              style={{ background: "var(--accent)" }}
            >
              Create First Amenity Rule
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => {
            const rawType = (rule.rule_type || "TEXT").toUpperCase();
            const typeKey = rawType === "IMG" || rawType === "IMAGE" ? "IMAGE" : rawType === "PDF" ? "PDF" : "TEXT";
            const typeCfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.TEXT;
            const TypeIcon = typeCfg.icon;
            const attachments = rule.attachments || [];

            return (
              <div
                key={rule.id}
                className="p-4 rounded-2xl border flex flex-col justify-between gap-3 transition hover:shadow-md"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Rule Type Pill & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: typeCfg.bg, color: typeCfg.color }}
                      >
                        <TypeIcon size={12} /> {typeCfg.label}
                      </span>

                      {rule.is_mandatory && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                          }}
                        >
                          <MdShield size={11} /> Mandatory
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-secondary font-mono">
                      #{rule.id}
                    </span>
                  </div>

                  {/* Title */}
                  <h4
                    className="text-sm font-bold leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {rule.title}
                  </h4>

                  {/* Content snippet */}
                  {rule.content ? (
                    <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                      {rule.content}
                    </p>
                  ) : null}

                  {/* Formatted snippet */}
                  {rule.formatted_content ? (
                    <div
                      className="p-2.5 rounded-xl border text-[11px] space-y-1 font-sans leading-relaxed"
                      style={{
                        background: "var(--card-inner-bg)",
                        borderColor: "var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {rule.formatted_content
                        .split("\n")
                        .slice(0, 2)
                        .map((line, idx) => (
                          <div key={idx} className="truncate">
                            {line}
                          </div>
                        ))}
                      {rule.formatted_content.split("\n").length > 2 && (
                        <span className="text-[10px] text-accent font-sans">
                          +{rule.formatted_content.split("\n").length - 2} more clauses...
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Attachments preview row */}
                  {attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {attachments.map((att) => {
                        const isPdf =
                          att.file_type === "PDF" ||
                          (att.file_name && att.file_name.toLowerCase().endsWith(".pdf"));
                        return (
                          <span
                            key={att.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px]"
                            style={{
                              background: "var(--card-inner-bg)",
                              borderColor: "var(--glass-border)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {isPdf ? (
                              <MdPictureAsPdf size={13} className="text-rose-500" />
                            ) : (
                              <MdImage size={13} className="text-blue-500" />
                            )}
                            <span className="truncate max-w-[120px]">
                              {att.file_name}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div
                  className="pt-3 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewRule(rule)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-accent transition cursor-pointer"
                  >
                    <MdVisibility size={15} />
                    <span>View Details</span>
                  </button>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRule(rule);
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                        title="Edit Rule"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRule(rule)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Deactivate Rule"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <AmenityRuleFormModal
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingRule(null);
          }}
          editingRule={editingRule}
          onSaved={loadRules}
          activeSocietyId={activeSocietyId}
        />
      )}

      {/* Preview Modal */}
      {previewRule && (
        <AmenityRulePreviewModal
          rule={previewRule}
          onClose={() => setPreviewRule(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRule && (
        <GlobalModal
          isOpen={!!deletingRule}
          onClose={() => setDeletingRule(null)}
          title="Deactivate Amenity Rule"
          subtitle="Are you sure you want to deactivate this rule?"
          icon={MdDelete}
          size="sm"
        >
          <div className="p-1 space-y-3 text-left">
            <p className="text-xs text-secondary leading-relaxed">
              Deactivating <strong>"{deletingRule.title}"</strong> will stop requiring it for new amenity bookings. Existing booking acceptance audit records will be securely preserved.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRule(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer flex items-center gap-1.5"
              >
                {deleting ? <Spinner cls="h-3 w-3" /> : "Deactivate"}
              </button>
            </div>
          </div>
        </GlobalModal>
      )}
    </div>
  );
}
