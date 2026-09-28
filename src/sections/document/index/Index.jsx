import {
  MdDescription, MdDelete, MdVisibility, MdInsertDriveFile,
  MdAdd, MdRefresh, MdPictureAsPdf, MdTableChart, MdSlideshow, MdImage,
  MdChevronRight, MdCalendarMonth, MdCloudDone, MdWarningAmber,
} from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import GlobalButton from "../../../components/common/GlobalButton";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import SlidingTabs from "../../../components/common/SlidingTabs";
import Pagination from "../../../components/common/Pagination";

const FILE_TYPES = [
  { exts: ["pdf"], icon: MdPictureAsPdf, color: "#f87171" },
  { exts: ["doc", "docx"], icon: MdDescription, color: "#60a5fa" },
  { exts: ["xls", "xlsx", "csv"], icon: MdTableChart, color: "#4ade80" },
  { exts: ["ppt", "pptx"], icon: MdSlideshow, color: "#fb923c" },
  { exts: ["png", "jpg", "jpeg", "webp", "gif"], icon: MdImage, color: "#22d3ee" },
];

const getFileType = (fileName = "") => {
  const ext = String(fileName).split(".").pop()?.toLowerCase();
  const hit = FILE_TYPES.find((f) => f.exts.includes(ext));
  return hit || { icon: MdInsertDriveFile, color: "#818cf8" };
};

const getFileExt = (fileName = "") => {
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "file";
};

function DocCard({ doc, t, onDelete, onOpen, isCommittee, catLabel, index = 0 }) {
  const { icon: FileIcon, color: fileColor } = getFileType(doc.file_name);
  const ext = getFileExt(doc.file_name);
  const formatDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div
      data-category={doc.category}
      style={{ "--doc-file-c": fileColor, animationDelay: `${index * 15}ms` }}
      className="doc-decent-card"
      onClick={() => onOpen(doc)}
    >
      <span className="doc-card-blob" aria-hidden="true" />

      <div className="doc-card-top">
        <div className="doc-card-head">
          <div className="doc-file-icon">
            <FileIcon size={20} />
          </div>
          <div className="doc-head-text">
            <span className="doc-label">{t("adDocColDoc")}</span>
            <h3 className="doc-title" title={doc.title}>
              {doc.title}
            </h3>
          </div>
          <MdChevronRight className="doc-card-arrow" size={16} aria-hidden="true" />
        </div>

        <span className="doc-cat-chip">
          <span className="doc-cat-dot" aria-hidden="true" />
          {catLabel(doc.category)}
        </span>
      </div>

      <div className="doc-meta">
        <span className="doc-meta-row">
          <span className="doc-meta-item">
            <MdInsertDriveFile size={12} aria-hidden="true" />
            {doc.file_size_formatted || "—"}
          </span>
          <span className="doc-meta-sep" aria-hidden="true">•</span>
          <span className="doc-meta-item">
            <MdCalendarMonth size={12} aria-hidden="true" />
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

      <div className="doc-card-footer">
        <button
          type="button"
          className="doc-view-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(doc);
          }}
        >
          <MdVisibility size={14} aria-hidden="true" /> {t("docView")}
        </button>
        {!isCommittee && (
          <button
            type="button"
            className="doc-del-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc);
            }}
            aria-label={t("billDelete") || "Delete"}
            title={t("billDelete") || "Delete"}
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
    <>
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdDescription size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0, color: "var(--text-primary)" }}>
              {t("adDocTitle")}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", margin: 0 }}>
              {initialLoad
                ? "—"
                : `${totalItems} ${t("adDocBadgeCount")}${activeCat !== "All" ? ` · ${catLabel(activeCat)}` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <ExpandableSearch
            value={search}
            onChange={onSearchChange}
            placeholder={t("adDocSearch")}
          />
          {!isCommittee && (
            <GlobalButton variant="add" icon={MdAdd} borderDraw onClick={onOpenUpload}>
              {t("adDocUploadBtn")}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ marginBottom: 16 }}>
        <SlidingTabs
          value={activeCat}
          onChange={onCatChange}
          items={["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"].map((cat) => ({
            id: cat,
            label: catLabel(cat),
            badge: counts[cat] ?? 0,
          }))}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="doc-empty-state">
          <div className="doc-empty-icon" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>
            <MdWarningAmber size={28} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
          <GlobalButton variant="secondary" icon={MdRefresh} onClick={onRetry}>
            {t("docRetry")}
          </GlobalButton>
        </div>
      )}

      {/* Loading */}
      {initialLoad && !error && (
        <div className="doc-card-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!initialLoad && !error && docs.length === 0 && !fetching && (
        <div className="doc-empty-state">
          <div className="doc-empty-icon">
            <MdCloudDone size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {counts.All === 0 ? t("docEmptyTitle") : t("docNotFound")}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 380 }}>
            {counts.All === 0 ? t("adDocEmptySub") : t("docNotFoundSub")}
          </p>
          {(search || activeCat !== "All") && (
            <GlobalButton variant="secondary" style={{ marginTop: 6 }} onClick={onClearFilters}>
              {t("billClearFilters")}
            </GlobalButton>
          )}
          {!isCommittee && counts.All === 0 && (
            <GlobalButton variant="add" icon={MdAdd} borderDraw style={{ marginTop: 6 }} onClick={onOpenUpload}>
              {t("adDocUploadBtn")}
            </GlobalButton>
          )}
        </div>
      )}

      {/* Cards + pagination */}
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

          <div className="doc-pagination-container">
            <p className="doc-pagination-info">
              {t("adDocShowingCount", {
                from: shownFrom,
                to: shownTo,
                total: totalItems,
              })}
            </p>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={limit}
              onPageSizeChange={onPageSizeChange}
            />
          </div>

          <p className="doc-page-note">{t("docFooter")}</p>
        </>
      )}
    </>
  );
}