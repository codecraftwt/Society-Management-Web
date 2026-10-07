import { useEffect, useRef } from "react";
import { MdPhotoCamera, MdDelete } from "react-icons/md";
import { toast } from "react-toastify";

import { useLang } from "../../context/LanguageContext";
import UserAvatar from "../../components/common/UserAvatar";
import ProfilePictureUploader from "../../components/common/ProfilePictureUploader";
import {
  getNameError,
  getMobileError,
  getEmailError,
  getRequiredDateError,
} from "../../utils/validators";

/* Same accepted types / size ceiling the shared ProfilePictureUploader uses */
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const MAX_BYTES = 5 * 1024 * 1024;

/* ──────────────────────────────────────────────────────────────────────────
 * CleaningStaffForm
 * ────────────────────────────────────────────────────────────────────────── */
export default function CleaningStaffForm({
  form,
  setForm,
  mode = "create",
  photoFile,
  setPhotoFile,
  photoPreview,
  setPhotoPreview,
  existingPhoto,
}) {
  const { t } = useLang();

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  const isCreate = mode === "create";

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const setField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ── Photo ────────────────────────────────────────────────────────────── */

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error(
        t("csPhotoErrType", "Please choose a JPEG, PNG, WEBP, GIF, HEIC or HEIF image.")
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("csPhotoErrSize", "Image is too large. Maximum size is 5MB."));
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPhotoFile?.(file);
    setPhotoPreview?.(url);
  };

  const clearPhoto = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPhotoFile?.(null);
    setPhotoPreview?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const shownPhoto = photoPreview || existingPhoto || null;

  /* ── Validation ───────────────────────────────────────────────────────── */

  const nameErr = getNameError(form.name, t("csFieldName", "Name"));
  const phoneErr = form.phone ? getMobileError(form.phone, t("csFieldPhone", "Phone")) : null;
  const emailErr = form.email ? getEmailError(form.email, t("csFieldEmail", "Email")) : null;
  const joinErr = form.joining_date
    ? getRequiredDateError(form.joining_date, t("csFieldJoiningDate", "Joining date"))
    : null;

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Profile photo ─────────────────────────────────────────────── */}
      <div>
        <h4 className="cs-section-title">
          <MdPhotoCamera size={14} />
          {t("csBasicInfo", "Basic Information")}
        </h4>

        <div className="cs-photo-picker" style={{ marginTop: 10 }}>
          {isCreate ? (
            <ProfilePictureUploader
              name={form.name || "Staff"}
              currentUrl={shownPhoto}
              onFileSelect={(file, previewUrl) => {
                if (file) {
                  setPhotoFile(file);
                  if (photoPreview) URL.revokeObjectURL(photoPreview);
                  setPhotoPreview(previewUrl);
                } else {
                  clearPhoto();
                }
              }}
              size={64}
              showAvatar
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <UserAvatar name={form.name} src={shownPhoto} size={72} radius={16} />
              <p className="cs-hint" style={{ marginTop: 0 }}>
                {t(
                  "csPhotoEditLocked",
                  "The photo is set when the staff record is created and cannot be changed here."
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Core fields ────────────────────────────────────────────────── */}
      <div className="cs-grid-2">
        <div className="cs-field">
          <label className="sa-label">{t("csFieldName", "Name")} *</label>
          <input
            className="input"
            value={form.name}
            onChange={setField("name")}
            placeholder={t("csNamePlaceholder", "Full name")}
          />
          {nameErr && <p className="cs-error">{nameErr}</p>}
        </div>

        <div className="cs-field">
          <label className="sa-label">{t("csFieldPhone", "Phone")}</label>
          <input
            className="input"
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
            }
            placeholder="10-digit mobile"
          />
          {phoneErr && <p className="cs-error">{phoneErr}</p>}
        </div>

        <div className="cs-field">
          <label className="sa-label">{t("csFieldEmail", "Email")}</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={setField("email")}
            placeholder="name@example.com"
          />
          {emailErr && <p className="cs-error">{emailErr}</p>}
        </div>

        <div className="cs-field">
          <label className="sa-label">{t("csFieldDesignation", "Designation")}</label>
          <input
            className="input"
            value={form.designation}
            onChange={setField("designation")}
            placeholder={t("csDesignationPlaceholder", "e.g. Head Cleaner")}
          />
        </div>

        <div className="cs-field">
          <label className="sa-label">{t("csFieldJoiningDate", "Joining date")}</label>
          <input
            className="input"
            type="date"
            value={form.joining_date || ""}
            onChange={setField("joining_date")}
          />
          {joinErr && <p className="cs-error">{joinErr}</p>}
        </div>

        <div className="cs-field">
          <label className="sa-label">{t("csFieldAddress", "Address")}</label>
          <input
            className="input"
            value={form.address}
            onChange={setField("address")}
            placeholder={t("csAddressPlaceholder", "Locality / home address")}
          />
        </div>
      </div>
    </div>
  );
}

export { ACCEPTED_MIME, MAX_BYTES };