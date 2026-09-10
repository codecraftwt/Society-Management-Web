import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdBookOnline, MdAdd, MdDelete, MdClose, MdFitnessCenter } from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalBadge from "../../components/common/GlobalBadge";
import Select from "../../components/common/Select";

// ── Reusable helper ──
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "amenities", "results", "items", "records"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
};

export default function CommitteeAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "GYM", isPaid: false, pricePerHour: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/amenities");
      setAmenities(toArray(res.data));
    } catch (err) {
      console.error(err);
      setAmenities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
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

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await API.delete(`/amenities/${deleteTargetId}`);
      setDeleteTargetId(null);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const TYPES = ["GYM", "SWIMMING_POOL", "CLUBHOUSE", "PARK", "PARKING", "TERRACE", "OTHER"];
  const typeEmoji = { GYM: "🏋️", SWIMMING_POOL: "🏊", CLUBHOUSE: "🏛️", PARK: "🌳", PARKING: "🚗", TERRACE: "🌅", OTHER: "📍" };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Amenities</h1>
          <p className="page-subtitle">Configure and manage society amenities</p>
        </div>
        <GlobalButton variant="add" icon={MdAdd} borderDraw onClick={() => setShowForm(true)}>
          Add Amenity
        </GlobalButton>
      </div>

      {/* ── ADD MODAL ── */}
      <GlobalModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Amenity"
        subtitle="Add a new community facility or amenity"
        icon={MdFitnessCenter}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Name *</label>
            <input
              className="input w-full"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Clubhouse Gym"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Type</label>
            <Select className="input w-full" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Access Pricing</label>
            <Select className="input w-full" value={form.isPaid ? "yes" : "no"} onChange={e => setForm(p => ({ ...p, isPaid: e.target.value === "yes" }))}>
              <option value="no">Free</option>
              <option value="yes">Paid</option>
            </Select>
          </div>

          {form.isPaid && (
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Price per Hour (₹)</label>
              <input
                className="input w-full"
                type="number"
                value={form.pricePerHour}
                onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))}
                placeholder="0"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Description (Optional)</label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of rules or timings..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
            <GlobalButton variant="cancel" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </GlobalButton>
            <GlobalButton variant="create" type="submit" loading={submitting}>
              Save Amenity
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* ── AMENITIES LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-secondary gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-sm">Loading amenities…</p>
        </div>
      ) : amenities.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
          <MdBookOnline size={40} className="mx-auto text-secondary opacity-40" />
          <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No amenities configured</p>
          <p className="mt-1 text-xs text-secondary">Click "Add Amenity" to configure your society's first facility.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {amenities.map(a => (
            <div key={a._id} className="premium-card p-4 sm:p-5 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl">{typeEmoji[a.type] || "📍"}</span>
                  <GlobalBadge variant={a.isPaid ? "warning" : "success"}>
                    {a.isPaid ? "Paid" : "Free"}
                  </GlobalBadge>
                </div>
                <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{a.name}</h3>
                <p className="text-xs text-secondary mt-0.5">{(a.type || "").replace("_", " ")}</p>
                {a.isPaid && a.pricePerHour && (
                  <p className="text-sm font-bold text-emerald-400 mt-2">₹{a.pricePerHour}/hr</p>
                )}
                {a.description && (
                  <p className="text-xs text-secondary mt-2 line-clamp-2">{a.description}</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: "var(--glass-border)" }}>
                <GlobalButton
                  variant="delete"
                  size="sm"
                  icon={MdDelete}
                  onClick={() => setDeleteTargetId(a._id)}
                >
                  Delete
                </GlobalButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Amenity"
        message="Are you sure you want to delete this amenity? Residents will no longer be able to view or book it."
        confirmText="Delete Amenity"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}