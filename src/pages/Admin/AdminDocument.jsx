
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "../../context/LanguageContext";
import {
  MdOutlineAdminPanelSettings,
  MdCloudUpload, MdDescription, MdDelete,
  MdSearch, MdFilterList, MdClose,
  MdGavel, MdGroups, MdDirectionsCar,
  MdBuild, MdBarChart, MdSecurity,
  MdCheckCircle, MdWarningAmber, MdVisibility,
  MdInsertDriveFile, MdOutlineUploadFile,
  MdAdd, MdRefresh,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";
import Select from "../../components/common/Select";


/* ── Constants ── */
const ALL_CATS  = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];
const FORM_CATS = ["Legal", "Meetings", "Guidelines", "Finance", "Security"];
const ICON_MAP  = { Legal: MdGavel, Meetings: MdGroups, Guidelines: MdDirectionsCar, Finance: MdBarChart, Security: MdSecurity };
const COLOR_MAP = { Legal: "purple", Meetings: "blue", Guidelines: "amber", Finance: "red", Security: "green" };
const LIMIT     = 5;

/* ── Debounce ── */
function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── Spinner ── */
function Spinner({ small = false }) {
  const s = small ? 13 : 18;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Pagination ── */
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p); return acc;
    }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e${i}`} className="pagination-ellipsis">…</span> : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ value, label, variant }) {
  return (
    <div className={`ad-stat-card ad-stat-${variant}`}>
      <p className="ad-stat-val">{value}</p>
      <p className="ad-stat-label">{label}</p>
    </div>
  );
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr className="ad-tbody-row">
      <td className="ad-td">
        <div className="ad-name-cell">
          <div className="ad-skeleton ad-sk-icon" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="ad-skeleton ad-sk-title" />
            <div className="ad-skeleton ad-sk-sub" />
          </div>
        </div>
      </td>
      <td className="ad-td ad-col-cat"><div className="ad-skeleton ad-sk-badge" /></td>
      <td className="ad-td ad-col-meta"><div className="ad-skeleton ad-sk-meta" /></td>
      <td className="ad-td ad-col-meta"><div className="ad-skeleton ad-sk-meta" /></td>
      <td className="ad-td"><div className="ad-skeleton ad-sk-btn" /></td>
    </tr>
  );
}

/* ── Delete modal ── */
function DeleteModal({ doc, loading, onConfirm, onCancel, t }) {
  if (!doc) return null;
  return (
    <div className="ad-overlay" onClick={() => !loading && onCancel()}>
      <div className="modal-box ad-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-icon-wrap"><MdWarningAmber size={26} /></div>
        <h3 className="ad-modal-title">{t("adDocDeleteTitle")}</h3>
        <p className="ad-modal-body">
          <span className="ad-modal-filename">"{doc.title}"</span> {t("adDocDeleteBody")}
        </p>
        <div className="ad-modal-actions">
          <button className="ad-modal-cancel" onClick={onCancel} disabled={loading}>{t("cancel")}</button>
          <button className="ad-modal-confirm" onClick={onConfirm} disabled={loading}>
            {loading
              ? <><span className="ad-spinner" /> {t("adDocDeleting")}</>
              : <><MdDelete size={14} /> {t("billDelete")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function AdminDocument() {
  const { t }   = useLang();
  const fileRef = useRef();

  /* ── List state ── */
  const [docs,       setDocs]       = useState([]);
  const [counts,     setCounts]     = useState({ All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
  const [initialLoad,setInitialLoad]= useState(true);
  const [fetching,   setFetching]   = useState(false);
  const [error,      setError]      = useState(null);

  /* ── Pagination ── */
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Search & filter ── */
  const [search,    setSearch]    = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const debSearch = useDebounce(search, 500);

  /* ── Upload ── */
  const [uploading,  setUploading]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [file,       setFile]       = useState(null);
  const [form,       setForm]       = useState({ title: "", category: "Legal", desc: "" });
  const [uploadOpen, setUploadOpen] = useState(false);

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  /* ── Toast ── */
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Category label ── */
  const catLabel = cat => ({
    All: t("docCatAll"), Legal: t("docCatLegal"), Meetings: t("docCatMeetings"),
    Guidelines: t("docCatGuidelines"), Finance: t("docCatFinance"), Security: t("docCatSecurity"),
  }[cat] || cat);

  const formatDate = d => !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const fileUrl    = doc => doc.file_url?.startsWith("http") ? doc.file_url : `${BASE_URL}/${doc.file_url}`;

  /* ────────────────────────────────────
     LOAD DOCUMENTS — backend paginated
  ──────────────────────────────────── */
  const fetchDocuments = useCallback(async (pg, q, cat, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (q)               params.set("search",   q);
      if (cat && cat !== "All") params.set("category", cat);

      const res  = await API.get(`/documents/admin?${params}`);
      const data = res.data;

      setDocs(data.data || []);
      setCounts(data.counts || { All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      setError(err.response?.data?.message || t("docLoadError"));
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  /* ── Initial load ── */
  useEffect(() => { fetchDocuments(1, "", "All", true); }, []);

  /* ── Re-fetch on search change ── */
  useEffect(() => {
    if (initialLoad) return;
    fetchDocuments(1, debSearch, activeCat);
  }, [debSearch]);

  /* ── Category change ── */
  const handleCatChange = cat => {
    setActiveCat(cat);
    fetchDocuments(1, debSearch, cat);
  };

  const handlePageChange = p => fetchDocuments(p, debSearch, activeCat);

  /* ────────────────────────────────────
     UPLOAD
  ──────────────────────────────────── */
  const handleUpload = async e => {
    e.preventDefault();
    if (!form.title.trim()) { showToast(t("adDocErrTitle"), "error"); return; }
    if (!file)               { showToast(t("adDocErrFile"),  "error"); return; }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file",        file);
      formData.append("title",       form.title.trim());
      formData.append("category",    form.category);
      formData.append("description", form.desc.trim());
      const res = await API.post("/documents/admin", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ title: "", category: "Legal", desc: "" });
      setFile(null);
      setUploadOpen(false);
      showToast(`"${res.data.data.title}" ${t("adDocUploadSuccess")}`);
      // reload page 1 to show the new doc at the top
      fetchDocuments(1, debSearch, activeCat);
    } catch (err) {
      showToast(err.response?.data?.message || t("adDocUploadFail"), "error");
    } finally { setUploading(false); }
  };

  /* ────────────────────────────────────
     DELETE
  ──────────────────────────────────── */
  /* ────────────────────────────────────
   DELETE
──────────────────────────────────── */
const handleDelete = async () => {
  try {
    setDeleting(true);
    // ✅ FIX: Add ?hard=true to permanently delete the file
    await API.delete(`/documents/admin/${deleteTarget.id}?hard=true`);
    showToast(`"${deleteTarget.title}" ${t("adDocDeleteSuccess")}`);
    setDeleteTarget(null);
    // go back one page if this was last item on page
    const newPage = docs.length === 1 && page > 1 ? page - 1 : page;
    fetchDocuments(newPage, debSearch, activeCat);
  } catch (err) {
    showToast(err.response?.data?.message || t("adDocDeleteFail"), "error");
  } finally { setDeleting(false); }
};

  const onDrop = e => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  /* ────────────────────────────────────
     RENDER
  ──────────────────────────────────── */
  return (
    <div className="ad-root animate-fadeIn">

      {/* Toast */}
      {toast && (
        <div className={`ad-toast ad-toast--${toast.type}`}>
          {toast.type === "success" ? <MdCheckCircle size={16} /> : <MdWarningAmber size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="ad-er">
        <div className="ad-er-left">
          <div className="ad-er-icon-wrap"><MdOutlineAdminPanelSettings size={22} /></div>
          <div>
            <h1 className="ad-page-title">{t("adDocTitle")}</h1>
            <p className="ad-page-subtitle">{t("adDocSubtitle")}</p>
          </div>
        </div>
        <div className="ad-er-right">
          <span className="ad-count-badge">
            <MdDescription size={13} /> {initialLoad ? "…" : counts.All} {t("adDocBadgeCount")}
          </span>
          <button
            className={`ad-upload-toggle-btn${uploadOpen ? " ad-upload-toggle-btn--open" : ""}`}
            onClick={() => setUploadOpen(o => !o)}
          >
            <span className="ad-upload-toggle-icon">
              {uploadOpen ? <MdClose size={17} /> : <MdAdd size={17} />}
            </span>
            <span className="ad-upload-toggle-label">
              {uploadOpen ? t("cancel") : t("adDocUploadBtn")}
            </span>
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="ad-stats-row">
        <StatCard value={initialLoad ? "—" : counts.All}        label={t("docStatTotal")}   variant="indigo" />
        <StatCard value={initialLoad ? "—" : counts.Legal}      label={t("docCatLegal")}    variant="purple" />
        <StatCard value={initialLoad ? "—" : counts.Finance}    label={t("docCatFinance")}  variant="green"  />
        <StatCard value={initialLoad ? "—" : counts.Meetings}   label={t("docCatMeetings")} variant="amber"  />
      </div>

      {/* ── UPLOAD PANEL ── */}
      <div className={`ad-upload-panel${uploadOpen ? " ad-upload-panel--open" : ""}`}>
        <div className="bg-card ad-upload-card">
          <div className="ad-card-er">
            <div className="ad-card-er-left">
              <div className="ad-card-icon-wrap"><MdCloudUpload size={18} /></div>
              <div>
                <h2 className="ad-card-title">{t("adDocUploadTitle")}</h2>
                <p className="ad-card-subtitle">{t("adDocUploadSub")}</p>
              </div>
            </div>
            <button className="ad-card-close-btn" onClick={() => setUploadOpen(false)}>
              <MdClose size={16} />
            </button>
          </div>

          <form className="ad-form" onSubmit={handleUpload}>
            <div className="ad-form-grid">
              <div className="ad-field">
                <label className="ad-label">{t("adDocFieldTitle")} <span className="ad-req">*</span></label>
                <input className="input" type="text" placeholder={t("adDocFieldTitlePlaceholder")}
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="ad-field">
                <label className="ad-label">{t("adDocFieldCategory")} <span className="ad-req">*</span></label>
                <Select className="input" value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
                  {FORM_CATS.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                </Select>
              </div>
            </div>

            <div className="ad-field">
              <label className="ad-label">
                {t("adDocFieldDesc")} <span className="ad-opt">({t("compPhotoOptional")})</span>
              </label>
              <textarea className="input ad-textarea" rows={2}
                placeholder={t("adDocFieldDescPlaceholder")}
                value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
            </div>

            <div className="ad-field">
              <label className="ad-label">{t("adDocFieldFile")} <span className="ad-req">*</span></label>
              <div
                className={`ad-dropzone${dragOver ? " ad-dropzone--over" : ""}${file ? " ad-dropzone--filled" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  style={{ display: "none" }} onChange={e => setFile(e.target.files[0] || null)} />
                {file ? (
                  <div className="ad-dz-filled">
                    <div className="ad-dz-file-icon"><MdCheckCircle size={20} /></div>
                    <div className="ad-dz-info">
                      <p className="ad-dz-filename">{file.name}</p>
                      <p className="ad-dz-filesize">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" className="ad-dz-remove"
                      onClick={e => { e.stopPropagation(); setFile(null); }}>
                      <MdClose size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="ad-dz-empty">
                    <MdOutlineUploadFile size={34} className="ad-dz-cloud" />
                    <p className="ad-dz-text">
                      {t("adDocDragDrop")} <span className="ad-dz-browse">{t("adDocBrowse")}</span>
                    </p>
                    <p className="ad-dz-hint">{t("adDocFileHint")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="ad-form-footer">
              <button type="submit" className="btn-primary ad-submit-btn" disabled={uploading}>
                {uploading
                  ? <><span className="ad-spinner ad-spinner--white" /> {t("adDocUploading")}</>
                  : <><MdCloudUpload size={16} /> {t("adDocUploadBtn")}</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── LIST ── */}
      <div className="ad-list-wrap">
        <div className="ad-list-top">
          <h2 className="ad-list-title">{t("adDocListTitle")}</h2>
          {!initialLoad && (
            <span className="ad-list-count">
              {totalItems} {activeCat !== "All" ? `· ${catLabel(activeCat)}` : ""}
              {search ? ` · "${search}"` : ""}
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className="ad-toolbar">
          <div className="ad-search-row">
            <div className="ad-search-wrap">
              <MdSearch size={17} className="ad-search-icon" />
              <input
                key="admin-doc-search"
                className="ad-search-input"
                placeholder={t("adDocSearch")}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                {fetching && !initialLoad ? <Spinner small /> : search
                  ? <button className="ad-search-clear" style={{ position: "static", transform: "none" }} onClick={() => setSearch("")}><MdClose size={13} /></button>
                  : null}
              </div>
            </div>
          </div>
          <div className="ad-filter-row-bar">
            <MdFilterList size={15} className="ad-filter-icon" />
            {ALL_CATS.map(cat => (
              <button key={cat} onClick={() => handleCatChange(cat)}
                className={`ad-filter-chip${activeCat === cat ? " ad-filter-chip--active" : ""}`}>
                {catLabel(cat)}
                <span className="ad-chip-count">{counts[cat] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="ad-error">
            <p className="ad-error-text">{error}</p>
            <button className="ad-btn ad-btn-view" onClick={() => fetchDocuments(1, debSearch, activeCat)}>
              <MdRefresh size={14} /> {t("docRetry")}
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {initialLoad && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr className="ad-t-row">
                  <th className="ad-th">{t("adDocColDoc")}</th>
                  <th className="ad-th ad-col-cat">{t("adDocFieldCategory")}</th>
                  <th className="ad-th ad-col-meta">{t("adDocColSize")}</th>
                  <th className="ad-th ad-col-meta">{t("adDocColDate")}</th>
                  <th className="ad-th ad-th-actions">{t("billActionCol")}</th>
                </tr>
              </thead>
              <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        )}

        {/* Empty */}
        {!initialLoad && !error && docs.length === 0 && (
          <div className="ad-empty">
            <MdDescription size={38} className="ad-empty-icon" />
            <p className="ad-empty-text">
              {counts.All === 0 ? t("docEmptyTitle") : t("docNotFound")}
            </p>
            <p className="ad-empty-sub">
              {counts.All === 0 ? t("adDocEmptySub") : t("docNotFoundSub")}
            </p>
            {(search || activeCat !== "All") && (
              <button className="ad-btn ad-btn-view" style={{ marginTop: 10 }}
                onClick={() => { setSearch(""); handleCatChange("All"); }}>
                {t("billClearFilters")}
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!initialLoad && !error && docs.length > 0 && (
          <>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr className="ad-t-row">
                    <th className="ad-th">{t("adDocColDoc")}</th>
                    <th className="ad-th ad-col-cat">{t("adDocFieldCategory")}</th>
                    <th className="ad-th ad-col-meta">{t("adDocColSize")}</th>
                    <th className="ad-th ad-col-meta">{t("adDocColDate")}</th>
                    <th className="ad-th ad-th-actions">{t("billActionCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => {
                    const Icon  = ICON_MAP[doc.category]  || MdDescription;
                    const color = COLOR_MAP[doc.category] || "blue";
                    return (
                      <tr key={doc.id} className="ad-tbody-row animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                        <td className="ad-td">
                          <div className="ad-name-cell">
                            <div className={`ad-row-icon ad-icon-${color}`}><Icon size={15} /></div>
                            <div className="ad-name-text">
                              <p className="ad-doc-name">{doc.title}</p>
                              <p className="ad-doc-file">{doc.file_name}</p>
                              <span className={`ad-cat-badge ad-badge-${color} ad-badge-inline`}>
                                {catLabel(doc.category)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="ad-td ad-col-cat">
                          <span className={`ad-cat-badge ad-badge-${color}`}>{catLabel(doc.category)}</span>
                        </td>
                        <td className="ad-td ad-td-meta ad-col-meta">{doc.file_size_formatted || "—"}</td>
                        <td className="ad-td ad-td-meta ad-col-meta">{formatDate(doc.created_at)}</td>
                        <td className="ad-td">
                          <div className="ad-row-actions">
                            <a href={fileUrl(doc)} target="_blank" rel="noopener noreferrer"
                              className="ad-btn ad-btn-view">
                              <MdVisibility size={14} />
                              <span className="ad-btn-label">{t("docView")}</span>
                            </a>
                            <button className="ad-btn ad-btn-delete" onClick={() => setDeleteTarget(doc)}>
                              <MdDelete size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="ad-mobile-list">
              {docs.map((doc, i) => {
                const Icon  = ICON_MAP[doc.category]  || MdDescription;
                const color = COLOR_MAP[doc.category] || "blue";
                return (
                  <div key={doc.id} className="ad-mobile-card animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                    <div className="ad-mc-top">
                      <div className="ad-mc-left">
                        <div className={`ad-row-icon ad-icon-${color}`}><Icon size={16} /></div>
                        <div>
                          <p className="ad-doc-name">{doc.title}</p>
                          <p className="ad-doc-file">{doc.file_name}</p>
                        </div>
                      </div>
                      <span className={`ad-cat-badge ad-badge-${color}`}>{catLabel(doc.category)}</span>
                    </div>
                    <div className="ad-mc-meta">
                      <span className="ad-size-chip"><MdInsertDriveFile size={11} />{doc.file_size_formatted || "—"}</span>
                      <span className="ad-size-chip">{formatDate(doc.created_at)}</span>
                    </div>
                    <div className="ad-mc-actions">
                      <a href={fileUrl(doc)} target="_blank" rel="noopener noreferrer"
                        className="ad-btn ad-btn-view ad-btn-flex">
                        <MdVisibility size={14} /> {t("docView")}
                      </a>
                      <button className="ad-btn ad-btn-delete" onClick={() => setDeleteTarget(doc)}>
                        <MdDelete size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer: count + pagination */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Showing{" "}
                <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}</strong>
                {" "}of{" "}
                <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> documents
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>

      {/* ── DELETE MODAL ── */}
      <DeleteModal
        doc={deleteTarget} loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        t={t}
      />
    </div>
  );
}