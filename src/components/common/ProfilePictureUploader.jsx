import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { MdPhotoCamera, MdDelete, MdUpload } from "react-icons/md";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
import { uploadMyProfilePicture, removeMyProfilePicture } from "../../services/userService";
import UserAvatar from "./UserAvatar";
import ProfilePictureCropModal from "./ProfilePictureCropModal";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

/**
 * ProfilePictureUploader
 *
 * Single authoritative component for profile picture uploads across the web app.
 *
 * Supports:
 *  - Direct API upload (Settings page) or File selection callback (Guard/Staff forms)
 *  - Interactive Crop Modal (Full Image or Crop Area with move & zoom controls)
 *  - Avatar preview & validation
 */
const ProfilePictureUploader = forwardRef(function ProfilePictureUploader(
  {
    name,
    currentUrl,
    onChange,
    onFileSelect,
    size = 72,
    showAvatar = true,
    actionsOnly = false,
    bare = false,
  },
  ref
) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const previewRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  // Crop Modal state
  const [cropFile, setCropFile] = useState(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const displayed = preview || currentUrl || null;

  /**
   * Returns an i18n key when the file is unacceptable, otherwise null.
   */
  const validate = (file) => {
    if (!file) return "ppErrType";
    if (!ACCEPTED.includes(file.type)) return "ppErrType";
    if (file.size > MAX_BYTES) return "ppErrSize";
    return null;
  };

  const showValidationError = (key) => {
    toast.error(
      key === "ppErrType"
        ? t("ppErrType", "Please choose a JPEG, PNG, WEBP, GIF, HEIC or HEIF image.")
        : t("ppErrSize", "Image is too large. Maximum size is 5MB.")
    );
  };

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const problem = validate(file);
    if (problem) {
      showValidationError(problem);
      return;
    }

    // Open Crop / Preview Modal
    setCropFile(file);
  };

  const openCropModal = (file) => {
    if (!file) return;
    const problem = validate(file);
    if (problem) {
      showValidationError(problem);
      return;
    }
    setCropFile(file);
  };

  const upload = async (file) => {
    setBusy(true);
    try {
      const url = await uploadMyProfilePicture(file);
      onChange?.(url || null);
      toast.success(t("ppUploadSuccess", "Profile picture updated."));
      return url || null;
    } catch (err) {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      toast.error(err.response?.data?.message || t("ppUploadFail", "Could not update profile picture."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleCropSave = async (finalFile) => {
    if (!finalFile) return;

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(finalFile);
    previewRef.current = url;
    setPreview(url);

    if (onFileSelect) {
      // Form mode (e.g. Guard form or Staff form)
      onFileSelect(finalFile, url);
    } else {
      // Direct API upload mode (Settings)
      await upload(finalFile);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    const problem = validate(file);
    if (problem) {
      showValidationError(problem);
      return null;
    }
    return upload(file);
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      if (!onFileSelect) {
        await removeMyProfilePicture();
      }
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      onChange?.(null);
      onFileSelect?.(null, null);
      toast.success(t("ppRemoveSuccess", "Profile picture removed."));
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || t("ppRemoveFail", "Could not remove profile picture."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({
    pick: () => inputRef.current?.click(),
    openCropModal,
    uploadFile,
    remove: handleRemove,
    validate,
    isBusy: busy,
  }));

  if (bare) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          onChange={handlePick}
          className="pp-uploader__input"
          aria-hidden="true"
          tabIndex={-1}
        />
        {cropFile && (
          <ProfilePictureCropModal
            isOpen={Boolean(cropFile)}
            onClose={() => setCropFile(null)}
            file={cropFile}
            onSave={handleCropSave}
            onPickAnother={() => {
              setCropFile(null);
              setTimeout(() => inputRef.current?.click(), 100);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className={`pp-uploader${actionsOnly ? " pp-uploader--actions" : ""}`}>
      {showAvatar && <UserAvatar name={name} src={displayed} size={size} radius={18} />}
      <div className="pp-uploader__actions">
        <button
          type="button"
          className="pp-uploader__btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? <MdUpload size={15} /> : <MdPhotoCamera size={15} />}
          <span>{currentUrl || preview ? t("ppChange", "Change photo") : t("ppUpload", "Upload photo")}</span>
        </button>

        {displayed && (
          <button
            type="button"
            className="pp-uploader__btn pp-uploader__btn--danger"
            onClick={handleRemove}
            disabled={busy}
          >
            <MdDelete size={15} />
            <span>{t("ppRemove", "Remove")}</span>
          </button>
        )}
      </div>

      <p className="pp-uploader__hint">
        {t("ppHint", "JPEG, PNG, WEBP, GIF or HEIC. Max 5MB.")}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handlePick}
        className="pp-uploader__input"
      />

      {cropFile && (
        <ProfilePictureCropModal
          isOpen={Boolean(cropFile)}
          onClose={() => setCropFile(null)}
          file={cropFile}
          onSave={handleCropSave}
          onPickAnother={() => {
            setCropFile(null);
            setTimeout(() => inputRef.current?.click(), 100);
          }}
        />
      )}
    </div>
  );
});

export default ProfilePictureUploader;
