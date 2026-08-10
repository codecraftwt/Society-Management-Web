import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdSearch, MdSecurity } from "react-icons/md";

export default function CommitteeGuards() {
  const [guards, setGuards] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/user/guard");
      setGuards(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = guards.filter(g =>
    `${g.name} ${g.phone} ${g.shiftType}`.toLowerCase().includes(search.toLowerCase())
  );

  const shiftColor = { MORNING: "amber", EVENING: "blue", NIGHT: "purple", FULL_DAY: "green" };

  return (
    <div className="comm-root">
      <div className="comm-page-er">
        <div>
          <h1 className="comm-page-title">Guards</h1>
          <p className="comm-page-subtitle">View security staff on duty</p>
        </div>
      </div>

      <div className="comm-search-wrap">
        <MdSearch className="comm-search-icon" size={16} />
        <input className="comm-search-input" placeholder="Search guards…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="comm-loading"><div className="comm-spinner" />Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="comm-empty"><MdSecurity size={32} /><p>No guards found</p></div>
      ) : (
        <div className="comm-list">
          {filtered.map(g => (
            <div key={g._id} className="comm-row-card">
              <div className="comm-row-avatar comm-row-avatar--guard">
                {(g.name || "?")[0].toUpperCase()}
              </div>
              <div className="comm-row-info">
                <p className="comm-row-name">{g.name}</p>
                <div className="comm-row-meta">
                  {g.phone && <span className="comm-meta-chip">{g.phone}</span>}
                  {g.shiftType && (
                    <span className={`comm-status-pill comm-status-pill--cat-${shiftColor[g.shiftType] || "blue"}`}>
                      {g.shiftType}
                    </span>
                  )}
                </div>
              </div>
              <span className={`comm-status-pill comm-status-pill--${g.isActive !== false ? "active" : "inactive"}`}>
                {g.isActive !== false ? "On Duty" : "Off Duty"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}