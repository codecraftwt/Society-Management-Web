import { useMemo } from "react";
import { toast } from "react-toastify";
import { MdAttachFile, MdClose } from "react-icons/md";

import { useLang } from "../../context/LanguageContext";
import { BASE_URL } from "../../config/apiConfig";
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

const imgStyle = {
  width: "100%",
  maxHeight: 220,
  objectFit: "cover",
  borderRadius: 12,
  border: "1px solid var(--glass-border)",
  background: "var(--card-inner-bg)",
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

      <div>
        <label className="sa-label">{t("noticeDescriptionLabel")}</label>
        <textarea
          className="input"
          rows={4}
          placeholder={t("noticeDescPlaceholder") || "Provide detailed information for residents..."}
          value={form.description}
          required
          style={{ resize: "none" }}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
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

      <div>
        <label className="sa-label">{t("noticeAttachmentLabel")}</label>
        {file ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {newPreviewUrl && <img src={newPreviewUrl} alt="New attachment preview" style={imgStyle} />}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 12px",
                borderRadius: 9,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <MdAttachFile size={16} style={{ color: "#10b981", flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
              >
                <MdClose size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {existingImage && <img src={existingImage} alt="Current attachment preview" style={{ ...imgStyle, marginBottom: 10 }} />}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                border: "1.5px dashed var(--glass-border)",
                background: "var(--card-inner-bg)",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
              }}
            >
              <MdAttachFile size={16} />
              <span>{existingFileUrl ? (t("noticeReplaceHint") || "Replace attachment") : t("noticeAttachHint")}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const selected = e.target.files[0];
                  e.target.value = "";
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
                }}
                style={{ display: "none" }}
              />
            </label>
            {existingFileUrl && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 12px",
                  marginTop: 10,
                  borderRadius: 9,
                  background: "rgba(160,90,255,0.08)",
                  border: "1px solid rgba(160,90,255,0.25)",
                }}
              >
                <MdAttachFile size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {existingFileName || t("noticeAttachmentLabel")}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  {t("noticeCurrent", "Current")}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}