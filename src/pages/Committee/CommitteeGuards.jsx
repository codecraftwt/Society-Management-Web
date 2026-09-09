import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdSearch, MdSecurity, MdPhone, MdSchedule } from "react-icons/md";
import GlobalBadge from "../../components/common/GlobalBadge";

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div>
        <h1 className="page-title">Guards</h1>
        <p className="page-subtitle">View security staff and shift assignments</p>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="search-input-wrap max-w-md">
        <MdSearch className="search-input-icon" size={16} />
        <input
          className="input search-input"
          placeholder="Search guards by name, phone, shift…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── GUARDS LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-secondary gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-sm">Loading guards…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
          <MdSecurity size={40} className="mx-auto text-secondary opacity-40" />
          <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No guards found</p>
          <p className="mt-1 text-xs text-secondary">Try searching with a different term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(g => (
            <div key={g._id || g.id} className="premium-card p-4 sm:p-5 flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-md"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.3))",
                  color: "var(--accent, #818cf8)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                {(g.name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                    {g.name}
                  </h3>
                  <GlobalBadge variant={g.isActive !== false ? "success" : "neutral"}>
                    {g.isActive !== false ? "On Duty" : "Off Duty"}
                  </GlobalBadge>
                </div>
                {g.phone && (
                  <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                    <MdPhone size={13} className="opacity-70" /> {g.phone}
                  </p>
                )}
                {g.shiftType && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <GlobalBadge variant="info">
                      <MdSchedule size={12} /> {g.shiftType}
                    </GlobalBadge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}