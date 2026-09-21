
import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useLang } from "../../context/LanguageContext";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
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
import { getTitleError } from "../../utils/validators";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";


import Pagination from "../../components/common/Pagination";

/* ── Document card ── */
function DocCard({ doc, t, onDelete, isCommittee }) {
  const Icon  = ICON_MAP[doc.category] || MdDescription;
  const color = COLOR_MAP[doc.category] || "blue";
  const catLabel = cat => ({
    All: t("docCatAll"), Legal: t("docCatLegal"), Meetings: t("docCatMeetings"),
    Guidelines: t("docCatGuidelines"), Finance: t("docCatFinance"), Security: t("docCatSecurity"),
  }[cat] || cat);
  const formatDate = d => !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const fileUrl    = doc => doc.file_url?.startsWith("http") ? doc.file_url : `${BASE_URL}/${doc.file_url}`;
  return (
    <div className="rounded-2xl border p-4 sm:p-5 flex flex-col justify-between" style={{
      background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
      borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      minHeight: 160
    }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
            background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--glass-border)",
            color: `var(--stat-${color}-color, #818cf8)`
          }}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-primary truncate" style={{ letterSpacing: "-0.01em", color: "var(--text-primary)" }} title={doc.title}>
              {doc.title}
            </h3>
            <p className="text-xs text-secondary truncate mt-0.5" title={doc.file_name}>{doc.file_name}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold shrink-0 border`} style={{
          background: `var(--stat-${color}-bg, rgba(255,255,255,0.05))`,
          color: `var(--stat-${color}-color, #fff)`,
          borderColor: `var(--stat-${color}-border, rgba(255,255,255,0.1))`
        }}>
          {catLabel(doc.category)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-medium text-secondary mb-4">
        <span className="flex items-center gap-1.5"><MdInsertDriveFile size={12} /> {doc.file_size_formatted || "—"}</span>
        <span>•</span>
        <span>{formatDate(doc.created_at)}</span>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onOpen(doc)}
          className="flex-1 h-9 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all"
          style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.08))"; e.currentTarget.style.borderColor = "var(--accent-light, #818cf8)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--card-inner-bg)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
        >
          <MdVisibility size={14} /> {t("docView")}
        </button>
        {!isCommittee && (
          <button
            onClick={() => onDelete(doc)}
            className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0"
            style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)", color: "var(--stat-red-color, #ef4444)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--stat-red-bg, rgba(239,68,68,0.15))"; e.currentTarget.style.borderColor = "var(--stat-red-border, rgba(239,68,68,0.3))"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--card-inner-bg)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          >
            <MdDelete size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="ad-mobile-card">
      <div className="ad-mc-top" style={{ alignItems: "center" }}>
        <div className="ad-skeleton ad-sk-icon" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="ad-skeleton ad-sk-title" />
          <div className="ad-skeleton ad-sk-sub" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="ad-skeleton ad-sk-badge" />
        <div className="ad-skeleton ad-sk-badge" />
      </div>
      <div className="ad-skeleton ad-sk-btn" style={{ width: "60%" }} />
    </div>
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
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
  const isCommittee = isCommitteeMember(user);
  const fileRef = useRef();

  /* ── List state ── */
  const [docs,       setDocs]       = useState([]);
  const [counts,     setCounts]     = useState({ All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
  const [initialLoad,setInitialLoad]= useState(true);
  const [fetching,   setFetching]   = useState(false);
  const [error,      setError]      = useState(null);

  /* ── Pagination ── */
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(5);
  const limitRef = useRef(limit);
  limitRef.current = limit;
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
  const [viewDoc,    setViewDoc]    = useState(null);

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const handleToggleUpload = () => {
    if (!uploadOpen && !hasPermission(user, "society_documents", "upload")) {
      showUnauthorized("You do not have permission to upload society documents.");
      return;
    }
    setUploadOpen(o => !o);
  };

  const handleOpenDelete = (doc) => {
    if (!hasPermission(user, "society_documents", "delete")) {
      showUnauthorized("You do not have permission to delete society documents.");
      return;
    }
    setDeleteTarget(doc);
  };

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

  /* ────────────────────────────────────
     LOAD DOCUMENTS — backend paginated
  ──────────────────────────────────── */
  const fetchDocuments = useCallback(async (pg, q, cat, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pg, limit: limitRef.current });
      if (q)               params.set("search",   q);
      if (cat && cat !== "All") params.set("category", cat);

      const res  = await API.get(`/documents/admin?${params}`);
      const data = res.data;

      const rawDocs = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.documents)
        ? data.documents
        : [];
      setDocs(rawDocs);
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
    if (!hasPermission(user, "society_documents", "upload")) {
      showUnauthorized("You do not have permission to upload society documents.");
      return;
    }
    const titleErr = getTitleError(form.title, "Document title");
    if (titleErr)  { showToast(titleErr, "error"); return; }
    if (!file)     { showToast(t("adDocErrFile"), "error"); return; }
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
  const handleDelete = async () => {
    if (!hasPermission(user, "society_documents", "delete")) {
      showUnauthorized("You do not have permission to delete society documents.");
      return;
    }
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

      {/* ── UNIFIED HEADER BAR ── */}
      <div
        className="ad-page-header flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border mb-2"
        style={{
          background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
          borderColor: "var(--glass-border, rgba(255, 255, 255, 0.1))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-accent shrink-0"
            style={{
              background: "var(--accent-soft, rgba(99,102,241,0.18))",
              border: "1px solid var(--accent-light, #818cf8)",
            }}
          >
            <MdDescription size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary flex items-center gap-2" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("adDocTitle") || "Society Documents"}
            </h1>
            <p className="text-xs text-secondary mt-0.5 hidden sm:block">
              {t("adDocSubtitle") || "Manage legal and administrative documents"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1" style={{ scrollbarWidth: "none" }}>
          <ExpandableSearch placeholder={t("adDocSearch")} value={search} onChange={setSearch} />
          {!isCommittee && (
            <GlobalButton
              variant="add"
              icon={uploadOpen ? MdClose : MdAdd}
              borderDraw
              onClick={handleToggleUpload}
              className="shrink-0"
              style={{ fontWeight: 700 }}
            >
              {uploadOpen ? t("cancel") : t("adDocUploadBtn")}
            </GlobalButton>
          )}
        </div>
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
              <GlobalButton type="submit" variant="add" disabled={uploading}>
                {uploading
                  ? <><span className="ad-spinner ad-spinner--white" /> {t("adDocUploading")}</>
                  : <><MdCloudUpload size={16} /> {t("adDocUploadBtn")}</>}
              </GlobalButton>
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
            {/* Expanded search moved to header */}
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
          <div className="ad-card-grid">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
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

        {/* Document cards */}
        {!initialLoad && !error && docs.length > 0 && (
          <>
            <div className="ad-card-grid">
              {docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} t={t} onDelete={handleOpenDelete} onOpen={setViewDoc} isCommittee={isCommittee} />
              ))}
            </div>

            {/* Footer: count + pagination */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Showing{" "}
                <strong style={{ color: "var(--text-primary)" }}>{(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}</strong>
                {" "}of{" "}
                <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> documents
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
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

      {/* ── VIEW MODAL ── */}
      <GlobalModal
        isOpen={!!viewDoc}
        onClose={() => setViewDoc(null)}
        title={viewDoc?.title || "Document"}
        subtitle={viewDoc?.file_name}
        icon={MdDescription}
        size="lg"
      >
        <div style={{ height: "70vh", width: "100%", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          {viewDoc && (
            <iframe
              src={viewDoc.file_url?.startsWith("http") ? viewDoc.file_url : `${BASE_URL}/${viewDoc.file_url}`}
              title={viewDoc.title}
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          )}
        </div>
      </GlobalModal>
    </div>
  );
}