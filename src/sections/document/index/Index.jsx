import {
  MdDescription, MdDelete, MdVisibility, MdInsertDriveFile,
  MdAdd, MdRefresh,
  MdGavel, MdGroups, MdDirectionsCar, MdBarChart, MdSecurity,
} from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import GlobalButton from "../../../components/common/GlobalButton";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import SlidingTabs from "../../../components/common/SlidingTabs";
import Pagination from "../../../components/common/Pagination";

const ICON_MAP = {
  Legal: MdGavel,
  Meetings: MdGroups,
  Guidelines: MdDirectionsCar,
  Finance: MdBarChart,
  Security: MdSecurity,
};
const COLOR_MAP = {
  Legal: "purple",
  Meetings: "blue",
  Guidelines: "amber",
  Finance: "red",
  Security: "green",
};

function DocCard({ doc, t, onDelete, onOpen, isCommittee, catLabel }) {
  const Icon = ICON_MAP[doc.category] || MdDescription;
  const color = COLOR_MAP[doc.category] || "blue";
  const formatDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4"
      style={{
        background: "var(--card-bg, #111827)",
        borderColor: "var(--glass-border, rgba(255, 255, 255, 0.08))",
        minHeight: 170,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              border: "1px solid var(--glass-border)",
              color: `var(--stat-${color}-color, #818cf8)`,
            }}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-bold truncate"
              style={{ letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}
              title={doc.title}
            >
              {doc.title}
            </h3>
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: "var(--text-secondary)", margin: 0 }}
              title={doc.file_name}
            >
              {doc.file_name}
            </p>
          </div>
        </div>
        <span
          className="px-2 py-1 rounded-md text-[10px] font-bold shrink-0 border"
          style={{
            background: `var(--stat-${color}-bg, rgba(255,255,255,0.05))`,
            color: `var(--stat-${color}-color, #fff)`,
            borderColor: `var(--stat-${color}-border, rgba(255,255,255,0.1))`,
          }}
        >
          {catLabel(doc.category)}
        </span>
      </div>

      <div
        className="flex items-center gap-3 text-[11px] font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        <span className="flex items-center gap-1.5">
          <MdInsertDriveFile size={12} /> {doc.file_size_formatted || "—"}
        </span>
        <span>•</span>
        <span>{formatDate(doc.created_at)}</span>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onOpen(doc)}
          className="flex-1 h-9 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all"
          style={{
            background: "var(--card-inner-bg)",
            borderColor: "var(--glass-border)",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.08))";
            e.currentTarget.style.borderColor = "var(--accent-light, #818cf8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--card-inner-bg)";
            e.currentTarget.style.borderColor = "var(--glass-border)";
          }}
        >
          <MdVisibility size={14} /> {t("docView")}
        </button>
        {!isCommittee && (
          <button
            type="button"
            onClick={() => onDelete(doc)}
            className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
              color: "var(--stat-red-color, #ef4444)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--stat-red-bg, rgba(239,68,68,0.15))";
              e.currentTarget.style.borderColor = "var(--stat-red-border, rgba(239,68,68,0.3))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card-inner-bg)";
              e.currentTarget.style.borderColor = "var(--glass-border)";
            }}
            aria-label={t("billDelete")}
          >
            <MdDelete size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-2xl border p-5 flex flex-col gap-3"
      style={{
        borderColor: "var(--glass-border, rgba(255,255,255,0.08))",
        background: "var(--card-bg, #111827)",
        minHeight: 170,
      }}
    >
      <div className="flex gap-3 items-center">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div style={{ height: 14, width: "70%", borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ height: 10, width: "40%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
        </div>
      </div>
      <div style={{ height: 12, width: "50%", borderRadius: 4, background: "rgba(255,255,255,0.04)", marginTop: 8 }} />
      <div style={{ height: 36, width: "100%", borderRadius: 10, background: "rgba(255,255,255,0.04)", marginTop: "auto" }} />
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
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--card-bg)",
          }}
        >
          <p style={{ color: "var(--stat-red-color, #ef4444)", margin: 0, fontSize: 13 }}>{error}</p>
          <GlobalButton variant="secondary" icon={MdRefresh} onClick={onRetry}>
            {t("docRetry")}
          </GlobalButton>
        </div>
      )}

      {/* Loading */}
      {initialLoad && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!initialLoad && !error && docs.length === 0 && !fetching && (
        <div
          style={{
            borderRadius: 16,
            border: "1px dashed var(--glass-border, rgba(255, 255, 255, 0.12))",
            background: "var(--card-bg, #111827)",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(160, 90, 255, 0.1)",
              color: "var(--accent, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MdDescription size={28} />
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            style={{ opacity: fetching ? 0.55 : 1, transition: "opacity 0.2s ease" }}
          >
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                t={t}
                catLabel={catLabel}
                onDelete={onDelete}
                onOpen={onOpenView}
                isCommittee={isCommittee}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("adDocShowingCount", {
                from: shownFrom,
                to: shownTo,
                total: totalItems,
              })}
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={limit}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </>
      )}
    </>
  );
}