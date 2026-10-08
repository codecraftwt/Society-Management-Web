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
  MdRotateLeft,
  MdFlip,
  MdRadioButtonUnchecked,
  MdCropSquare,
  MdCenterFocusStrong,
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
 *  - Shape Switcher: Circle (1:1), Square (1:1), Full Image
 *  - Interactive Canvas: Pan, Smooth Zoom (slider + mouse wheel + pinch), 90° Rotate Left/Right, Flip Horizontal
 *  - Reset & Center Focus
 *  - Dual Live Avatar Preview (Full Profile 54px & Compact Navbar 32px)
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

  // Mode: "FULL" (Original aspect ratio) or "CROP"
  const [mode, setMode] = useState("CROP"); // "FULL" | "CROP"
  const [shape, setShape] = useState("CIRCLE"); // "CIRCLE" | "SQUARE"

  // Image source & loaded state
  const [imageObj, setImageObj] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  // Transform states for cropping (pan, zoom, rotation, flip)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
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
      setFlipH(false);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Wheel zoom handler
  const handleWheel = useCallback((e) => {
    if (mode !== "CROP") return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => Math.min(Math.max(0.4, Number((prev + delta).toFixed(2))), 3.5));
  }, [mode]);

  // Attach wheel listener with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

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
    ctx.scale(scale * (flipH ? -1 : 1), scale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imageObj, -rawDrawW / 2, -rawDrawH / 2, rawDrawW, rawDrawH);
    ctx.restore();

    // Render Overlay Mask (Dark background ONLY OUTSIDE the crop shape)
    ctx.save();
    ctx.fillStyle = "rgba(10, 12, 20, 0.62)";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    const radius = Math.min(width, height) * 0.40;
    if (shape === "CIRCLE") {
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2, true);
    } else {
      const boxSize = radius * 2;
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(width / 2 - radius, height / 2 - radius, boxSize, boxSize, 20);
      } else {
        ctx.rect(width / 2 - radius, height / 2 - radius, boxSize, boxSize);
      }
    }
    ctx.fill("evenodd");
    ctx.restore();

    // Draw alignment guides (rule of thirds inside window when dragging)
    if (isDragging) {
      ctx.save();
      ctx.beginPath();
      if (shape === "CIRCLE") {
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      } else {
        const boxSize = radius * 2;
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(width / 2 - radius, height / 2 - radius, boxSize, boxSize, 20);
        } else {
          ctx.rect(width / 2 - radius, height / 2 - radius, boxSize, boxSize);
        }
      }
      ctx.clip();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const left = width / 2 - radius;
      const top = height / 2 - radius;
      const size = radius * 2;

      ctx.beginPath();
      ctx.moveTo(left + size / 3, top);
      ctx.lineTo(left + size / 3, top + size);
      ctx.moveTo(left + (size * 2) / 3, top);
      ctx.lineTo(left + (size * 2) / 3, top + size);

      ctx.moveTo(left, top + size / 3);
      ctx.lineTo(left + size, top + size / 3);
      ctx.moveTo(left, top + (size * 2) / 3);
      ctx.lineTo(left + size, top + (size * 2) / 3);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Outer Crop Window Glowing Border
    ctx.save();
    ctx.strokeStyle = "rgba(168, 85, 247, 0.95)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(168, 85, 247, 0.6)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (shape === "CIRCLE") {
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    } else {
      const boxSize = radius * 2;
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(width / 2 - radius, height / 2 - radius, boxSize, boxSize, 20);
      } else {
        ctx.rect(width / 2 - radius, height / 2 - radius, boxSize, boxSize);
      }
    }
    ctx.stroke();
    ctx.restore();

    // Render Center Point Crosshair
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [imageObj, offset, scale, rotation, flipH, isDragging, shape]);

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
    ctx.scale(scale * (flipH ? -1 : 1), scale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imageObj, -rawDrawW / 2, -rawDrawH / 2, rawDrawW, rawDrawH);
    ctx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    setPreviewAvatarUrl(dataUrl);
  }, [imageObj, imageUrl, mode, scale, offset, rotation, flipH]);

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

  // Zoom and transform controls
  const handleZoomIn = () => setScale((s) => Math.min(3.5, Number((s + 0.15).toFixed(2))));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))));
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);
  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const handleFlipH = () => setFlipH((f) => !f);
  const handleCenter = () => setOffset({ x: 0, y: 0 });
  const handleResetTransform = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
  };

  // Export / Save Handler
  const handleSave = () => {
    if (!file || !imageObj) return;

    if (mode === "FULL") {
      onSave(file);
      onClose();
      return;
    }

    const exportCanvas = document.createElement("canvas");
    const outputSize = 512;
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
    ctx.beginPath();
    if (shape === "CIRCLE") {
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    } else {
      ctx.roundRect(0, 0, outputSize, outputSize, 32);
    }
    ctx.clip();

    ctx.translate(
      outputSize / 2 + offset.x * (outputSize / 340),
      outputSize / 2 + offset.y * (outputSize / 340)
    );
    ctx.scale(scale * (flipH ? -1 : 1), scale);
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
        {/* Mode & Shape Segmented Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="pp-mode-tabs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMode("CROP")}
              className={`pp-mode-tab ${mode === "CROP" ? "active" : ""}`}
            >
              <MdCrop size={17} />
              <span>{t("ppModeCrop", "Crop Area")}</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("FULL")}
              className={`pp-mode-tab ${mode === "FULL" ? "active" : ""}`}
            >
              <MdImage size={17} />
              <span>{t("ppModeFull", "Full Image")}</span>
            </button>
          </div>

          {mode === "CROP" && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card-inner border border-glass">
              <button
                type="button"
                onClick={() => setShape("CIRCLE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  shape === "CIRCLE"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
                title="Circular Crop"
              >
                <MdRadioButtonUnchecked size={15} />
                <span>Circle</span>
              </button>
              <button
                type="button"
                onClick={() => setShape("SQUARE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  shape === "SQUARE"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
                title="Square Crop"
              >
                <MdCropSquare size={15} />
                <span>Square</span>
              </button>
            </div>
          )}
        </div>

        {/* Canvas & Viewport Box */}
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
              💡 {t("ppDragZoomHint", "Drag to position • Scroll or slider to zoom")}
            </div>
          )}
        </div>

        {/* Interactive Controls Bar (Crop Mode Only) */}
        {mode === "CROP" && (
          <div className="pp-control-bar">
            {/* Zoom Slider */}
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

            {/* Quick Actions (Rotate L/R, Flip, Center, Reset) */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleRotateLeft}
                title="Rotate Left 90°"
                className="pp-btn-icon"
              >
                <MdRotateLeft size={17} />
              </button>

              <button
                type="button"
                onClick={handleRotateRight}
                title={t("ppRotate", "Rotate Right 90°")}
                className="pp-btn-icon"
              >
                <MdRotateRight size={17} />
              </button>

              <button
                type="button"
                onClick={handleFlipH}
                title="Flip Horizontal"
                className={`pp-btn-icon ${flipH ? "text-accent border-accent" : ""}`}
              >
                <MdFlip size={17} />
              </button>

              <button
                type="button"
                onClick={handleCenter}
                title="Center Photo"
                className="pp-btn-icon"
              >
                <MdCenterFocusStrong size={17} />
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
              <UserAvatar name="Preview" src={previewAvatarUrl} size={54} radius={shape === "CIRCLE" ? 999 : 14} />
            </div>
            <div className="pp-avatar-ring-small" title={t("ppNavbarPreview", "Navbar Preview")}>
              <UserAvatar name="Preview" src={previewAvatarUrl} size={32} radius={shape === "CIRCLE" ? 999 : 8} />
            </div>
          </div>

          <div className="pp-preview-info">
            <div className="pp-preview-title">
              ✨ {t("ppLivePreviewTitle", "Live Avatar Preview")}
            </div>
            <div className="pp-preview-sub">
              {t("ppLivePreviewSubtitle", "Real-time preview across resident directory, mobile app cards, and navigation.")}
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
