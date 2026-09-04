import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";
const getToken = () => localStorage.getItem("token");

const CATEGORY_MAP = {
  aadhar: {
    label: "Aadhaar Card",
    icon: "🪪",
    colorClass: "rd-icon-blue",
    badgeClass: "rd-badge-blue",
    glowClass: "rd-glow-blue",
    desc: "Government-issued identity document",
  },
  pan: {
    label: "PAN Card",
    icon: "💳",
    colorClass: "rd-icon-amber",
    badgeClass: "rd-badge-amber",
    glowClass: "rd-glow-amber",
    desc: "Permanent Account Number card",
  },
};

/* ─────────────────────────────────────────
   VIEW MODAL
───────────────────────────────────────── */
function ViewModal({ doc, onClose }) {
  const meta = CATEGORY_MAP[doc.type] || { label: doc.type, icon: "📄", colorClass: "rd-icon-purple", badgeClass: "rd-badge-purple" };
  const fileUrl = `${API}${doc.file_url}`;
  const ext = doc.file_url?.split(".").pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  const isPdf = ext === "pdf";

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "820px",
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
          display: "flex", flexDirection: "column",
          maxHeight: "90vh",
          animation: "scaleIn 0.22s ease",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--card-inner-bg)",
          gap: "10px", flexShrink: 0, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className={`rd-icon-wrap ${meta.colorClass}`} style={{ fontSize: "1.1rem", width: "34px", height: "34px" }}>
              {meta.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{meta.label}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>
                {doc.file_url?.split("/").pop()}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn-export"
              style={{ textDecoration: "none", padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <span style={{ fontSize: "0.75rem" }}>⬇</span>
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              style={{
                width: "32px", height: "32px", borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.28)",
                background: "rgba(239,68,68,0.10)", color: "#f87171",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "16px", fontWeight: 700, flexShrink: 0,
              }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflow: "auto",
          background: "rgba(0,0,0,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "340px",
        }}>
          {isImage && (
            <img
              src={fileUrl}
              alt={meta.label}
              style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }}
            />
          )}
          {isPdf && (
            <iframe
              src={fileUrl}
              title={meta.label}
              style={{ width: "100%", height: "75vh", border: "none", display: "block" }}
            />
          )}
          {!isImage && !isPdf && (
            <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 1rem" }}>
                Preview not available for this file type
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: "none", display: "inline-flex" }}
              >
                Open File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   UPLOAD / RE-UPLOAD MODAL
───────────────────────────────────────── */
function UploadModal({ docType, existingDoc, onClose, onSuccess }) {
  const meta = CATEGORY_MAP[docType] || { label: docType, icon: "📄", colorClass: "rd-icon-purple" };
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();
  const isEdit = !!existingDoc;

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
  if (!file) { setError("Please select a file first."); return; }
  setError(null);
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append(docType, file);

    if (isEdit) {
      // ✅ Update route — single doc only
      await axios.patch(`${API}/api/user-documents/${docType}`, formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });
    } else {
      // Initial upload — both docs required, handled by existing POST
      await axios.post(`${API}/api/user-documents`, formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });
    }

    onSuccess();
    onClose();
  } catch (err) {
    setError(err.response?.data?.message || err.message || "Upload failed.");
  } finally {
    setUploading(false);
  }
};

  const fileSize = file
    ? file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`
    : null;

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(0,0,0,0.68)",
        backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "440px",
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.50)",
          animation: "scaleIn 0.22s ease",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--card-inner-bg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className={`rd-icon-wrap ${meta.colorClass}`} style={{ fontSize: "1.1rem", width: "34px", height: "34px" }}>
              {meta.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                {isEdit ? `Re-upload ${meta.label}` : `Upload ${meta.label}`}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>
                {isEdit ? "Replace existing document" : "Upload new document"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px", height: "28px", borderRadius: "7px",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "14px",
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {/* Error Banner */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px", borderRadius: "10px", marginBottom: "14px",
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5", fontSize: "13px",
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`ad-dropzone${dragOver ? " ad-dropzone--over" : ""}${file ? " ad-dropzone--filled" : ""}`}
            style={{ cursor: "pointer", minHeight: "110px" }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
            />
            {!file ? (
              <div className="ad-dz-empty">
                <span className="ad-dz-cloud" style={{ fontSize: "2rem" }}>☁</span>
                <p className="ad-dz-text">
                  Drag & drop or <span className="ad-dz-browse">browse</span>
                </p>
                <p className="ad-dz-hint">JPG, PNG, WEBP or PDF · Max 5 MB</p>
              </div>
            ) : (
              <div className="ad-dz-filled">
                <div className="ad-dz-file-icon" style={{ fontSize: "1.2rem" }}>📎</div>
                <div className="ad-dz-info">
                  <p className="ad-dz-filename">{file.name}</p>
                  <p className="ad-dz-filesize">{fileSize}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ad-dz-remove"
                >✕</button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "0.65rem", borderRadius: "10px",
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || !file}
              className="btn-primary"
              style={{
                flex: 2, justifyContent: "center",
                borderRadius: "10px", padding: "0.65rem",
                fontSize: "13px",
                opacity: !file || uploading ? 0.55 : 1,
                cursor: !file || uploading ? "not-allowed" : "pointer",
                gap: "6px",
              }}
            >
              {uploading ? (
                <>
                  <span style={{
                    width: "13px", height: "13px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.65s linear infinite",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  Uploading…
                </>
              ) : isEdit ? "Re-upload" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteModal({ doc, onClose, onSuccess }) {
  const meta = CATEGORY_MAP[doc.type] || { label: doc.type };
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await axios.delete(`${API}/api/user-documents/${doc.type}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Delete failed.");
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(0,0,0,0.68)",
        backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "360px",
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "20px",
          padding: "1.75rem 1.5rem",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.50)",
          animation: "scaleIn 0.22s ease",
        }}
      >
        {/* Icon */}
        <div style={{
          width: "52px", height: "52px", borderRadius: "14px",
          margin: "0 auto 1rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(239,68,68,0.12)",
          border: "1.5px solid rgba(239,68,68,0.28)",
          fontSize: "1.4rem",
        }}>🗑</div>

        <h3 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Delete {meta.label}?
        </h3>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove your{" "}
          <strong style={{ color: "#fca5a5" }}>{meta.label}</strong> from the system.
          This action cannot be undone.
        </p>

        {error && (
          <p style={{
            color: "#fca5a5", fontSize: "12px", marginBottom: "12px",
            background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: "8px", padding: "8px 12px",
          }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1, padding: "0.65rem", borderRadius: "10px",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)",
              fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              opacity: deleting ? 0.55 : 1,
            }}
          >Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, display: "inline-flex", alignItems: "center",
              justifyContent: "center", gap: "6px", padding: "0.65rem",
              borderRadius: "10px",
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              color: "#fff", border: "none", fontSize: "0.85rem",
              fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(220,38,38,0.4)",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? (
              <>
                <span style={{
                  width: "13px", height: "13px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "spin 0.65s linear infinite",
                  display: "inline-block",
                }} />
                Deleting…
              </>
            ) : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   DOCUMENT CARD
───────────────────────────────────────── */
function DocCard({ doc, onView, onEdit, onDelete }) {
  const meta = CATEGORY_MAP[doc.type] || {
    label: doc.type, icon: "📄",
    colorClass: "rd-icon-purple", badgeClass: "rd-badge-purple", glowClass: "rd-glow-purple",
    desc: "Document",
  };

  const uploadedDate = doc.uploaded_at
    ? new Date(doc.uploaded_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  const ext = doc.file_url?.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <div className="rd-doc-card">
      <div className={`rd-card-accent ${meta.glowClass}`} />
      <div className="rd-card-inner">
        {/* Top */}
        <div className="rd-card-top">
          <div className={`rd-icon-wrap ${meta.colorClass}`} style={{ fontSize: "1.5rem" }}>
            {meta.icon}
          </div>
          <div className="rd-card-meta">
            <span className={`rd-category-badge ${meta.badgeClass}`}>{meta.label}</span>
            <span className="rd-date-chip">{uploadedDate}</span>
          </div>
        </div>

        {/* Body */}
        <div className="rd-card-body">
          <p className="rd-doc-title">{meta.label}</p>
          <p className="rd-doc-desc">{meta.desc}</p>
        </div>

        {/* Footer */}
        <div className="rd-card-footer">
          <span className="rd-size-chip">
            <span style={{ fontSize: "0.7rem" }}>📎</span>
            {ext} File
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {/* View */}
            <button className="rd-btn rd-btn-view" onClick={() => onView(doc)}>
              <span style={{ fontSize: "0.72rem" }}>👁</span>
              <span>View</span>
            </button>

            {/* Edit / Re-upload */}
            <button
              onClick={() => onEdit(doc)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                fontSize: "12px", fontWeight: 600, borderRadius: "9px",
                padding: "6px 10px", border: "1px solid rgba(107,70,193,0.28)",
                cursor: "pointer", transition: "all 0.18s ease",
                background: "rgba(107,70,193,0.12)", color: "#C0B0E5",
              }}
            >
              <span style={{ fontSize: "0.72rem" }}>✏️</span>
              <span>Edit</span>
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(doc)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", borderRadius: "9px",
                padding: "6px 8px", border: "1px solid rgba(239,68,68,0.25)",
                cursor: "pointer", transition: "all 0.18s ease",
                background: "rgba(239,68,68,0.10)", color: "#fca5a5",
              }}
            >🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   EMPTY SLOT CARD
───────────────────────────────────────── */
function EmptySlotCard({ docType, onUpload }) {
  const meta = CATEGORY_MAP[docType];
  return (
    <div
      className="rd-doc-card"
      style={{ border: "1.5px dashed var(--glass-border)", opacity: 0.75 }}
    >
      <div className="rd-card-inner">
        <div className="rd-card-top">
          <div className={`rd-icon-wrap ${meta.colorClass}`} style={{ fontSize: "1.5rem", opacity: 0.5 }}>
            {meta.icon}
          </div>
          <span className={`rd-category-badge ${meta.badgeClass}`}>{meta.label}</span>
        </div>
        <div className="rd-card-body">
          <p className="rd-doc-title" style={{ opacity: 0.7 }}>{meta.label}</p>
          <p className="rd-doc-desc">Not uploaded yet</p>
        </div>
        <div className="rd-card-footer">
          <span className="rd-size-chip" style={{ opacity: 0.5 }}>No file</span>
          <button
            className="rd-btn rd-btn-view"
            onClick={() => onUpload(docType)}
          >
            <span style={{ fontSize: "0.72rem" }}>⬆</span>
            <span>Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function MyDocuments() {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewDoc, setViewDoc] = useState(null);
  const [uploadModal, setUploadModal] = useState(null); // { docType, existingDoc? }
  const [deleteDoc, setDeleteDoc] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API}/api/user-documents/my`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data) {
        const arr = [];
        if (res.data.aadhar_url)
          arr.push({
            type: "aadhar",
            file_url: res.data.aadhar_url,
            uploaded_at: res.data.updatedAt || res.data.createdAt,
          });
        if (res.data.pan_url)
          arr.push({
            type: "pan",
            file_url: res.data.pan_url,
            uploaded_at: res.data.updatedAt || res.data.createdAt,
          });
        setDocs(arr);
      } else {
        setDocs([]);
      }
    } catch (err) {
      if (err.response?.status === 404) setDocs([]);
      else setError(err.response?.data?.message || err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const uploadedTypes = (docs || []).map((d) => d.type);
  const missingTypes = Object.keys(CATEGORY_MAP).filter((t) => !uploadedTypes.includes(t));
  const totalDocs = Object.keys(CATEGORY_MAP).length;

  return (
    <div className="rd-root">
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: "1.2rem", right: "1.2rem", zIndex: 2000,
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "10px 18px", borderRadius: "12px",
          fontSize: "13px", fontWeight: 600,
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
          animation: "fadeInUp 0.3s ease both",
          background: toast.type === "success" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          color: toast.type === "success" ? "#86efac" : "#fca5a5",
        }}>
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="rd-er">
        <div className="rd-er-left">
          <div className="rd-er-icon-wrap">
            <span style={{ fontSize: "1.4rem" }}>🗂️</span>
          </div>
          <div>
            <h1 className="rd-page-title">My Documents</h1>
            <p className="rd-page-subtitle">View, upload and manage your identity documents</p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="rd-stats-row" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className="rd-stat-card rd-stat-green">
          <div className="rd-stat-val">{docs ? docs.length : "—"}</div>
          <div className="rd-stat-label">Uploaded</div>
        </div>
        <div className="rd-stat-card rd-stat-amber">
          <div className="rd-stat-val">{docs ? totalDocs - docs.length : "—"}</div>
          <div className="rd-stat-label">Pending</div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "12px", padding: "3rem 1rem",
          color: "var(--text-secondary)", fontSize: "14px",
        }}>
          <div style={{
            width: "20px", height: "20px",
            border: "2px solid rgba(91,141,239,0.20)", borderTopColor: "#5B8DEF",
            borderRadius: "50%", animation: "spin 0.65s linear infinite",
          }} />
          Loading documents…
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "10px", padding: "2.5rem 1rem", borderRadius: "14px",
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
          textAlign: "center",
        }}>
          <span style={{ fontSize: "1.5rem" }}>⚠️</span>
          <p style={{ fontSize: "13px", color: "#fca5a5", margin: 0 }}>{error}</p>
          <button className="btn-primary" onClick={fetchDocs} style={{ marginTop: "4px" }}>Retry</button>
        </div>
      )}

      {/* ── Document Grid ── */}
      {!loading && !error && docs !== null && (
        <div className="rd-grid">
          {docs.map((doc) => (
            <DocCard
              key={doc.type}
              doc={doc}
              onView={(d) => setViewDoc(d)}
              onEdit={(d) => setUploadModal({ docType: d.type, existingDoc: d })}
              onDelete={(d) => setDeleteDoc(d)}
            />
          ))}

          {missingTypes.map((type) => (
            <EmptySlotCard
              key={type}
              docType={type}
              onUpload={(t) => setUploadModal({ docType: t, existingDoc: null })}
            />
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {!loading && docs && docs.length > 0 && (
        <p className="rd-footer-note">
          Your documents are securely stored and only accessible to you and authorised society administrators.
        </p>
      )}

      {/* ── Modals ── */}
      {viewDoc && (
        <ViewModal doc={viewDoc} onClose={() => setViewDoc(null)} />
      )}

      {uploadModal && (
        <UploadModal
          docType={uploadModal.docType}
          existingDoc={uploadModal.existingDoc}
          onClose={() => setUploadModal(null)}
          onSuccess={() => {
            const label = CATEGORY_MAP[uploadModal.docType]?.label || "Document";
            showToast(
              uploadModal.existingDoc
                ? `${label} updated successfully`
                : `${label} uploaded successfully`
            );
            fetchDocs();
          }}
        />
      )}

      {deleteDoc && (
        <DeleteModal
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onSuccess={() => {
            const label = CATEGORY_MAP[deleteDoc.type]?.label || "Document";
            showToast(`${label} deleted`, "error");
            fetchDocs();
          }}
        />
      )}
    </div>
  );
}