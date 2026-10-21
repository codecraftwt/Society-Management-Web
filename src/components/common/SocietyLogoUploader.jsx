import { useState, useRef, useEffect } from "react";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import API from "../../services/api";
import {
  MdCloudUpload,
  MdDelete,
  MdApartment,
  MdClose,
  MdSave,
  MdCheckCircle,
  MdCameraAlt,
} from "react-icons/md";
import GlobalButton from "./GlobalButton";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * SocietyLogoUploader
 *
 * Streamlined society logo modal:
 * - Upside centered logo preview with camera hover overlay and drag-and-drop
 * - Prominent society name only (no cluttered redundant text)
 * - Clean action buttons below: Upload/Change Logo, Save, Cancel, and Remove
 */
export default function SocietyLogoUploader({
  societyId,
  societyName = "Selected Society",
  currentLogoUrl = null,
  onLogoUpdated,
  onClose,
  disabled = false,
}) {
  const { t } = useLang();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  // Reset local selection when societyId or currentLogoUrl changes
  useEffect(() => {
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setImageError(false);
  }, [societyId, currentLogoUrl]);

  const handleFileValidation = (file) => {
    if (!file) return null;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(
        t("saInvalidLogoFormat", "Unsupported file format. Please upload a PNG, JPEG, or WebP image.")
      );
      return null;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        t("saLogoTooLarge", "File is too large. Society logo must not exceed 5MB.")
      );
      return null;
    }

    return file;
  };

  const handleFileSelected = (file) => {
    const validFile = handleFileValidation(file);
    if (!validFile) return;

    if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }

    setSelectedFile(validFile);
    setSelectedPreviewUrl(URL.createObjectURL(validFile));
    setImageError(false);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploadLoading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || uploadLoading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleCancelSelection = () => {
    if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadLogo = async () => {
    if (!societyId) {
      toast.error(t("saPickSocietyFirst", "Please select a valid society first."));
      return;
    }
    if (!selectedFile) {
      toast.error(t("saSelectLogoFileFirst", "Please choose an image file to upload."));
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append("logo", selectedFile);

      const res = await API.post(`/societies/${societyId}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(t("saToastLogoSaved", "Society logo updated successfully!"));
        handleCancelSelection();
        if (typeof onLogoUpdated === "function") {
          onLogoUpdated(res.data.logo_url);
        }
        if (typeof onClose === "function") {
          onClose();
        }
      } else {
        toast.error(res.data?.message || t("saErrSaveLogo", "Failed to upload society logo."));
      }
    } catch (err) {
      console.error("Upload logo error:", err);
      toast.error(
        err.response?.data?.message ||
          t("saErrSaveLogo", "Failed to upload society logo. Please try again.")
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!societyId) return;

    if (!window.confirm(t("saConfirmRemoveLogo", "Are you sure you want to remove the society logo?"))) {
      return;
    }

    try {
      setRemoveLoading(true);
      const res = await API.delete(`/societies/${societyId}/logo`);
      if (res.data?.success) {
        toast.success(t("saToastLogoRemoved", "Society logo removed successfully."));
        handleCancelSelection();
        if (typeof onLogoUpdated === "function") {
          onLogoUpdated(null);
        }
        if (typeof onClose === "function") {
          onClose();
        }
      } else {
        toast.error(res.data?.message || t("saErrRemoveLogo", "Failed to remove society logo."));
      }
    } catch (err) {
      console.error("Remove logo error:", err);
      toast.error(
        err.response?.data?.message ||
          t("saErrRemoveLogo", "Failed to remove society logo. Please try again.")
      );
    } finally {
      setRemoveLoading(false);
    }
  };

  const activeDisplayLogo = selectedPreviewUrl || currentLogoUrl;
  const isPendingSave = Boolean(selectedFile);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center p-2 sm:p-4 w-full text-center"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled || uploadLoading || removeLoading}
      />

      {/* ── UPSIDE LOGO PREVIEW (Clickable & Drag-droppable) ── */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => {
            if (!disabled && !uploadLoading) {
              fileInputRef.current?.click();
            }
          }}
          disabled={disabled || uploadLoading}
          className={`w-36 h-36 sm:w-40 sm:h-40 rounded-3xl border-2 p-3 flex items-center justify-center relative overflow-hidden transition-all duration-200 cursor-pointer shadow-md bg-[var(--card-inner-bg)] ${
            isDragging
              ? "border-[var(--accent)] scale-105 ring-4 ring-[var(--accent)]/20"
              : isPendingSave
              ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
              : "border-[var(--glass-border)] hover:border-[var(--accent)]"
          }`}
          title={currentLogoUrl ? "Click to change logo" : "Click to upload logo"}
        >
          {activeDisplayLogo && !imageError ? (
            <img
              src={activeDisplayLogo}
              alt={`${societyName} logo`}
              className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[rgba(160,90,255,0.12)] border border-[rgba(160,90,255,0.2)] flex items-center justify-center text-[var(--accent)]">
              <MdApartment size={40} />
            </div>
          )}

          {/* Hover Camera Overlay */}
          <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
            <MdCameraAlt size={22} />
            <span>
              {isPendingSave
                ? t("change", "Change")
                : activeDisplayLogo
                ? t("edit", "Edit Logo")
                : t("upload", "Upload Logo")}
            </span>
          </span>
        </button>

        {/* Status badge pill if new file is selected */}
        {isPendingSave && (
          <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent)] text-white shadow-lg flex items-center gap-1 animate-pulse">
            <MdCheckCircle size={12} />
            {t("saNewLogoReady", "New")}
          </span>
        )}
      </div>

      {/* ── SOCIETY NAME ONLY ── */}
      <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-4 tracking-tight">
        {societyName}
      </h3>

      {/* ── UPLOAD / ACTION BUTTONS BELOW ── */}
      <div className="flex items-center gap-3 justify-center mt-5 flex-wrap w-full">
        {isPendingSave ? (
          <>
            <GlobalButton
              variant="secondary"
              icon={MdClose}
              onClick={handleCancelSelection}
              disabled={uploadLoading || removeLoading}
              size="md"
            >
              {t("cancel", "Cancel")}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              icon={MdSave}
              onClick={handleUploadLogo}
              loading={uploadLoading}
              disabled={disabled || removeLoading}
              borderDraw
              size="md"
            >
              {t("saSaveLogoBtn", "Save Logo")}
            </GlobalButton>
          </>
        ) : (
          <>
            <GlobalButton
              variant="primary"
              icon={MdCloudUpload}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploadLoading || removeLoading}
              borderDraw
              size="md"
            >
              {currentLogoUrl
                ? t("saChangeLogoBtn", "Change Logo")
                : t("saUploadLogoBtn", "Upload Logo")}
            </GlobalButton>

            {currentLogoUrl && (
              <GlobalButton
                variant="danger"
                icon={MdDelete}
                onClick={handleRemoveLogo}
                loading={removeLoading}
                disabled={disabled || uploadLoading}
                size="md"
              >
                {t("remove", "Remove Logo")}
              </GlobalButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}
