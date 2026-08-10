import React, { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";

/* ─────────────────────────────────────────────────────────────
   UTILITY – normalise ANY API response shape into a plain array
────────────────────────────────────────────────────────────── */
const toArr = (res) => {
  const d = res?.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  for (const key of ["data","residents","bills","parcels","visitors","complaints","parking","items","results"]) {
    if (Array.isArray(d[key])) return d[key];
  }
  return [];
};

/* ─────────────────────────────────────────────────────────────
   SPINNER
────────────────────────────────────────────────────────────── */
const SpinnerComp = ({ t }) => (
  <div className="fh-loading">
    <div className="fh-spinner" />
    <span>{t("fhLoading")}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
────────────────────────────────────────────────────────────── */
const Empty = ({ icon = "📭", text = "No data", sub = "" }) => (
  <div className="fh-empty-state">
    <span className="fh-empty-icon">{icon}</span>
    <p className="fh-empty-text">{text}</p>
    {sub && <p className="fh-empty-sub">{sub}</p>}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   STATUS PILL helper
────────────────────────────────────────────────────────────── */
const statusCls = (s = "") => {
  const v = s.toLowerCase().replace(/[^a-z]/g, "");
  if (["paid","resolved","collected","delivered","completed","approved"].includes(v)) return "fh-status-pill--paid";
  if (["pending","pendingpayment","atgate","open","rejected"].includes(v))            return "fh-status-pill--pending";
  return "fh-status-pill--inprogress";
};

const Pill = ({ status, t }) => (
  <span className={`fh-status-pill ${statusCls(status)}`}>
    {status || t("fhUnknown")}
  </span>
);

/* ─────────────────────────────────────────────────────────────
   TAB: RESIDENTS
────────────────────────────────────────────────────────────── */
const ResidentsTab = ({ residents, t }) => {
  if (!residents.length)
    return <Empty icon="👤" text={t("fhNoResidents")} sub={t("fhNoResidentsSub")} />;

  return (
    <div className="fh-list">
      {residents.map((r, i) => {
        const name     = r.User?.name || r.user?.name || r.name || r.resident_name || t("fhUnknown");
        const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const moveIn   = r.move_in_date || r.move_in  || r.moveIn  || r.check_in  || r.created_at || null;
        const moveOut  = r.move_out_date || r.move_out || r.moveOut || r.check_out || null;
        const isCurrent = !moveOut;
        const role     = r.type || r.role || r.resident_type || r.User?.role || t("fhResidents");

        return (
          <div className="fh-resident-card" key={r.id || i}>
            <div className="fh-resident-avatar">{initials}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fh-resident-top">
                <p className="fh-resident-name">{name}</p>
                <span className={`fh-resident-badge ${isCurrent ? "fh-resident-badge--current" : "fh-resident-badge--past"}`}>
                  {isCurrent ? t("fhCurrent") : t("fhPast")}
                </span>
              </div>

              <p className="fh-resident-meta">{role}</p>

              <div className="fh-resident-dates">
                {moveIn && (
                  <span className="fh-date-chip fh-date-chip--in">
                    {t("fhIn")}: {String(moveIn).slice(0, 10)}
                  </span>
                )}
                {moveIn && <span className="fh-date-sep">→</span>}
                {isCurrent
                  ? <span className="fh-date-chip fh-date-chip--present">{t("fhPresent")}</span>
                  : moveOut && <span className="fh-date-chip fh-date-chip--out">{t("fhOut")}: {String(moveOut).slice(0, 10)}</span>
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: BILLS
────────────────────────────────────────────────────────────── */
const BillsTab = ({ bills, t }) => {
  if (!bills.length)
    return <Empty icon="💰" text={t("fhNoBills")} sub={t("fhNoBillsSub")} />;

  return (
    <div className="fh-table-wrap">
      <table className="fh-table">
        <thead>
          <tr className="fh-t-row">
            <th className="fh-th">{t("fhDescription")}</th>
            <th className="fh-th">{t("fhAmount")}</th>
            <th className="fh-th">{t("fhDueDate")}</th>
            <th className="fh-th">{t("fhStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b, i) => (
            <tr className="fh-tbody-row" key={b.id || i}>
              <td className="fh-td fh-td--name">
                {b.description || b.title || b.bill_type || b.type || `${t("fhBills")} #${i + 1}`}
              </td>
              <td className="fh-td fh-td--amount">
                ₹{Number(b.amount || 0).toLocaleString("en-IN")}
              </td>
              <td className="fh-td">
                {b.due_date || b.dueDate || b.due || "—"}
              </td>
              <td className="fh-td">
                <Pill status={b.status} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: PARCELS
────────────────────────────────────────────────────────────── */
const ParcelsTab = ({ parcels, t }) => {
  if (!parcels.length)
    return <Empty icon="📦" text={t("fhNoParcels")} sub={t("fhNoParcelsSub")} />;

  return (
    <div className="fh-list">
      {parcels.map((p, i) => (
        <div className="fh-row-card" key={p.id || i}>
          <div className="fh-row-card-icon fh-row-card-icon--blue">📦</div>
          <div className="fh-row-card-body">
            <p className="fh-row-card-title">
              {p.courier_name || p.courierName || p.sender || `${t("fhParcels")} #${i + 1}`}
            </p>
            {p.description && <p className="fh-row-card-sub">{p.description}</p>}
            <div className="fh-row-card-footer">
              {(p.arrived_at || p.created_at || p.date) && (
                <span className="fh-row-date">
                  {String(p.arrived_at || p.created_at || p.date).slice(0, 10)}
                </span>
              )}
              <Pill status={(p.status || "expected").replace("_", " ")} t={t} />
              {p.otp && <span className="fh-meta-chip">OTP: {p.otp}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: VISITORS
────────────────────────────────────────────────────────────── */
const VisitorsTab = ({ visitors, t }) => {
  if (!visitors.length)
    return <Empty icon="🚶" text={t("fhNoVisitors")} sub={t("fhNoVisitorsSub")} />;

  return (
    <div className="fh-list">
      {visitors.map((v, i) => (
        <div className="fh-row-card" key={v.id || i}>
          <div className="fh-row-card-icon fh-row-card-icon--purple">🚶</div>
          <div className="fh-row-card-body">
            <p className="fh-row-card-title">
              {v.visitor_name || v.visitorName || v.name || `${t("fhVisitors")} #${i + 1}`}
            </p>
            {v.purpose && <p className="fh-row-card-sub">{v.purpose}</p>}
            <div className="fh-row-card-footer">
              {(v.entry_time || v.entry || v.check_in || v.created_at) && (
                <span className="fh-row-date">
                  {String(v.entry_time || v.entry || v.check_in || v.created_at)
                    .slice(0, 16).replace("T", " ")}
                </span>
              )}
              {v.vehicle_number && (
                <span className="fh-meta-chip">🚗 {v.vehicle_number}</span>
              )}
              {v.exit_time && (
                <span className="fh-meta-chip">
                  {t("fhOut")}: {String(v.exit_time).slice(0, 16).replace("T", " ")}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: COMPLAINTS
   — shows complainer name from User.name (included by backend)
────────────────────────────────────────────────────────────── */
const ComplaintsTab = ({ complaints, t }) => {
  if (!complaints.length)
    return <Empty icon="📋" text={t("fhNoComplaints")} sub={t("fhNoComplaintsSub")} />;

  return (
    <div className="fh-list">
      {complaints.map((c, i) => {
        /* backend includes { User: { id, name } } on each complaint */
        const complainerName = c.User?.name || c.user?.name || null;

        return (
          <div className="fh-row-card" key={c.id || i}>
            <div className="fh-row-card-icon fh-row-card-icon--red">📋</div>
            <div className="fh-row-card-body">

              {/* complaint title */}
              <p className="fh-row-card-title">
                {c.title || c.subject || c.category || `${t("fhComplaints")} #${i + 1}`}
              </p>

              {/* complainer name chip — shown just below the title */}
              {complainerName && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    By
                  </span>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(99,102,241,0.10)",
                    border: "1px solid rgba(99,102,241,0.22)",
                    color: "var(--stat-purple-color, #c4b5fd)",
                  }}>
                    👤 {complainerName}
                  </span>
                </div>
              )}

              {/* description */}
              {c.description && (
                <p className="fh-row-card-sub">{c.description}</p>
              )}

              {/* footer: date + status */}
              <div className="fh-row-card-footer">
                {(c.created_at || c.date) && (
                  <span className="fh-row-date">
                    {String(c.created_at || c.date).slice(0, 10)}
                  </span>
                )}
                <Pill status={c.status || "OPEN"} t={t} />
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: PARKING
────────────────────────────────────────────────────────────── */
const ParkingTab = ({ parking, t }) => {
  if (!parking.length)
    return <Empty icon="🚗" text={t("fhNoParking")} sub={t("fhNoParkingSub")} />;

  return (
    <div className="fh-list">
      {parking.map((p, i) => (
        <div className="fh-row-card" key={p.id || i}>
          <div className="fh-row-card-icon fh-row-card-icon--amber">🚗</div>
          <div className="fh-row-card-body">

            {/* guest name */}
            <p className="fh-row-card-title">
              {p.guest_name || `${t("fhParking")} #${i + 1}`}
            </p>

            {/* vehicle info */}
            {(p.vehicle_number || p.vehicle_type) && (
              <p className="fh-row-card-sub">
                {[p.vehicle_number, p.vehicle_type].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="fh-row-card-footer">
              {/* expected arrival date */}
              {p.expected_arrival && (
                <span className="fh-row-date">
                  {String(p.expected_arrival).slice(0, 10)}
                </span>
              )}

              {/* assigned spot */}
              {p.assigned_spot && (
                <span className="fh-meta-chip">🅿️ {p.assigned_spot}</span>
              )}

              {/* status */}
              <Pill status={p.status || "APPROVED"} t={t} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────── */
const FlatHistory = () => {
  const { t } = useLang();

  const [flats,        setFlats]        = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [activeTab,    setActiveTab]    = useState("residents");
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(false);
  const [fetchError,   setFetchError]   = useState(null);

  const [data, setData] = useState({
    residents:  [],
    bills:      [],
    parcels:    [],
    visitors:   [],
    complaints: [],
    parking:    [],
  });

  /* ── TABS CONFIGURATION ── */
  const TABS = [
    { id: "residents",  label: t("fhResidents"),  icon: "👤", color: "indigo" },
    { id: "bills",      label: t("fhBills"),      icon: "💰", color: "amber"  },
    { id: "parcels",    label: t("fhParcels"),    icon: "📦", color: "blue"   },
    { id: "visitors",   label: t("fhVisitors"),   icon: "🚶", color: "purple" },
    { id: "complaints", label: t("fhComplaints"), icon: "📋", color: "red"    },
    { id: "parking",    label: t("fhParking"),    icon: "🚗", color: "green"  },
  ];

  /* ── 1. Load flat list on mount ── */
  useEffect(() => {
    API.get("/flats/getall")
      .then((res) => setFlats(toArr(res)))
      .catch((err) => console.error("Flats fetch error:", err));
  }, []);

  /* ── 2. Load full flat details when a card is clicked ── */
  const fetchFlatDetails = useCallback(async (flat) => {
    try {
      setLoading(true);
      setFetchError(null);
      setActiveTab("residents");

      const [residentsRes, billsRes, parcelsRes, visitorsRes, complaintsRes, parkingRes] =
        await Promise.allSettled([
          API.get(`/flat-history/${flat.id}`),
          API.get(`/bills/society`),
          API.get(`/parcels`),
          API.get(`/visitors`),
          API.get(`/complaints`),
          API.get(`/parking/requests?limit=100`),
        ]);

      const safeArr = (result) =>
        result.status === "fulfilled" ? toArr(result.value) : [];

      /* normalise residents */
      const residents = (() => {
        if (residentsRes.status !== "fulfilled") return [];
        const raw = residentsRes.value?.data;
        if (!raw) return [];
        if (Array.isArray(raw))           return raw;
        if (Array.isArray(raw.data))      return raw.data;
        if (Array.isArray(raw.residents)) return raw.residents;
        if (typeof raw === "object")      return [raw];
        return [];
      })();

      /* filter by flat_id or flat_number */
      const byFlat = (arr) =>
        arr.filter(
          (item) =>
            String(item.flat_id    ?? item.flatId    ?? "") === String(flat.id) ||
            String(item.flat_number ?? "")                   === String(flat.flat_number)
        );

      /* resident_id of this flat — used for complaints filter */
      const residentId = flat.resident_id;

      setData({
        residents,
        bills:      byFlat(safeArr(billsRes)),
        parcels:    byFlat(safeArr(parcelsRes)),
        visitors:   byFlat(safeArr(visitorsRes)),

        // ✅ complaints have no flat_id → match by resident_id
        complaints: residentId
          ? safeArr(complaintsRes).filter(
              (c) => String(c.resident_id ?? "") === String(residentId)
            )
          : [],

        // ✅ parking requests have flat_id
        parking: safeArr(parkingRes).filter(
          (p) => String(p.flat_id ?? "") === String(flat.id)
        ),
      });

      setSelectedFlat(flat);
    } catch (err) {
      console.error("fetchFlatDetails error:", err);
      setFetchError(t("fhFetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  /* ── 3. Reset ── */
  const goBack = () => {
    setSelectedFlat(null);
    setData({ residents: [], bills: [], parcels: [], visitors: [], complaints: [], parking: [] });
    setFetchError(null);
  };

  /* ── Filtered + grouped flat list ── */
  const filtered = flats.filter((f) =>
    `flat ${f.flat_number} block ${f.block_id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, flat) => {
    const key = `${t("fhBlock")} ${flat.block_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(flat);
    return acc;
  }, {});

  /* ── Stat counts ── */
  const paidCount    = data.bills.filter((b) => (b.status || "").toLowerCase() === "paid").length;
  const pendingCount = data.bills.length - paidCount;

  /* ── Tab content renderer ── */
  const renderContent = () => {
    if (loading)    return <SpinnerComp t={t} />;
    if (fetchError) return (
      <div style={{ padding: "2rem", color: "#fca5a5", textAlign: "center", fontSize: "14px" }}>
        ⚠️ {fetchError}
      </div>
    );
    switch (activeTab) {
      case "residents":  return <ResidentsTab  residents={data.residents}   t={t} />;
      case "bills":      return <BillsTab      bills={data.bills}           t={t} />;
      case "parcels":    return <ParcelsTab    parcels={data.parcels}       t={t} />;
      case "visitors":   return <VisitorsTab   visitors={data.visitors}     t={t} />;
      case "complaints": return <ComplaintsTab complaints={data.complaints} t={t} />;
      case "parking":    return <ParkingTab    parking={data.parking}       t={t} />;
      default:           return null;
    }
  };

  /* ════════════════════════════════════════════════════════
     FLAT LIST VIEW
  ════════════════════════════════════════════════════════ */
  if (!selectedFlat) {
    return (
      <div className="fh-root">

        {/* Page header */}
        <div className="fh-page-er">
          <div className="fh-page-er-left">
            <div className="fh-page-icon-wrap" style={{ fontSize: "1.3rem" }}>🏠</div>
            <div>
              <h1 className="fh-page-title">{t("fhTitle")}</h1>
              <p className="fh-page-subtitle">{t("fhSubtitle")}</p>
            </div>
          </div>
          <span style={{
            fontSize: "12px",
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: "999px",
            background: "rgba(59,130,246,.10)",
            border: "1px solid rgba(59,130,246,.22)",
            color: "var(--stat-blue-color, #93c5fd)",
            whiteSpace: "nowrap",
          }}>
            {flats.length} {t("fhFlats")}
          </span>
        </div>

        {/* Search */}
        <div className="fh-search-wrap">
          <span className="fh-search-icon" style={{ pointerEvents: "none" }}>🔍</span>
          <input
            className="fh-search-input"
            placeholder={t("fhSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="fh-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        {/* Blocks + flat cards */}
        {Object.keys(grouped).length === 0 ? (
          <Empty icon="🏠" text={t("fhNoFlatsFound")} sub={t("fhNoFlatsSub")} />
        ) : (
          Object.keys(grouped).sort().map((blockName) => (
            <div className="fh-block-section" key={blockName}>
              <div className="fh-block-label">
                <span className="fh-block-dot" />
                {blockName}
                <span className="fh-block-count">{grouped[blockName].length}</span>
              </div>

              <div className="fh-flat-grid">
                {grouped[blockName].map((flat) => {
                  const occ = !!flat.resident_id; // ✅ correct occupancy check
                  return (
                    <div
                      key={flat.id}
                      className="fh-flat-card"
                      style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}
                      onClick={() => fetchFlatDetails(flat)}
                    >
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                        borderRadius: "14px 14px 0 0",
                        background: occ
                          ? "linear-gradient(90deg,#22c55e,#4ade80,transparent)"
                          : "linear-gradient(90deg,#64748b,#94a3b8,transparent)",
                      }} />

                      <div className="fh-flat-card-left">
                        <div
                          className={`fh-flat-icon ${occ ? "fh-flat-icon--occupied" : "fh-flat-icon--vacant"}`}
                          style={{ fontSize: "1rem" }}
                        >
                          {occ ? "👥" : "🏠"}
                        </div>
                        <div>
                          <p className="fh-flat-number">{t("fhFlat")} {flat.flat_number}</p>
                          <span className={`fh-flat-status ${occ ? "fh-flat-status--occupied" : "fh-flat-status--vacant"}`}>
                            {occ ? t("fhOccupied") : t("fhVacant")}
                          </span>
                        </div>
                      </div>

                      <button
                        className="fh-view-btn"
                        onClick={(e) => { e.stopPropagation(); fetchFlatDetails(flat); }}
                      >
                        {t("fhOpen")} <span className="fh-view-btn-arrow">›</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     DASHBOARD VIEW
  ════════════════════════════════════════════════════════ */
  const occ = !!selectedFlat.resident_id; // ✅ correct occupancy check

  return (
    <div className="fh-root">

      {/* Dashboard header */}
      <div className="fh-dash-er">
        <button className="fh-back-btn" onClick={goBack}>{t("fhBack")}</button>
        <div className="fh-dash-title-wrap">
          <div className="fh-dash-icon" style={{ fontSize: "1.2rem" }}>🏠</div>
          <div>
            <h2 className="fh-dash-title">{t("fhFlat")} {selectedFlat.flat_number}</h2>
            <p className="fh-dash-sub">
              {t("fhBlock")} {selectedFlat.block_id}&nbsp;·&nbsp;
              <span style={{ color: occ ? "#22c55e" : "#94a3b8" }}>
                {occ ? t("fhOccupied") : t("fhVacant")}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      {!loading && !fetchError && (
        <div className="fh-stat-strip">
          {[
            { cls: "fh-stat-chip--indigo", icon: "👤", count: data.residents.length,  label: t("fhResidents")  },
            { cls: "fh-stat-chip--green",  icon: "✓",  count: paidCount,              label: t("fhBillsPaid")  },
            { cls: "fh-stat-chip--amber",  icon: "⏳", count: pendingCount,           label: t("fhPending")    },
            { cls: "fh-stat-chip--blue",   icon: "📦", count: data.parcels.length,    label: t("fhParcels")    },
            { cls: "fh-stat-chip--purple", icon: "🚶", count: data.visitors.length,   label: t("fhVisitors")   },
            { cls: "fh-stat-chip--red",    icon: "📋", count: data.complaints.length, label: t("fhComplaints") },
          ].map(({ cls, icon, count, label }) => (
            <div className={`fh-stat-chip ${cls}`} key={label}>
              <span>{icon}</span>
              <span className="fh-stat-chip-count">{count}</span>
              <span className="fh-stat-chip-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="fh-tab-bar" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
        {TABS.map((tab) => {
          const count    = data[tab.id]?.length ?? 0;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`fh-tab ${isActive ? `fh-tab--active-${tab.color}` : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="fh-tab-icon">{tab.icon}</span>
              {tab.label}
              <span className={`fh-tab-badge ${isActive ? "fh-tab-badge--active" : ""}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="fh-tab-content" key={activeTab}>
        {renderContent()}
      </div>

    </div>
  );
};

export default FlatHistory;