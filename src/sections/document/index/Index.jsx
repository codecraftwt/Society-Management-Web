import { useState } from "react";
import {
  MdDescription, MdDelete, MdVisibility, MdInsertDriveFile,
  MdAdd, MdRefresh, MdPictureAsPdf, MdTableChart, MdSlideshow, MdImage,
  MdChevronRight, MdCalendarMonth, MdCloudDone, MdWarningAmber,
  MdFolderOpen, MdGavel, MdGroups, MdMenuBook, MdAccountBalanceWallet,
  MdSecurity, MdGridView, MdViewList, MdFileDownload, MdOpenInNew,
} from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import { BASE_URL } from "../../../config/apiConfig";
import GlobalButton from "../../../components/common/GlobalButton";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import SlidingTabs from "../../../components/common/SlidingTabs";
import Pagination from "../../../components/common/Pagination";
import StatCard from "../../../components/common/StatCard";

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

      <div className="doc-card-footer flex items-center justify-between gap-2 mt-auto pt-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="doc-view-btn flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(doc);
            }}
          >
            <MdVisibility size={14} aria-hidden="true" /> {t("docView") || "Preview"}
          </button>
          
          <a
            href={fileLink}
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:text-accent bg-card-inner-bg border border-glass-border hover:border-accent/40 transition-all cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            title="Open in new tab / Download"
          >
            <MdOpenInNew size={15} />
          </a>
        </div>

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

function DocTableRow({ doc, t, onDelete, onOpen, isCommittee, catLabel }) {
  const { icon: FileIcon, color: fileColor } = getFileType(doc.file_name);
  const ext = getFileExt(doc.file_name);
  const formatDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fileLink = getDocUrl(doc.file_url);

  return (
    <tr
      className="border-b transition-colors cursor-pointer hover:bg-hover-bg"
      style={{ borderColor: "var(--glass-border)" }}
      onClick={() => onOpen(doc)}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{
              color: fileColor,
              background: `color-mix(in srgb, ${fileColor} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${fileColor} 30%, transparent)`,
            }}
          >
            <FileIcon size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-primary truncate max-w-xs sm:max-w-sm m-0">
              {doc.title}
            </p>
            <p className="text-xs text-secondary truncate max-w-xs m-0 mt-0.5">
              {doc.file_name}
            </p>
          </div>
        </div>
      </td>

      <td className="py-3 px-3">
        <span className="doc-cat-chip">
          <span className="doc-cat-dot" aria-hidden="true" />
          {catLabel(doc.category)}
        </span>
      </td>

      <td className="py-3 px-3 text-xs text-secondary font-medium">
        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded-md bg-card-inner-bg border border-glass-border">
          {ext}
        </span>
      </td>

      <td className="py-3 px-3 text-xs text-secondary font-medium whitespace-nowrap">
        {doc.file_size_formatted || "—"}
      </td>

      <td className="py-3 px-3 text-xs text-secondary font-medium whitespace-nowrap">
        {formatDate(doc.created_at)}
      </td>

      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 text-accent bg-accent/10 border-accent/25 hover:bg-accent/20 cursor-pointer"
            onClick={() => onOpen(doc)}
            title="Preview Document"
          >
            <MdVisibility size={14} />
            <span className="hidden sm:inline">{t("docView") || "Preview"}</span>
          </button>

          <a
            href={fileLink}
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-accent bg-card-inner-bg border border-glass-border hover:border-accent/40 transition-all cursor-pointer"
            title="Open in new tab"
          >
            <MdOpenInNew size={14} />
          </a>

          {!isCommittee && (
            <button
              type="button"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
              onClick={() => onDelete(doc)}
              title={t("billDelete") || "Delete"}
            >
              <MdDelete size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
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
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  const CATEGORY_TABS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];

  return (
    <div className="space-y-5">
      {/* ── 1. Dynamic StatCards Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={MdFolderOpen}
          value={counts?.All || totalItems || 0}
          label={t("docCatAll") || "All Files"}
          tone="brand"
          active={activeCat === "All"}
          onClick={() => onCatChange("All")}
        />
        <StatCard
          icon={MdGavel}
          value={counts?.Legal || 0}
          label={t("docCatLegal") || "Legal"}
          tone="brand"
          active={activeCat === "Legal"}
          onClick={() => onCatChange("Legal")}
        />
        <StatCard
          icon={MdGroups}
          value={counts?.Meetings || 0}
          label={t("docCatMeetings") || "Meetings"}
          tone="info"
          active={activeCat === "Meetings"}
          onClick={() => onCatChange("Meetings")}
        />
        <StatCard
          icon={MdMenuBook}
          value={counts?.Guidelines || 0}
          label={t("docCatGuidelines") || "Guidelines"}
          tone="warning"
          active={activeCat === "Guidelines"}
          onClick={() => onCatChange("Guidelines")}
        />
        <StatCard
          icon={MdAccountBalanceWallet}
          value={counts?.Finance || 0}
          label={t("docCatFinance") || "Finance"}
          tone="success"
          active={activeCat === "Finance"}
          onClick={() => onCatChange("Finance")}
        />
        <StatCard
          icon={MdSecurity}
          value={counts?.Security || 0}
          label={t("docCatSecurity") || "Security"}
          tone="info"
          active={activeCat === "Security"}
          onClick={() => onCatChange("Security")}
        />
      </div>

      {/* ── 2. Unified Header & Actions Bar ── */}
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
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-card-inner-bg border border-glass-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-accent text-white shadow-sm shadow-accent/30"
                  : "text-secondary hover:text-primary"
              }`}
              title="Grid View"
            >
              <MdGridView size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-accent text-white shadow-sm shadow-accent/30"
                  : "text-secondary hover:text-primary"
              }`}
              title="Table / List View"
            >
              <MdViewList size={16} />
            </button>
          </div>

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

      {/* ── 3. Category Tabs ── */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <SlidingTabs
          value={activeCat}
          onChange={onCatChange}
          items={CATEGORY_TABS.map((cat) => ({
            id: cat,
            label: catLabel(cat),
            badge: counts[cat] ?? 0,
          }))}
        />
      </div>

      {/* ── 4. Error Alert ── */}
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

      {/* ── 5. Loading Skeleton ── */}
      {initialLoad && !error && (
        <div className="doc-card-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── 6. Empty State ── */}
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

      {/* ── 7. Document Content (Grid vs Table List) ── */}
      {!initialLoad && !error && docs.length > 0 && (
        <>
          {viewMode === "grid" ? (
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
          ) : (
            <div
              className="rounded-2xl border overflow-hidden bg-card border-glass-border shadow-sm"
              style={{ opacity: fetching ? 0.55 : 1, transition: "opacity 0.2s ease" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr
                      className="border-b text-[11px] uppercase tracking-wider text-secondary bg-card-inner-bg/60"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <th className="py-3 px-4 font-bold">Document & File</th>
                      <th className="py-3 px-3 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold">Format</th>
                      <th className="py-3 px-3 font-bold">Size</th>
                      <th className="py-3 px-3 font-bold">Date Uploaded</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {docs.map((doc) => (
                      <DocTableRow
                        key={doc.id}
                        doc={doc}
                        t={t}
                        catLabel={catLabel}
                        onDelete={onDelete}
                        onOpen={onOpenView}
                        isCommittee={isCommittee}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 8. Pagination Strip ── */}
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