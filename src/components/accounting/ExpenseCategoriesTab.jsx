import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { MdAdd, MdEdit, MdDelete, MdClose, MdCategory } from "react-icons/md";
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "../../services/accountingService";

const inputStyle = {
  background: "var(--card-inner-bg)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-primary)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};

export default function ExpenseCategoriesTab({ canEdit = true, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const list = await getExpenseCategories();
      setCategories(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load expense categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (modal.mode === "create") {
        await createExpenseCategory(form);
        toast.success("Expense category added.");
      } else {
        await updateExpenseCategory(modal.item.id, form);
        toast.success("Expense category updated.");
      }
      setModal(null);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    try {
      const res = await deleteExpenseCategory(cat.id);
      toast.success(res.message || "Category updated.");
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete category.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">Expense Categories</h2>
          <p className="text-xs text-secondary">
            Configure society-specific expense categories. Categories used in historical expenses are safely deactivated instead of deleted.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setForm({ name: "", status: "ACTIVE" });
              setModal({ mode: "create" });
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-white flex items-center gap-1.5"
          >
            <MdAdd size={16} /> Add Category
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-secondary text-sm">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl p-8 border border-glass-border bg-card/40 text-center space-y-2">
          <MdCategory size={36} className="mx-auto text-secondary opacity-50" />
          <p className="font-semibold text-primary">No expense categories yet</p>
          <p className="text-xs text-secondary">Add categories like Security, Housekeeping, Repairs, Electricity, Water.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl p-4 border border-glass-border bg-card/50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-primary truncate">{cat.name}</h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cat.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"
                    }`}
                  >
                    {cat.status}
                  </span>
                </div>
                <p className="text-[11px] text-secondary mt-2">Used in {cat.usage_count || 0} expense(s)</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ name: cat.name, status: cat.status });
                      setModal({ mode: "edit", item: cat });
                    }}
                    className="p-1.5 rounded-lg border border-glass-border text-secondary hover:text-primary"
                  >
                    <MdEdit size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    title={cat.usage_count > 0 ? "Deactivate Category" : "Delete Category"}
                    className="p-1.5 rounded-lg border border-glass-border text-rose-400 hover:bg-rose-500/10"
                  >
                    <MdDelete size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
            style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1200 }}
            onClick={() => setModal(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl animate-scaleIn shadow-2xl"
              style={{ background: "var(--modal-bg)", border: "1.5px solid var(--glass-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
                <h3 className="text-lg font-bold text-primary">
                  {modal.mode === "create" ? "Add Expense Category" : "Edit Expense Category"}
                </h3>
                <button type="button" onClick={() => setModal(null)} className="text-secondary hover:text-primary">
                  <MdClose size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Category Name *</label>
                  <input
                    required
                    style={inputStyle}
                    placeholder="e.g. Repairs & Maintenance"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                {modal.mode === "edit" && (
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">Status</label>
                    <select
                      style={inputStyle}
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-white">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
