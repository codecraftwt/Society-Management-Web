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
} from "react-icons/md";
import GlobalModal from "./GlobalModal";
import GlobalButton from "./GlobalButton";
import UserAvatar from "./UserAvatar";
import { useLang } from "../../context/LanguageContext";

/**
 * ProfilePictureCropModal
 *
 * Provides a sleek, interactive, touch & mouse friendly crop modal.
 * Features:
 *  - Mode Switcher: Full Image vs Crop Area
 *  - Perfect 1:1 Circular Crop Window with glowing accent border
 *  - Smooth Pan & Zoom slider controls + Reset button
 *  - Premium Live Avatar Preview card
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

  // Transform states for cropping (pan & zoom)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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
    const imgAspect = imageObj.width / imageObj.height;
    let baseW = width;
    let baseH = height;

    if (imgAspect > 1) {
      baseW = height * imgAspect;
      baseH = height;
    } else {
      baseW = width;
      baseH = width / imgAspect;
    }

    ctx.save();
    // Move origin to center of canvas
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(imageObj, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    // Render Overlay Mask (Dark background with circular cutout)
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, width, height);

    // Create circular clear window in center (exact 1:1 circle)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const radius = Math.min(width, height) * 0.40;
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw circular border ring with accent glow
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#9e58ff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "rgba(158, 88, 255, 0.6)";
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.restore();
  }, [imageObj, scale, offset]);

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

    const imgAspect = imageObj.width / imageObj.height;
    let baseW = size;
    let baseH = size;
    if (imgAspect > 1) {
      baseW = size * imgAspect;
      baseH = size;
    } else {
      baseW = size;
      baseH = size / imgAspect;
    }

    ctx.save();
    ctx.translate(size / 2 + offset.x * (size / 340), size / 2 + offset.y * (size / 340));
    ctx.scale(scale, scale);
    ctx.drawImage(imageObj, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    const dataUrl = offscreen.toDataURL("image/png");
    setPreviewAvatarUrl(dataUrl);
  }, [imageObj, imageUrl, mode, scale, offset]);

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
  const handleZoomIn = () => setScale((s) => Math.min(3.5, s + 0.15));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, s - 0.15));
  const handleResetTransform = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
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

    const imgAspect = imageObj.width / imageObj.height;
    let baseW = outputSize;
    let baseH = outputSize;
    if (imgAspect > 1) {
      baseW = outputSize * imgAspect;
      baseH = outputSize;
    } else {
      baseW = outputSize;
      baseH = outputSize / imgAspect;
    }

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
    ctx.drawImage(imageObj, -baseW / 2, -baseH / 2, baseW, baseH);
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Mode Selector Segmented Control */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: 4,
            borderRadius: 12,
            background: "var(--card-inner-bg)",
            border: "1.5px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("FULL")}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: mode === "FULL" ? "var(--accent)" : "transparent",
              color: mode === "FULL" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: mode === "FULL" ? "0 4px 14px rgba(158, 88, 255, 0.35)" : "none",
            }}
          >
            <MdImage size={17} />
            <span>{t("ppModeFull", "Full Image")}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("CROP")}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: mode === "CROP" ? "var(--accent)" : "transparent",
              color: mode === "CROP" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: mode === "CROP" ? "0 4px 14px rgba(158, 88, 255, 0.35)" : "none",
            }}
          >
            <MdCrop size={17} />
            <span>{t("ppModeCrop", "Crop Area")}</span>
          </button>
        </div>

        {/* Canvas & Viewport Box (Square 340x340 for 100% Perfect Circle) */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 340,
            aspectRatio: "1 / 1",
            margin: "0 auto",
            borderRadius: 20,
            overflow: "hidden",
            background: "#0a0a0f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid var(--glass-border)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            userSelect: "none",
            touchAction: "none",
          }}
        >
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
              style={{
                width: "100%",
                height: "100%",
                cursor: isDragging ? "grabbing" : "grab",
              }}
            />
          )}

          {/* Hint Badge */}
          {mode === "CROP" && (
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0, 0, 0, 0.75)",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 14px",
                borderRadius: 999,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              💡 {t("ppDragZoomHint", "Drag to position • Use slider to zoom")}
            </div>
          )}
        </div>

        {/* Interactive Controls Bar (Crop Mode Only) */}
        {mode === "CROP" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 14,
              background: "var(--card-inner-bg)",
              border: "1.5px solid var(--glass-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <button
                type="button"
                onClick={handleZoomOut}
                title={t("zoomOut", "Zoom Out")}
                style={{
                  border: "none",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  padding: "6px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
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
                style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
              />

              <button
                type="button"
                onClick={handleZoomIn}
                title={t("zoomIn", "Zoom In")}
                style={{
                  border: "none",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  padding: "6px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MdZoomIn size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetTransform}
              title={t("reset", "Reset Position")}
              style={{
                border: "none",
                background: "rgba(158, 88, 255, 0.12)",
                color: "var(--accent)",
                fontSize: 11.5,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <MdRefresh size={15} />
              <span>{t("reset", "Reset")}</span>
            </button>
          </div>
        )}

        {/* Live Avatar Preview Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 14,
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(158, 88, 255, 0.12), rgba(16, 185, 129, 0.08))",
            border: "1.5px solid rgba(158, 88, 255, 0.3)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{
            position: "relative",
            padding: 3,
            borderRadius: 18,
            background: "linear-gradient(135deg, var(--accent), #10b981)",
            boxShadow: "0 4px 14px rgba(158, 88, 255, 0.35)",
            flexShrink: 0,
          }}>
            <UserAvatar name="Preview" src={previewAvatarUrl} size={58} radius={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.01em" }}>
              ✨ {t("ppLivePreviewTitle", "Avatar Live Preview")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.35 }}>
              {t("ppLivePreviewSubtitle", "This is how your photo will look across your profile, cards, and navigation bars.")}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
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
