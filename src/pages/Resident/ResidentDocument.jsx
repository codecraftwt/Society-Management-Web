import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLang } from "../../context/LanguageContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";
import Pagination from "../../components/common/Pagination";
import {
  MdDescription, MdDownload, MdVisibility,
  MdRefresh,
  MdInsertDriveFile, MdPictureAsPdf, MdTableChart, MdSlideshow, MdImage,
  MdCalendarMonth, MdFolderOpen,
} from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";
import "../../sections/document/Document.css";

const ALL_CATS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const FILE_TYPES = [
  { exts: ["pdf"], icon: MdPictureAsPdf, color: "#ef4444" },
  { exts: ["doc", "docx"], icon: MdDescription, color: "#3b82f6" },
  { exts: ["xls", "xlsx", "csv"], icon: MdTableChart, color: "#10b981" },
  { exts: ["ppt", "pptx"], icon: MdSlideshow, color: "#f97316" },
  { exts: ["png", "jpg", "jpeg", "webp", "gif", "svg"], icon: MdImage, color: "#06b6d4" },
];

const getFileType = (fileName = "") => {
  const ext = String(fileName).split(".").pop()?.toLowerCase();
  const hit = FILE_TYPES.find((f) => f.exts.includes(ext));
  return hit || { icon: MdInsertDriveFile, color: "#8b5cf6" };
};

const getFileExt = (fileName = "") => {
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "file";
};

const getDocUrl = (fileUrl) => {
  if (!fileUrl) return "#";
  return fileUrl.startsWith("http") ? fileUrl : `${BASE_URL}/${fileUrl}`;
};

function SkeletonCard() {
  return (
    <div className="doc-skeleton" style={{ minHeight: 215 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="doc-skel-box" style={{ width: 42, height: 42, borderRadius: 13 }} />
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div className="doc-skel-line" style={{ width: "35%" }} />
          <div className="doc-skel-line" style={{ width: "75%" }} />
        </div>
      </div>
      <div className="doc-skel-line" style={{ width: "50%", marginTop: 4 }} />
      <div className="doc-skel-line" style={{ flex: 1, minHeight: 38, borderRadius: 12, marginTop: 4 }} />
      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
        <div className="doc-skel-line" style={{ flex: 1, height: 36, borderRadius: 12 }} />
        <div className="doc-skel-line" style={{ width: 36, height: 36, borderRadius: 12 }} />
      </div>
    </div>
  );
}

function ResidentDocCard({ doc, index, t, categoryLabel, onOpen }) {
  const { icon: FileIcon, color: fileColor } = getFileType(doc.file_name);
  const ext = getFileExt(doc.file_name);
  const fileUrl = getDocUrl(doc.file_url);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      data-category={doc.category}
      style={{ "--doc-file-c": fileColor, animationDelay: `${index * 25}ms` }}
      className="doc-decent-card rd-modern-doc-card group"
      onClick={() => onOpen(doc)}
    >
      {/* Corner category color blob */}
      <span className="doc-card-blob" aria-hidden="true" />

      {/* Card Header: Icon + Category Badge */}
      <div className="doc-card-top">
        <div className="doc-card-head">
          <div className="doc-file-icon">
            <FileIcon size={22} />
          </div>
          <div className="doc-head-text">
            <span className="doc-label">{t("docDocument", "Document")}</span>
            <h3 className="doc-title" title={doc.title}>
              {doc.title}
            </h3>
          </div>
        </div>

        <span className="doc-cat-chip">
          <span className="doc-cat-dot" aria-hidden="true" />
          {categoryLabel(doc.category)}
        </span>
      </div>

      {/* Description if present */}
      {doc.description && (
        <p className="rd-doc-desc" title={doc.description}>
          {doc.description}
        </p>
      )}

      {/* Metadata Row: File Size & Date */}
      <div className="doc-meta">
        <div className="doc-meta-row">
          <span className="doc-meta-item">
            <MdInsertDriveFile size={13} aria-hidden="true" />
            {doc.file_size_formatted || "—"}
          </span>
          <span className="doc-meta-sep" aria-hidden="true">•</span>
          <span className="doc-meta-item">
            <MdCalendarMonth size={13} aria-hidden="true" />
            {formatDate(doc.created_at)}
          </span>
        </div>
      </div>

      {/* File Name Box + Extension Chip */}
      <div className="doc-card-body">
        <span className="doc-file-row">
          <span className="doc-file-mark" aria-hidden="true" />
          <span className="doc-file-name" title={doc.file_name}>
            {doc.file_name}
          </span>
        </span>
        <span className="doc-ext">{ext}</span>
      </div>

      {/* Card Action Footer: Primary Preview + Quick Download */}
      <div className="rd-card-footer" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpen(doc)}
          className="rd-btn-preview"
          title={t("docView", "View Document")}
        >
          <MdVisibility size={16} />
          <span>{t("docView", "View Document")}</span>
        </button>

        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={doc.file_name || doc.title}
          className="rd-btn-download"
          title={t("docDownload", "Download")}
          aria-label={t("docDownload", "Download")}
        >
          <MdDownload size={17} />
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Component: ResidentDocument
═══════════════════════════════════════════ */
export default function ResidentDocument() {
  const { t } = useLang();

  const [documents,      setDocuments]      = useState([]);
  const [counts,         setCounts]         = useState({ All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
  const [activeCat,      setActiveCat]      = useState("All");
  const [error,          setError]          = useState(null);

  // ── Loading states ──
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  // ── Search ──
  const [search,         setSearch]         = useState("");
  const debouncedSearch = useDebounce(search, 500);

  // ── Pagination ──
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(12);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewDoc,    setViewDoc]    = useState(null);

  /* Maps backend category string → translated display label */
  const categoryLabel = (cat) => {
    const map = {
      All:        t("docCatAll", "All Documents"),
      Legal:      t("docCatLegal", "Legal & Compliance"),
      Meetings:   t("docCatMeetings", "Minutes & Meetings"),
      Guidelines: t("docCatGuidelines", "Rules & Guidelines"),
      Finance:    t("docCatFinance", "Financial Statements"),
      Security:   t("docCatSecurity", "Security Protocols"),
    };
    return map[cat] || cat;
  };

  /* ── Fetch ── */
  const fetchDocuments = useCallback(async (
    pageNum, currentCategory, currentSearch, isInitial = false
  ) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);

    setError(null);

    try {
      const params = new URLSearchParams({
        page:  pageNum,
        limit: limitRef.current,
        ...(currentCategory && currentCategory !== "All" ? { category: currentCategory } : {}),
        ...(currentSearch ? { search: currentSearch } : {}),
      });

      const res = await API.get(`/documents?${params}`);

      setDocuments(res.data.data || []);
      setCounts(res.data.counts  || {});
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalItems(res.data.pagination?.totalItems ?? 0);
      setPage(pageNum);
    } catch (err) {
      setError(err.response?.data?.message || t("docLoadError", "Failed to load documents"));
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [t]);

  // ── First load ──
  useEffect(() => {
    fetchDocuments(1, "All", "", true);
  }, []);

  // ── Re-fetch on search change ──
  useEffect(() => {
    if (initialLoad) return;
    fetchDocuments(1, activeCat, debouncedSearch);
  }, [debouncedSearch]);

  const handleCategoryChange = (cat) => {
    setActiveCat(cat);
    setPage(1);
    fetchDocuments(1, cat, debouncedSearch);
  };

  const handlePageChange = (newPage) =>
    fetchDocuments(newPage, activeCat, debouncedSearch);

  const handleRetry = () =>
    fetchDocuments(page, activeCat, debouncedSearch, page === 1 && initialLoad);

  return (
    <div className="documents-page rd-doc-page ge-root rd-root animate-fadeIn space-y-4">
      {/* ── 1. Page Header & Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdDescription size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="rd-page-title page-title m-0">
                {t("docTitle", "Society Documents")}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                {totalItems} {t("docFiles", "Files")}
              </span>
            </div>
            <p className="rd-page-subtitle page-subtitle mt-0.5 m-0">
              {t("docSubtitle", "Official bylaws, meeting minutes, financial audits & community policies")}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5">
          <ExpandableSearch
            placeholder={t("docSearch", "Search documents by title or file…")}
            value={search}
            onChange={setSearch}
            maxWidth={280}
          />
        </div>
      </div>

      {/* ── 2. Category Filter Pills with Live Badges ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {ALL_CATS.map((cat) => {
          const isActive = activeCat === cat;
          const count = counts?.[cat] ?? 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-accent text-white shadow-xs shadow-accent/25"
                  : "bg-card-inner-bg text-secondary border border-glass-border hover:text-primary hover:border-accent/40"
              }`}
            >
              <span>{categoryLabel(cat)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-card text-secondary border border-glass-border"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Error State ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between gap-3">
          <p className="m-0 font-semibold">{error}</p>
          <button
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-xs font-bold hover:bg-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
            onClick={handleRetry}
          >
            <MdRefresh size={15} /> {t("docRetry", "Retry")}
          </button>
        </div>
      )}

      {/* ── 4. Loading Skeletons ── */}
      {initialLoad && (
        <div className="doc-card-grid">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── 5. Empty State ── */}
      {!initialLoad && !error && documents.length === 0 && (
        <div className="doc-empty-state">
          <div className="doc-empty-icon">
            <MdFolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-primary m-0">
            {counts.All === 0 ? t("docEmptyTitle", "No documents uploaded yet") : t("docNotFound", "No matching documents found")}
          </p>
          <p className="text-xs text-secondary mt-1 max-w-sm mx-auto m-0">
            {counts.All === 0 ? t("docEmptySub", "Published society bylaws and notices will appear here.") : t("docNotFoundSub", "Try changing your search keywords or switching category filters.")}
          </p>
        </div>
      )}

      {/* ── 6. Documents Modern Grid ── */}
      {!initialLoad && !error && documents.length > 0 && (
        <div className="space-y-4">
          <div className="doc-card-grid">
            {documents.map((doc, i) => (
              <ResidentDocCard
                key={doc.id}
                doc={doc}
                index={i}
                t={t}
                categoryLabel={categoryLabel}
                onOpen={setViewDoc}
              />
            ))}
          </div>

          {/* ── Pagination Footer ── */}
          <div className="flex flex-col sm:flex-row justify-between items-center px-2 pt-3 border-t border-glass-border gap-3">
            <span className="text-xs text-secondary font-medium">
              {t("reportShowing", "Showing")} <strong>{documents.length}</strong> {t("reportOf", "of")} <strong>{totalItems}</strong> {t("docStatTotal", "documents")}
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={limit}
              onPageSizeChange={(s) => {
                limitRef.current = s;
                setLimit(s);
                setPage(1);
                handlePageChange(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ── 7. Document Preview Modal ── */}
      <GlobalModal
        isOpen={!!viewDoc}
        onClose={() => setViewDoc(null)}
        title={viewDoc?.title || t("docDocument", "Document")}
        subtitle={viewDoc?.file_name}
        icon={<MdDescription size={20} className="text-accent" />}
        size="xl"
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