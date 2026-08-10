import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdSearch, MdVisibility } from "react-icons/md";

export default function CommitteeVisitorLogs() {
  const [visitors, setVisitors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    loadVisitors(); 
  }, []);

  const loadVisitors = async () => {
    try {
      const res = await API.get("/visitors");

      console.log("Visitors API response:", res.data);

      // ✅ Backend returns { data: [...], pagination: {...}, counts: {...} }
      let data = res.data?.data || [];

      if (!Array.isArray(data)) {
        console.error("Unexpected API shape:", typeof data, data);
        data = [];
      }

      setVisitors(data);
    } catch (err) {
      console.error("Failed to load visitors:", err);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed: Match actual backend field names
  const filtered = visitors.filter(v =>
    `${v.visitor_name || ""} ${v.mobile || ""} ${v.purpose || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const fmt = (d) => 
    d ? new Date(d).toLocaleString("en-IN", { 
      dateStyle: "medium", 
      timeStyle: "short" 
    }) : "—";

  // ✅ Helper to get flat display name
  const getFlatDisplay = (visitor) => {
    if (!visitor.Flat) return "—";
    const blockName = visitor.Flat.Block?.name || "";
    const flatNumber = visitor.Flat.flat_number || "";
    return blockName && flatNumber ? `${blockName}-${flatNumber}` : flatNumber || "—";
  };

  return (
    <div className="comm-root">
      <div className="comm-page-header">
        <div>
          <h1 className="comm-page-title">Visitor Logs</h1>
          <p className="comm-page-subtitle">Monitor all society entries & exits</p>
        </div>
      </div>

      <div className="comm-search-wrap">
        <MdSearch className="comm-search-icon" size={16} />
        <input
          className="comm-search-input"
          placeholder="Search visitor, phone or purpose…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="comm-loading">
          <div className="comm-spinner" />
          Loading…
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="comm-table-wrap comm-desktop-only">
            <table className="comm-table">
              <thead>
                <tr className="comm-t-row">
                  <th className="comm-th">Visitor</th>
                  <th className="comm-th">Phone</th>
                  <th className="comm-th">Purpose</th>
                  <th className="comm-th">Vehicle</th>
                  <th className="comm-th">Flat</th>
                  <th className="comm-th">Entry</th>
                  <th className="comm-th">Exit</th>
                  <th className="comm-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="comm-tbody-row">
                    <td className="comm-td comm-td--name">{v.visitor_name || "—"}</td>
                    <td className="comm-td">{v.mobile || "—"}</td>
                    <td className="comm-td">
                      <span className="comm-purpose-badge">
                        {v.purpose || "—"}
                      </span>
                    </td>
                    <td className="comm-td">{v.vehicle_number || "—"}</td>
                    <td className="comm-td">{getFlatDisplay(v)}</td>
                    <td className="comm-td">{fmt(v.entry_time)}</td>
                    <td className="comm-td">{fmt(v.exit_time)}</td>
                    <td className="comm-td">
                      <span className={`comm-status-pill comm-status-pill--${v.exit_time ? "exited" : "inside"}`}>
                        {v.exit_time ? "Exited" : "Inside"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="comm-empty-row">
                      No visitor records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="comm-mobile-list comm-mobile-only">
            {filtered.length === 0 ? (
              <div className="comm-empty">
                <MdVisibility size={28} />
                <p>No visitors found</p>
              </div>
            ) : filtered.map(v => (
              <div key={v.id} className="comm-mobile-card">
                <div className="comm-mobile-card-top">
                  <p className="comm-row-name">{v.visitor_name || "Unknown"}</p>
                  <span className={`comm-status-pill comm-status-pill--${v.exit_time ? "exited" : "inside"}`}>
                    {v.exit_time ? "Exited" : "Inside"}
                  </span>
                </div>
                <div className="comm-mobile-card-meta">
                  {v.mobile && <span className="comm-meta-chip">📱 {v.mobile}</span>}
                  {v.purpose && <span className="comm-meta-chip">{v.purpose}</span>}
                  {v.Flat && <span className="comm-meta-chip">🏠 {getFlatDisplay(v)}</span>}
                  {v.vehicle_number && <span className="comm-meta-chip">🚗 {v.vehicle_number}</span>}
                </div>
                <p className="comm-mobile-card-time">
                  📥 Entry: {fmt(v.entry_time)}
                </p>
                {v.exit_time && (
                  <p className="comm-mobile-card-time">
                    📤 Exit: {fmt(v.exit_time)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}