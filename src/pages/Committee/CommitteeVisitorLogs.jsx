import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdSearch, MdPerson, MdAccessTime, MdOutlineInbox } from "react-icons/md";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";

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
      let data = res.data?.visitors || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setVisitors(data);
    } catch (err) {
      console.error("Failed to load visitors:", err);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

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

  const getFlatDisplay = (visitor) => {
    if (!visitor.Flat) return "—";
    const blockName = visitor.Flat.Block?.name || "";
    const flatNumber = visitor.Flat.flat_number || "";
    return blockName && flatNumber ? `${blockName}-${flatNumber}` : flatNumber || "—";
  };

  const columns = [
    {
      key: "visitor",
      header: "Visitor",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(37, 99, 235, 0.15)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <MdPerson size={15} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              {v.visitor_name || "—"}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              {v.mobile || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {v.purpose || "—"}
        </span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
          {v.vehicle_number || "—"}
        </span>
      ),
    },
    {
      key: "flat",
      header: "Flat",
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.85rem" }}>
          {getFlatDisplay(v)}
        </span>
      ),
    },
    {
      key: "entry",
      header: "Entry",
      render: (v) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: "0.8rem", fontWeight: 600 }}>
          <MdAccessTime size={13} /> {fmt(v.entry_time)}
        </span>
      ),
    },
    {
      key: "exit",
      header: "Exit",
      render: (v) => (
        v.exit_time ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
            <MdAccessTime size={13} /> {fmt(v.exit_time)}
          </span>
        ) : (
          <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>—</span>
        )
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => (
        <GlobalBadge
          variant={v.exit_time ? "neutral" : "success"}
          dot
        >
          {v.exit_time ? "OUT" : "IN"}
        </GlobalBadge>
      ),
    },
  ];

  return (
    <div className="comm-root animate-fadeIn">
      <div className="comm-page-header">
        <div>
          <h1 className="comm-page-title">Visitor Logs</h1>
          <p className="comm-page-subtitle">Monitor all society entries & exits</p>
        </div>
      </div>

      <div className="comm-search-wrap" style={{ marginBottom: 16 }}>
        <MdSearch className="comm-search-icon" size={18} />
        <input
          className="comm-search-input"
          placeholder="Search visitor, phone or purpose…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <GlobalTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={search ? "No visitors match your search." : "No visitor logs available."}
        emptyIcon={MdOutlineInbox}
      />
    </div>
  );
}