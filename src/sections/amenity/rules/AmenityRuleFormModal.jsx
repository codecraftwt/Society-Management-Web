import React, { useState, useEffect } from "react";
import {
  MdClose,
  MdCloudUpload,
  MdDelete,
  MdPictureAsPdf,
  MdImage,
  MdGavel,
  MdTextFields,
  MdFormatListBulleted,
  MdOutlineDescription,
} from "react-icons/md";
import GlobalModal from "../../../components/common/GlobalModal";
import { Spinner } from "../amenityHelpers.jsx";
import { createAmenityRule, updateAmenityRule } from "../../../services/amenityService";
import { useCustomAlert } from "../../../context/CustomAlertContext";

const UPLOAD_TYPES = [
  {
    type: "TEXT",
    label: "Text",
    desc: "Summary & bullet points",
    icon: MdTextFields,
  },
  {
    type: "IMAGE",
    label: "Image",
    desc: "PNG, JPG, WEBP",
    icon: MdImage,
  },
  {
    type: "PDF",
    label: "PDF",
    desc: "PDF document",
    icon: MdPictureAsPdf,
  },
];

export default function AmenityRuleFormModal({
  isOpen,
  onClose,
  editingRule = null,
  onSaved,
  activeSocietyId,
}) {
  const { showSuccess, showError, showWarning } = useCustomAlert();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    rule_type: "TEXT",
    content: "",
    formatted_content: "",
    is_mandatory: true,
  });

  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);

  useEffect(() => {
    if (editingRule) {
      const type = (editingRule.rule_type || "TEXT").toUpperCase();
      setForm({
        title: editingRule.title || "",
        rule_type: type === "IMG" || type === "IMAGE" ? "IMAGE" : type === "PDF" ? "PDF" : "TEXT",
        content: editingRule.content || "",
        formatted_content: editingRule.formatted_content || "",
        is_mandatory: editingRule.is_mandatory !== false,
      });
      setExistingAttachments(editingRule.attachments || []);
      setRemovedAttachmentIds([]);
      setNewFiles([]);
    } else {
      setForm({
        title: "",
        rule_type: "TEXT",
        content: "",
        formatted_content: "",
        is_mandatory: true,
      });
      setExistingAttachments([]);
      setRemovedAttachmentIds([]);
      setNewFiles([]);
    }
  }, [editingRule, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Filter by selected rule_type
    const filtered = files.filter((f) => {
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const isImg = f.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(f.name);
      if (form.rule_type === "IMAGE") return isImg;
      if (form.rule_type === "PDF") return isPdf;
      return true;
    });

    if (filtered.length < files.length) {
      showWarning(
        form.rule_type === "IMAGE"
          ? "Only image files (JPG, PNG, WEBP) are allowed for Image rules."
          : "Only PDF documents are allowed for PDF rules."
      );
    }

    if (!filtered.length) return;

    // Maximum 5 files total
    const totalCount =
      existingAttachments.length - removedAttachmentIds.length + newFiles.length + filtered.length;
    if (totalCount > 5) {
      showWarning("A maximum of 5 files can be attached per rule.");
      return;
    }

    setNewFiles((prev) => [...prev, ...filtered]);
    e.target.value = "";
  };

  const handleRemoveNewFile = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingAttachment = (id) => {
    setRemovedAttachmentIds((prev) => [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showWarning("Rule title is required.");
      return;
    }

    const currentAttachmentsCount =
      existingAttachments.filter((att) => !removedAttachmentIds.includes(att.id)).length +
      newFiles.length;

    if (form.rule_type === "TEXT") {
      if (!form.content.trim() && !form.formatted_content.trim()) {
        showWarning("Rule Summary / Primary Content is required for text rules.");
        return;
      }
    } else if (form.rule_type === "IMAGE") {
      if (currentAttachmentsCount === 0) {
        showWarning("Please attach at least one image policy file (JPG, PNG, WEBP).");
        return;
      }
    } else if (form.rule_type === "PDF") {
      if (currentAttachmentsCount === 0) {
        showWarning("Please attach at least one PDF policy document.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("rule_type", form.rule_type);
      // Always append content and formatted_content so clearing/removing text is sent to backend
      data.append("content", form.content ? form.content.trim() : "");
      data.append(
        "formatted_content",
        form.rule_type === "TEXT" && form.formatted_content ? form.formatted_content.trim() : ""
      );
      data.append("is_mandatory", form.is_mandatory);

      if (activeSocietyId && activeSocietyId !== "ALL") {
        data.append("society_id", activeSocietyId);
      }

      // Attach new files
      newFiles.forEach((file) => {
        data.append("files", file);
      });

      if (editingRule) {
        if (removedAttachmentIds.length > 0) {
          data.append("removed_attachment_ids", JSON.stringify(removedAttachmentIds));
        }
        await updateAmenityRule(editingRule.id, data);
        showSuccess("Amenity rule updated successfully!");
      } else {
        await createAmenityRule(data);
        showSuccess("New amenity rule created successfully!");
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Failed to save amenity rule.";
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const visibleExisting = existingAttachments.filter(
    (att) => !removedAttachmentIds.includes(att.id)
  );

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRule ? "Edit Amenities Rule & Policy" : "Define New Amenities Rule"}
      subtitle="Common rules apply automatically across all society amenities."
      icon={MdGavel}
      size="lg"
      bodyStyle={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        overflowY: "auto",
        maxHeight: "calc(90vh - 80px)",
      }}
      bodyClassName="[&::-webkit-scrollbar]:hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Rule Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Breakage & Damage Recovery Policy"
            required
            className="px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-accent transition"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Rule Uploading Type Selector (Text, Image, PDF) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Rule Uploading Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {UPLOAD_TYPES.map(({ type, label, desc, icon: IconComp }) => {
              const isSelected = form.rule_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      rule_type: type,
                      formatted_content: type === "TEXT" ? prev.formatted_content : "",
                    }));
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition text-center ${
                    isSelected ? "ring-2 ring-accent" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  style={{
                    background: isSelected ? "var(--accent-soft)" : "var(--card-inner-bg)",
                    borderColor: isSelected ? "var(--accent)" : "var(--glass-border)",
                  }}
                >
                  <IconComp
                    size={22}
                    className="mb-1"
                    style={{ color: isSelected ? "var(--accent)" : "var(--text-secondary)" }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: isSelected ? "var(--accent)" : "var(--text-primary)" }}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-secondary mt-0.5">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Conditional Section 1: For TEXT ── */}
        {form.rule_type === "TEXT" && (
          <div className="flex flex-col gap-4">
            {/* Rule Summary / Primary Content textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Rule Summary / Primary Content <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Summarize the rule policy. Residents will review this prior to submitting their booking request."
                required
                className="px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-accent transition"
                style={{
                  background: "var(--card-inner-bg)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Detailed Bullet Points & Clauses (Optional) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  <MdFormatListBulleted size={14} className="text-accent" /> Detailed Bullet Points &
                  Clauses (Optional)
                </label>
                <span className="text-[10px] text-secondary">One item per line</span>
              </div>
              <textarea
                rows={3}
                value={form.formatted_content}
                onChange={(e) => setForm({ ...form, formatted_content: e.target.value })}
                placeholder="• Resident charges: ₹500/hr, Tenant charges: ₹800/hr&#10;• A refundable deposit of ₹2,000 is required upon booking&#10;• Music must cease strictly by 10:00 PM"
                className="px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-accent transition font-mono"
                style={{
                  background: "var(--card-inner-bg)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Conditional Section 2: For IMAGE or PDF ── */}
        {(form.rule_type === "IMAGE" || form.rule_type === "PDF") && (
          <div className="space-y-3">
            {/* Optional Description / Caption */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Policy Description / Note (Optional)
              </label>
              <input
                type="text"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={
                  form.rule_type === "IMAGE"
                    ? "Brief note or caption for the image policy..."
                    : "Brief description of the policy document..."
                }
                className="px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-accent transition"
                style={{
                  background: "var(--card-inner-bg)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Policy Documents & Images Dropzone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  Policy Documents & Images (PDF, JPG, PNG) <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-secondary">
                  {form.rule_type === "IMAGE" ? "JPG, PNG, WEBP (Max 5)" : "PDF document (Max 5)"}
                </span>
              </div>

              {/* Upload Dropzone */}
              <label
                className="flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent/60 transition"
                style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
              >
                <MdCloudUpload size={30} className="text-accent mb-1.5" />
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                  {form.rule_type === "IMAGE"
                    ? "Click to select or drag images here"
                    : "Click to select or drag PDF file here"}
                </span>
                <span className="text-[10px] text-secondary mt-1">
                  {form.rule_type === "IMAGE"
                    ? "Supports JPG, JPEG, PNG, WEBP files"
                    : "Supports standard PDF documents"}
                </span>
                <input
                  type="file"
                  multiple
                  accept={
                    form.rule_type === "IMAGE"
                      ? "image/jpeg,image/png,image/webp"
                      : "application/pdf"
                  }
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Existing Attachments */}
              {visibleExisting.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <div className="text-[11px] font-semibold text-secondary">Existing Attachments:</div>
                  {visibleExisting.map((att) => {
                    const isPdf =
                      att.file_type === "PDF" ||
                      (att.file_name && att.file_name.toLowerCase().endsWith(".pdf"));
                    return (
                      <div
                        key={att.id}
                        className="p-2 rounded-lg border flex items-center justify-between text-xs"
                        style={{
                          background: "var(--card-inner-bg)",
                          borderColor: "var(--glass-border)",
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPdf ? (
                            <MdPictureAsPdf className="text-rose-500 shrink-0" size={16} />
                          ) : (
                            <MdImage className="text-blue-500 shrink-0" size={16} />
                          )}
                          <span className="truncate" style={{ color: "var(--text-primary)" }}>
                            {att.file_name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingAttachment(att.id)}
                          className="p-1 text-rose-500 hover:text-rose-600 transition"
                          title="Remove attachment"
                        >
                          <MdDelete size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Files Pending Upload */}
              {newFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <div className="text-[11px] font-semibold text-secondary">
                    Files Ready to Upload ({newFiles.length}):
                  </div>
                  {newFiles.map((file, idx) => {
                    const isPdf =
                      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg border flex items-center justify-between text-xs"
                        style={{
                          background: "rgba(160, 90, 255, 0.05)",
                          borderColor: "rgba(160, 90, 255, 0.2)",
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPdf ? (
                            <MdPictureAsPdf className="text-rose-500 shrink-0" size={16} />
                          ) : (
                            <MdImage className="text-blue-500 shrink-0" size={16} />
                          )}
                          <span
                            className="truncate font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {file.name}
                          </span>
                          <span className="text-[10px] text-secondary">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(idx)}
                          className="p-1 text-rose-500 hover:text-rose-600 transition"
                          title="Remove file"
                        >
                          <MdDelete size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mandatory Acceptance Checkbox */}
        <label
          className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
          style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
        >
          <input
            type="checkbox"
            checked={form.is_mandatory}
            onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
            className="w-4 h-4 rounded text-accent cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Mandatory Acceptance Rule
            </span>
            <p className="text-[11px] text-secondary">
              Residents cannot request or book amenities without reviewing and accepting mandatory rules.
            </p>
          </div>
        </label>

        {/* Footer Actions */}
        <div
          className="pt-3 border-t flex items-center justify-end gap-2.5 mt-1"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition shadow-md flex items-center gap-1.5 hover:opacity-95"
            style={{ background: "var(--accent)" }}
          >
            {submitting ? <Spinner cls="h-3.5 w-3.5" /> : editingRule ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </form>
    </GlobalModal>
  );
}
