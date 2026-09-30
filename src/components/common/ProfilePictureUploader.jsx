import { useEffect, useRef, useState } from "react";
import { MdPhotoCamera, MdDelete, MdUpload } from "react-icons/md";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
import { uploadMyProfilePicture, removeMyProfilePicture } from "../../services/userService";
import UserAvatar from "./UserAvatar";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export default function ProfilePictureUploader({ name, currentUrl, onChange, size = 72 }) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const previewRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const displayed = preview || currentUrl || null;

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error(t("ppErrType", "Please choose a JPEG, PNG, WEBP, GIF, HEIC or HEIF image."));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("ppErrSize", "Image is too large. Maximum size is 5MB."));
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    upload(file);
  };

  const upload = async (file) => {
    setBusy(true);
    try {
      const url = await uploadMyProfilePicture(file);
      onChange?.(url || null);
      toast.success(t("ppUploadSuccess", "Profile picture updated."));
    } catch (err) {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      toast.error(err.response?.data?.message || t("ppUploadFail", "Could not update profile picture."));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeMyProfilePicture();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      onChange?.(null);
      toast.success(t("ppRemoveSuccess", "Profile picture removed."));
    } catch (err) {
      toast.error(err.response?.data?.message || t("ppRemoveFail", "Could not remove profile picture."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pp-uploader">
      <UserAvatar name={name} src={displayed} size={size} radius={18} />
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
    </div>
  );
}
