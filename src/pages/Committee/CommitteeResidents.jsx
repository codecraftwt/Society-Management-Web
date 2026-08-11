import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdSearch,
  MdClose,
  MdHome,
  MdChevronLeft,
  MdChevronRight,
  MdPerson,
} from "react-icons/md";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Spinner({ small = false }) {
  const s = small ? 13 : 20;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

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
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={15} /> Prev
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`e-${idx}`} className="pagination-ellipsis">...</span>
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
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

const LIMIT = 10;

export default function CommitteeResidents() {
  const { t } = useLang();

  const [residents, setResidents] = useState([]);
  const [totalAll, setTotalAll] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadResidents = useCallback(async (pageNum, currentSearch, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: LIMIT,
        ...(currentSearch ? { search: currentSearch } : {}),
      });
      const res = await API.get(`/users/resident?${params}`);
      setResidents(res.data.data || []);
      setTotalAll(res.data.totalAll ?? res.data.pagination?.totalItems ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalItems(res.data.pagination?.totalItems ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.error("Load residents failed", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadResidents(1, "", true); }, []);
  useEffect(() => { if (initialLoad) return; loadResidents(1, debouncedSearch); }, [debouncedSearch]);

  const handlePageChange = (p) => loadResidents(p, debouncedSearch);

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(107,70,193,0.12)", border: "1px solid rgba(107,70,193,0.25)" }}
          >
            <MdPerson size={20} style={{ color: "#9F87D7" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("residentTitle") || "Residents"}</h2>
            <p className="text-secondary text-xs mt-0.5">
              {initialLoad ? "—" : totalAll} {(t("residentTitle") || "Residents")?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="bg-card rounded-2xl overflow-hidden">

        {/* ── Toolbar ── */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--divider)" }}
        >
          <p className="text-xs text-secondary shrink-0">
            {initialLoad ? "—" : `${totalItems} ${(t("residentTitle") || "residents")?.toLowerCase()}`}
            {search && !initialLoad && ` ${t("noticesMatching") || "matching"} "${search}"`}
          </p>
          <div className="relative" style={{ maxWidth: 240, width: "100%" }}>
            <MdSearch size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input
              className="input h-9 pl-8 pr-8 text-xs w-full"
              placeholder={`${t("residentName") || "Name"} / ${t("residentEmail") || "Email"}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {fetching ? (
                <Spinner small />
              ) : search ? (
                <button onClick={() => setSearch("")} className="text-secondary transition-colors">
                  <MdClose size={13} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {initialLoad && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <Spinner />
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {/* ── Empty (no residents at all) ── */}
        {!initialLoad && totalAll === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-secondary">
            <MdPerson size={40} className="opacity-20" />
            <p className="text-sm">{t("residentEmpty") || "No residents found."}</p>
          </div>
        )}

        {/* ── No search match ── */}
        {!initialLoad && totalAll > 0 && residents.length === 0 && !fetching && (
          <div className="flex flex-col items-center gap-2 py-14 text-secondary">
            <MdSearch size={36} className="opacity-20" />
            <p className="text-sm">{t("visNoMatch") || "No residents match your search."}</p>
            <button
              onClick={() => setSearch("")}
              className="text-xs mt-1"
              style={{ color: "#94B5F5", background: "none", border: "none", cursor: "pointer" }}
            >
              {t("billClearFilters") || "Clear search"}
            </button>
          </div>
        )}

        {!initialLoad && residents.length > 0 && (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--card-inner-bg)", borderBottom: "1px solid var(--divider)" }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("residentName") || "Name"}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("residentEmail") || "Email"}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">{t("afColFlat") || "Flat"}</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r, idx) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid var(--divider)" }}
                      className="transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-5 py-3 text-xs text-secondary">{(page - 1) * LIMIT + idx + 1}</td>

                      {/* Name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "rgba(107,70,193,0.12)", color: "#9F87D7" }}
                          >
                            {r.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium block" style={{ color: "var(--text-primary)" }}>
                              {r.name}
                            </span>
                            {r.roles?.includes("COMMITTEE_MEMBER") && (
                              <span className="res-committee-badge">★ Committee</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3 text-secondary text-xs">{r.email}</td>

                      {/* Flat */}
                      <td className="px-5 py-3">
                        {r.flat_number ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}
                          >
                            <MdHome size={11} /> {r.flat_number}
                          </span>
                        ) : (
                          <span className="text-xs text-secondary/50">{t("profileNotAssigned") || "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="md:hidden" style={{ borderColor: "var(--divider)" }}>
              {residents.map((r) => (
                <div
                  key={r.id}
                  className="animate-fadeIn"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--divider)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(107,70,193,0.12)",
                      color: "#9F87D7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {r.name?.charAt(0)?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        margin: "2px 0 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.email}
                    </p>
                    {/* Tags row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                      {r.flat_number && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: 999,
                            background: "rgba(34,197,94,0.12)",
                            color: "#86efac",
                            border: "1px solid rgba(34,197,94,0.25)",
                          }}
                        >
                          <MdHome size={10} /> {r.flat_number}
                        </span>
                      )}
                      {r.roles?.includes("COMMITTEE_MEMBER") && (
                        <span className="res-committee-badge">★ Committee</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            <div
              className="flex flex-col items-center gap-2 px-5 py-4"
              style={{ borderTop: "1px solid var(--divider)" }}
            >
              <p className="text-xs text-secondary">
                {t("billShowing") || "Showing"} {residents.length} {t("billOf") || "of"} {totalItems}
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}