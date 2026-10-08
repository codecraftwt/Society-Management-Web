import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import Select from "./Select";
import { useLang } from "../../context/LanguageContext";
import "./Pagination.css";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  onChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  style,
}) {
  const { t } = useLang();
  const go = onPageChange || onChange;
  const size = Number(pageSize);
  const showPager = totalPages > 1 && typeof go === "function";
  const showSize = typeof onPageSizeChange === "function" && Number.isFinite(size) && size > 0;

  if (!showPager && !showSize) return null;

  const options = [...new Set([...(pageSizeOptions || PAGE_SIZE_OPTIONS), size].filter(Boolean))].sort(
    (a, b) => a - b
  );

  const pages = Array.from({ length: Math.max(totalPages, 0) }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination-wrap pagination-wrap--bar" style={style}>
      {showSize && (
        <div className="pagination-size">
          <span className="pagination-size-label">{t("paginationPerPage") || "Rows per page:"}</span>
          <div style={{ width: 84 }}>
            <Select
              value={size}
              searchable={false}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              options={options.map((n) => ({ value: n, label: String(n) }))}
              className="pagination-size-select"
            />
          </div>
        </div>
      )}

      {showPager && (
        <div className="pagination-pages">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            className="pagination-btn"
          >
            <MdChevronLeft size={15} /> {t("paginationPrev")}
          </button>
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`e-${idx}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page >= totalPages}
            className="pagination-btn"
          >
            {t("paginationNext")} <MdChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
