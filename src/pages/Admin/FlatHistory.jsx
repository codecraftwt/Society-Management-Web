import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import API from "../../services/api";
import { toast } from "react-toastify";
import { moveOutResident } from "../../services/flatService";
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
const ResidentsTab = ({ residents, t, onMoveOut }) => {
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

              {isCurrent && onMoveOut && (
                <div className="fh-resident-actions">
                  <button
                    type="button"
                    className="fh-move-out-btn"
                    onClick={() => onMoveOut(r)}
                    title={t("fhMoveOutTitle")}
                  >
                    <span className="fh-move-out-ico">➜</span>
                    {t("fhMarkLeft")}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: BILLS & PAYMENTS
────────────────────────────────────────────────────────────── */
const BillsTab = ({ bills, t }) => {
  const [filter, setFilter] = useState("all");

  if (!bills.length)
    return <Empty icon="💳" text={t("fhNoBills")} sub={t("fhNoBillsSub")} />;

  const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const paidBills = bills.filter((b) => (b.status || "").toLowerCase() === "paid");
  const pendingBills = bills.filter((b) => (b.status || "").toLowerCase() !== "paid");
  const paidAmount = paidBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const pendingAmount = pendingBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const displayedBills =
    filter === "paid" ? paidBills : filter === "pending" ? pendingBills : bills;

  return (
    <div className="fh-bills-section">
      {/* Financial Summary Strip */}
      <div className="fh-bills-summary-row">
        <div className="fh-bills-sum-card fh-bills-sum-card--total">
          <span className="fh-bills-sum-label">Total Billed</span>
          <span className="fh-bills-sum-val">₹{totalAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="fh-bills-sum-card fh-bills-sum-card--paid">
          <span className="fh-bills-sum-label">Paid Amount</span>
          <span className="fh-bills-sum-val">₹{paidAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="fh-bills-sum-card fh-bills-sum-card--pending">
          <span className="fh-bills-sum-label">Pending Amount</span>
          <span className="fh-bills-sum-val">₹{pendingAmount.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Filter Toggle Buttons */}
      <div className="fh-bills-subtoggle-bar">
        <button
          type="button"
          className={`fh-bills-subtoggle-btn ${filter === "all" ? "fh-bills-subtoggle-btn--active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Bills ({bills.length})
        </button>
        <button
          type="button"
          className={`fh-bills-subtoggle-btn ${filter === "paid" ? "fh-bills-subtoggle-btn--active" : ""}`}
          onClick={() => setFilter("paid")}
        >
          Paid ({paidBills.length})
        </button>
        <button
          type="button"
          className={`fh-bills-subtoggle-btn ${filter === "pending" ? "fh-bills-subtoggle-btn--active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Pending ({pendingBills.length})
        </button>
      </div>

      {displayedBills.length === 0 ? (
        <Empty icon="💰" text="No bills in this category" sub="Select a different filter above." />
      ) : (
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
              {displayedBills.map((b, i) => (
                <tr className="fh-tbody-row" key={b.id || i}>
                  <td className="fh-td fh-td--name">
                    <div style={{ fontWeight: 600 }}>
                      {b.description || b.title || b.bill_type || b.type || `${t("fhBills")} #${i + 1}`}
                    </div>
                    {b.billing_month && (
                      <span style={{ fontSize: "11px", opacity: 0.7 }}>Month: {b.billing_month}</span>
                    )}
                  </td>
                  <td className="fh-td fh-td--amount">
                    ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="fh-td">
                    {b.due_date ? String(b.due_date).slice(0, 10) : b.dueDate || b.due || "—"}
                  </td>
                  <td className="fh-td">
                    <Pill status={b.status} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
                    background: "rgba(107,70,193,0.10)",
                    border: "1px solid rgba(107,70,193,0.22)",
                    color: "var(--stat-purple-color, #C0B0E5)",
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
  const [activeBlock,  setActiveBlock]  = useState("");
  const [confirmMoveOut, setConfirmMoveOut] = useState(null);
  const [movingOut,    setMovingOut]    = useState(false);

  const searchInputRef = useRef(null);

  /* ── Keyboard shortcut: Ctrl+K or Cmd+K to focus search ── */
  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

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
    { id: "residents",  label: t("fhResidents"),              icon: "👥", color: "indigo" },
    { id: "bills",      label: `${t("fhBills")} & Payments`,  icon: "💳", color: "amber"  },
    { id: "parcels",    label: t("fhParcels"),                icon: "📦", color: "blue"   },
    { id: "visitors",   label: t("fhVisitors"),               icon: "🚶", color: "purple" },
    { id: "complaints", label: t("fhComplaints"),             icon: "📋", color: "red"    },
    { id: "parking",    label: t("fhParking"),                icon: "🚗", color: "green"  },
  ];

  /* ── Helper: Extract clean block name ── */
  const getBlockName = useCallback((flat) => {
    const raw = flat?.Block?.name || flat?.Floor?.Block?.name;
    if (raw && typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    return flat?.block_id ? `${t("fhBlock")} ${flat.block_id}` : "Unassigned";
  }, [t]);

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

  /* ── 3. Reset Detail Drawer ── */
  const goBack = () => {
    setSelectedFlat(null);
    setData({ residents: [], bills: [], parcels: [], visitors: [], complaints: [], parking: [] });
    setFetchError(null);
  };

  /* ── Escape key closes detail drawer ── */
  useEffect(() => {
    if (!selectedFlat) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (confirmMoveOut) setConfirmMoveOut(null);
        else goBack();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedFlat, confirmMoveOut]);

  /* ── Group all flats by blockName ── */
  const allBlockGroups = useMemo(() => {
    return flats.reduce((acc, flat) => {
      const bName = getBlockName(flat);
      if (!acc[bName]) {
        acc[bName] = {
          name: bName,
          blockId: flat.block_id,
          flats: [],
          occupiedCount: 0,
          vacantCount: 0,
        };
      }
      acc[bName].flats.push(flat);
      if (flat.resident_id) acc[bName].occupiedCount++;
      else acc[bName].vacantCount++;
      return acc;
    }, {});
  }, [flats, getBlockName]);

  const blockNames = useMemo(() => Object.keys(allBlockGroups).sort(), [allBlockGroups]);

  /* ── Default active block selection ── */
  useEffect(() => {
    if (blockNames.length > 0 && (!activeBlock || !allBlockGroups[activeBlock])) {
      setActiveBlock(blockNames[0]);
    }
  }, [blockNames, activeBlock, allBlockGroups]);

  /* ── Search handling ── */
  const searchTrim = search.trim().toLowerCase();

  const matchCountsByBlock = useMemo(() => {
    if (!searchTrim) return {};
    const res = {};
    for (const bName of blockNames) {
      const cnt = allBlockGroups[bName].flats.filter((f) =>
        `flat ${f.flat_number} ${bName}`.toLowerCase().includes(searchTrim)
      ).length;
      if (cnt > 0) res[bName] = cnt;
    }
    return res;
  }, [allBlockGroups, blockNames, searchTrim]);

  // If search matches other blocks but current block has 0, auto switch to first match
  useEffect(() => {
    if (!searchTrim) return;
    if (activeBlock && (matchCountsByBlock[activeBlock] || 0) > 0) return;
    const firstMatch = blockNames.find((b) => (matchCountsByBlock[b] || 0) > 0);
    if (firstMatch) {
      setActiveBlock(firstMatch);
    }
  }, [searchTrim, matchCountsByBlock, activeBlock, blockNames]);

  const activeBlockFlats = useMemo(() => {
    if (!activeBlock || !allBlockGroups[activeBlock]) return [];
    const blockFlats = allBlockGroups[activeBlock].flats;
    if (!searchTrim) return blockFlats;
    return blockFlats.filter((f) =>
      `flat ${f.flat_number} ${activeBlock}`.toLowerCase().includes(searchTrim)
    );
  }, [allBlockGroups, activeBlock, searchTrim]);

  /* ── Navigation between blocks (Slider control) ── */
  const currentBlockIdx = blockNames.indexOf(activeBlock);

  const handleSelectBlock = (bName) => {
    setActiveBlock(bName);
  };

  const handlePrevBlock = () => {
    if (currentBlockIdx > 0) {
      const prev = blockNames[currentBlockIdx - 1];
      handleSelectBlock(prev);
    }
  };

  const handleNextBlock = () => {
    if (currentBlockIdx < blockNames.length - 1) {
      const next = blockNames[currentBlockIdx + 1];
      handleSelectBlock(next);
    }
  };

  /* ── Move-out flow: open confirm, close, execute ── */
  const openMoveOutConfirm = useCallback((resident) => {
    setConfirmMoveOut({ flat: selectedFlat, resident });
  }, [selectedFlat]);

  const closeMoveOutConfirm = useCallback(() => {
    if (movingOut) return;
    setConfirmMoveOut(null);
  }, [movingOut]);

  const doMoveOut = useCallback(async () => {
    if (!confirmMoveOut || movingOut) return;
    const { flat, resident } = confirmMoveOut;
    const userId =
      resident.user_id ?? resident.userId ?? resident.User?.id ?? resident.user?.id ?? null;

    if (!flat || !userId) {
      toast.error(t("fhMoveOutFailId"));
      setConfirmMoveOut(null);
      return;
    }

    setMovingOut(true);
    try {
      await moveOutResident(flat.id, userId);
      toast.success(t("fhMoveOutSuccess"));
      setConfirmMoveOut(null);

      const res = await API.get("/flats/getall");
      const fresh = toArr(res);
      setFlats(fresh);
      const updated = fresh.find((f) => String(f.id) === String(flat.id));
      if (updated) await fetchFlatDetails(updated);
    } catch (err) {
      console.error("Move-out error:", err);
      toast.error(err.response?.data?.message || t("fhMoveOutFail"));
    } finally {
      setMovingOut(false);
    }
  }, [confirmMoveOut, movingOut, t, fetchFlatDetails]);

  /* ── Section content renderer (one section per toggle tab) ── */
  const renderContent = () => {
    if (loading)    return <SpinnerComp t={t} />;
    if (fetchError) return (
      <div style={{ padding: "2rem", color: "var(--danger, #f87171)", textAlign: "center", fontSize: "14px" }}>
        ⚠️ {fetchError}
      </div>
    );
    switch (activeTab) {
      case "residents":  return <ResidentsTab  residents={data.residents}   t={t} onMoveOut={openMoveOutConfirm} />;
      case "bills":      return <BillsTab      bills={data.bills}           t={t} />;
      case "parcels":    return <ParcelsTab    parcels={data.parcels}       t={t} />;
      case "visitors":   return <VisitorsTab   visitors={data.visitors}     t={t} />;
      case "complaints": return <ComplaintsTab complaints={data.complaints} t={t} />;
      case "parking":    return <ParkingTab    parking={data.parking}       t={t} />;
      default:           return null;
    }
  };

  return (
    <div className="fh-root">
      {/* Page Header */}
      <div className="fh-page-header">
        <div className="fh-page-header-left">
          <div className="fh-page-icon-box">🏢</div>
          <div className="fh-page-titles">
            <h1 className="fh-page-title">{t("fhTitle") || "Flat Directory"}</h1>
            <p className="fh-page-subtitle">{t("fhSubtitle") || "Manage and view complete flat history"}</p>
          </div>
        </div>
        <div className="fh-flats-badge">
          <span>{flats.length} {t("fhFlats") || "Flats"}</span>
        </div>
      </div>

      {/* Modern SaaS Search Bar */}
      <div className="fh-search-bar">
        <span className="fh-search-icon">🔍</span>
        <input
          ref={searchInputRef}
          className="fh-search-input"
          placeholder={t("fhSearchPlaceholder") || "Search flats, blocks, or residents..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="fh-search-right-actions">
          {search ? (
            <button
              type="button"
              className="fh-search-clear"
              onClick={() => setSearch("")}
              title="Clear search"
            >
              ✕
            </button>
          ) : (
            <span className="fh-kbd">Ctrl K</span>
          )}
        </div>
      </div>

      {/* Block Quick Selector Strip */}
      {blockNames.length > 1 && (
        <div className="fh-block-selector-row">
          <div className="fh-block-pills-scroll">
            {blockNames.map((bName) => {
              const bData = allBlockGroups[bName];
              const isAct = bName === activeBlock;
              const matchCnt = matchCountsByBlock[bName];
              return (
                <button
                  key={bName}
                  type="button"
                  className={`fh-block-select-pill ${isAct ? "fh-block-select-pill--active" : ""}`}
                  onClick={() => handleSelectBlock(bName)}
                >
                  <span>🏢 {bName}</span>
                  <span className="fh-block-pill-count">
                    {matchCnt !== undefined ? `${matchCnt} match` : `${bData?.flats?.length || 0}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Block Section & Flats Container */}
      <div className="fh-block-section-wrap">
        {activeBlock && allBlockGroups[activeBlock] ? (
          <div className="fh-block-content" key={activeBlock}>
            {/* Compact Block Summary Bar */}
            <div className="fh-block-summary-bar">
              <div className="fh-block-summary-left">
                <span className="fh-block-summary-name">🏢 Block {activeBlock.replace(/^Block\s*/i, "")}</span>
                <span className="fh-block-summary-stat">
                  <strong>{allBlockGroups[activeBlock].flats.length}</strong> Flats
                </span>
                <span className="fh-status-chip fh-status-chip--occ">
                  <span className="fh-chip-dot fh-chip-dot--green" />
                  <strong>{allBlockGroups[activeBlock].occupiedCount}</strong> Occupied
                </span>
                <span className="fh-status-chip fh-status-chip--vac">
                  <span className="fh-chip-dot fh-chip-dot--gray" />
                  <strong>{allBlockGroups[activeBlock].vacantCount}</strong> Vacant
                </span>
              </div>

              {/* Prev / Next Pagination Control */}
              <div className="fh-block-summary-nav">
                <button
                  type="button"
                  className="fh-block-nav-arrow"
                  onClick={handlePrevBlock}
                  disabled={currentBlockIdx <= 0}
                  title="Previous Block"
                >
                  ‹
                </button>
                <span className="fh-block-pagination-label">
                  {currentBlockIdx + 1} / {blockNames.length}
                </span>
                <button
                  type="button"
                  className="fh-block-nav-arrow"
                  onClick={handleNextBlock}
                  disabled={currentBlockIdx >= blockNames.length - 1}
                  title="Next Block"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Flats Grid for this block */}
            {activeBlockFlats.length === 0 ? (
              <Empty icon="🔍" text={t("fhNoFlatsFound")} sub={t("fhNoFlatsSub")} />
            ) : (
              <div className="fh-flat-grid">
                {activeBlockFlats.map((flat) => {
                  const occ = !!flat.resident_id;
                  const isSelected = selectedFlat?.id === flat.id;
                  const residentName =
                    flat.User?.name ||
                    flat.user?.name ||
                    flat.resident_name ||
                    (occ ? "Occupied Resident" : null);

                  return (
                    <div
                      key={flat.id}
                      className={`fh-flat-card ${isSelected ? "fh-flat-card--selected" : ""}`}
                      onClick={() => fetchFlatDetails(flat)}
                    >
                      {/* Top row: Flat number, BHK/type pill, and Status */}
                      <div className="fh-card-header-row">
                        <div className="fh-card-header-left">
                          <div className={`fh-card-avatar ${occ ? "fh-card-avatar--occ" : "fh-card-avatar--vac"}`}>
                            <span>{occ ? "👥" : "🏢"}</span>
                          </div>
                          <div className="fh-card-title-group">
                            <div className="fh-card-number-row">
                              <h3 className="fh-card-number">{t("fhFlat")} {flat.flat_number}</h3>
                              {flat.flat_type && (
                                <span className="fh-card-type-tag">{flat.flat_type}</span>
                              )}
                            </div>
                            <span className="fh-card-meta-line">
                              {flat.Floor?.floor_number != null
                                ? `Floor ${flat.Floor.floor_number}`
                                : `Block ${activeBlock.replace(/^Block\s*/i, "")}`}
                              {flat.area_sqft ? ` · ${flat.area_sqft} sq.ft` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`fh-card-status-badge ${occ ? "fh-card-status-badge--occ" : "fh-card-status-badge--vac"}`}>
                          <span className={`fh-status-indicator-dot ${occ ? "fh-status-indicator-dot--occ" : ""}`} />
                          {occ ? t("fhOccupied") : t("fhVacant")}
                        </span>
                      </div>

                      {/* Middle row: Useful Info instead of empty space */}
                      <div className="fh-card-middle-content">
                        {occ ? (
                          <div className="fh-card-info-item">
                            <span className="fh-card-info-label">Resident</span>
                            <span className="fh-card-info-value" title={residentName}>
                              {residentName}
                            </span>
                          </div>
                        ) : (
                          <div className="fh-card-info-item">
                            <span className="fh-card-info-label">Status</span>
                            <span className="fh-card-info-value fh-card-info-value--vacant">
                              Available Unit
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Subtle divider */}
                      <div className="fh-card-divider" />

                      {/* Bottom row: Action View */}
                      <div className="fh-card-footer-action">
                        <span className="fh-card-footer-text">View Flat History</span>
                        <span className="fh-card-footer-arrow">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <Empty icon="🏠" text={t("fhNoFlatsFound")} sub={t("fhNoFlatsSub")} />
        )}
      </div>

      {/* Flat History Detail Pop-up Modal (Centered Pop instead of Slider) */}
      {selectedFlat && (
        <div className="fh-modal-overlay" onClick={goBack}>
          <div
            className="fh-modal-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Glowing top accent line */}
            <div className="fh-modal-top-accent" />

            {/* Modal Header */}
            <div className="fh-modal-header">
              <div className="fh-modal-header-left">
                <div
                  className={`fh-modal-flat-avatar ${
                    selectedFlat.resident_id
                      ? "fh-modal-flat-avatar--occ"
                      : "fh-modal-flat-avatar--vac"
                  }`}
                >
                  <span>{selectedFlat.resident_id ? "👥" : "🏠"}</span>
                </div>
                <div>
                  <div className="fh-modal-title-row">
                    <h2 className="fh-modal-title">
                      {t("fhFlat")} {selectedFlat.flat_number}
                    </h2>
                    <span
                      className={`fh-card-status-badge ${
                        selectedFlat.resident_id
                          ? "fh-card-status-badge--occ"
                          : "fh-card-status-badge--vac"
                      }`}
                    >
                      <span className={`fh-status-indicator-dot ${selectedFlat.resident_id ? "fh-status-indicator-dot--occ" : ""}`} />
                      {selectedFlat.resident_id ? t("fhOccupied") : t("fhVacant")}
                    </span>
                  </div>
                  <div className="fh-modal-subtitle">
                    <span className="fh-modal-badge-chip">🏢 {getBlockName(selectedFlat)}</span>
                    {selectedFlat.flat_type && (
                      <span className="fh-modal-badge-chip">{selectedFlat.flat_type}</span>
                    )}
                    {selectedFlat.area_sqft && (
                      <span className="fh-modal-badge-chip">{selectedFlat.area_sqft} sq.ft</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="fh-modal-header-actions">
                <button className="fh-modal-close-btn" onClick={goBack} title="Close Popup (Esc)">
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body (scrollbar hidden) */}
            <div className="fh-modal-body">
              {/* Section Toggle Buttons */}
              <div className="fh-section-toggle-wrap">
                <div className="fh-modern-tab-bar">
                  {TABS.map((tab) => {
                    const count = data[tab.id]?.length ?? 0;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`fh-modern-tab-btn ${isActive ? "fh-modern-tab-btn--active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <span className="fh-tab-btn-icon">{tab.icon}</span>
                        <span className="fh-tab-btn-label">{tab.label}</span>
                        <span className="fh-modern-tab-badge">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Section — slider-type animation on switch */}
              <div className="fh-section-animated" key={activeTab}>
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move-Out Confirmation Popup (centered, styled like app popups) */}
      {confirmMoveOut && (
        <div className="fh-confirm-overlay" onClick={closeMoveOutConfirm}>
          <div
            className="fh-confirm-box"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="fh-confirm-accent" />
            <div className="fh-confirm-icon">🚪</div>
            <h3 className="fh-confirm-title">{t("fhMoveOutTitle")}</h3>
            <p className="fh-confirm-text">
              {t("fhMoveOutConfirm")} <strong>
                {confirmMoveOut?.resident?.User?.name ||
                  confirmMoveOut?.resident?.user?.name ||
                  confirmMoveOut?.resident?.name ||
                  t("fhUnknown")}
              </strong>
              {confirmMoveOut?.flat ? ` — ${t("fhFlat")} ${confirmMoveOut.flat.flat_number}` : ""}?
            </p>
            <div className="fh-confirm-actions">
              <button
                type="button"
                className="fh-confirm-btn--cancel"
                onClick={closeMoveOutConfirm}
                disabled={movingOut}
              >
                {t("fhCancel")}
              </button>
              <button
                type="button"
                className="fh-confirm-btn--danger"
                onClick={doMoveOut}
                disabled={movingOut}
              >
                {movingOut ? t("fhMovingOut") : t("fhConfirmMoveOut")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlatHistory;