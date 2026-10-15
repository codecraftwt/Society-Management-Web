import {
  MdDescription, MdDelete, MdVisibility, MdInsertDriveFile,
  MdAdd, MdRefresh, MdPictureAsPdf, MdTableChart, MdSlideshow, MdImage,
  MdChevronRight, MdCalendarMonth, MdCloudDone, MdWarningAmber,
} from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { BASE_URL } from "../../../config/apiConfig";
import GlobalButton from "../../../components/common/GlobalButton";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import Pagination from "../../../components/common/Pagination";

const ALL_CATS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];

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

function DocCard({ doc, t, onDelete, onOpen, isCommittee, catLabel, index = 0 }) {
  const { icon: FileIcon, color: fileColor } = getFileType(doc.file_name);
  const ext = getFileExt(doc.file_name);
  const formatDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const fileLink = getDocUrl(doc.file_url);

  return (
    <div
      data-category={doc.category}
      style={{ "--doc-file-c": fileColor, animationDelay: `${index * 20}ms` }}
      className="doc-decent-card group hover:border-accent/50"
      onClick={() => onOpen(doc)}
    >
      <span className="doc-card-blob" aria-hidden="true" />

      <div className="doc-card-top">
        <div className="doc-card-head">
          <div className="doc-file-icon">
            <FileIcon size={22} />
          </div>
          <div className="doc-head-text">
            <span className="doc-label">{t("adDocColDoc") || "Document"}</span>
            <h3 className="doc-title" title={doc.title}>
              {doc.title}
            </h3>
          </div>
          <MdChevronRight className="doc-card-arrow text-secondary group-hover:text-accent group-hover:translate-x-1 transition-all" size={18} aria-hidden="true" />
        </div>

        <span className="doc-cat-chip">
          <span className="doc-cat-dot" aria-hidden="true" />
          {catLabel(doc.category)}
        </span>
      </div>

      <div className="doc-meta">
        <span className="doc-meta-row">
          <span className="doc-meta-item">
            <MdInsertDriveFile size={13} aria-hidden="true" />
            {doc.file_size_formatted || "—"}
          </span>
          <span className="doc-meta-sep" aria-hidden="true">•</span>
          <span className="doc-meta-item">
            <MdCalendarMonth size={13} aria-hidden="true" />
            {formatDate(doc.created_at)}
          </span>
        </span>
      </div>

      <div className="doc-card-body">
        <span className="doc-file-row">
          <span className="doc-file-mark" aria-hidden="true" />
          <span className="doc-file-name" title={doc.file_name}>
            {doc.file_name}
          </span>
        </span>
        <span className="doc-ext">{ext}</span>
      </div>

      {/* Primary Card Action Footer: View Document Only */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-glass-border">
        {/* Primary Action: View Document */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(doc);
          }}
          className="flex-1 h-9.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-accent text-white hover:opacity-90 shadow-xs shadow-accent/25 cursor-pointer"
          title={t("docView") || "View Document"}
        >
          <MdVisibility size={16} />
          <span>{t("docView") || "View Document"}</span>
        </button>

        {/* Admin Action: Delete */}
        {!isCommittee && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc);
            }}
            className="w-9.5 h-9.5 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer shrink-0"
            title={t("billDelete") || "Delete"}
            aria-label={t("billDelete") || "Delete"}
          >
            <MdDelete size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="doc-skeleton">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="doc-skel-box" style={{ width: 42, height: 42 }} />
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div className="doc-skel-line" style={{ width: "35%" }} />
          <div className="doc-skel-line" style={{ width: "75%" }} />
        </div>
      </div>
      <div className="doc-skel-line" style={{ width: "50%" }} />
      <div className="doc-skel-line" style={{ flex: 1, minHeight: 38, borderRadius: 12 }} />
      <div className="doc-skel-line" style={{ width: "100%", height: 34, borderRadius: 11 }} />
    </div>
  );
}

export default function Index({
  search,
  counts,
  docs,
  initialLoad,
  fetching,
  error,
  activeCat,
  page,
  limit,
  totalPages,
  totalItems,
  shownFrom,
  shownTo,
  isCommittee,
  catLabel,
  onSearchChange,
  onCatChange,
  onClearFilters,
  onRetry,
  onOpenUpload,
  onOpenView,
  onDelete,
  onPageChange,
  onPageSizeChange,
}) {
  const { t } = useLang();

  return (
    <div className="space-y-4">
      {/* ── 1. Unified Header & Actions Bar ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdDescription size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-primary m-0">
                {t("adDocTitle") || "Society Document Repository"}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                {totalItems} Files
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5 m-0">
              {initialLoad
                ? "Loading records..."
                : `${totalItems} ${t("adDocBadgeCount") || "documents available"}${activeCat !== "All" ? ` · Filtered by ${catLabel(activeCat)}` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap xl:flex-nowrap justify-start xl:justify-end">
          <ExpandableSearch
            value={search}
            onChange={onSearchChange}
            placeholder={t("adDocSearch") || "Search document title or filename..."}
            maxWidth={280}
          />

          {!isCommittee && (
            <GlobalButton variant="add" icon={MdAdd} borderDraw onClick={onOpenUpload}>
              {t("adDocUploadBtn") || "Upload Document"}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── 2. Category Filter Pills (Primary & Secondary Theme) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {ALL_CATS.map((cat) => {
          const isActive = activeCat === cat;
          const count = counts?.[cat] ?? 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCatChange?.(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-accent text-white shadow-xs shadow-accent/25"
                  : "bg-card-inner-bg text-secondary border border-glass-border hover:text-primary hover:border-accent/40"
              }`}
            >
              <span>{catLabel(cat)}</span>
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

      {/* ── 3. Error Alert ── */}
      {error && (
        <div className="doc-empty-state">
          <div className="doc-empty-icon" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>
            <MdWarningAmber size={28} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
          <GlobalButton variant="secondary" icon={MdRefresh} onClick={onRetry}>
            {t("docRetry") || "Retry"}
          </GlobalButton>
        </div>
      )}

      {/* ── 4. Loading Skeleton ── */}
      {initialLoad && !error && (
        <div className="doc-card-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── 5. Empty State ── */}
      {!initialLoad && !error && docs.length === 0 && !fetching && (
        <div className="doc-empty-state">
          <div className="doc-empty-icon">
            <MdCloudDone size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {counts.All === 0 ? t("docEmptyTitle") || "No Documents Uploaded" : t("docNotFound") || "No Matching Documents"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 380 }}>
            {counts.All === 0
              ? t("adDocEmptySub") || "Upload guidelines, meeting minutes, bylaws, or certificates for your society."
              : t("docNotFoundSub") || "Try adjusting your search keyword or selected category filter."}
          </p>
          {(search || activeCat !== "All") && (
            <GlobalButton variant="secondary" style={{ marginTop: 6 }} onClick={onClearFilters}>
              {t("billClearFilters") || "Clear All Filters"}
            </GlobalButton>
          )}
          {!isCommittee && counts.All === 0 && (
            <GlobalButton variant="add" icon={MdAdd} borderDraw style={{ marginTop: 6 }} onClick={onOpenUpload}>
              {t("adDocUploadBtn") || "Upload First Document"}
            </GlobalButton>
          )}
        </div>
      )}

      {/* ── 6. Document Card Grid (Table view removed per user request) ── */}
      {!initialLoad && !error && docs.length > 0 && (
        <>
          <div
            className="doc-card-grid"
            style={{ opacity: fetching ? 0.55 : 1, transition: "opacity 0.2s ease" }}
          >
            {docs.map((doc, i) => (
              <DocCard
                key={doc.id}
                doc={doc}
                t={t}
                catLabel={catLabel}
                onDelete={onDelete}
                onOpen={onOpenView}
                isCommittee={isCommittee}
                index={i}
              />
            ))}
          </div>

          {/* ── 7. Pagination Strip ── */}
          <div className="doc-pagination-container">
            <p className="doc-pagination-info">
              {t("adDocShowingCount", {
                from: shownFrom,
                to: shownTo,
                total: totalItems,
              }) || `Showing ${shownFrom}–${shownTo} of ${totalItems} documents`}
            </p>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={limit}
              onPageSizeChange={onPageSizeChange}
            />
          </div>

          <p className="doc-page-note">{t("docFooter") || "Documents uploaded here are visible to residents with access permissions."}</p>
        </>
      )}
    </div>
  );
}