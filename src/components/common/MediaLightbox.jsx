import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FaTimes, FaChevronLeft, FaChevronRight, FaPlay, FaDownload, FaFileArchive } from "react-icons/fa";
import { downloadMediaFile, downloadMediaZip } from "../../utils/downloadMedia";

const circleBtn = {
  background: "rgba(255, 255, 255, 0.15)",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  transition: "background 0.2s ease",
};

const pillBtn = {
  background: "rgba(255, 255, 255, 0.15)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 14px",
  whiteSpace: "nowrap",
  transition: "background 0.2s ease",
};

export default function MediaLightbox({ isOpen, mediaList = [], initialIndex = 0, onClose, downloadName }) {
  const list = Array.isArray(mediaList) ? mediaList : [];
  const listLen = list.length;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevProps, setPrevProps] = useState({ open: isOpen, idx: initialIndex });
  const [savingOne, setSavingOne] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 });
  const thumbRefs = useRef([]);

  if (prevProps.open !== isOpen || prevProps.idx !== initialIndex) {
    setPrevProps({ open: isOpen, idx: initialIndex });
    if (isOpen) {
      const max = Math.max(listLen - 1, 0);
      setCurrentIndex(Math.min(Math.max(initialIndex || 0, 0), max));
      setSavingOne(false);
      setZipping(false);
      setZipProgress({ done: 0, total: 0 });
    }
  }

  const safeIndex = Math.min(currentIndex, Math.max(listLen - 1, 0));

  useEffect(() => {
    if (!isOpen || listLen < 2) return;
    const el = thumbRefs.current[safeIndex];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [safeIndex, isOpen, listLen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev < listLen - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : listLen - 1));
      } else if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, listLen, onClose]);

  if (!isOpen || listLen === 0) return null;

  const currentItem = list[safeIndex] || list[0];
  const hasMultiple = listLen > 1;
  const mediaMaxHeight = hasMultiple ? "calc(100vh - 210px)" : "80vh";

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : listLen - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < listLen - 1 ? prev + 1 : 0));
  };

  const handleDownloadCurrent = async (e) => {
    e.stopPropagation();
    if (savingOne || zipping) return;
    setSavingOne(true);
    try {
      const res = await downloadMediaFile(currentItem, safeIndex);
      if (res.ok) toast.success("Download started");
      else toast.info("Opened in a new tab — right-click to save");
    } catch {
      toast.error("Download failed");
    } finally {
      setSavingOne(false);
    }
  };

  const handleDownloadAll = async (e) => {
    e.stopPropagation();
    if (savingOne || zipping) return;
    setZipping(true);
    setZipProgress({ done: 0, total: listLen });
    try {
      const base = (downloadName || "event_media").replace(/\.[^.]+$/, "");
      const res = await downloadMediaZip(list, `${base}.zip`, (done, total) =>
        setZipProgress({ done, total })
      );
      if (res.ok) toast.success(`ZIP downloaded (${res.added} files)`);
      else toast.warning(`ZIP downloaded — ${res.failed} file(s) skipped`);
    } catch {
      toast.error("Could not create ZIP");
    } finally {
      setZipping(false);
      setZipProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div
      className="media-lightbox-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        title="Close"
        aria-label="Close"
        style={{
          ...circleBtn,
          position: "absolute",
          top: 20,
          right: 20,
          width: 40,
          height: 40,
        }}
      >
        <FaTimes size={18} />
      </button>

      {/* Top toolbar - counter + downloads */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          zIndex: 10000,
          maxWidth: "calc(100vw - 90px)",
          padding: "6px 8px",
          borderRadius: 999,
          background: "rgba(15, 15, 17, 0.78)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          backdropFilter: "blur(10px)",
        }}
      >
        {hasMultiple && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: 999,
              letterSpacing: 0.5,
            }}
          >
            {safeIndex + 1} / {listLen}
          </div>
        )}

        <button
          onClick={handleDownloadCurrent}
          disabled={savingOne || zipping}
          title="Download this media"
          style={{
            ...pillBtn,
            opacity: savingOne || zipping ? 0.6 : 1,
            pointerEvents: savingOne || zipping ? "none" : "auto",
          }}
        >
          <FaDownload size={13} />
          {savingOne ? "Downloading..." : "Download"}
        </button>

        {hasMultiple && (
          <button
            onClick={handleDownloadAll}
            disabled={savingOne || zipping}
            title="Download all media as ZIP"
            style={{
              ...pillBtn,
              background: zipping ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.15)",
              opacity: savingOne ? 0.6 : 1,
              pointerEvents: savingOne ? "none" : "auto",
            }}
          >
            <FaFileArchive size={13} />
            {zipping
              ? `Zipping ${zipProgress.done}/${zipProgress.total || listLen}...`
              : `Download All (${listLen})`}
          </button>
        )}
      </div>

      {/* Navigation - Prev */}
      {hasMultiple && (
        <button
          onClick={handlePrev}
          title="Previous"
          aria-label="Previous"
          style={{
            ...circleBtn,
            position: "absolute",
            left: 20,
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
          }}
        >
          <FaChevronLeft size={20} />
        </button>
      )}

      {/* Navigation - Next (forward) */}
      {hasMultiple && (
        <button
          onClick={handleNext}
          title="Next"
          aria-label="Next"
          style={{
            ...circleBtn,
            position: "absolute",
            right: 20,
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
          }}
        >
          <FaChevronRight size={20} />
        </button>
      )}

      {/* Content Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: mediaMaxHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {currentItem.media_type === "VIDEO" ? (
          <video
            src={currentItem.url}
            controls
            autoPlay
            key={currentItem.id || currentItem.url}
            style={{ maxWidth: "100%", maxHeight: mediaMaxHeight, borderRadius: 12, outline: "none" }}
          />
        ) : (
          <img
            src={currentItem.url}
            alt="Event Detail"
            style={{
              maxWidth: "100%",
              maxHeight: mediaMaxHeight,
              objectFit: "contain",
              borderRadius: 12,
            }}
          />
        )}
      </div>

      {/* Thumbnail Strip - bottom center */}
      {hasMultiple && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            background: "rgba(20, 20, 20, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: 14,
            backdropFilter: "blur(10px)",
            maxWidth: "90vw",
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "thin",
            zIndex: 10000,
          }}
        >
          {list.map((item, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={item.id || idx}
                ref={(el) => (thumbRefs.current[idx] = el)}
                onClick={() => setCurrentIndex(idx)}
                title={`${idx + 1}`}
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: 62,
                  height: 62,
                  padding: 0,
                  borderRadius: 9,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: isActive ? "2px solid #ffffff" : "2px solid rgba(255,255,255,0.18)",
                  boxShadow: isActive ? "0 0 0 2px rgba(255,255,255,0.35)" : "none",
                  opacity: isActive ? 1 : 0.6,
                  transition: "opacity 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                  background: "#111",
                }}
              >
                {item.media_type === "VIDEO" ? (
                  <>
                    <img
                      src={item.thumbnail || item.url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.35)",
                        color: "#fff",
                      }}
                    >
                      <FaPlay size={12} />
                    </span>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
