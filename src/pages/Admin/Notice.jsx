
import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import socket from "../../services/socket";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  MdAdd,
  MdAttachFile,
  MdSearch,
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdCampaign,
  MdOutlineArticle,
  MdOutlineOpenInNew,
  MdSchedule,
} from "react-icons/md";

import { BASE_URL } from "../../config/apiConfig";
import Select from "../../components/common/Select";

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function Spinner({ small = false }) {
  const s = small ? 13 : 18;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
          >
            {p}
          </button>
        ),
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

const BARS = ["#6366f1", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"];
const DOTS = ["#818cf8", "#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#fbbf24"];
const BG   = [
  "rgba(99,102,241,0.10)", "rgba(59,130,246,0.10)", "rgba(139,92,246,0.10)",
  "rgba(236,72,153,0.10)", "rgba(6,182,212,0.10)",  "rgba(245,158,11,0.10)",
];
const BDR  = [
  "rgba(99,102,241,0.22)", "rgba(59,130,246,0.22)", "rgba(139,92,246,0.22)",
  "rgba(236,72,153,0.22)", "rgba(6,182,212,0.22)",  "rgba(245,158,11,0.22)",
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

const LIMIT = 10;

/* ── File helpers ── */

const isImageFile = (fileName) =>
  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName || "");

const isPublicHost = () => {
  const h = window.location.hostname;
  return (
    h !== "localhost" &&
    !h.startsWith("127.") &&
    !h.startsWith("192.168.") &&
    !h.startsWith("10.")
  );
};

const getPreviewUrl = (url, name) => {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return url;
  if (["doc", "docx", "ppt", "pptx", "csv"].includes(ext)) {
    if (!isPublicHost()) return null;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  if (["xls", "xlsx"].includes(ext)) {
    if (!isPublicHost()) return null;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }
  return null;
};

export default function Notice() {
  const { user } = useContext(AuthContext);
  const { t }    = useLang();

  const [notices,     setNotices]     = useState([]);
  const [totalAll,    setTotalAll]    = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalItems,  setTotalItems]  = useState(0);
  const [search,      setSearch]      = useState("");
  const debSearch = useDebounce(search, 500);

  // --- SUPER ADMIN / SOCIETY FILTER ---
  const activeRole = user?.activeRole ?? user?.role;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";
  const [societiesList, setSocietiesList] = useState([]);
  const [filterSocietyId, setFilterSocietyId] = useState(() => {
    const saved = localStorage.getItem("superadmin_society_filter");
    return (saved === "ALL" || !saved) ? "" : saved;
  });

  // --- EDIT MODE ---
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then((res) => setSocietiesList(res.data || []))
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file,       setFile]       = useState(null);
  const [form,       setForm]       = useState({ title: "", description: "", society_id: "" });

  const [lightbox,    setLightbox]    = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const loadNotices = useCallback(async (pg, q, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg, limit: LIMIT,
        ...(q ? { search: q } : {}),
      });
      const headers = (isSuperAdmin && filterSocietyId) ? { "x-society-id": filterSocietyId } : {};
      const res  = await API.get(`/notices?${params}`, { headers });
      const data = res.data;

      if (Array.isArray(data)) {
        setNotices(data);
        setTotalAll(data.length);
        setTotalPages(1);
        setTotalItems(data.length);
        setPage(1);
      } else {
        setNotices(data.data || []);
        setTotalAll(data.totalAll ?? data.pagination?.totalItems ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotalItems(data.pagination?.totalItems ?? 0);
        setPage(pg);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [filterSocietyId, isSuperAdmin]);

  useEffect(() => { loadNotices(1, "", true); }, [loadNotices]);
  useEffect(() => { if (!initialLoad) loadNotices(1, debSearch); }, [debSearch, loadNotices]);

  // ── FIX 2: counts only bump for notices genuinely new from other users ──
  useEffect(() => {
    const onNoticeCreated = (notice) => {
      setNotices((prev) => {
        // Already in list (added by reload after own submit, or duplicate event) — skip
        if (prev.find((n) => n.id === notice.id)) return prev;
        // Notice from another user arriving via socket — prepend and bump counts
        setTotalAll((c)   => c + 1);
        setTotalItems((c) => c + 1);
        return [notice, ...prev];
      });
    };
    socket.on("notice_created", onNoticeCreated);
    return () => { socket.off("notice_created", onNoticeCreated); };
  }, []);

  const handlePage = (p) => loadNotices(p, debSearch);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      if (file) fd.append("file", file);

      // Resolve society ID: prioritize form.society_id, then filterSocietyId, then user.society_id
      const activeSocId = isSuperAdmin ? (form.society_id || filterSocietyId) : user?.society_id;
      
      if (!activeSocId && isSuperAdmin) {
        alert("Please select a society");
        return;
      }

      const headers = { 
        "Content-Type": "multipart/form-data",
        ...(isSuperAdmin ? { "x-society-id": activeSocId } : {})
      };

      if (editingId) {
        await API.put(`/notices/${editingId}`, fd, { headers });
      } else {
        await API.post("/notices", fd, { headers });
      }

      setForm({ title: "", description: "", society_id: "" });
      setFile(null);
      setEditingId(null);
      setShowForm(false);
      await loadNotices(1, debSearch);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (n) => {
    setForm({ title: n.title, description: n.description, society_id: n.society_id });
    setEditingId(n.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, socId) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    setDeletingId(id);
    try {
      const headers = (isSuperAdmin && socId) ? { "x-society-id": socId } : {};
      await API.delete(`/notices/${id}`, { headers });
      await loadNotices(page, debSearch);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileView = (fileUrl) => {
    if (!fileUrl) return;

    // 1. Recover the original human-readable filename
    //    Priority: ?filename= query param  →  last path segment
    let fileName = "attachment";
    try {
      const paramMatch = fileUrl.match(/[?&]filename=([^&]+)/);
      fileName = paramMatch
        ? decodeURIComponent(paramMatch[1])
        : decodeURIComponent(fileUrl.split("?")[0].split("/").pop()) || "attachment";
    } catch (_) {
      fileName = fileUrl.split("?")[0].split("/").pop() || "attachment";
    }

    // 2. Build a clean URL — strip ALL query params for the actual src/href.
    //    Cloudinary URLs are already absolute → use as-is.
    //    Legacy local paths (/uploads/...) → prepend BASE_URL.
    const rawPath = fileUrl.split("?")[0];
    const fullUrl =
      rawPath.startsWith("http://") || rawPath.startsWith("https://")
        ? rawPath                      // ✅ Cloudinary absolute URL, no prefix
        : `${BASE_URL}${rawPath}`;     // ✅ legacy local path

    // 3. Route to the right viewer
    if (isImageFile(fileName)) {
      setLightbox(fullUrl);
      return;
    }

    setFilePreview({
      fullUrl,
      name: fileName,
      previewUrl: getPreviewUrl(fullUrl, fileName),
    });
  };

  const canPost    = activeRole === "SUPER_ADMIN" || activeRole === "SOCIETY_ADMIN" || activeRole === "COMMITTEE_MEMBER";

  const TH = {
    fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
    letterSpacing: "0.07em", textTransform: "uppercase",
    padding: "9px 16px", background: "var(--card-inner-bg)",
    borderBottom: "1px solid var(--divider)", whiteSpace: "nowrap",
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(59,130,246,0.12))",
            border: "1.5px solid rgba(99,102,241,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99,102,241,0.18)",
          }}>
            <MdCampaign size={21} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0,
              letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              {t("noticeBoard")}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
              {initialLoad ? "—" : `${totalAll} notices published`}
            </p>
          </div>
        </div>
        {canPost && (
          <button
            onClick={() => setShowForm((p) => !p)}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center shrink-0"
          >
            {showForm ? <><MdClose size={16} />{t("cancel")}</> : <><MdAdd size={17} />{t("noticeAddBtn")}</>}
          </button>
        )}
      </div>

      {/* ══ CREATE FORM ══ */}
      {showForm && canPost && (
        <div className="animate-scaleIn" style={{
          background: "var(--card-bg)", border: "1.5px solid var(--glass-border)",
          borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-md)",
        }}>
          <div style={{
            padding: "13px 18px", borderBottom: "1px solid var(--divider)",
            background: "var(--card-inner-bg)", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MdOutlineArticle size={15} style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                {t("noticeCreateTitle")}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0" }}>
                Broadcast to all residents instantly
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{
            padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12,
          }}>
            {/* Society Selection for SuperAdmin */}
            {isSuperAdmin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Society <span style={{ color: "#f87171" }}>*</span>
                </label>
                <Select
                  className="input" style={{ height: 40 }}
                  value={form.society_id} required
                  onChange={(e) => setForm({ ...form, society_id: e.target.value })}
                >
                  <option value="">Select Society</option>
                  {societiesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {[
              { key: "title",       label: "Title",       placeholder: t("noticeTitlePlaceholder"), required: true },
              { key: "description", label: "Description", placeholder: t("noticeDescPlaceholder"),  required: true, textarea: true },
            ].map(({ key, label, placeholder, required, textarea }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {label} {required && <span style={{ color: "#f87171" }}>*</span>}
                </label>
                {textarea ? (
                  <textarea
                    className="input" placeholder={placeholder} rows={3}
                    style={{ resize: "none", lineHeight: 1.6 }}
                    value={form[key]} required={required}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : (
                  <input
                    className="input" placeholder={placeholder}
                    style={{ height: 40 }}
                    value={form[key]} required={required}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}

            {/* Attachment */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
                textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {t("noticeAttachment")}{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.5 }}>
                  (optional)
                </span>
              </label>
              {file ? (
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px",
                  borderRadius: 9, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)" }}>
                  <MdAttachFile size={14} style={{ color: "#4ade80", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text-primary)", flex: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                  <button type="button" onClick={() => setFile(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171",
                      display: "flex", padding: 0 }}>
                    <MdClose size={14} />
                  </button>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  borderRadius: 9, cursor: "pointer", border: "1.5px dashed var(--card-inner-border)",
                  background: "var(--card-inner-bg)" }}>
                  <MdAttachFile size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Click to attach a file</span>
                  <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: "none" }} />
                </label>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
              <button type="submit" disabled={submitting} className="btn-primary"
                style={{ flex: 1, justifyContent: "center", opacity: submitting ? 0.65 : 1 }}>
                {submitting ? <><Spinner small />Publishing…</> : <><MdCampaign size={15} />{t("noticePublish")}</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-muted">
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══ BOARD CARD ══ */}
      <div style={{
        background: "var(--card-bg)", border: "1.5px solid var(--glass-border)",
        borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-md)",
      }}>
        <div style={{
          padding: "16px", borderBottom: "1px solid var(--divider)",
          background: "var(--card-inner-bg)", display: "flex", flexDirection: "column", gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: totalAll > 0 ? "#22c55e" : "#475569",
                boxShadow: totalAll > 0 ? "0 0 6px rgba(34,197,94,0.7)" : "none",
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {t("noticeBoard")} List
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.6, marginLeft: 4 }}>
                ({totalItems})
              </span>
            </div>

            <div style={{ position: "relative", width: "100%", maxWidth: 260 }}>
              <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
              <input
                key="notice-search" className="input" placeholder="Search notices…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ height: 36, paddingLeft: 30, paddingRight: 30, fontSize: 12, width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                {fetching ? <Spinner small /> : search ? (
                  <button onClick={() => setSearch("")}
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-secondary)", display: "flex", padding: 0 }}>
                    <MdClose size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Select className="input" style={{ width: 160, height: 36, fontSize: 12 }}
                value={filterSocietyId} onChange={(e) => setFilterSocietyId(e.target.value)}>
                <option value="">— All Societies —</option>
                {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>
                Filter by society
              </span>
            </div>
          )}
        </div>

        {/* States */}
        {initialLoad && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            gap: 12, padding: "50px 20px", color: "var(--text-secondary)" }}>
            <Spinner />
            <p style={{ fontSize: 13, margin: 0 }}>Loading notices…</p>
          </div>
        )}
        {!initialLoad && totalAll === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            gap: 10, padding: "52px 20px", color: "var(--text-secondary)" }}>
            <div style={{ width: 50, height: 50, borderRadius: 13,
              background: "rgba(99,102,241,0.08)", border: "1.5px solid rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <MdCampaign size={24} style={{ color: "#6366f1", opacity: 0.45 }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{t("noticeEmpty")}</p>
            <p style={{ fontSize: 12, margin: 0, opacity: 0.5 }}>No notices published yet.</p>
          </div>
        )}
        {!initialLoad && totalAll > 0 && notices.length === 0 && !fetching && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            gap: 8, padding: "50px 20px", color: "var(--text-secondary)" }}>
            <MdSearch size={32} style={{ opacity: 0.15 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No notices match <strong>"{search}"</strong></p>
            <button onClick={() => setSearch("")}
              style={{ fontSize: 12, color: "#60a5fa", background: "none", border: "none",
                cursor: "pointer", padding: 0, marginTop: 4 }}>
              Clear search
            </button>
          </div>
        )}

        {/* ══ TABLE ══ */}
        {!initialLoad && notices.length > 0 && (
          <>
            {/* Desktop */}
            <div className="hidden md:block" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "45%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...TH, textAlign: "left" }}>Title &amp; Description</th>
                    <th style={{ ...TH, textAlign: "left" }}>Date &amp; Time</th>
                    <th style={{ ...TH, textAlign: "right" }}>Attachment</th>
                    <th style={{ ...TH, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((n, idx) => {
                    const bar = BARS[idx % BARS.length];
                    const dot = DOTS[idx % DOTS.length];
                    const bg  = BG[idx  % BG.length];
                    const bdr = BDR[idx % BDR.length];
                    return (
                      <tr key={n.id} className="animate-fadeIn"
                        style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.15s",
                          animationDelay: `${idx * 20}ms`, position: "relative" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "12px 16px", verticalAlign: "middle", position: "relative" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                            width: 3, background: bar, borderRadius: "0 3px 3px 0" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                              background: bg, border: `1px solid ${bdr}`,
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <MdCampaign size={16} style={{ color: dot }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 650, margin: 0,
                                color: "var(--text-primary)", overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
                                {n.title}
                              </p>
                              <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--text-secondary)",
                                opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {n.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <MdSchedule size={12} style={{ color: "var(--text-secondary)", opacity: 0.5, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.8 }}>
                              {fmtDate(n.created_at)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle", textAlign: "right" }}>
                          {n.file_url ? (
                            <button
                              onClick={() => handleFileView(n.file_url)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                fontSize: 11, fontWeight: 600, color: "#60a5fa",
                                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.20)",
                                padding: "4px 10px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.16)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.35)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.20)"; }}
                            >
                              <MdOutlineOpenInNew size={12} />
                              {t("noticesViewAttachment")}
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.3 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", verticalAlign: "middle", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                              onClick={() => handleEdit(n)}
                              style={{
                                padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)"
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(n.id, n.society_id)}
                              disabled={deletingId === n.id}
                              style={{
                                padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)",
                                opacity: deletingId === n.id ? 0.5 : 1
                              }}
                            >
                              {deletingId === n.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              {notices.map((n, idx) => {
                const bar = BARS[idx % BARS.length];
                const dot = DOTS[idx % DOTS.length];
                const bg  = BG[idx  % BG.length];
                const bdr = BDR[idx % BDR.length];
                return (
                  <div key={n.id} className="animate-fadeIn"
                    style={{ position: "relative", borderBottom: "1px solid var(--divider)",
                      padding: "12px 14px 12px 18px", animationDelay: `${idx * 20}ms` }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                      width: 3, background: bar, borderRadius: "0 3px 3px 0" }} />
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: bg, border: `1px solid ${bdr}`,
                        display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                        <MdCampaign size={17} style={{ color: dot }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 650, margin: 0,
                          color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                          {n.title}
                        </p>
                        <p style={{ fontSize: 12, margin: "3px 0 0", color: "var(--text-secondary)",
                          lineHeight: 1.5, opacity: 0.8 }}>
                          {n.description}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MdSchedule size={11} style={{ color: "var(--text-secondary)", opacity: 0.5 }} />
                            <span style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}>
                              {fmtDate(n.created_at)}
                            </span>
                          </div>
                          {n.file_url && (
                            <button
                              onClick={() => handleFileView(n.file_url)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                fontSize: 11, fontWeight: 600, color: "#60a5fa",
                                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.20)",
                                padding: "2px 8px", borderRadius: 999, cursor: "pointer",
                              }}
                            >
                              <MdOutlineOpenInNew size={11} />
                              {t("noticesViewAttachment")}
                            </button>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleEdit(n)}
                              style={{ fontSize: 11, fontWeight: 600, color: "#818cf8" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(n.id, n.society_id)}
                              disabled={deletingId === n.id}
                              style={{ fontSize: 11, fontWeight: 600, color: "#f87171" }}
                            >
                              {deletingId === n.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 16px", borderTop: "1px solid var(--divider)",
              background: "var(--card-inner-bg)", flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Showing{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>{" "}
                notices
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePage} />
            </div>
          </>
        )}
      </div>

      {/* ══ IMAGE LIGHTBOX ══ */}
      {lightbox && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ width: "100%", maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={() => setLightbox(null)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                  border: "none", cursor: "pointer", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdClose size={17} />
              </button>
            </div>
            <img src={lightbox} alt="attachment"
              style={{ width: "100%", borderRadius: 12, objectFit: "contain", maxHeight: "75vh", display: "block" }} />
            <p style={{ textAlign: "center", fontSize: 11, marginTop: 10, color: "rgba(255,255,255,0.3)" }}>
              Tap outside to close
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* ══ FILE PREVIEW MODAL (PDF / Doc / Sheet) ══ */}
      {filePreview && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setFilePreview(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 860, height: "82vh",
              display: "flex", flexDirection: "column", gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                📄 {filePreview.name}
              </span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a href={filePreview.fullUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: "white", background: "rgba(255,255,255,0.12)", textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 5 }}>
                  ↓ {t("docDownload") || "Download"}
                </a>
                <button onClick={() => setFilePreview(null)}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                    border: "none", cursor: "pointer", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MdClose size={17} />
                </button>
              </div>
            </div>

            {filePreview.previewUrl ? (
              <iframe
                key={filePreview.previewUrl}
                src={filePreview.previewUrl}
                title={filePreview.name}
                style={{ flex: 1, border: "none", borderRadius: 12, background: "white", width: "100%" }}
              />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 14, background: "rgba(255,255,255,0.04)",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 48 }}>📄</span>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {filePreview.name}
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0, textAlign: "center", maxWidth: 320 }}>
                  {isPublicHost()
                    ? "Preview not available for this file type."
                    : "In-browser preview requires a deployed (public) URL. Download the file to open it."}
                </p>
                <a href={filePreview.fullUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "8px 20px", borderRadius: 999, background: "var(--accent)",
                    color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 6 }}>
                  ↓ Download file
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}