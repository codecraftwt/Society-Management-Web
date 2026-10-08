import React, { useState, useEffect } from "react";
import { FaCloudUploadAlt, FaTrash, FaImage, FaVideo, FaTimes, FaPlay } from "react-icons/fa";

export default function MultiMediaUploader({
  existingMedia = [],
  photos = [],
  videos = [],
  onPhotosChange,
  onVideosChange,
  onKeepMediaChange,
  maxPhotos = 10,
  maxVideos = 5,
}) {
  const [retainedMedia, setRetainedMedia] = useState(existingMedia);

  useEffect(() => {
    setRetainedMedia(existingMedia);
  }, [existingMedia]);

  const handleRetainRemove = (mediaId) => {
    const updated = retainedMedia.filter((m) => m.id !== mediaId);
    setRetainedMedia(updated);
    if (onKeepMediaChange) {
      onKeepMediaChange(updated.map((m) => m.id));
    }
  };

  const handleNewPhotosSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const existingPhotoCount = retainedMedia.filter((m) => m.media_type === "IMAGE").length;
    const availableSlots = maxPhotos - existingPhotoCount - photos.length;
    if (availableSlots <= 0) return;

    const validFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, availableSlots);
    onPhotosChange([...photos, ...validFiles]);
  };

  const handleRemoveNewPhoto = (index) => {
    const updated = [...photos];
    updated.splice(index, 1);
    onPhotosChange(updated);
  };

  const handleNewVideosSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const existingVideoCount = retainedMedia.filter((m) => m.media_type === "VIDEO").length;
    const availableSlots = maxVideos - existingVideoCount - videos.length;
    if (availableSlots <= 0) return;

    const validFiles = files.filter((f) => f.type.startsWith("video/")).slice(0, availableSlots);
    onVideosChange([...videos, ...validFiles]);
  };

  const handleRemoveNewVideo = (index) => {
    const updated = [...videos];
    updated.splice(index, 1);
    onVideosChange(updated);
  };

  const existingPhotos = retainedMedia.filter((m) => m.media_type === "IMAGE");
  const existingVideos = retainedMedia.filter((m) => m.media_type === "VIDEO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── PHOTO UPLOAD SECTION ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <FaImage color="var(--accent)" /> Photos ({existingPhotos.length + photos.length} / {maxPhotos})
          </label>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <FaCloudUploadAlt size={14} /> Add Photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: "none" }}
              onChange={handleNewPhotosSelect}
              disabled={existingPhotos.length + photos.length >= maxPhotos}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
          {/* Existing Photos */}
          {existingPhotos.map((item) => (
            <div key={`exist-img-${item.id}`} style={{ position: "relative", width: "100%", height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
              <img src={item.url} alt="Event Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => handleRetainRemove(item.id)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "rgba(239, 68, 68, 0.85)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaTimes size={10} />
              </button>
            </div>
          ))}

          {/* New Photos */}
          {photos.map((file, idx) => {
            const previewUrl = URL.createObjectURL(file);
            return (
              <div key={`new-img-${idx}`} style={{ position: "relative", width: "100%", height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--accent)" }}>
                <img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => handleRemoveNewPhoto(idx)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(239, 68, 68, 0.85)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaTimes size={10} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── VIDEO UPLOAD SECTION ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <FaVideo color="var(--accent)" /> Videos ({existingVideos.length + videos.length} / {maxVideos})
          </label>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <FaCloudUploadAlt size={14} /> Add Videos
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/3gpp"
              multiple
              style={{ display: "none" }}
              onChange={handleNewVideosSelect}
              disabled={existingVideos.length + videos.length >= maxVideos}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {/* Existing Videos */}
          {existingVideos.map((item) => (
            <div key={`exist-vid-${item.id}`} style={{ position: "relative", width: "100%", height: 80, borderRadius: 8, overflow: "hidden", background: "#000", border: "1px solid var(--glass-border)" }}>
              <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", pointerEvents: "none" }}>
                <FaPlay size={16} color="#fff" />
              </div>
              <button
                type="button"
                onClick={() => handleRetainRemove(item.id)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "rgba(239, 68, 68, 0.85)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                }}
              >
                <FaTimes size={10} />
              </button>
            </div>
          ))}

          {/* New Videos */}
          {videos.map((file, idx) => {
            const previewUrl = URL.createObjectURL(file);
            return (
              <div key={`new-vid-${idx}`} style={{ position: "relative", width: "100%", height: 80, borderRadius: 8, overflow: "hidden", background: "#000", border: "1px solid var(--accent)" }}>
                <video src={previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", pointerEvents: "none" }}>
                  <FaPlay size={16} color="#fff" />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveNewVideo(idx)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(239, 68, 68, 0.85)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  <FaTimes size={10} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
