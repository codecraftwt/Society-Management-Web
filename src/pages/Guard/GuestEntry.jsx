
import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { MdAdd, MdSearch, MdClose, MdChevronLeft, MdChevronRight } from "react-icons/md";
import Modal from "../../components/Modal";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";

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

function resolveVisitorFlatLabel(v) {
  return resolveFlatLabel(v?.Flat);
}

export default function GuestEntry() {
  const { t } = useLang();

  /* ── Modal / form state ── */
  const [showModal,    setShowModal]    = useState(false);
  const [flats,        setFlats]        = useState([]);
  const [slots,        setSlots]        = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  // ✅ Added vehicle_type to the form so the backend can record it on ParkingRequest
  const [form, setForm] = useState({
    visitor_name: "", mobile: "", vehicle_number: "",
    vehicle_type: "CAR",   // default; guard can change to BIKE
    flat_id: "",
  });

  /* ── Visitor list state ── */
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
  const [filter, setFilter] = useState("ALL");
  const debSearch = useDebounce(search, 500);

  /* ── Load flats + slots once ── */
  const loadStaticData = async () => {
    try {
      const [flatRes, slotRes] = await Promise.allSettled([
        API.get("/flats/assigned?limit=1000"),
        API.get("/parking-slots/available"),
      ]);

      if (flatRes.status === "fulfilled") {
        const flatData = flatRes.value.data;
        setFlats(Array.isArray(flatData) ? flatData : flatData?.data || []);
      } else {
        console.error("Failed to load flats for guest entry:", flatRes.reason);
        setFlats([]);
      }

      if (slotRes.status === "fulfilled") {
        const slotData = slotRes.value.data;
        setSlots(Array.isArray(slotData) ? slotData : slotData?.data || []);
      } else {
        console.error("Failed to load parking slots for guest entry:", slotRes.reason);
        setSlots([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Load paginated visitors ── */
  const loadVisitors = useCallback(async (pg, q, f, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({
        page:   pg,
        limit:  LIMIT,
        filter: f,
        ...(q ? { search: q } : {}),
      });
      const res  = await API.get(`/visitors?${params}`);
      const data = res.data;

      setVisitors(Array.isArray(data) ? data : data?.data || []);
      setCounts(data?.counts      || { ALL: 0, IN: 0, OUT: 0 });
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) { console.error(err); }
    finally { setInitialLoad(false); setFetching(false); }
  }, []);

  useEffect(() => {
    loadStaticData();
    loadVisitors(1, "", "ALL", true);
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadVisitors(1, debSearch, filter);
  }, [debSearch]);

  const handleFilterChange = (f) => {
    setFilter(f);
    loadVisitors(1, debSearch, f);
  };

  const handlePageChange = (p) => loadVisitors(p, debSearch, filter);

  /* ── Submit new visitor entry ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // If vehicle is entered, a slot must be selected
      if (form.vehicle_number && !selectedSlot) {
        alert(t("geErrSelectSlot"));
        return;
      }

      await API.post("/visitors", {
        visitor_name:   form.visitor_name,
        purpose:        "GUEST",
        flat_id:        form.flat_id,
        mobile:         form.mobile,
        vehicle_number: form.vehicle_number || null,
        // ✅ vehicle_type is now sent so the backend can populate ParkingRequest.vehicle_type
        vehicle_type:   form.vehicle_number ? form.vehicle_type : undefined,
        assigned_slot:  selectedSlot || null,
      });

      setForm({ visitor_name: "", mobile: "", vehicle_number: "", vehicle_type: "CAR", flat_id: "" });
      setSelectedSlot("");
      setShowModal(false);
      loadVisitors(1, debSearch, filter);
      loadStaticData();
    } catch (err) {
      const msg = err.response?.data?.message || "Entry failed";
      toast.error(msg);
    }
  };

  // Filter only truly available slots; also filter by vehicle_type if one is selected
  const availableSlots = Array.isArray(slots)
    ? slots.filter(s => {
        if (s.status !== "AVAILABLE") return false;
        // If the guard picked a vehicle type, only show matching slots
        if (form.vehicle_number && form.vehicle_type) {
          return s.vehicle_type === form.vehicle_type;
        }
        return true;
      })
    : [];

  const filterTabs = [
    { key: "ALL", label: t("geFilterAll"),    count: counts.ALL, cls: "all"        },
    { key: "IN",  label: t("geFilterInside"), count: counts.IN,  cls: "inprogress" },
    { key: "OUT", label: t("geFilterLeft"),   count: counts.OUT, cls: "resolved"   },
  ];

  return (
    <div className="ge-root">

      {/* ── HEADER ── */}
      <div className="ge-er">
        <div className="ge-er-left">
          <div className="er-icon er-icon--complaint" style={{ fontSize: 22 }}>🚶</div>
          <div>
            <h2 className="page-title">{t("geTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("geTotal")}</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <MdAdd size={18} /> {t("geAddBtn")}
        </button>
      </div>

      {/* ── STAT CARDS ── */}
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

      {/* ── SEARCH + FILTER ── */}
      <div className="ge-toolbar">
        <div className="ge-search-wrap" style={{ position: "relative" }}>
          <MdSearch className="ge-search-icon" size={17} />
          <input
            className="ge-search-input"
            placeholder={t("geSearch")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: (search || fetching) ? 36 : 12 }}
          />
          {fetching && !initialLoad ? (
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
              <Spinner size={13} />
            </div>
          ) : search ? (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", alignItems: "center",
            }}>
              <MdClose size={13} />
            </button>
          ) : null}
        </div>

        <div className="ge-filter-pills">
          {filterTabs.map(({ key, label, count, cls }) => (
            <button key={key} onClick={() => handleFilterChange(key)}
              className={`complaint-filter-pill complaint-filter-pill--${cls} ${filter === key ? "active" : ""}`}>
              {label}
              <span className="complaint-filter-pill-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="ge-table-wrap">
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
                  <th className="ge-th">{t("geColName")}</th>
                  <th className="ge-th">{t("geColFlat")}</th>
                  <th className="ge-th">{t("geColEntry")}</th>
                  <th className="ge-th">{t("geColExit")}</th>
                  <th className="ge-th">{t("billStatusCol")}</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <tr key={v.id} className="ge-tbody-row">
                    <td className="ge-td ge-td--num">{(page - 1) * LIMIT + i + 1}</td>
                    <td className="ge-td ge-td--name">
                      <div className="ge-name-cell">
                        <span className={`ge-row-bar ${v.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"}`} />
                        {v.visitor_name}
                      </div>
                    </td>
                    <td className="ge-td">
                      <span className="ge-flat-chip">{resolveVisitorFlatLabel(v)}</span>
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
                ))}
              </tbody>
            </table>

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
          </>
        )}
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="ge-mobile-list">
        {initialLoad ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Spinner size={22} />
          </div>
        ) : visitors.length === 0 ? (
          <div className="ge-empty">
            <span className="ge-empty-icon">👥</span>
            <span>{t("geEmpty")}</span>
          </div>
        ) : (
          <>
            {visitors.map(v => (
              <div key={v.id} className="ge-mobile-card">
                <div className="ge-mc-top">
                  <div className="ge-mc-name-row">
                    <span className={`ge-row-bar ${v.exit_time ? "ge-row-bar--left" : "ge-row-bar--inside"}`} />
                    <span className="ge-mc-name">{v.visitor_name}</span>
                  </div>
                  {v.exit_time
                    ? <span className="ge-badge ge-badge--left">✔ {t("geFilterLeft")}</span>
                    : <span className="ge-badge ge-badge--inside">● {t("geFilterInside")}</span>}
                </div>
                <div className="ge-mc-rows">
                  <div className="ge-mc-row">
                    <span className="ge-mc-label">{t("geColFlat")}</span>
                    <span className="ge-flat-chip">{resolveVisitorFlatLabel(v)}</span>
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
            ))}

            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>

      {/* ── MODAL ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t("geModalTitle")}>
        <form onSubmit={handleSubmit} className="ge-form">

          <input placeholder={t("geFieldName")} className="input" required
            value={form.visitor_name}
            onChange={e => setForm({ ...form, visitor_name: e.target.value })} />

          <input placeholder={t("geFieldMobile")} className="input" required
            value={form.mobile}
            onChange={e => setForm({ ...form, mobile: e.target.value })} />

          {/* Vehicle number */}
          <input placeholder={t("geFieldVehicle")} className="input"
            value={form.vehicle_number}
            onChange={e => setForm({ ...form, vehicle_number: e.target.value, vehicle_type: "CAR" })} />

          {/* ✅ Vehicle type — shown only when a vehicle number is entered */}
          {form.vehicle_number && (
            <Select className="input" value={form.vehicle_type}
              onChange={e => setForm({ ...form, vehicle_type: e.target.value, selected_slot: "" })}>
              <option value="CAR">Car 🚗</option>
              <option value="BIKE">Bike 🏍️</option>
            </Select>
          )}

          {/* Slot picker — only when vehicle is entered; filtered by vehicle_type */}
          {form.vehicle_number && (
            <Select className="input" value={selectedSlot}
              onChange={e => setSelectedSlot(e.target.value)}>
              <option value="">{t("geSelectSlot")}</option>
              {availableSlots.map(slot => (
                <option key={slot.id} value={slot.slot_number}>
                  {slot.slot_number}{slot.vehicle_type ? ` (${slot.vehicle_type})` : ""}
                </option>
              ))}
            </Select>
          )}

          {/* Flat selector — same format as ManageBills */}
          <Select className="input" required value={form.flat_id}
            onChange={e => setForm({ ...form, flat_id: e.target.value })}>
            <option value="">{t("billChooseFlat")}</option>
            {flats.map(flat => (
              <option key={flat.id} value={flat.id}>
                {flat.flat_number} ({flat.Block?.name || flat.Floor?.Block?.name || "—"}) – {flat.User?.name || t("billNoResident")}
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
