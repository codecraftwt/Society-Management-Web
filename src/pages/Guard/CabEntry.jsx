
import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { MdAdd, MdSearch, MdClose, MdChevronLeft, MdChevronRight, MdLocalTaxi } from "react-icons/md";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";

function useDebounce(value, delay = 500) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size }} className="animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

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
        p === "..." ? <span key={`e${i}`} className="pagination-ellipsis">...</span> : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>{p}</button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

const LIMIT = 10;

function resolveFlatLabel(flat) {
  if (!flat) return "NA";
  const block       = flat.Floor?.Block?.name || flat.Block?.name || null;
  const floorNumber = flat.Floor?.floor_number ?? null;
  const flatNumber  = flat.flat_number || "";
  return [
    block,
    floorNumber != null ? `Floor ${floorNumber}` : null,
    flatNumber,
  ].filter(Boolean).join(" / ") || "NA";
}

function splitCabName(name = "") {
  const idx = name.indexOf(" - ");
  if (idx === -1) return { aggregator: "", driver: name };
  return { aggregator: name.slice(0, idx), driver: name.slice(idx + 3) };
}

export default function CabEntry() {
  const { t } = useLang();

  const [showModal, setShowModal] = useState(false);
  const [flats, setFlats] = useState([]);
  const [cabs, setCabs] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0, IN: 0, OUT: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  const [form, setForm] = useState({
    driver_name: "",
    vehicle_number: "",
    aggregator: "",
    flat_id: "",
    mobile: "",
  });

  const loadFlats = async () => {
    try {
      const flatRes = await API.get("/flats/assigned?limit=1000");
      const flatData = flatRes.data;
      setFlats(Array.isArray(flatData) ? flatData : flatData?.data || []);
    } catch (err) {
      console.error("Failed to load flats for cab entry:", err);
      setFlats([]);
    }
  };

  const loadCabs = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: LIMIT,
        filter: f,
        purpose: "CAB",
        ...(q ? { search: q } : {}),
      });
      const res = await API.get(`/visitors?${params}`);
      const data = res.data;
      setCabs(Array.isArray(data) ? data : data?.data || []);
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

  useEffect(() => {
    loadFlats();
    loadCabs(1, "", "ALL", true);
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadCabs(1, debSearch, filter);
  }, [debSearch]);

  const handleFilterChange = (f) => {
    setFilter(f);
    loadCabs(1, debSearch, f);
  };

  const handlePageChange = (p) => loadCabs(p, debSearch, filter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/visitors", {
        visitor_name: `${form.aggregator} - ${form.driver_name}`,
        purpose: "CAB",
        flat_id: Number(form.flat_id),
        mobile: form.mobile,
        vehicle_number: form.vehicle_number,
      });

      setForm({
        driver_name: "",
        vehicle_number: "",
        aggregator: "",
        flat_id: "",
        mobile: "",
      });
      setShowModal(false);
      loadCabs(1, debSearch, filter);
    } catch (err) {
      const msg = err.response?.data?.message || "Entry failed";
      toast.error(msg);
    }
  };

  const emptyCopy = search || filter !== "ALL"
    ? (t("cabEmptyFilter") || "No cab entries match your filters")
    : t("cabEmpty");

  return (
    <div className="ge-root">

      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdLocalTaxi size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("cabTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("cabTotal") || "total cabs"}</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <MdAdd size={18} /> {t("cabAddBtn")}
        </button>
      </div>

      <div className="ge-stats">
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

      <div className="ge-toolbar">
        <div className="ge-search-wrap">
          <MdSearch className="ge-search-icon" size={17} />
          <input
            className="ge-search-input"
            placeholder={t("cabSearch") || "Search driver, aggregator, vehicle..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {fetching && !initialLoad ? (
            <div className="ge-search-action">
              <Spinner size={13} />
            </div>
          ) : search ? (
            <button type="button" onClick={() => setSearch("")} className="ge-search-clear" aria-label="Clear search">
              <MdClose size={13} />
            </button>
          ) : null}
        </div>

        <SlidingTabs
          className="ge-filter-tabs"
          value={filter}
          onChange={handleFilterChange}
          items={[
            { id: "ALL", label: t("geFilterAll"), badge: counts.ALL },
            { id: "IN", label: t("geFilterInside"), badge: counts.IN, alert: counts.IN },
            { id: "OUT", label: t("geFilterLeft"), badge: counts.OUT },
          ]}
        />
      </div>

      <div className="ge-table-wrap">
        {initialLoad ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 20px" }}>
            <Spinner size={24} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{t("compLoading")}</p>
          </div>
        ) : cabs.length === 0 ? (
          <div className="ge-empty">
            <MdLocalTaxi size={40} />
            <span>{emptyCopy}</span>
            {search && (
              <button onClick={() => setSearch("")}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="ge-table">
              <thead>
                <tr className="ge-t-row">
                  <th className="ge-th">#</th>
                  <th className="ge-th">{t("cabColAggregator")}</th>
                  <th className="ge-th">{t("cabColDriver")}</th>
                  <th className="ge-th">{t("cabColMobile")}</th>
                  <th className="ge-th">{t("cabColVehicle")}</th>
                  <th className="ge-th">{t("geColFlat")}</th>
                  <th className="ge-th">{t("geColEntry")}</th>
                  <th className="ge-th">{t("geColExit")}</th>
                  <th className="ge-th">{t("billStatusCol")}</th>
                </tr>
              </thead>
              <tbody>
                {cabs.map((v, i) => {
                  const { aggregator, driver } = splitCabName(v.visitor_name);
                  return (
                    <tr key={v.id} className="ge-tbody-row">
                      <td className="ge-td ge-td--num">{(page - 1) * LIMIT + i + 1}</td>
                      <td className="ge-td">
                        {aggregator ? <span className="ge-flat-chip">{aggregator}</span> : "—"}
                      </td>
                      <td className="ge-td ge-td--name">
                        <div className="ge-name-cell">
                          <span className={`ge-row-bar ${v.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"}`} />
                          {driver || v.visitor_name}
                        </div>
                      </td>
                      <td className="ge-td">{v.mobile || "—"}</td>
                      <td className="ge-td">{v.vehicle_number || "—"}</td>
                      <td className="ge-td">
                        <span className="ge-flat-chip">{resolveFlatLabel(v.Flat)}</span>
                      </td>
                      <td className="ge-td ge-td--time">{new Date(v.entry_time).toLocaleTimeString()}</td>
                      <td className="ge-td ge-td--time">
                        {v.exit_time
                          ? new Date(v.exit_time).toLocaleTimeString()
                          : <span className="ge-dash">—</span>}
                      </td>
                      <td className="ge-td">
                        {v.exit_time
                          ? <span className="ge-badge ge-badge--left">✔ {t("geFilterLeft")}</span>
                          : <span className="ge-badge ge-badge--inside">● {t("geFilterInside")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Showing{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong>
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>

      <div className="ge-mobile-list">
        {initialLoad ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Spinner size={22} />
          </div>
        ) : cabs.length === 0 ? (
          <div className="ge-empty">
            <MdLocalTaxi size={40} />
            <span>{emptyCopy}</span>
          </div>
        ) : (
          <>
            {cabs.map(v => {
              const { aggregator, driver } = splitCabName(v.visitor_name);
              return (
                <div key={v.id} className="ge-mobile-card">
                  <div className="ge-mc-top">
                    <div className="ge-mc-name-row">
                      <span className={`ge-row-bar ${v.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"}`} />
                      <span className="ge-mc-name">{driver || v.visitor_name}</span>
                    </div>
                    {v.exit_time
                      ? <span className="ge-badge ge-badge--left">✔ {t("geFilterLeft")}</span>
                      : <span className="ge-badge ge-badge--inside">● {t("geFilterInside")}</span>}
                  </div>
                  <div className="ge-mc-rows">
                    {aggregator ? (
                      <div className="ge-mc-row">
                        <span className="ge-mc-label">{t("cabColAggregator")}</span>
                        <span className="ge-flat-chip">{aggregator}</span>
                      </div>
                    ) : null}
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("cabColMobile")}</span>
                      <span className="ge-mc-val">{v.mobile || "—"}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("cabColVehicle")}</span>
                      <span className="ge-mc-val">{v.vehicle_number || "—"}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("geColFlat")}</span>
                      <span className="ge-flat-chip">{resolveFlatLabel(v.Flat)}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("geColEntry")}</span>
                      <span className="ge-mc-val">{new Date(v.entry_time).toLocaleTimeString()}</span>
                    </div>
                    <div className="ge-mc-row">
                      <span className="ge-mc-label">{t("geColExit")}</span>
                      <span className={v.exit_time ? "ge-mc-val" : "ge-dash"}>
                        {v.exit_time ? new Date(v.exit_time).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t("cabModalTitle")}>
        <form onSubmit={handleSubmit} className="ge-form">
          <Select
            className="input"
            required
            value={form.aggregator}
            onChange={e => setForm({ ...form, aggregator: e.target.value })}
          >
            <option value="">{t("cabSelectAggregator")}</option>
            <option>Uber</option>
            <option>Ola</option>
            <option>BluSmart</option>
            <option>{t("cabOther")}</option>
          </Select>
          <input
            placeholder={t("cabFieldDriver")}
            className="input"
            required
            value={form.driver_name}
            onChange={e => setForm({ ...form, driver_name: e.target.value })}
          />
          <input
            placeholder={t("cabFieldMobile")}
            className="input"
            required
            value={form.mobile}
            onChange={e => setForm({ ...form, mobile: e.target.value })}
          />
          <input
            placeholder={t("cabFieldVehicle")}
            className="input"
            required
            value={form.vehicle_number}
            onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
          />
          <Select
            className="input"
            required
            value={form.flat_id}
            onChange={e => setForm({ ...form, flat_id: e.target.value })}
          >
            <option value="">{t("billChooseFlat")}</option>
            {flats.map(flat => (
              <option key={flat.id} value={flat.id}>
                {flat.flat_number} (
                  {flat.Block?.name ||
                   flat.Floor?.Block?.name ||
                   "—"}
                ) – {flat.User?.name || t("billNoResident")}
              </option>
            ))}
          </Select>
          <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            {t("geSaveEntry")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
