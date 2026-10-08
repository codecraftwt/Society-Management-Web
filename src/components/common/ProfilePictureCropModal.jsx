import { useState, useRef, useEffect, useCallback } from "react";
import {
  MdPhotoCamera,
  MdCrop,
  MdZoomIn,
  MdZoomOut,
  MdRefresh,
  MdCloudUpload,
  MdCheck,
  MdClose,
  MdImage,
  MdRotateRight,
} from "react-icons/md";
import GlobalModal from "./GlobalModal";
import GlobalButton from "./GlobalButton";
import UserAvatar from "./UserAvatar";
import { useLang } from "../../context/LanguageContext";
import "./ProfilePictureCropModal.css";

/**
 * ProfilePictureCropModal
 *
 * Provides a sleek, interactive, touch & mouse friendly crop modal.
 * Features:
 *  - Mode Switcher: Full Image vs Crop Area
 *  - Perfect 1:1 Circular Crop Window with glowing accent border & alignment guides
 *  - Smooth Pan & Zoom slider controls + 90° Rotation + Reset button
 *  - Dual Live Avatar Preview (Full Profile & Compact Navbar size)
 *  - Actions: Choose Another, Cancel, Save Photo
 */
export default function ProfilePictureCropModal({
  isOpen,
  onClose,
  file,
  onSave,
  onPickAnother,
}) {
  const { t } = useLang();

  // Mode: "FULL" (Original aspect ratio) or "CROP" (Interactive crop area)
  const [mode, setMode] = useState("CROP"); // "FULL" | "CROP"

  // Image source & loaded state
  const [imageObj, setImageObj] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  // Transform states for cropping (pan, zoom, rotation)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Canvas ref
  const canvasRef = useRef(null);

  // Preview URL for live avatar preview
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(null);

  // Load image object when file changes
  useEffect(() => {
    if (!file) {
      setImageObj(null);
      setImageUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageObj(img);
      // Reset position & initial auto-scale
      setOffset({ x: 0, y: 0 });
      setScale(1);
      setRotation(0);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Render Canvas in Crop Mode
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Calculate base aspect ratio fit inside square canvas
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const naturalW = isRotated90or270 ? imageObj.height : imageObj.width;
    const naturalH = isRotated90or270 ? imageObj.width : imageObj.height;
    const imgAspect = naturalW / naturalH;

    let baseW = width;
    let baseH = height;

    if (imgAspect > 1) {
      baseW = height * imgAspect;
      baseH = height;
    } else {
      baseW = width;
      baseH = width / imgAspect;
    }

    const rawDrawW = isRotated90or270 ? baseH : baseW;
    const rawDrawH = isRotated90or270 ? baseW : baseH;

    ctx.save();
    // Move origin to center of canvas + offset
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imageObj, -rawDrawW / 2, -rawDrawH / 2, rawDrawW, rawDrawH);
    ctx.restore();

    // Render Overlay Mask (Cinematic dark background with circular cutout)
    ctx.save();
    ctx.fillStyle = "rgba(8, 10, 16, 0.78)";
    ctx.fillRect(0, 0, width, height);

    // Create circular clear window in center (exact 1:1 circle)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const radius = Math.min(width, height) * 0.40;
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw alignment guides (rule of thirds inside circle) when dragging
    if (isDragging) {
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const d = radius * 2;
      const x0 = width / 2 - radius;
      const y0 = height / 2 - radius;

      // Third lines
      ctx.beginPath();
      ctx.moveTo(x0 + d / 3, y0);
      ctx.lineTo(x0 + d / 3, y0 + d);
      ctx.moveTo(x0 + (2 * d) / 3, y0);
      ctx.lineTo(x0 + (2 * d) / 3, y0 + d);
      ctx.moveTo(x0, y0 + d / 3);
      ctx.lineTo(x0 + d, y0 + d / 3);
      ctx.moveTo(x0, y0 + (2 * d) / 3);
      ctx.lineTo(x0 + d, y0 + (2 * d) / 3);
      ctx.stroke();
      ctx.restore();
    }

    // Draw circular border ring with accent glow
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#a05aff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "rgba(160, 90, 255, 0.75)";
    ctx.shadowBlur = 14;
    ctx.stroke();

    // Draw subtle 4-cardinal tick marks on the border
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.shadowBlur = 0;
    const tickLen = 6;

    ctx.beginPath();
    // Top
    ctx.moveTo(width / 2, height / 2 - radius - tickLen);
    ctx.lineTo(width / 2, height / 2 - radius + tickLen);
    // Bottom
    ctx.moveTo(width / 2, height / 2 + radius - tickLen);
    ctx.lineTo(width / 2, height / 2 + radius + tickLen);
    // Left
    ctx.moveTo(width / 2 - radius - tickLen, height / 2);
    ctx.lineTo(width / 2 - radius + tickLen, height / 2);
    // Right
    ctx.moveTo(width / 2 + radius - tickLen, height / 2);
    ctx.lineTo(width / 2 + radius + tickLen, height / 2);
    ctx.stroke();

    ctx.restore();
  }, [imageObj, scale, offset, rotation, isDragging]);

  // Re-render canvas whenever transform or image changes
  useEffect(() => {
    if (mode === "CROP") {
      renderCanvas();
    }
  }, [mode, renderCanvas]);

  // Generate live avatar preview
  useEffect(() => {
    if (!imageObj) {
      setPreviewAvatarUrl(null);
      return;
    }

    if (mode === "FULL") {
      setPreviewAvatarUrl(imageUrl);
      return;
    }

    // Generate cropped preview blob
    const offscreen = document.createElement("canvas");
    const size = 320;
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext("2d");

    if (!ctx) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const naturalW = isRotated90or270 ? imageObj.height : imageObj.width;
    const naturalH = isRotated90or270 ? imageObj.width : imageObj.height;
    const imgAspect = naturalW / naturalH;

    let baseW = size;
    let baseH = size;
    if (imgAspect > 1) {
      baseW = size * imgAspect;
      baseH = size;
    } else {
      baseW = size;
      baseH = size / imgAspect;
    }

    const rawDrawW = isRotated90or270 ? baseH : baseW;
    const rawDrawH = isRotated90or270 ? baseW : baseH;

    ctx.save();
    ctx.translate(size / 2 + offset.x * (size / 340), size / 2 + offset.y * (size / 340));
    ctx.scale(scale, scale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imageObj, -rawDrawW / 2, -rawDrawH / 2, rawDrawW, rawDrawH);
    ctx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    setPreviewAvatarUrl(dataUrl);
  }, [imageObj, imageUrl, mode, scale, offset, rotation]);

  // Mouse & Touch Dragging Handlers
  const handlePointerDown = (e) => {
    if (mode !== "CROP") return;
    setIsDragging(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    dragStartRef.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || mode !== "CROP") return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    setOffset({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(3.5, Number((s + 0.15).toFixed(2))));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetTransform = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Export / Save Handler
  const handleSave = () => {
    if (!file || !imageObj) return;

    if (mode === "FULL") {
      // Pass original raw file
      onSave(file);
      onClose();
      return;
    }

    // Export cropped canvas image to File
    const exportCanvas = document.createElement("canvas");
    const outputSize = 512; // High resolution square export
    exportCanvas.width = outputSize;
    exportCanvas.height = outputSize;
    const ctx = exportCanvas.getContext("2d");

    if (!ctx) {
      onSave(file);
      onClose();
      return;
    }

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const naturalW = isRotated90or270 ? imageObj.height : imageObj.width;
    const naturalH = isRotated90or270 ? imageObj.width : imageObj.height;
    const imgAspect = naturalW / naturalH;

    let baseW = outputSize;
    let baseH = outputSize;
    if (imgAspect > 1) {
      baseW = outputSize * imgAspect;
      baseH = outputSize;
    } else {
      baseW = outputSize;
      baseH = outputSize / imgAspect;
    }

    const rawDrawW = isRotated90or270 ? baseH : baseW;
    const rawDrawH = isRotated90or270 ? baseW : baseH;

    ctx.save();
    // Clip circular output
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(
      outputSize / 2 + offset.x * (outputSize / 340),
      outputSize / 2 + offset.y * (outputSize / 340)
    );
    ctx.scale(scale, scale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imageObj, -rawDrawW / 2, -rawDrawH / 2, rawDrawW, rawDrawH);
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) {
          onSave(file);
          onClose();
          return;
        }
        const croppedFile = new File([blob], file.name || "profile_picture.png", {
          type: "image/png",
          lastModified: Date.now(),
        });
        onSave(croppedFile);
        onClose();
      },
      "image/png",
      0.95
    );
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("ppCropTitle", "Adjust Profile Picture")}
      subtitle={t("ppCropSubtitle", "Choose full image or position your photo inside the crop circle")}
      icon={MdPhotoCamera}
      size="md"
    >
      <div className="pp-modal-wrap">
        {/* Mode Selector Segmented Control */}
        <div className="pp-mode-tabs">
          <button
            type="button"
            onClick={() => setMode("FULL")}
            className={`pp-mode-tab ${mode === "FULL" ? "active" : ""}`}
          >
            <MdImage size={17} />
            <span>{t("ppModeFull", "Full Image")}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("CROP")}
            className={`pp-mode-tab ${mode === "CROP" ? "active" : ""}`}
          >
            <MdCrop size={17} />
            <span>{t("ppModeCrop", "Crop Area")}</span>
          </button>
        </div>

        {/* Canvas & Viewport Box (Square 340x340 for 100% Perfect Circle) */}
        <div className="pp-canvas-box">
          {mode === "FULL" ? (
            <img
              src={imageUrl}
              alt="Full Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`pp-canvas ${isDragging ? "grabbing" : ""}`}
            />
          )}

          {/* Hint Badge */}
          {mode === "CROP" && (
            <div className="pp-hint-pill">
              💡 {t("ppDragZoomHint", "Drag to position • Use controls to zoom & rotate")}
            </div>
          )}
        </div>

        {/* Interactive Controls Bar (Crop Mode Only) */}
        {mode === "CROP" && (
          <div className="pp-control-bar">
            <div className="pp-slider-group">
              <button
                type="button"
                onClick={handleZoomOut}
                title={t("zoomOut", "Zoom Out")}
                className="pp-btn-icon"
              >
                <MdZoomOut size={18} />
              </button>

              <input
                type="range"
                min="0.4"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="pp-range-slider"
                title={`${Math.round(scale * 100)}%`}
              />

              <button
                type="button"
                onClick={handleZoomIn}
                title={t("zoomIn", "Zoom In")}
                className="pp-btn-icon"
              >
                <MdZoomIn size={18} />
              </button>

              <span className="pp-zoom-level">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={handleRotate}
                title={t("ppRotate", "Rotate 90°")}
                className="pp-btn-icon"
              >
                <MdRotateRight size={18} />
              </button>

              <button
                type="button"
                onClick={handleResetTransform}
                title={t("reset", "Reset Position")}
                className="pp-btn-action-small"
              >
                <MdRefresh size={15} />
                <span>{t("reset", "Reset")}</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Avatar Preview Card (Dual Sizes: Large Profile & Compact Navbar) */}
        <div className="pp-preview-card">
          <div className="pp-preview-avatars">
            <div className="pp-avatar-ring-large" title={t("ppProfilePreview", "Profile Preview")}>
              <UserAvatar name="Preview" src={previewAvatarUrl} size={54} radius={999} />
            </div>
            <div className="pp-avatar-ring-small" title={t("ppNavbarPreview", "Navbar Preview")}>
              <UserAvatar name="Preview" src={previewAvatarUrl} size={32} radius={999} />
            </div>
          </div>

          <div className="pp-preview-info">
            <div className="pp-preview-title">
              ✨ {t("ppLivePreviewTitle", "Live Avatar Preview")}
            </div>
            <div className="pp-preview-sub">
              {t("ppLivePreviewSubtitle", "Preview how your photo appears in your profile header and navigation bar.")}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pp-footer-actions">
          <GlobalButton
            variant="secondary"
            size="sm"
            icon={MdCloudUpload}
            onClick={onPickAnother}
          >
            {t("ppChooseAnother", "Choose Another")}
          </GlobalButton>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GlobalButton
              variant="secondary"
              size="sm"
              icon={MdClose}
              onClick={onClose}
            >
              {t("cancel", "Cancel")}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              icon={MdCheck}
              onClick={handleSave}
            >
              {t("save", "Save Photo")}
            </GlobalButton>
          </div>
        </div>
      </div>
    </GlobalModal>
  );
}

