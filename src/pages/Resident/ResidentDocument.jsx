import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";
import StatCard from "../../components/common/StatCard";
import Pagination from "../../components/common/Pagination";
import {
  MdDescription, MdDownload, MdVisibility,
  MdSearch,
  MdGavel, MdGroups, MdMenuBook,
  MdBarChart, MdSecurity,
  MdClose, MdRefresh,
  MdChevronLeft, MdChevronRight,
  MdFolderOpen, MdGridView, MdViewList,
  MdInsertDriveFile, MdPictureAsPdf, MdTableChart, MdSlideshow, MdImage,
  MdCalendarMonth, MdOpenInNew,
} from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CATEGORY_KEYS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];

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
    <div className="rd-doc-card rd-skeleton-card">
      <div className="rd-card-accent rd-skeleton-bar" />
      <div className="rd-card-inner">
        <div className="rd-card-top">
          <div className="rd-skeleton rd-skeleton-icon" />
          <div className="rd-skeleton rd-skeleton-badge" />
        </div>
        <div className="rd-card-body" style={{ gap: 8 }}>
          <div className="rd-skeleton rd-skeleton-title" />
          <div className="rd-skeleton rd-skeleton-desc" />
          <div className="rd-skeleton rd-skeleton-desc rd-skeleton-desc--short" />
        </div>
        <div className="rd-card-footer">
          <div className="rd-skeleton rd-skeleton-chip" />
          <div className="rd-skeleton rd-skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

function ResidentDocCard({ doc, index, t, categoryLabel, onOpen }) {
  const { icon: FileIcon, color: fileColor } = getFileType(doc.file_name);
  const ext = getFileExt(doc.file_name);
  const fileUrl = getDocUrl(doc.file_url);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      className="p-4 rounded-2xl border border-glass-border bg-card hover:bg-card-inner-bg/80 hover:border-accent/50 transition-all flex flex-col justify-between gap-3 shadow-sm group cursor-pointer"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onOpen(doc)}
    >
      <div>
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: `color-mix(in srgb, ${fileColor} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${fileColor} 30%, transparent)`,
              color: fileColor,
            }}
          >
            <FileIcon size={20} />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
              {categoryLabel(doc.category)}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors line-clamp-2 m-0" title={doc.title}>
          {doc.title}
        </h3>
        <p className="text-xs text-secondary line-clamp-2 mt-1 m-0">
          {doc.description || `${categoryLabel(doc.category)} document`}
        </p>
      </div>

      <div className="pt-3 border-t border-glass-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-secondary">
          <span className="font-mono font-semibold uppercase">{ext}</span>
          <span>•</span>
          <span>{doc.file_size_formatted || "—"}</span>
          <span>•</span>
          <span>{formatDate(doc.created_at)}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpen(doc)}
            className="p-1.5 rounded-lg bg-card-inner-bg hover:bg-accent-soft hover:text-accent text-secondary border border-glass-border transition-all cursor-pointer"
            title={t("docView") || "Preview"}
          >
            <MdVisibility size={15} />
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={doc.file_name || doc.title}
            className="p-1.5 rounded-lg bg-card-inner-bg hover:bg-emerald-500/15 hover:text-emerald-400 text-secondary border border-glass-border transition-all cursor-pointer inline-flex items-center justify-center"
            title={t("docDownload") || "Download"}
          >
            <MdDownload size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Component
═══════════════════════════════════════════ */
export default function ResidentDocument() {
  const { t } = useLang();

  const [documents,      setDocuments]      = useState([]);
  const [counts,         setCounts]         = useState({ All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
  const [error,          setError]          = useState(null);
  const [viewMode,       setViewMode]       = useState("grid"); // "grid" | "table"

  // ── Loading states ──
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  // ── Search & filter ──
  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
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
      All:        t("docCatAll") || "All Documents",
      Legal:      t("docCatLegal") || "Legal & Compliance",
      Meetings:   t("docCatMeetings") || "Minutes & Meetings",
      Guidelines: t("docCatGuidelines") || "Rules & Guidelines",
      Finance:    t("docCatFinance") || "Financial Statements",
      Security:   t("docCatSecurity") || "Security Protocols",
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
        page:     pageNum,
        limit: limitRef.current,
        category: currentCategory,
        ...(currentSearch ? { search: currentSearch } : {}),
      });

      const res = await API.get(`/documents?${params}`);

      setDocuments(res.data.data || []);
      setCounts(res.data.counts  || {});
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
    } catch (err) {
      setError(err.response?.data?.message || t("docLoadError") || "Failed to load documents");
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [t]);

  // ── First load ──
  useEffect(() => {
    fetchDocuments(1, "All", "", true);
  }, []);

  // ── Re-fetch on search/category change ──
  useEffect(() => {
    if (initialLoad) return;
    fetchDocuments(1, activeCategory, debouncedSearch);
  }, [debouncedSearch, activeCategory]);

  const handleCategoryChange = (cat) => setActiveCategory(cat);

  const handlePageChange = (newPage) =>
    fetchDocuments(newPage, activeCategory, debouncedSearch);

  const handleRetry = () =>
    fetchDocuments(page, activeCategory, debouncedSearch, page === 1 && initialLoad);

  return (
    <div className="ge-root rd-root animate-fadeIn space-y-5">
      {/* ── 1. Page Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdDescription size={22} />
          </div>
          <div>
            <h1 className="rd-page-title page-title m-0">{t("docTitle") || "Society Documents"}</h1>
            <p className="rd-page-subtitle page-subtitle m-0">{t("docSubtitle") || "Official bylaws, meeting minutes, financial audits & community policies"}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Dynamic Category StatCards Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <StatCard
          icon={MdFolderOpen}
          value={counts.All ?? 0}
          label="All Files"
          tone="brand"
          active={activeCategory === "All"}
          onClick={() => setActiveCategory("All")}
        />
        <StatCard
          icon={MdGavel}
          value={counts.Legal ?? 0}
          label="Legal"
          tone="danger"
          active={activeCategory === "Legal"}
          onClick={() => setActiveCategory("Legal")}
        />
        <StatCard
          icon={MdGroups}
          value={counts.Meetings ?? 0}
          label="Meetings"
          tone="info"
          active={activeCategory === "Meetings"}
          onClick={() => setActiveCategory("Meetings")}
        />
        <StatCard
          icon={MdMenuBook}
          value={counts.Guidelines ?? 0}
          label="Guidelines"
          tone="warning"
          active={activeCategory === "Guidelines"}
          onClick={() => setActiveCategory("Guidelines")}
        />
        <StatCard
          icon={MdBarChart}
          value={counts.Finance ?? 0}
          label="Finance"
          tone="success"
          active={activeCategory === "Finance"}
          onClick={() => setActiveCategory("Finance")}
        />
        <StatCard
          icon={MdSecurity}
          value={counts.Security ?? 0}
          label="Security"
          tone="brand"
          active={activeCategory === "Security"}
          onClick={() => setActiveCategory("Security")}
        />
      </div>

      {/* ── 3. Toolbar: Categories + View Toggle + Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="gp-filter-tabs"
            value={activeCategory}
            onChange={handleCategoryChange}
            tabs={CATEGORY_KEYS.map((cat) => ({
              id: cat,
              label: categoryLabel(cat),
              badge: counts[cat] ?? 0,
            }))}
          />
        </div>

        <div className="flex items-center gap-2.5 ml-auto flex-wrap sm:flex-nowrap">
          {/* Grid vs Table View Mode Switcher */}
          <div className="flex items-center rounded-xl p-1 bg-card-inner-bg border border-glass-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-accent text-white shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
              title="Grid View"
            >
              <MdGridView size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-accent text-white shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
              title="Table View"
            >
              <MdViewList size={16} />
            </button>
          </div>

          <ExpandableSearch
            placeholder={t("docSearch") || "Search by document title…"}
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* ── 4. Error State ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between gap-3">
          <p className="m-0 font-semibold">{error}</p>
          <button
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-xs font-bold hover:bg-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
            onClick={handleRetry}
          >
            <MdRefresh size={15} /> {t("docRetry") || "Retry"}
          </button>
        </div>
      )}

      {/* ── 5. Loading Skeletons ── */}
      {initialLoad && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── 6. Empty State ── */}
      {!initialLoad && !error && documents.length === 0 && (
        <div className="p-12 rounded-2xl border border-glass-border bg-card text-center text-secondary shadow-sm">
          <MdDescription size={44} className="mx-auto mb-2 opacity-25 text-accent" />
          <p className="text-base font-bold text-primary m-0">
            {counts.All === 0 ? (t("docEmptyTitle") || "No documents uploaded yet") : (t("docNotFound") || "No matching documents found")}
          </p>
          <p className="text-xs text-secondary mt-1 max-w-sm mx-auto m-0">
            {counts.All === 0 ? (t("docEmptySub") || "Published society bylaws and notices will appear here.") : (t("docNotFoundSub") || "Try changing your search keywords or switching category filters.")}
          </p>
        </div>
      )}

      {/* ── 7. Documents Display (Grid vs. Table) ── */}
      {!initialLoad && !error && documents.length > 0 && (
        <div className="space-y-4">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
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
          ) : (
            <div className="bg-card rounded-2xl border border-glass-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-card-inner-bg/80 border-b border-glass-border text-secondary font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="p-3.5">Document</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">File Details</th>
                      <th className="p-3.5">Uploaded</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {documents.map((doc) => {
                      const { icon: FileIcon, color: fileColor } = getFileType(doc.file_name);
                      const fileUrl = getDocUrl(doc.file_url);

                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-card-inner-bg/50 transition-colors cursor-pointer"
                          onClick={() => setViewDoc(doc)}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                                style={{
                                  background: `color-mix(in srgb, ${fileColor} 15%, transparent)`,
                                  borderColor: `color-mix(in srgb, ${fileColor} 30%, transparent)`,
                                  color: fileColor,
                                }}
                              >
                                <FileIcon size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-primary truncate m-0">{doc.title}</p>
                                <p className="text-[11px] text-secondary truncate m-0">{doc.file_name}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                              {categoryLabel(doc.category)}
                            </span>
                          </td>

                          <td className="p-3.5 text-secondary">
                            <span className="font-mono text-xs">{doc.file_size_formatted || "—"}</span>
                          </td>

                          <td className="p-3.5 text-secondary">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}
                          </td>

                          <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewDoc(doc)}
                                className="p-1.5 rounded-lg bg-card-inner-bg hover:bg-accent-soft hover:text-accent text-secondary border border-glass-border transition-all cursor-pointer"
                                title={t("docView") || "Preview"}
                              >
                                <MdVisibility size={15} />
                              </button>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={doc.file_name || doc.title}
                                className="p-1.5 rounded-lg bg-card-inner-bg hover:bg-emerald-500/15 hover:text-emerald-400 text-secondary border border-glass-border transition-all cursor-pointer inline-flex items-center justify-center"
                                title={t("docDownload") || "Download"}
                              >
                                <MdDownload size={15} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Pagination Footer ── */}
          <div className="flex flex-col sm:flex-row justify-between items-center px-2 pt-3 border-t border-glass-border gap-3">
            <span className="text-xs text-secondary font-medium">
              {t("reportShowing") || "Showing"} <strong>{documents.length}</strong> {t("reportOf") || "of"} <strong>{totalItems}</strong> {t("docStatTotal") || "documents"}
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

      {/* ── 8. Document Preview Modal ── */}
      <GlobalModal
        isOpen={!!viewDoc}
        onClose={() => setViewDoc(null)}
        title={viewDoc?.title || t("docDocument") || "Document"}
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