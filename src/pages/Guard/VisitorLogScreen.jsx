import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { MdSearch, MdExitToApp, MdClose, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { toast } from "react-toastify";
/* ── Debounce hook ── */
function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/* ── Spinner ── */
function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size }} className="animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

/* ── Pagination ── */
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

const LIMIT = 10;

export default function VisitorLogScreen() {
  const { t } = useLang();

  /* ── Data state ── */
  const [visitors,    setVisitors]    = useState([]);
  const [counts,      setCounts]      = useState({ ALL: 0, IN: 0, OUT: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);

  /* ── Pagination ── */
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ── Search & filter ── */
  const [search, setSearch] = useState("");
  const [tab,    setTab]    = useState("IN");
  const debSearch = useDebounce(search, 500);

  /* ── Load visitors (server-side paginated) ── */
  const loadVisitors = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: LIMIT,
        filter: f,
        ...(q ? { search: q } : {}),
      });

      const res = await API.get(`/visitors?${params}`);
      const data = res.data;

      setVisitors(Array.isArray(data) ? data : data?.data || []);
      setCounts(data?.counts || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    loadVisitors(1, "", "IN", true);
  }, [loadVisitors]);

  /* ── Re-fetch on debounced search ── */
  useEffect(() => {
    if (initialLoad) return;
    loadVisitors(1, debSearch, tab);
  }, [debSearch]);

  const handleTabChange = (f) => {
    setTab(f);
    loadVisitors(1, debSearch, f);
  };

  const handlePageChange = (p) => loadVisitors(p, debSearch, tab);

  /* ── Mark exit ── */
  const markExit = async (id) => {
  try {
    await API.put(`/visitors/exit/${id}`);

    toast.success("Visitor exit marked successfully ✅"); // ✅ added

    loadVisitors(page, debSearch, tab);
  } catch (err) {
    const msg =
      err?.response?.data?.message || "Failed to mark exit. Please try again.";
    toast.error(msg);
  }
};
 
  const flatLabel = (v) => {
  const block = v.Flat?.Block?.name;
  const floor = v.Flat?.floor_number ?? v.Flat?.Floor?.floor_number;
  const flat  = v.Flat?.flat_number;

  if (!block && !floor && !flat) return "N/A";

  return [
    block && `${block}`,
    floor !== undefined && floor !== null && `Floor ${floor}`,
    flat && `Flat ${flat}`,
  ]
    .filter(Boolean)
    .join(" › ");
};

  const filterTabs = [
    { key: "IN",  label: t("geFilterInside"), count: counts.IN,  cls: "inprogress" },
    { key: "OUT", label: t("vlsHistory"),     count: counts.OUT, cls: "resolved" },
  ];

  return (
    <div className="vl-root">

      {/* ── HEADER ── */}
      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ge-er-icon" style={{ fontSize: 20 }}>📋</div>
          <div>
            <h2 className="page-title">{t("vlsTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("vlsSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="vl-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{counts.ALL}</span>
          <span className="complaint-stat-label">{t("geStatTotal")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{counts.IN}</span>
          <span className="complaint-stat-label">{t("geStatInside")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{counts.OUT}</span>
          <span className="complaint-stat-label">{t("geStatExited")}</span>
        </div>
      </div>

      {/* ── SEARCH + TABS ── */}
      <div className="vl-toolbar">
        <div className="ge-search-wrap" style={{ position: "relative" }}>
          <MdSearch className="ge-search-icon" size={17} />
          <input
            className="ge-search-input"
            placeholder={t("vlsSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: search || fetching ? 36 : 12 }}
          />
          {fetching && !initialLoad ? (
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
              <Spinner size={13} />
            </div>
          ) : search ? (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-secondary)", display: "flex", alignItems: "center",
              }}
            >
              <MdClose size={13} />
            </button>
          ) : null}
        </div>

        <div className="ge-filter-pills">
          {filterTabs.map(({ key, label, count, cls }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`complaint-filter-pill complaint-filter-pill--${cls} ${tab === key ? "active" : ""}`}
            >
              {label}
              <span className="complaint-filter-pill-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING ── */}
      {initialLoad ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 20px" }}>
          <Spinner size={24} />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("compLoading")}</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="ge-empty">
          <span className="ge-empty-icon">👥</span>
          <span>{t("geEmpty")}</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--accent)",
                background: "none", border: "none", cursor: "pointer", marginTop: 4,
              }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── DESKTOP TABLE ── */}
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead>
                <tr className="ge-t-row">
                  <th className="ge-th">#</th>
                  <th className="ge-th">{t("geColName")}</th>
                  <th className="ge-th">{t("vlsPurpose")}</th>
                  <th className="ge-th">{t("geColFlat")}</th>
                  <th className="ge-th">{t("geColEntry")}</th>
                  <th className="ge-th">{t("geColExit")}</th>
                  <th className="ge-th">{t("billStatusCol")}</th>
                  {tab === "IN" && <th className="ge-th">{t("billActionCol")}</th>}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <tr key={v.id} className="ge-tbody-row">
                    <td className="ge-td ge-td--num">{(page - 1) * LIMIT + i + 1}</td>
                    <td className="ge-td ge-td--name">
                      <div className="ge-name-cell">
                        <span className={`ge-row-bar ${v.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"}`} />
                        {v.visitor_name || t("vlsUnknown")}
                      </div>
                    </td>
                    <td className="ge-td">{v.purpose}</td>
                    <td className="ge-td"><span className="ge-flat-chip">{flatLabel(v)}</span></td>
                    <td className="ge-td ge-td--time">
                      {new Date(v.entry_time).toLocaleTimeString()} &nbsp;·&nbsp; {new Date(v.entry_time).toLocaleDateString()}
                    </td>
                    <td className="ge-td ge-td--time">
                      {v.exit_time
                        ? `${new Date(v.exit_time).toLocaleTimeString()} · ${new Date(v.exit_time).toLocaleDateString()}`
                        : <span className="ge-dash">—</span>}
                    </td>
                    <td className="ge-td">
                      {v.exit_time
                        ? <span className="ge-badge ge-badge--left">✔ {t("geFilterLeft")}</span>
                        : <span className="ge-badge ge-badge--inside">● {t("geFilterInside")}</span>}
                    </td>
                    {tab === "IN" && (
                      <td className="ge-td">
                        {!v.exit_time && (
                          <button onClick={() => markExit(v.id)} className="vl-exit-btn">
                            <MdExitToApp size={13} /> {t("vlsMarkExit")}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Table footer with pagination ── */}
            <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Showing{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>{" "}
                visitors
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="ge-mobile-list">
            {visitors.map((v) => (
              <div key={v.id} className="vl-mc">
                <div className="vl-mc-top">
                  <div className="vl-mc-name-wrap">
                    <span className={`ge-row-bar ${v.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"}`} />
                    <span className="vl-mc-name">{v.visitor_name || t("vlsUnknown")}</span>
                  </div>
                  {v.exit_time
                    ? <span className="ge-badge ge-badge--left">✔ {t("geFilterLeft")}</span>
                    : <span className="ge-badge ge-badge--inside">● {t("geFilterInside")}</span>}
                </div>
                <div className="vl-mc-divider" />
                <div className="vl-mc-grid">
                  <div className="vl-mc-cell">
                    <span className="vl-mc-label">{t("geColFlat")}</span>
                    <span className="ge-flat-chip">{flatLabel(v)}</span>
                  </div>
                  <div className="vl-mc-cell">
                    <span className="vl-mc-label">{t("vlsPurpose")}</span>
                    <span className="vl-mc-val">{v.purpose}</span>
                  </div>
                  <div className="vl-mc-cell vl-mc-cell--full">
                    <span className="vl-mc-label">{t("geColEntry")}</span>
                    <span className="vl-mc-val">
                      {new Date(v.entry_time).toLocaleTimeString()} &nbsp;·&nbsp; {new Date(v.entry_time).toLocaleDateString()}
                    </span>
                  </div>
                  {v.exit_time && (
                    <div className="vl-mc-cell vl-mc-cell--full">
                      <span className="vl-mc-label">{t("geColExit")}</span>
                      <span className="vl-mc-val">
                        {new Date(v.exit_time).toLocaleTimeString()} &nbsp;·&nbsp; {new Date(v.exit_time).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                {!v.exit_time && (
                  <button onClick={() => markExit(v.id)} className="vl-exit-btn vl-exit-btn--full">
                    <MdExitToApp size={13} /> {t("vlsMarkExit")}
                  </button>
                )}
              </div>
            ))}

            {/* ── Mobile pagination ── */}
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}