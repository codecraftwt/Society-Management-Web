import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdBarChart, MdSearch } from "react-icons/md";

// ── Reusable helper ──
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "bills", "payments", "results", "items", "records"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  console.error("Expected array, got:", typeof data, data);
  return [];
};

export default function CommitteePaymentTracking() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/bills/society");

      console.log("Bills API response:", res.data);

      setBills(toArray(res.data));
    } catch (err) {
      console.error(err);
      setBills([]); // keep state as array on error
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    ALL: bills.length,
    PAID: bills.filter(b => b.status === "PAID").length,
    PENDING: bills.filter(b => b.status !== "PAID").length,
  };
  const totalCollected = bills.filter(b => b.status === "PAID").reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalPending   = bills.filter(b => b.status !== "PAID").reduce((s, b) => s + Number(b.amount || 0), 0);

  const filtered = bills.filter(b => {
    const matchFilter = filter === "ALL" || (filter === "PAID" ? b.status === "PAID" : b.status !== "PAID");
    const matchSearch = `${b.title} ${b.residentName} ${b.flatNumber}`.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

  return (
    <div className="comm-root">
      <div className="comm-page-er">
        <div>
          <h1 className="comm-page-title">Payment Tracking</h1>
          <p className="comm-page-subtitle">Monitor dues and payment status</p>
        </div>
      </div>

      <div className="comm-stats-grid comm-stats-grid--3">
        <div className="comm-stat-card comm-stat-card--blue">
          <div className="comm-stat-icon comm-stat-icon--blue"><MdBarChart size={20} /></div>
          <div><p className="comm-stat-val">₹{totalCollected.toLocaleString()}</p><p className="comm-stat-label">Collected</p></div>
        </div>
        <div className="comm-stat-card comm-stat-card--amber">
          <div className="comm-stat-icon comm-stat-icon--amber"><MdBarChart size={20} /></div>
          <div><p className="comm-stat-val">₹{totalPending.toLocaleString()}</p><p className="comm-stat-label">Outstanding</p></div>
        </div>
        <div className="comm-stat-card comm-stat-card--green">
          <div className="comm-stat-icon comm-stat-icon--green"><MdBarChart size={20} /></div>
          <div>
            <p className="comm-stat-val">{counts.PAID}/{counts.ALL}</p>
            <p className="comm-stat-label">Bills Paid</p>
          </div>
        </div>
      </div>

      <div className="comm-filter-strip">
        {["ALL", "PAID", "PENDING"].map(s => (
          <button key={s} className={`comm-filter-pill ${filter === s ? "comm-filter-pill--active" : ""}`} onClick={() => setFilter(s)}>
            {s} <span className="comm-filter-count">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="comm-search-wrap">
        <MdSearch className="comm-search-icon" size={16} />
        <input className="comm-search-input" placeholder="Search payments…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="comm-loading"><div className="comm-spinner" />Loading…</div>
      ) : (
        <div className="comm-list">
          {filtered.length === 0 ? (
            <div className="comm-empty"><MdBarChart size={32} /><p>No payment records found</p></div>
          ) : filtered.map(b => (
            <div key={b._id} className="comm-rule-card">
              <div className="comm-rule-left">
                <div>
                  <p className="comm-row-name">{b.title}</p>
                  <div className="comm-row-meta">
                    {b.residentName && <span className="comm-meta-chip">{b.residentName}</span>}
                    {b.flatNumber && <span className="comm-meta-chip">Flat {b.flatNumber}</span>}
                    <span className="comm-meta-chip">Due: {fmt(b.dueDate)}</span>
                  </div>
                </div>
              </div>
              <div className="comm-rule-right">
                <span className="comm-rule-amount">₹{Number(b.amount || 0).toLocaleString()}</span>
                <span className={`comm-status-pill comm-status-pill--${b.status === "PAID" ? "green" : "amber"}`}>
                  {b.status || "PENDING"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}