import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdAccountBalance, MdAdd, MdDelete, MdClose } from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalBadge from "../../components/common/GlobalBadge";
import Select from "../../components/common/Select";

export default function CommitteeBillingRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", frequency: "MONTHLY", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/billing-rules");
      setRules(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.amount) return;
    setSubmitting(true);
    try {
      await API.post("/billing-rules", form);
      setShowForm(false);
      setForm({ name: "", amount: "", frequency: "MONTHLY", description: "" });
      load();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await API.delete(`/billing-rules/${deleteTargetId}`);
      setDeleteTargetId(null);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Billing Rules</h1>
          <p className="page-subtitle">Configure maintenance & recurring billing schedules</p>
        </div>
        <GlobalButton variant="add" icon={MdAdd} borderDraw onClick={() => setShowForm(true)}>
          Add Rule
        </GlobalButton>
      </div>

      {/* ── CREATE MODAL ── */}
      <GlobalModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Billing Rule"
        subtitle="Set up a recurring or fixed billing rule"
        icon={MdAccountBalance}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Rule Name *</label>
            <input
              className="input w-full"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Society Maintenance Fee"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Amount (₹) *</label>
            <input
              className="input w-full"
              type="number"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Frequency</label>
            <Select className="input w-full" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
              {["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"].map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional details about this billing rule..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
            <GlobalButton variant="cancel" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </GlobalButton>
            <GlobalButton variant="create" type="submit" loading={submitting}>
              Save Rule
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* ── RULES LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-secondary gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-sm">Loading billing rules…</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}>
          <MdAccountBalance size={40} className="mx-auto text-secondary opacity-40" />
          <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No billing rules configured</p>
          <p className="mt-1 text-xs text-secondary">Click "Add Rule" to configure recurring charges for flats.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(r => (
            <div key={r.id} className="premium-card p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{r.name}</h3>
                  <GlobalBadge variant="info">
                    {r.frequency}
                  </GlobalBadge>
                </div>
                {r.description && (
                  <p className="text-xs text-secondary mt-1 line-clamp-2">{r.description}</p>
                )}
                <p className="text-lg font-bold text-emerald-400 mt-3">₹{Number(r.amount).toLocaleString()}</p>
              </div>

              <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: "var(--glass-border)" }}>
                <GlobalButton
                  variant="delete"
                  size="sm"
                  icon={MdDelete}
                  onClick={() => setDeleteTargetId(r.id)}
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
        title="Delete Billing Rule"
        message="Are you sure you want to delete this billing rule? This action cannot be undone."
        confirmText="Delete Rule"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
