import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdApartment, MdSearch } from "react-icons/md";

export default function CommitteeProperty() {
  const [flats, setFlats] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/flats");
      setFlats(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = flats.filter(f =>
    `${f.flatNumber} ${f.block} ${f.residentName}`.toLowerCase().includes(search.toLowerCase())
  );

  const occupied = flats.filter(f => f.isOccupied).length;
  const vacant   = flats.length - occupied;

  return (
    <div className="comm-root">
      <div className="comm-page-er">
        <div>
          <h1 className="comm-page-title">Property</h1>
          <p className="comm-page-subtitle">Block & unit overview</p>
        </div>
      </div>

      <div className="comm-stats-grid comm-stats-grid--3">
        <div className="comm-stat-card comm-stat-card--blue">
          <div className="comm-stat-icon comm-stat-icon--blue"><MdApartment size={20} /></div>
          <div><p className="comm-stat-val">{flats.length}</p><p className="comm-stat-label">Total Units</p></div>
        </div>
        <div className="comm-stat-card comm-stat-card--green">
          <div className="comm-stat-icon comm-stat-icon--green"><MdApartment size={20} /></div>
          <div><p className="comm-stat-val">{occupied}</p><p className="comm-stat-label">Occupied</p></div>
        </div>
        <div className="comm-stat-card comm-stat-card--amber">
          <div className="comm-stat-icon comm-stat-icon--amber"><MdApartment size={20} /></div>
          <div><p className="comm-stat-val">{vacant}</p><p className="comm-stat-label">Vacant</p></div>
        </div>
      </div>

      <div className="comm-search-wrap">
        <MdSearch className="comm-search-icon" size={16} />
        <input className="comm-search-input" placeholder="Search by flat, block or resident…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="comm-loading"><div className="comm-spinner" />Loading…</div>
      ) : (
        <div className="comm-flat-grid">
          {filtered.length === 0 ? (
            <div className="comm-empty"><MdApartment size={32} /><p>No units found</p></div>
          ) : filtered.map(f => (
            <div key={f._id} className={`comm-flat-card ${f.isOccupied ? "comm-flat-card--occupied" : "comm-flat-card--vacant"}`}>
              <div className="comm-flat-top">
                <span className="comm-flat-number">{f.flatNumber}</span>
                {f.block && <span className="comm-meta-chip">Block {f.block}</span>}
              </div>
              <span className={`comm-status-pill comm-status-pill--${f.isOccupied ? "green" : "amber"}`}>
                {f.isOccupied ? "Occupied" : "Vacant"}
              </span>
              {f.residentName && <p className="comm-flat-resident">{f.residentName}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}