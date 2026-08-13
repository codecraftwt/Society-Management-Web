import { useState, useEffect } from "react";
import API from "../../services/api";
import { MdAccountBalance, MdAdd, MdEdit, MdDelete } from "react-icons/md";
import Select from "../../components/common/Select";

export default function CommitteeBillingRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", frequency: "MONTHLY", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get("/billing-rules");
      setRules(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this billing rule?")) return;
    try { await API.delete(`/billing-rules/${id}`); load(); } catch (err) { console.error(err); }
  };

  const freqColor = { MONTHLY: "blue", QUARTERLY: "purple", YEARLY: "green", ONE_TIME: "amber" };

  return (
    <div className="comm-root">
      <div className="comm-page-er">
        <div>
          <h1 className="comm-page-title">Billing Rules</h1>
          <p className="comm-page-subtitle">Configure maintenance & billing schedules</p>
        </div>
        <button className="comm-btn-primary" onClick={() => setShowForm(s => !s)}>
          <MdAdd size={16} /> Add Rule
        </button>
      </div>

      {showForm && (
        <div className="comm-form-card">
          <h3 className="comm-form-title">New Billing Rule</h3>
          <div className="comm-form-fields">
            <div className="comm-field">
              <label className="comm-label">Rule Name *</label>
              <input className="comm-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Maintenance Fee" />
            </div>
            <div className="comm-field">
              <label className="comm-label">Amount (₹) *</label>
              <input className="comm-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="comm-field">
              <label className="comm-label">Frequency</label>
              <Select className="comm-input" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                {["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"].map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
            <div className="comm-field comm-field--full">
              <label className="comm-label">Description</label>
              <input className="comm-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <div className="comm-form-footer">
            <button className="comm-btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save Rule"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="comm-loading"><div className="comm-spinner" />Loading…</div>
      ) : rules.length === 0 ? (
        <div className="comm-empty"><MdAccountBalance size={32} /><p>No billing rules configured</p></div>
      ) : (
        <div className="comm-list">
          {rules.map(r => (
            <div key={r.id} className="comm-rule-card">
              <div className="comm-rule-left">
                <div className="comm-rule-icon"><MdAccountBalance size={18} /></div>
                <div>
                  <p className="comm-row-name">{r.name}</p>
                  {r.description && <p className="comm-rule-desc">{r.description}</p>}
                  <span className={`comm-status-pill comm-status-pill--cat-${freqColor[r.frequency] || "blue"}`}>
                    {r.frequency}
                  </span>
                </div>
              </div>
              <div className="comm-rule-right">
                <span className="comm-rule-amount">₹{Number(r.amount).toLocaleString()}</span>
                <button className="comm-icon-btn comm-icon-btn--delete" onClick={() => handleDelete(r.id)}>
                  <MdDelete size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
