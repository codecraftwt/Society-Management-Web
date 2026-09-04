import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import {
  MdPictureAsPdf,
  MdChevronLeft,
  MdChevronRight,
  MdZoomIn,
  MdZoomOut,
  MdFitScreen,
  MdFileDownload,
  MdOpenInNew,
  MdClose,
} from "react-icons/md";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const KEYFRAMES = `
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

/* Shared round icon-button used throughout the viewer toolbar. */
function TBtn({ label, title, onClick, disabled, active, href, children }) {
  const [hv, setHv] = useState(false);
  const style = {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: hv ? "1px solid rgba(37, 99, 235, 0.35)" : "1px solid var(--divider)",
    background: active ? "var(--accent-soft)" : hv ? "var(--card-inner-bg-hover)" : "var(--card-bg)",
    color: active ? "var(--accent)" : "var(--text-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.18s ease",
    flexShrink: 0,
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

export default function PdfViewer({ url, name, onClose }) {
  const [numPages, setNumPages]     = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom]             = useState(1);       /* multiplier */
  const [isFitWidth, setIsFitWidth] = useState(false);   /* toggle fit to width */
  const [pageW, setPageW]           = useState(560);     /* px available for the page */
  const [loaded, setLoaded]         = useState(false);
  const [failed, setFailed]         = useState(false);
  const [docUrl, setDocUrl]         = useState(url);
  const [retried, setRetried]       = useState(false);
  const canvasRef = useRef(null);

  /* Keep docUrl in sync if url prop changes */
  useEffect(() => {
    setDocUrl(url);
    setLoaded(false);
    setFailed(false);
    setRetried(false);
  }, [url]);

  /* Keep the page width in sync with the container (rotation, resize). */
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
  }, [loaded]);

  /* Natural paper sizing: 640px max at 100% zoom unless fit to width is toggled */
  const baseWidth = Math.min(pageW, 640);
  const computedWidth = isFitWidth
    ? Math.max(220, pageW)
    : Math.max(220, Math.floor(baseWidth * zoom));
  const zoomPct = Math.round(zoom * 100);

  const onLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
    setPageNumber((p) => Math.min(p, n || 1));
    setLoaded(true);
    setFailed(false);
  };

  const onLoadError = () => {
    if (!retried) {
      setRetried(true);
      setLoaded(false);
      setFailed(false);
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || "document.pdf")}&mode=inline`;
      setDocUrl(proxyUrl);
      return;
    }
    setLoaded(true);
    setFailed(true);
  };

  const stepZoom = (dir) =>
    setZoom((z) => Math.min(2.5, Math.max(0.5, +(z * (dir > 0 ? 1.2 : 0.8)).toFixed(2))));

  const goPage = (p) => setPageNumber(Math.min(numPages, Math.max(1, p)));

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          background: "var(--card-bg)",
          border: "1.5px solid var(--glass-border)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
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
            background: "var(--card-inner-bg)",
            borderBottom: "1px solid var(--divider)",
            flexWrap: "wrap",
          }}
        >
          {/* Left: Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 180px" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(37, 99, 235, 0.14)",
                border: "1px solid rgba(37, 99, 235, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MdPictureAsPdf size={17} style={{ color: "var(--accent)" }} />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 650,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name || "PDF Document"}
            </span>
          </div>

          {/* Center: Controls (Page Nav + Zoom) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {numPages > 1 && (
              <>
                <TBtn label="Previous page" title="Previous page" onClick={() => goPage(pageNumber - 1)} disabled={pageNumber <= 1}>
                  <MdChevronLeft size={18} />
                </TBtn>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", padding: "0 4px", fontVariantNumeric: "tabular-nums" }}>
                  {pageNumber} / {numPages}
                </span>
                <TBtn label="Next page" title="Next page" onClick={() => goPage(pageNumber + 1)} disabled={pageNumber >= numPages}>
                  <MdChevronRight size={18} />
                </TBtn>
                <div style={{ width: 1, height: 18, background: "var(--divider)", margin: "0 4px" }} />
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
                color: "var(--text-secondary)",
                background: "var(--card-bg)",
                border: "1px solid var(--divider)",
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

          {/* Right: Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 650,
                color: "var(--text-primary)",
                background: "var(--card-bg)",
                border: "1px solid var(--glass-border)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
            >
              <MdFileDownload size={14} /> Download
            </a>
            <TBtn label="Open in new tab" title="Open in new tab" href={url}>
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
                  background: "var(--card-bg)",
                  border: "1px solid var(--glass-border)",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.18s ease",
                  marginLeft: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--danger)";
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.borderColor = "var(--danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--card-bg)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                }}
              >
                <MdClose size={17} />
              </button>
            )}
          </div>
        </div>

        {/* ── LOADING ── */}
        {!loaded && !failed && (
          <div
            style={{
              flex: 1,
              minHeight: 280,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "var(--accent-soft)",
                border: "1px solid rgba(37, 99, 235, 0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                style={{ width: 22, height: 22, color: "var(--accent)" }}
                className="animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              Preparing document…
            </span>
          </div>
        )}

        {/* ── ERROR ── */}
        {failed && (
          <div
            style={{
              flex: 1,
              minHeight: 280,
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
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdPictureAsPdf size={26} style={{ color: "var(--accent)", opacity: 0.8 }} />
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 650, margin: 0 }}>
              Could not render this PDF in the viewer.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                background: "var(--accent)",
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
        )}

        {/* ── PAGE AREA ── */}
        {!failed && (
          <div
            ref={canvasRef}
            style={{
              flex: loaded ? 1 : 0,
              height: loaded ? "auto" : 0,
              minHeight: 0,
              overflow: "auto",
              background: "var(--card-inner-bg)",
              display: loaded ? "flex" : "block",
              visibility: loaded ? "visible" : "hidden",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: loaded ? "20px 16px" : 0,
              boxSizing: "border-box",
            }}
          >
            <Document file={docUrl} onLoadSuccess={onLoadSuccess} onLoadError={onLoadError}>
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
      </div>
    </>
  );
}