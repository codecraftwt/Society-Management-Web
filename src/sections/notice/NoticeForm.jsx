import { useMemo, useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { MdAttachFile, MdClose, MdPublic, MdHome } from "react-icons/md";

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
  const { user } = useContext(AuthContext);

  const [flatsList, setFlatsList] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);

  const activeSocId = isSuperAdmin ? form.society_id : user?.society_id;

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
            {flatsList.map((f) => {
              const blockName = f.Floor?.Block?.name || f.Block?.name || "";
              const ownerName = f.User?.name || "";
              const label = `${blockName ? `${blockName} - ` : ""}Flat ${f.flat_number}${ownerName ? ` (Owner: ${ownerName})` : ""}`;
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
              <span>{existingFileUrl ? (t("noticeReplaceHint", "Replace attachment")) : t("noticeAttachHint")}</span>
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