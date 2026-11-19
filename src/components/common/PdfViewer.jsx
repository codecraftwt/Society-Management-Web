import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import {
  MdPictureAsPdf,
  MdImage,
  MdChevronLeft,
  MdChevronRight,
  MdZoomIn,
  MdZoomOut,
  MdFitScreen,
  MdFileDownload,
  MdOpenInNew,
  MdClose,
  MdWeb,
  MdOutlineDescription,
} from "react-icons/md";
import { API_BASE } from "../../config/apiConfig";

// Set worker to CDN with valid JavaScript MIME type to avoid host .mjs octet-stream MIME errors
if (typeof window !== "undefined" && pdfjs) {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version || "4.8.69"}/build/pdf.worker.min.mjs`;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";
  }
}

const KEYFRAMES = `
  @keyframes pdfBackdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pdfModalIn {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes pdfPageIn {
    from { opacity: 0; transform: translateY(8px) scale(0.99); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .react-pdf__Page {
    display: flex !important;
    justify-content: center !important;
    margin: 0 auto !important;
  }
  .react-pdf__Page__canvas {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 6px;
    box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
`;

function TBtn({ label, title, onClick, disabled, active, href, children }) {
  const [hv, setHv] = useState(false);
  const style = {
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: active
      ? "1px solid var(--accent)"
      : hv
      ? "1px solid rgba(59, 130, 246, 0.35)"
      : "1px solid var(--divider, rgba(255, 255, 255, 0.1))",
    background: active
      ? "var(--accent)"
      : hv
      ? "var(--card-inner-bg-hover, rgba(255, 255, 255, 0.08))"
      : "var(--card-bg, rgba(255, 255, 255, 0.04))",
    color: active ? "#ffffff" : "var(--text-secondary, #94a3b8)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.15s ease",
    flexShrink: 0,
    textDecoration: "none",
  };
  const common = {
    title,
    "aria-label": label || title,
    onMouseEnter: () => setHv(true),
    onMouseLeave: () => setHv(false),
    style,
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...common}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} {...common}>
      {children}
    </button>
  );
}

export default function PdfViewer({
  url,
  fileUrl,
  name,
  fileName,
  onClose,
  embedded = false,
}) {
  const rawUrl = url || fileUrl || "";
  const docTitle = name || fileName || "Document";

  const isImage = Boolean(
    (rawUrl || docTitle || "").match(/\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i)
  );

  // Derive API Proxy URL (solves cross-origin CORS on raw files)
  const apiBase = (API_BASE || import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
  const isDirectApiUrl = rawUrl.includes("/document") || rawUrl.includes("/download");
  const proxyUrl = isDirectApiUrl
    ? rawUrl
    : rawUrl
    ? `${apiBase}/download?url=${encodeURIComponent(rawUrl)}&name=${encodeURIComponent(docTitle || "document.pdf")}&mode=inline`
    : "";
  const googleDocsUrl = rawUrl
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`
    : "";

  // View mode: 'native' (iframe browser PDF viewer), 'canvas' (react-pdf), 'gdocs' (Google Docs viewer)
  const [viewMode, setViewMode] = useState("native");
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFitWidth, setIsFitWidth] = useState(false);
  const [pageW, setPageW] = useState(640);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [autoFallbackTriggered, setAutoFallbackTriggered] = useState(false);

  const canvasRef = useRef(null);

  // Effective PDF source to load in canvas and iframe
  const effectivePdfUrl = proxyUrl || rawUrl;

  // Escape key listener & Body scroll lock
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const origOverflow = document.body.style.overflow;
    if (!embedded) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [onClose, embedded]);

  // Keep page width in sync with container
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 60) setPageW(w - 32);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasLoaded, viewMode]);

  // Sizing for canvas view
  const baseWidth = Math.min(pageW, 720);
  const computedWidth = isFitWidth
    ? Math.max(220, pageW)
    : Math.max(220, Math.floor(baseWidth * zoom));
  const zoomPct = Math.round(zoom * 100);

  const onLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
    setPageNumber((p) => Math.min(p, n || 1));
    setCanvasLoaded(true);
    setCanvasFailed(false);
  };

  const onLoadError = () => {
    setCanvasFailed(true);
    setCanvasLoaded(true);
    // If canvas fails, automatically switch to native browser viewer
    if (!autoFallbackTriggered) {
      setAutoFallbackTriggered(true);
      setViewMode("native");
    }
  };

  const stepZoom = (dir) =>
    setZoom((z) => Math.min(2.5, Math.max(0.5, +(z * (dir > 0 ? 1.2 : 0.8)).toFixed(2))));

  const goPage = (p) => setPageNumber(Math.min(numPages, Math.max(1, p)));

  // If onClose is provided and not embedded, render in a portal modal
  const isModal = Boolean(onClose && !embedded);

  const viewerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        background: "var(--card-bg, #1e1e24)",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      {/* ── TOP UNIFIED TOOLBAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 16px",
          background: "var(--card-inner-bg, rgba(255, 255, 255, 0.04))",
          borderBottom: "1px solid var(--divider, rgba(255, 255, 255, 0.08))",
          flexWrap: "wrap",
          zIndex: 10,
        }}
      >
        {/* Left: Icon + Title + Viewer Mode Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 240px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: isImage ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 99, 235, 0.15)",
              border: `1px solid ${isImage ? "rgba(16, 185, 129, 0.3)" : "rgba(37, 99, 235, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isImage ? (
              <MdImage size={18} style={{ color: "#10b981" }} />
            ) : (
              <MdPictureAsPdf size={18} style={{ color: "var(--accent, #3b82f6)" }} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary, #ffffff)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={docTitle}
            >
              {docTitle}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary, #94a3b8)" }}>
              {isImage ? "Image Document" : viewMode === "native" ? "Native Browser View" : viewMode === "canvas" ? "Canvas View" : "Google Docs View"}
            </span>
          </div>

          {/* Mode Switcher for PDFs */}
          {!isImage && (
            <div
              style={{
                display: "inline-flex",
                background: "var(--card-bg, rgba(0, 0, 0, 0.3))",
                padding: 2,
                borderRadius: 8,
                border: "1px solid var(--divider, rgba(255, 255, 255, 0.08))",
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("native")}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 650,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: viewMode === "native" ? "var(--accent, #3b82f6)" : "transparent",
                  color: viewMode === "native" ? "#ffffff" : "var(--text-secondary, #94a3b8)",
                  transition: "all 0.15s ease",
                }}
                title="Render inside browser's high-performance native PDF engine"
              >
                <MdWeb size={13} /> Browser
              </button>
              <button
                type="button"
                onClick={() => setViewMode("canvas")}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 650,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: viewMode === "canvas" ? "var(--accent, #3b82f6)" : "transparent",
                  color: viewMode === "canvas" ? "#ffffff" : "var(--text-secondary, #94a3b8)",
                  transition: "all 0.15s ease",
                }}
                title="Interactive Canvas Viewer with page flip"
              >
                <MdOutlineDescription size={13} /> Canvas
              </button>
              <button
                type="button"
                onClick={() => setViewMode("gdocs")}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 650,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: viewMode === "gdocs" ? "var(--accent, #3b82f6)" : "transparent",
                  color: viewMode === "gdocs" ? "#ffffff" : "var(--text-secondary, #94a3b8)",
                  transition: "all 0.15s ease",
                }}
                title="Google Docs Cloud PDF Viewer"
              >
                G-Docs
              </button>
            </div>
          )}
        </div>

        {/* Center: Controls (Canvas page nav & zoom) */}
        {!isImage && viewMode === "canvas" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {numPages > 1 && (
              <>
                <TBtn label="Previous page" title="Previous page" onClick={() => goPage(pageNumber - 1)} disabled={pageNumber <= 1}>
                  <MdChevronLeft size={18} />
                </TBtn>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #94a3b8)", padding: "0 4px", fontVariantNumeric: "tabular-nums" }}>
                  {pageNumber} / {numPages}
                </span>
                <TBtn label="Next page" title="Next page" onClick={() => goPage(pageNumber + 1)} disabled={pageNumber >= numPages}>
                  <MdChevronRight size={18} />
                </TBtn>
                <div style={{ width: 1, height: 18, background: "var(--divider, rgba(255,255,255,0.1))", margin: "0 4px" }} />
              </>
            )}

            <TBtn label="Zoom out" title="Zoom out" onClick={() => { setIsFitWidth(false); stepZoom(-1); }} disabled={zoom <= 0.5 && !isFitWidth}>
              <MdZoomOut size={16} />
            </TBtn>
            <span
              style={{
                minWidth: 42,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary, #94a3b8)",
                background: "var(--card-bg, rgba(255,255,255,0.04))",
                border: "1px solid var(--divider, rgba(255,255,255,0.1))",
                borderRadius: 8,
                padding: "4px 6px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {isFitWidth ? "Fit" : `${zoomPct}%`}
            </span>
            <TBtn label="Zoom in" title="Zoom in" onClick={() => { setIsFitWidth(false); stepZoom(1); }} disabled={zoom >= 2.5 && !isFitWidth}>
              <MdZoomIn size={16} />
            </TBtn>
            <TBtn label="Fit to width" title="Fit to width" onClick={() => setIsFitWidth(!isFitWidth)} active={isFitWidth}>
              <MdFitScreen size={15} />
            </TBtn>
          </div>
        )}

        {/* Center: Image zoom controls */}
        {isImage && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TBtn label="Zoom out" title="Zoom out" onClick={() => stepZoom(-1)} disabled={zoom <= 0.5}>
              <MdZoomOut size={16} />
            </TBtn>
            <span
              style={{
                minWidth: 42,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary, #94a3b8)",
                background: "var(--card-bg, rgba(255,255,255,0.04))",
                border: "1px solid var(--divider, rgba(255,255,255,0.1))",
                borderRadius: 8,
                padding: "4px 6px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {zoomPct}%
            </span>
            <TBtn label="Zoom in" title="Zoom in" onClick={() => stepZoom(1)} disabled={zoom >= 2.5}>
              <MdZoomIn size={16} />
            </TBtn>
            <TBtn label="Reset zoom" title="Reset zoom" onClick={() => setZoom(1)} active={zoom === 1}>
              <MdFitScreen size={15} />
            </TBtn>
          </div>
        )}

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={proxyUrl || rawUrl}
            download={docTitle}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 650,
              color: "var(--text-primary, #ffffff)",
              background: "var(--card-bg, rgba(255, 255, 255, 0.08))",
              border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
          >
            <MdFileDownload size={15} /> Download
          </a>
          <TBtn label="Open in new tab" title="Open in new tab" href={rawUrl || proxyUrl}>
            <MdOpenInNew size={15} />
          </TBtn>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--card-bg, rgba(255, 255, 255, 0.08))",
                border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.15))",
                cursor: "pointer",
                color: "var(--text-secondary, #94a3b8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.18s ease",
                marginLeft: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--card-bg, rgba(255, 255, 255, 0.08))";
                e.currentTarget.style.color = "var(--text-secondary, #94a3b8)";
                e.currentTarget.style.borderColor = "var(--glass-border, rgba(255, 255, 255, 0.15))";
              }}
            >
              <MdClose size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── VIEWER BODY CONTAINER ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          background: "var(--card-inner-bg, rgba(0, 0, 0, 0.25))",
          overflow: "hidden",
        }}
      >
        {/* 1. IMAGE MODE */}
        {isImage && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
              padding: 20,
            }}
          >
            <img
              src={rawUrl}
              alt={docTitle}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 0.15s ease",
                borderRadius: 8,
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* 2. NATIVE BROWSER IFRAME MODE (Instant, no CORS blockage) */}
        {!isImage && viewMode === "native" && (
          <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
            <iframe
              src={proxyUrl || rawUrl}
              title={docTitle}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                background: "#525659",
              }}
            />
          </div>
        )}

        {/* 3. GOOGLE DOCS VIEWER MODE */}
        {!isImage && viewMode === "gdocs" && (
          <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
            <iframe
              src={googleDocsUrl}
              title={docTitle}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                background: "#ffffff",
              }}
            />
          </div>
        )}

        {/* 4. CANVAS / REACT-PDF MODE */}
        {!isImage && viewMode === "canvas" && (
          <>
            {!canvasLoaded && !canvasFailed && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  zIndex: 2,
                  background: "var(--card-inner-bg, rgba(0,0,0,0.4))",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    style={{ width: 22, height: 22, color: "var(--accent, #3b82f6)" }}
                    className="animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary, #94a3b8)" }}>
                  Rendering canvas…
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode("native")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 650,
                    background: "var(--accent, #3b82f6)",
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Switch to Native Browser Viewer
                </button>
              </div>
            )}

            {canvasFailed && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdPictureAsPdf size={26} style={{ color: "#ef4444" }} />
                </div>
                <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: 13, fontWeight: 650, margin: 0 }}>
                  Canvas rendering encountered a restriction.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setViewMode("native")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "var(--accent, #3b82f6)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    View with Native Browser Engine
                  </button>
                  <a
                    href={rawUrl || proxyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MdOpenInNew size={14} /> Open in new tab
                  </a>
                </div>
              </div>
            )}

            {!canvasFailed && (
              <div
                ref={canvasRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  padding: "24px 16px",
                  boxSizing: "border-box",
                }}
              >
                <Document file={effectivePdfUrl} onLoadSuccess={onLoadSuccess} onLoadError={onLoadError}>
                  <div
                    key={pageNumber}
                    style={{
                      animation: "pdfPageIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
                      borderRadius: 8,
                      maxWidth: "100%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={computedWidth}
                      renderTextLayer
                      renderAnnotationLayer
                    />
                  </div>
                </Document>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // If used as a popup modal (when onClose is provided and not embedded)
  if (isModal && typeof document !== "undefined") {
    return createPortal(
      <>
        <style>{KEYFRAMES}</style>
        <div
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-5"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000000,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            animation: "pdfBackdropIn 0.2s ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && onClose) onClose();
          }}
        >
          <div
            className="w-full max-w-5xl h-[90vh] max-h-[920px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              position: "relative",
              zIndex: 1000001,
              background: "var(--card-bg, #18181b)",
              border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
              boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              animation: "pdfModalIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {viewerContent}
          </div>
        </div>
      </>,
      document.body
    );
  }

  // Inline / embedded mode
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden shadow-xl"
        style={{
          background: "var(--card-bg, #18181b)",
          border: "1.5px solid var(--glass-border, rgba(255, 255, 255, 0.12))",
          minHeight: 520,
        }}
      >
        {viewerContent}
      </div>
    </>
  );
}
