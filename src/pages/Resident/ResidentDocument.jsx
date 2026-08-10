
import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../../context/LanguageContext";
import {
  MdDescription, MdDownload, MdOpenInNew,
  MdSearch, MdFilterList,
  MdGavel, MdGroups, MdDirectionsCar,
  MdBarChart, MdSecurity,
  MdClose, MdRefresh,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";
/* ── Debounce hook — keeps input focused during search ── */
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CATEGORY_KEYS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];
const LIMIT = 12; // 12 fits nicely in a 3-col grid

const ICON_MAP = {
  Legal:      MdGavel,
  Meetings:   MdGroups,
  Guidelines: MdDirectionsCar,
  Finance:    MdBarChart,
  Security:   MdSecurity,
};

const COLOR_MAP = {
  Legal:      { icon: "rd-icon-purple", badge: "rd-badge-purple", glow: "rd-glow-purple" },
  Meetings:   { icon: "rd-icon-blue",   badge: "rd-badge-blue",   glow: "rd-glow-blue"   },
  Guidelines: { icon: "rd-icon-amber",  badge: "rd-badge-amber",  glow: "rd-glow-amber"  },
  Finance:    { icon: "rd-icon-red",    badge: "rd-badge-red",    glow: "rd-glow-red"    },
  Security:   { icon: "rd-icon-green",  badge: "rd-badge-green",  glow: "rd-glow-green"  },
};

/* ── Stat card ── */
function StatCard({ value, label, colorClass }) {
  return (
    <div className={`rd-stat-card ${colorClass}`}>
      <p className="rd-stat-val">{value}</p>
      <p className="rd-stat-label">{label}</p>
    </div>
  );
}

/* ── Skeleton loader ── */
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

/* ── Document card ── */
function DocCard({ doc, index, t, categoryLabel }) {
  const Icon = ICON_MAP[doc.category] || MdDescription;
  const c    = COLOR_MAP[doc.category] || COLOR_MAP["Legal"];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const fileUrl = doc.file_url?.startsWith("http")
    ? doc.file_url
    : `${BASE_URL}/${doc.file_url}`;

  return (
    <div className="rd-doc-card" style={{ animationDelay: `${index * 60}ms` }}>
      <div className={`rd-card-accent ${c.glow}`} />
      <div className="rd-card-inner">

        <div className="rd-card-top">
          <div className={`rd-icon-wrap ${c.icon}`}>
            <Icon size={22} />
          </div>
          <div className="rd-card-meta">
            <span className={`rd-category-badge ${c.badge}`}>{categoryLabel(doc.category)}</span>
            <span className="rd-date-chip">{formatDate(doc.created_at)}</span>
          </div>
        </div>

        <div className="rd-card-body">
          <h3 className="rd-doc-title">{doc.title}</h3>
          <p className="rd-doc-desc">{doc.description || `${categoryLabel(doc.category)} ${t("docDocument")}`}</p>
        </div>

        <div className="rd-card-footer">
          <span className="rd-size-chip">
            <MdDescription size={12} />
            {doc.file_size_formatted || "—"}
          </span>
          <div className="rd-actions">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rd-btn rd-btn-view"
              title={t("docView")}
            >
              <MdOpenInNew size={15} />
              <span>{t("docView")}</span>
            </a>
            <button
              className="rd-btn rd-btn-download"
              title={t("docDownload")}
              onClick={async () => {
                try {
                  const res  = await fetch(fileUrl);
                  const blob = await res.blob();
                  const url  = window.URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href     = url;
                  a.download = doc.file_name || doc.title;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch { /* silent fail */ }
              }}
            >
              <MdDownload size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Pagination ── */
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
    <div className="pagination-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="pagination-btn"
      >
        <MdChevronLeft size={15} /> Prev
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="pagination-btn"
      >
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
        limit:    LIMIT,
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
    <div className="rd-root animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="rd-er">
        <div className="rd-er-left">
          <div className="rd-er-icon-wrap">
            <MdDescription size={22} />
          </div>
          <div>
            <h1 className="rd-page-title">{t("docTitle")}</h1>
            <p className="rd-page-subtitle">{t("docSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* ── STATS — always from server counts, stable regardless of search ── */}
      <div className="rd-stats-row">
        <StatCard value={initialLoad ? "—" : counts.All}        label={t("docStatTotal")}    colorClass="rd-stat-indigo" />
        <StatCard value={initialLoad ? "—" : counts.Legal}      label={t("docCatLegal")}      colorClass="rd-stat-purple" />
        <StatCard value={initialLoad ? "—" : counts.Finance}    label={t("docCatFinance")}    colorClass="rd-stat-green"  />
        <StatCard value={initialLoad ? "—" : counts.Guidelines} label={t("docCatGuidelines")} colorClass="rd-stat-amber"  />
      </div>

      {/* ── TOOLBAR ── */}
      <div className="rd-toolbar">
        <div className="rd-search-row">
          <div className="rd-search-wrap">
            <MdSearch size={17} className="rd-search-icon" />
            {/* stable key so React never remounts this input */}
            <input
              key="document-search-input"
              className="rd-search-input"
              placeholder={t("docSearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* subtle spinner while fetching, clear button when idle */}
            {fetching ? (
              <div className="rd-search-clear" style={{ pointerEvents: "none" }}>
                <svg className="animate-spin" style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            ) : search ? (
              <button className="rd-search-clear" onClick={() => setSearch("")} title={t("cancel")}>
                <MdClose size={13} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Filter chips */}
        <div className="rd-filter-row-bar">
          <MdFilterList size={15} className="rd-filter-icon" />
          {CATEGORY_KEYS.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`rd-filter-chip ${activeCategory === cat ? "rd-filter-chip--active" : ""}`}
            >
              {categoryLabel(cat)}
              <span className="rd-chip-count">{counts[cat] ?? 0}</span>
            </button>
          ))}
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
              />
            ))}
          </div>

          {/* ── Pagination + count ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 8 }}>
            <p className="rd-footer-note" style={{ marginBottom: 0 }}>
              {t("reportShowing")} {documents.length} {t("reportOf")} {totalItems} {t("docStatTotal").toLowerCase()}
            </p>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
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

    </div>
  );
}