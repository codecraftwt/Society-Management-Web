
import React, { useState, useEffect, useCallback, useRef} from "react";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";
import {
  MdDescription, MdDownload, MdVisibility,
  MdSearch,
  MdGavel, MdGroups, MdDirectionsCar,
  MdBarChart, MdSecurity,
  MdClose, MdRefresh,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";
import Pagination from "../../components/common/Pagination";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentDocument() {
  const { t } = useLang();

  const [documents,      setDocuments]      = useState([]);
  const [counts,         setCounts]         = useState({ All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
  const [error,          setError]          = useState(null);

  // ── Two loading states ──
  const [initialLoad, setInitialLoad] = useState(true);  // skeletons on first load
  const [fetching,    setFetching]    = useState(false); // tiny spinner in search box

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
      All:        t("docCatAll"),
      Legal:      t("docCatLegal"),
      Meetings:   t("docCatMeetings"),
      Guidelines: t("docCatGuidelines"),
      Finance:    t("docCatFinance"),
      Security:   t("docCatSecurity"),
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
      setError(err.response?.data?.message || t("docLoadError"));
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

  /* ── RENDER ── */
  return (
    <div className="ge-root rd-root animate-fadeIn">

      <div className="ge-er rd-er">
        <div className="ge-er-left rd-er-left">
          <div className="ad-page-icon">
            <MdDescription size={22} />
          </div>
          <div>
            <h1 className="rd-page-title page-title">{t("docTitle")}</h1>
            <p className="rd-page-subtitle page-subtitle">{t("docSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="ge-toolbar">
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

        <div className="ml-auto">
          <ExpandableSearch
            placeholder={t("docSearch")}
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* ── ERROR STATE ── */}
      {error && (
        <div className="rd-error">
          <p className="rd-error-text">{error}</p>
          <button className="rd-btn rd-btn-view" onClick={handleRetry}>
            <MdRefresh size={15} /> {t("docRetry")}
          </button>
        </div>
      )}

      {/* ── LOADING SKELETONS (first load only) ── */}
      {initialLoad && (
        <div className="rd-grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!initialLoad && !error && documents.length === 0 && (
        <div className="rd-empty">
          <MdDescription size={36} className="rd-empty-icon" />
          <p className="rd-empty-text">
            {counts.All === 0 ? t("docEmptyTitle") : t("docNotFound")}
          </p>
          <p className="rd-empty-sub">
            {counts.All === 0 ? t("docEmptySub") : t("docNotFoundSub")}
          </p>
        </div>
      )}

      {/* ── DOCUMENT GRID ── */}
      {!initialLoad && !error && documents.length > 0 && (
        <>
          <div className="rd-grid">
            {documents.map((doc, i) => (
              <DocCard
                key={doc.id}
                doc={doc}
                index={i}
                t={t}
                categoryLabel={categoryLabel}
                onOpen={setViewDoc}
              />
            ))}
          </div>

          {/* ── Pagination + count ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 }}>
            <p className="rd-footer-note" style={{ marginBottom: 0 }}>
              {t("reportShowing")} {documents.length} {t("reportOf")} {totalItems} {t("docStatTotal").toLowerCase()}
            </p>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
          </div>
        </>
      )}

      {/* ── FOOTER NOTE (no pagination state) ── */}
      {!initialLoad && !error && documents.length === 0 && counts.All > 0 && (
        <p className="rd-footer-note">{t("docFooter")}</p>
      )}

      {!initialLoad && !error && counts.All === 0 && (
        <p className="rd-footer-note">{t("docFooter")}</p>
      )}

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