import React from "react";
import {
  MdChevronLeft,
  MdChevronRight,
  MdOutlineInbox,
} from "react-icons/md";
import GlobalButton from "./GlobalButton";

/**
 * GlobalTable
 * The standard table component for the entire application across all panels.
 *
 * Props:
 * - columns: Array of { key, header, render: (row, index) => ReactNode, align: 'left'|'center'|'right', width, className, hiddenMobile }
 * - data: Array of row items
 * - loading: boolean
 * - loadingRows: number (default 5)
 * - emptyMessage: string (default "No data found")
 * - emptySubtext: string
 * - emptyIcon: ReactNode / Component
 * - emptyAction: ReactNode (e.g. Add Button)
 * - page: number
 * - totalPages: number
 * - totalItems: number
 * - onPageChange: (newPage) => void
 * - onRowClick: (row, index) => void
 * - rowKey: string | ((row, index) => string|number)
 * - compact: boolean
 * - className: string
 * - style: object
 */
export default function GlobalTable({
  columns = [],
  data = [],
  loading = false,
  loadingRows = 5,
  emptyMessage = "No records available",
  emptySubtext = "There are no records to display at this time.",
  emptyIcon: EmptyIcon = null,
  emptyAction = null,
  page = 1,
  totalPages = 1,
  totalItems = null,
  onPageChange = null,
  onRowClick = null,
  rowKey = "id",
  compact = false,
  className = "",
  style = {},
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row[rowKey] ?? index;
  };

  // Pagination page numbers generator
  const getPageNumbers = () => {
    if (totalPages <= 1) return [];
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
      .reduce((acc, p, idx, arr) => {
        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
        acc.push(p);
        return acc;
      }, []);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`global-table-container bg-card ${className}`}
      style={{
        borderRadius: 16,
        border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
        background: "var(--card-bg, #111827)",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        ...style,
      }}
    >
      {/* Scrollable table container */}
      <div
        className="global-table-scroll custom-scrollbar"
        style={{
          width: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <table
          className="global-table"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: compact ? "0.82rem" : "0.875rem",
          }}
        >
          {/* Table Header */}
          <thead>
            <tr
              style={{
                background: "var(--card-inner-bg, rgba(255, 255, 255, 0.03))",
                borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
              }}
            >
              {columns.map((col, idx) => {
                const align = col.align || "left";
                return (
                  <th
                    key={col.key || idx}
                    className={`global-table-th ${col.hiddenMobile ? "hidden md:table-cell" : ""} ${col.className || ""}`}
                    style={{
                      padding: compact ? "10px 14px" : "14px 18px",
                      textAlign: align,
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-tertiary, #94a3b8)",
                      borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                      whiteSpace: "nowrap",
                      width: col.width,
                    }}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: loadingRows }).map((_, rIdx) => (
                <tr
                  key={`skeleton-${rIdx}`}
                  style={{
                    borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.05))",
                  }}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={`skeleton-${rIdx}-${cIdx}`}
                      className={col.hiddenMobile ? "hidden md:table-cell" : ""}
                      style={{
                        padding: compact ? "12px 14px" : "16px 18px",
                        borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.05))",
                      }}
                    >
                      <div
                        style={{
                          height: 14,
                          borderRadius: 6,
                          background: "var(--card-inner-bg, rgba(255, 255, 255, 0.08))",
                          animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                          width: cIdx === 0 ? "35%" : cIdx === 1 ? "80%" : "60%",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "var(--card-inner-bg, rgba(255, 255, 255, 0.04))",
                        border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-tertiary, #94a3b8)",
                        opacity: 0.8,
                      }}
                    >
                      {EmptyIcon ? (
                        typeof EmptyIcon === "function" ? <EmptyIcon size={24} /> : EmptyIcon
                      ) : (
                        <MdOutlineInbox size={26} />
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          margin: "0 0 4px 0",
                        }}
                      >
                        {emptyMessage}
                      </p>
                      {emptySubtext && (
                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            margin: 0,
                          }}
                        >
                          {emptySubtext}
                        </p>
                      )}
                    </div>
                    {emptyAction && <div style={{ marginTop: 6 }}>{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rIdx) => {
                const isClickable = typeof onRowClick === "function";
                return (
                  <tr
                    key={getRowKey(row, rIdx)}
                    onClick={isClickable ? () => onRowClick(row, rIdx) : undefined}
                    className="global-table-row transition-colors"
                    style={{
                      cursor: isClickable ? "pointer" : "default",
                      borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.06))",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {columns.map((col, cIdx) => {
                      const align = col.align || "left";
                      const value = col.render
                        ? col.render(row, rIdx)
                        : col.key
                        ? row[col.key]
                        : null;

                      return (
                        <td
                          key={col.key || cIdx}
                          className={`global-table-td ${col.hiddenMobile ? "hidden md:table-cell" : ""} ${col.className || ""}`}
                          style={{
                            padding: compact ? "10px 14px" : "14px 18px",
                            textAlign: align,
                            color: "var(--text-primary)",
                            borderBottom: "1px solid var(--glass-border, rgba(255, 255, 255, 0.06))",
                            verticalAlign: "middle",
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination */}
      {(totalPages > 1 || totalItems != null) && (
        <div
          className="global-table-footer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "12px 18px",
            borderTop: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
            background: "var(--card-inner-bg, rgba(255, 255, 255, 0.02))",
          }}
        >
          {/* Total items info */}
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary, #94a3b8)",
            }}
          >
            {totalItems != null ? (
              <span>
                Showing <strong>{data.length}</strong> of <strong>{totalItems}</strong> entries
              </span>
            ) : (
              <span>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && onPageChange && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="pagination-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))",
                  background: "var(--card-inner-bg, rgba(255, 255, 255, 0.05))",
                  color: "var(--text-secondary, #cbd5e1)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  opacity: page <= 1 ? 0.4 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <MdChevronLeft size={16} /> Prev
              </button>

              {pageNumbers.map((p, i) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    style={{
                      padding: "0 4px",
                      color: "var(--text-tertiary, #94a3b8)",
                      fontSize: "0.8rem",
                    }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => onPageChange(p)}
                    style={{
                      width: 28,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: p === page ? "none" : "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))",
                      background: p === page ? "var(--accent, #2563eb)" : "var(--card-inner-bg, rgba(255, 255, 255, 0.05))",
                      color: p === page ? "#ffffff" : "var(--text-secondary, #cbd5e1)",
                      cursor: "pointer",
                      boxShadow: p === page ? "0 2px 8px rgba(37, 99, 235, 0.4)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="pagination-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.1))",
                  background: "var(--card-inner-bg, rgba(255, 255, 255, 0.05))",
                  color: "var(--text-secondary, #cbd5e1)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  opacity: page >= totalPages ? 0.4 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                Next <MdChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
