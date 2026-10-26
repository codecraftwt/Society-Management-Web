import { useMemo, useState, useEffect, useContext, useRef } from "react";
import { toast } from "react-toastify";
import {
  MdAttachFile,
  MdClose,
  MdPublic,
  MdHome,
  MdEditNote,
  MdInfoOutline,
  MdCloudUpload,
  MdPictureAsPdf,
  MdSwapHoriz,
} from "react-icons/md";

import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { BASE_URL } from "../../config/apiConfig";
import API from "../../services/api";
import Select from "../../components/common/Select";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
]);

const ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "gif", "webp", "svg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DESC_MAX_LENGTH = 1000;
const DESC_MIN_HEIGHT = 200;
const DESC_MAX_HEIGHT = 380;

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function NoticeForm({
  isSuperAdmin,
  societiesList,
  form,
  setForm,
  file,
  setFile,
  existingFileUrl,
}) {
  const { t } = useLang();
  const { user } = useContext(AuthContext);

  const [flatsList, setFlatsList] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const descRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeSocId = isSuperAdmin ? form.society_id : user?.society_id;

  const descLength = (form.description || "").length;
  const descPercent = Math.min(100, (descLength / DESC_MAX_LENGTH) * 100);
  const descState =
    descLength >= DESC_MAX_LENGTH ? "limit" : descLength >= DESC_MAX_LENGTH * 0.9 ? "warn" : "normal";

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.style.height = "auto";
      const nextHeight = Math.max(DESC_MIN_HEIGHT, Math.min(el.scrollHeight, DESC_MAX_HEIGHT));
      el.style.height = `${nextHeight}px`;
    });
    return () => cancelAnimationFrame(frame);
  }, [form.description]);

  useEffect(() => {
    let isMounted = true;
    if (activeSocId && form.target_type === "FLAT") {
      setLoadingFlats(true);
      API.get("/flats", {
        headers: { "x-society-id": activeSocId },
      })
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res.data)
              ? res.data
              : Array.isArray(res.data?.flats)
              ? res.data.flats
              : Array.isArray(res.data?.data)
              ? res.data.data
              : [];
            setFlatsList(list);
          }
        })
        .catch((err) => {
          console.error("Error fetching flats for notice audience:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingFlats(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activeSocId, form.target_type]);

  const newPreviewUrl = useMemo(() => {
    if (!file || !file.type?.startsWith("image/")) return null;
    const url = URL.createObjectURL(file);
    return url;
  }, [file]);

  const existingFileName = useMemo(() => {
    if (!existingFileUrl) return "";
    const raw = existingFileUrl.split("?")[0];
    return raw.split("/").pop() || "";
  }, [existingFileUrl]);

  const existingImage = useMemo(() => {
    if (!existingFileUrl || newPreviewUrl) return null;
    const raw = existingFileUrl.split("?")[0];
    const ext = raw.split(".").pop()?.toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) return null;
    return existingFileUrl.startsWith("http://") || existingFileUrl.startsWith("https://")
      ? raw
      : `${BASE_URL}${raw}`;
  }, [existingFileUrl, newPreviewUrl]);

  const applySelectedFile = (selected) => {
    if (!selected) return;
    const ext = selected.name?.split(".").pop()?.toLowerCase() || "";
    const allowedType = ALLOWED_MIMES.has(selected.type);
    const allowedExt = ALLOWED_EXTS.includes(ext) && !selected.type;
    if (!allowedType && !allowedExt) {
      toast.error(t("noticeInvalidFileType", "Invalid file type. Only PDF, JPG, PNG, WEBP, GIF and SVG are allowed."));
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error(t("noticeFileTooLarge", "File size exceeds the 10 MB limit."));
      return;
    }
    setFile(selected);
  };

  const handleFileInput = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    applySelectedFile(selected);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    applySelectedFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const newFileKind = newPreviewUrl
    ? t("noticeFileImage", "Image")
    : `${file?.name?.split(".").pop()?.toUpperCase() || "FILE"}`;

  return (
    <>
      {isSuperAdmin && (
        <div>
          <label className="sa-label">{t("noticeSociety")}</label>
          <Select
            className="input"
            value={form.society_id}
            required
            onChange={(e) => setForm({ ...form, society_id: e.target.value })}
          >
            <option value="">{t("noticeSelectSociety")}</option>
            {societiesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* ── Audience Selector ── */}
      <div>
        <label className="sa-label">{t("noticeAudience", "Audience / Visibility")}</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setForm({ ...form, target_type: "SOCIETY", target_flat_id: "" })}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: form.target_type === "SOCIETY" || !form.target_type
                ? "2px solid var(--accent, #9e58ff)"
                : "1px solid var(--glass-border)",
              background: form.target_type === "SOCIETY" || !form.target_type
                ? "rgba(160, 90, 255, 0.12)"
                : "var(--card-inner-bg)",
              color: form.target_type === "SOCIETY" || !form.target_type
                ? "var(--accent, #9e58ff)"
                : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <MdPublic size={18} />
            <span>{t("noticeAudienceSociety", "Entire Society")}</span>
          </button>

          <button
            type="button"
            onClick={() => setForm({ ...form, target_type: "FLAT" })}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: form.target_type === "FLAT"
                ? "2px solid #10b981"
                : "1px solid var(--glass-border)",
              background: form.target_type === "FLAT"
                ? "rgba(16, 185, 129, 0.12)"
                : "var(--card-inner-bg)",
              color: form.target_type === "FLAT" ? "#10b981" : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <MdHome size={18} />
            <span>{t("noticeAudienceFlat", "Specific Flat")}</span>
          </button>
        </div>
      </div>

      {/* ── Flat Selector (when Specific Flat selected) ── */}
      {form.target_type === "FLAT" && (
        <div style={{ marginTop: 2, padding: "12px", borderRadius: 10, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
          <label className="sa-label" style={{ color: "#10b981" }}>
            {t("noticeTargetFlatLabel", "Target Flat (Owner & Tenant will receive this notice)")} *
          </label>
          <Select
            className="input"
            value={form.target_flat_id || ""}
            required
            onChange={(e) => setForm({ ...form, target_flat_id: e.target.value })}
            style={{ marginTop: 4 }}
          >
            <option value="">
              {loadingFlats
                ? t("noticeLoadingFlats", "Loading flats...")
                : t("noticeSelectFlat", "-- Select Target Flat --")}
            </option>
            {flatsList
              .filter((f) => {
                const hasOwner = Boolean(f.resident_id || f.User?.name);
                const hasMembership = Boolean(f.FlatMemberships && f.FlatMemberships.length > 0);
                return hasOwner || hasMembership;
              })
              .map((f) => {
                const blockName = f.Floor?.Block?.name || f.Block?.name || "";
                const tenantMembership = f.FlatMemberships?.find(
                  (m) => m.member_type === "TENANT" && m.is_active !== false && (m.User?.name || m.user?.name)
                );
                const tenantUser = f.User?.resident_type === "TENANT" ? f.User : null;
                const tenantName = tenantMembership?.User?.name || tenantMembership?.user?.name || tenantUser?.name;
                const ownerName = f.User?.resident_type !== "TENANT" ? f.User?.name : "";

                let occupantLabel = "";
                if (tenantName) {
                  occupantLabel = ` (Tenant: ${tenantName})`;
                } else if (ownerName) {
                  occupantLabel = ` (Owner: ${ownerName})`;
                } else if (f.User?.name) {
                  occupantLabel = ` (Resident: ${f.User.name})`;
                }

                const label = `${blockName ? `${blockName} - ` : ""}Flat ${f.flat_number}${occupantLabel}`;
                return (
                  <option key={f.id} value={f.id}>
                    {label}
                  </option>
                );
              })}
          </Select>
          <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: "6px 0 0 4px" }}>
            {t("noticeTargetFlatHint", "Only authorized residents/tenants of this flat and society admins can see this notice.")}
          </p>
        </div>
      )}

      <div>
        <label className="sa-label">{t("noticeTitleLabel")}</label>
        <input
          className="input"
          placeholder={t("noticeTitlePlaceholder") || "e.g. Water Tank Cleaning Schedule"}
          value={form.title}
          required
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div className="notice-desc-field">
        <div className="notice-desc-head">
          <label className="sa-label notice-desc-label" htmlFor="notice-description">
            <MdEditNote size={16} aria-hidden="true" />
            <span>{t("noticeDescriptionLabel")}</span>
          </label>
          <span className={`notice-desc-count is-${descState}`} aria-hidden="true">
            <strong>{descLength}</strong>
            <span className="notice-desc-count-sep">/</span>
            {DESC_MAX_LENGTH}
          </span>
        </div>

        <div className={`notice-desc-shell is-${descState}`}>
          <textarea
            id="notice-description"
            ref={descRef}
            className="notice-desc-input"
            rows={7}
            maxLength={DESC_MAX_LENGTH}
            placeholder={t("noticeDescPlaceholder") || "Provide detailed information for residents..."}
            value={form.description}
            required
            aria-describedby="notice-description-help"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="notice-desc-footer">
            <span className="notice-desc-tip" id="notice-description-help">
              <MdInfoOutline size={14} aria-hidden="true" />
              <span>{t("noticeDescTip", "Be clear and specific. Line breaks are supported.")}</span>
            </span>
            <span className="notice-desc-track" aria-hidden="true">
              <span className="notice-desc-bar" style={{ width: `${descPercent}%` }} />
            </span>
          </div>
        </div>
      </div>


      {/* Acknowledgement Required Checkbox */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, padding: "12px", borderRadius: 10, background: "rgba(160,90,255,0.06)", border: "1px solid rgba(160,90,255,0.15)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.acknowledgement_required}
            onChange={(e) => setForm({ ...form, acknowledgement_required: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t("noticeAckRequired") || "Acknowledgement Required"}
          </span>
        </label>
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, paddingLeft: 28 }}>
          {t("noticeAckHelper") || "Recipients must open the notice and explicitly mark it as read."}
        </p>
      </div>

      <div className="notice-upload-field">
        <div className="notice-upload-head">
          <label className="sa-label notice-upload-label" htmlFor="notice-file-input">
            <MdAttachFile size={15} aria-hidden="true" />
            <span>{t("noticeAttachmentLabel")}</span>
          </label>
        </div>

        <input
          id="notice-file-input"
          ref={fileInputRef}
          type="file"
          className="notice-upload-input"
          accept="image/*,application/pdf"
          onChange={handleFileInput}
        />

        {file ? (
          <div className="notice-upload-card is-new">
            {newPreviewUrl ? (
              <img className="notice-upload-thumb" src={newPreviewUrl} alt={t("noticeNewPreview", "New attachment preview")} />
            ) : (
              <span className="notice-upload-doc" aria-hidden="true">
                <MdPictureAsPdf size={24} />
                <small>{newFileKind}</small>
              </span>
            )}
            <div className="notice-upload-meta">
              <span className="notice-upload-name" title={file.name}>
                {file.name}
              </span>
              <span className="notice-upload-sub">
                {formatFileSize(file.size)} · {newFileKind}
                {existingFileUrl ? ` · ${t("noticeReplacesCurrent", "Replaces current attachment")}` : ""}
              </span>
            </div>
            <div className="notice-upload-actions">
              <button
                type="button"
                className="notice-upload-action"
                onClick={openFilePicker}
                title={t("replace", "Replace")}
              >
                <MdSwapHoriz size={15} aria-hidden="true" />
                <span>{t("replace", "Replace")}</span>
              </button>
              <button
                type="button"
                className="notice-upload-remove"
                onClick={() => setFile(null)}
                aria-label={t("remove", "Remove")}
                title={t("remove", "Remove")}
              >
                <MdClose size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {existingFileUrl && (
              <div className="notice-upload-card is-existing">
                {existingImage ? (
                  <img className="notice-upload-thumb" src={existingImage} alt={t("noticeCurrentPreview", "Current attachment preview")} />
                ) : (
                  <span className="notice-upload-doc" aria-hidden="true">
                    <MdAttachFile size={22} />
                  </span>
                )}
                <div className="notice-upload-meta">
                  <span className="notice-upload-name" title={existingFileName}>
                    {existingFileName || t("noticeAttachmentLabel")}
                  </span>
                  <span className="notice-upload-sub">{t("noticeCurrentAttachment", "Current attachment")}</span>
                </div>
                <span className="notice-upload-tag">{t("noticeCurrent", "Current")}</span>
              </div>
            )}

            <label
              htmlFor="notice-file-input"
              className={`notice-dropzone${isDragging ? " is-dragging" : ""}${existingFileUrl ? " is-compact" : ""}`}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFilePicker();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={t("noticeDropAria", "Upload attachment by clicking or dropping a file here")}
            >
              <span className="notice-dropzone-icon" aria-hidden="true">
                <MdCloudUpload size={existingFileUrl ? 22 : 30} />
              </span>
              <span className="notice-dropzone-copy">
                <strong>
                  {existingFileUrl
                    ? t("noticeReplaceDropTitle", "Drop a new file to replace")
                    : t("noticeDropTitle", "Click to upload or drag & drop")}
                </strong>
                <span>{t("noticeDropSubtitle", "PDF or image · up to 10 MB")}</span>
              </span>
              <span className="notice-dropzone-cta">{t("browse", "Browse")}</span>
            </label>

            <div className="notice-upload-formats" aria-hidden="true">
              <span>PDF</span>
              <span>JPG</span>
              <span>PNG</span>
              <span>WEBP</span>
              <span>GIF</span>
              <span>SVG</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}