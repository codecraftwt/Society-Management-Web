import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdBookOnline, MdAdd, MdDelete, MdClose } from "react-icons/md";

// ── Reusable helper ──
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "amenities", "results", "items", "records"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  console.error("Expected array, got:", typeof data, data);
  return [];
};

export default function CommitteeAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "GYM", isPaid: false, pricePerHour: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/amenities");

      // ── DEBUG ──
      console.log("Amenities API response:", res.data);

      setAmenities(toArray(res.data));
    } catch (err) {
      console.error(err);
      setAmenities([]); // keep state as array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await API.post("/amenities", form);
      setShowForm(false);
      setForm({ name: "", type: "GYM", isPaid: false, pricePerHour: "", description: "" });
      load();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this amenity?")) return;
    try { await API.delete(`/amenities/${id}`); load(); } catch (err) { console.error(err); }
  };

  const TYPES = ["GYM", "SWIMMING_POOL", "CLUBHOUSE", "PARK", "PARKING", "TERRACE", "OTHER"];
  const typeEmoji = { GYM: "🏋️", SWIMMING_POOL: "🏊", CLUBHOUSE: "🏛️", PARK: "🌳", PARKING: "🚗", TERRACE: "🌅", OTHER: "📍" };

  return (
    <div className="comm-root">
      <div className="comm-page-er">
        <div>
          <h1 className="comm-page-title">Amenities</h1>
          <p className="comm-page-subtitle">Configure society amenities</p>
        </div>
        <button className="comm-btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? <MdClose size={16} /> : <MdAdd size={16} />}
          {showForm ? "Cancel" : "Add Amenity"}
        </button>
      </div>

      {showForm && (
        <div className="comm-form-card">
          <h3 className="comm-form-title">New Amenity</h3>
          <div className="comm-form-fields">
            <div className="comm-field">
              <label className="comm-label">Name *</label>
              <input className="comm-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Amenity name" />
            </div>
            <div className="comm-field">
              <label className="comm-label">Type</label>
              <select className="comm-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="comm-field">
              <label className="comm-label">Paid Amenity?</label>
              <select className="comm-input" value={form.isPaid ? "yes" : "no"} onChange={e => setForm(p => ({ ...p, isPaid: e.target.value === "yes" }))}>
                <option value="no">Free</option>
                <option value="yes">Paid</option>
              </select>
            </div>
            {form.isPaid && (
              <div className="comm-field">
                <label className="comm-label">Price per Hour (₹)</label>
                <input className="comm-input" type="number" value={form.pricePerHour} onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))} placeholder="0" />
              </div>
            )}
          </div>
          <div className="comm-form-footer">
            <button className="comm-btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save Amenity"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="comm-loading"><div className="comm-spinner" />Loading…</div>
      ) : amenities.length === 0 ? (
        <div className="comm-empty"><MdBookOnline size={32} /><p>No amenities configured</p></div>
      ) : (
        <div className="comm-amenity-grid">
          {amenities.map(a => (
            <div key={a._id} className="comm-amenity-card">
              <div className="comm-amenity-top">
                <span className="comm-amenity-emoji">{typeEmoji[a.type] || "📍"}</span>
                <div className="comm-amenity-badges">
                  <span className={`comm-status-pill comm-status-pill--cat-${a.isPaid ? "amber" : "green"}`}>
                    {a.isPaid ? "Paid" : "Free"}
                  </span>
                </div>
              </div>
              <p className="comm-amenity-name">{a.name}</p>
              <p className="comm-amenity-type">{(a.type || "").replace("_", " ")}</p>
              {a.isPaid && a.pricePerHour && (
                <p className="comm-amenity-price">₹{a.pricePerHour}/hr</p>
              )}
              <button className="comm-icon-btn comm-icon-btn--delete comm-amenity-del" onClick={() => handleDelete(a._id)}>
                <MdDelete size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}