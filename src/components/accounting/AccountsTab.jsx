import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  MdAccountBalance,
  MdAdd,
  MdEdit,
  MdSwapHoriz,
  MdPayments,
  MdStar,
  MdCheckCircle,
  MdClose,
  MdToggleOn,
  MdToggleOff,
} from "react-icons/md";
import Select from "../common/Select";
import {
  createFinancialAccount,
  updateFinancialAccount,
  toggleFinancialAccountStatus,
  recordCashEntry,
  transferBetweenAccounts,
} from "../../services/accountingService";

const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v) || 0);

const TODAY = () => new Date().toISOString().slice(0, 10);

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

function ModalShell({ title, subtitle, onClose, children }) {
  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto py-8 px-4 animate-fadeIn"
      style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1200 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl animate-scaleIn my-auto shadow-2xl"
        style={{ background: "var(--modal-bg)", border: "1.5px solid var(--glass-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
          <div>
            <h3 className="text-lg font-bold text-primary">{title}</h3>
            {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-secondary hover:text-primary">
            <MdClose size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function AccountsTab({ accounts = [], canEdit = true, onRefresh }) {
  const [bankModal, setBankModal] = useState(null); // null | { mode: 'create' | 'edit', item }
  const [cashModal, setCashModal] = useState(false);
  const [cashInModal, setCashInModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const cashAccount = accounts.find((a) => a.account_type === "CASH");
  const bankAccounts = accounts.filter((a) => a.account_type !== "CASH");
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");

  const [bankForm, setBankForm] = useState({
    account_name: "",
    account_type: "SAVINGS",
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    opening_balance: "0",
    opening_balance_date: TODAY(),
    is_default: false,
  });

  const [cashOpenForm, setCashOpenForm] = useState({
    opening_balance: "0",
    opening_balance_date: TODAY(),
  });

  const [cashInForm, setCashInForm] = useState({
    type: "CREDIT",
    source: "CASH_IN",
    amount: "",
    entry_date: TODAY(),
    description: "",
  });

  const [transferForm, setTransferForm] = useState({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    transfer_date: TODAY(),
    description: "",
  });

  const openCreateBank = () => {
    setBankForm({
      account_name: "",
      account_type: "SAVINGS",
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      branch_name: "",
      opening_balance: "0",
      opening_balance_date: TODAY(),
      is_default: bankAccounts.length === 0,
    });
    setBankModal({ mode: "create" });
  };

  const openEditBank = (acc) => {
    setBankForm({
      account_name: acc.account_name || "",
      account_type: acc.account_type || "SAVINGS",
      bank_name: acc.bank_name || "",
      account_holder_name: acc.account_holder_name || "",
      account_number: acc.account_number || "",
      ifsc_code: acc.ifsc_code || "",
      branch_name: acc.branch_name || "",
      opening_balance: String(acc.opening_balance ?? 0),
      opening_balance_date: acc.opening_balance_date || TODAY(),
      is_default: !!acc.is_default,
    });
    setBankModal({ mode: "edit", item: acc });
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (bankModal.mode === "create") {
        await createFinancialAccount(bankForm);
        toast.success("Bank account added.");
      } else {
        await updateFinancialAccount(bankModal.item.id, bankForm);
        toast.success("Bank account updated.");
      }
      setBankModal(null);
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save bank account.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (acc) => {
    try {
      const next = acc.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await toggleFinancialAccountStatus(acc.id, next);
      toast.success(`Account marked ${next}.`);
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update account status.");
    }
  };

  const handleSaveCashOpening = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await createFinancialAccount({
        account_type: "CASH",
        account_name: cashAccount?.account_name || "Cash in Hand",
        opening_balance: Number(cashOpenForm.opening_balance || 0),
        opening_balance_date: cashOpenForm.opening_balance_date,
      });
      toast.success("Cash account opening balance updated.");
      setCashModal(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update cash account.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordCashIn = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await recordCashEntry(cashInForm);
      toast.success("Cash entry recorded.");
      setCashInModal(false);
      setCashInForm({ type: "CREDIT", source: "CASH_IN", amount: "", entry_date: TODAY(), description: "" });
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record cash entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await transferBetweenAccounts(transferForm);
      toast.success("Transfer completed.");
      setTransferModal(false);
      setTransferForm({ from_account_id: "", to_account_id: "", amount: "", transfer_date: TODAY(), description: "" });
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Transfer failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Formal Header Toolbar */}
      <div className="bg-card border border-glass-border rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-primary">Bank &amp; Cash Accounts</h2>
          <p className="text-xs text-secondary mt-0.5">Society bank accounts and cash in hand</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCashInModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors"
            >
              <MdPayments size={15} /> Record Cash Received
            </button>
            <button
              type="button"
              onClick={() => setTransferModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 flex items-center gap-1.5 transition-colors"
            >
              <MdSwapHoriz size={15} /> Cash / Bank Transfer
            </button>
            <button
              type="button"
              onClick={openCreateBank}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-white hover:opacity-90 flex items-center gap-1.5 shadow-sm transition-opacity"
            >
              <MdAdd size={16} /> Add Bank Account
            </button>
          </div>
        )}
      </div>

      {/* Formal Cash Account Card */}
      {cashAccount && (
        <div className="bg-card border border-glass-border rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
              <MdPayments size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">{cashAccount.account_name}</h3>
              <p className="text-xs text-secondary mt-0.5">
                Opening: {CURRENCY(cashAccount.opening_balance)}
                {cashAccount.opening_balance_date ? ` · ${cashAccount.opening_balance_date}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-secondary font-semibold">Current Cash Balance</p>
              <p className="text-xl font-extrabold text-emerald-500">{CURRENCY(cashAccount.current_balance)}</p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setCashOpenForm({
                    opening_balance: String(cashAccount.opening_balance ?? 0),
                    opening_balance_date: cashAccount.opening_balance_date || TODAY(),
                  });
                  setCashModal(true);
                }}
                title="Edit Cash Opening Balance"
                className="p-2 rounded-xl border border-glass-border bg-card-inner-bg text-secondary hover:text-primary hover:border-accent transition-colors"
              >
                <MdEdit size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bank Accounts Grid */}
      {bankAccounts.length === 0 ? (
        <div className="rounded-2xl p-8 border border-glass-border bg-card/40 text-center space-y-2">
          <MdAccountBalance size={36} className="mx-auto text-secondary opacity-50" />
          <p className="font-semibold text-primary">No bank accounts registered yet</p>
          <p className="text-xs text-secondary">Add your society bank accounts to enable bank-wise expenses, FDs, and online collections.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-2xl p-5 border border-glass-border bg-card/50 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-primary truncate">{acc.account_name}</h4>
                    {acc.is_default && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <MdStar size={11} /> Default Collection
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    {acc.bank_name} · {acc.account_type}
                  </p>
                  <p className="text-xs font-mono text-secondary mt-1">
                    A/C: {acc.masked_account_number} · IFSC: {acc.ifsc_code}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    acc.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-500/15 text-slate-400"
                  }`}
                >
                  {acc.status}
                </span>
              </div>

              <div className="pt-3 border-t border-glass-border flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-secondary font-semibold">Current Balance</p>
                  <p className="text-xl font-extrabold text-primary">{CURRENCY(acc.current_balance)}</p>
                  <p className="text-[11px] text-secondary">
                    Opening: {CURRENCY(acc.opening_balance)}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditBank(acc)}
                      title="Edit Bank Account"
                      className="p-2 rounded-lg border border-glass-border text-secondary hover:text-primary hover:border-accent"
                    >
                      <MdEdit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(acc)}
                      title={acc.status === "ACTIVE" ? "Deactivate Account" : "Activate Account"}
                      className="p-2 rounded-lg border border-glass-border text-secondary hover:text-primary"
                    >
                      {acc.status === "ACTIVE" ? <MdToggleOn size={20} className="text-emerald-400" /> : <MdToggleOff size={20} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bank Create/Edit Modal */}
      {bankModal && (
        <ModalShell
          title={bankModal.mode === "create" ? "Add Bank Account" : "Edit Bank Account"}
          subtitle="Opening balance should reflect only the actual available bank balance (exclude FDs)."
          onClose={() => setBankModal(null)}
        >
          <form onSubmit={handleSaveBank} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Account Label *</label>
                <input
                  required
                  style={inputStyle}
                  placeholder="e.g. SBI Maintenance A/C"
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Account Type</label>
                <Select
                  value={bankForm.account_type}
                  onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value })}
                  options={[
                    { value: "SAVINGS", label: "Savings" },
                    { value: "CURRENT", label: "Current" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Bank Name *</label>
                <input
                  required
                  style={inputStyle}
                  placeholder="e.g. State Bank of India"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Account Holder Name *</label>
                <input
                  required
                  style={inputStyle}
                  value={bankForm.account_holder_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Account Number *</label>
                <input
                  required
                  style={inputStyle}
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">IFSC Code *</label>
                <input
                  required
                  style={inputStyle}
                  value={bankForm.ifsc_code}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Branch</label>
                <input
                  style={inputStyle}
                  value={bankForm.branch_name}
                  onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Opening Balance (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  style={inputStyle}
                  value={bankForm.opening_balance}
                  onChange={(e) => setBankForm({ ...bankForm, opening_balance: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Opening Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={bankForm.opening_balance_date}
                  onChange={(e) => setBankForm({ ...bankForm, opening_balance_date: e.target.value })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-primary cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={bankForm.is_default}
                onChange={(e) => setBankForm({ ...bankForm, is_default: e.target.checked })}
              />
              Set as default online collection bank account (for bills & amenities)
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setBankModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save Bank Account"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Cash Opening Balance Modal */}
      {cashModal && (
        <ModalShell title="Configure Cash Account Opening Balance" onClose={() => setCashModal(false)}>
          <form onSubmit={handleSaveCashOpening} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">Opening Cash in Hand (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                style={inputStyle}
                value={cashOpenForm.opening_balance}
                onChange={(e) => setCashOpenForm({ ...cashOpenForm, opening_balance: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">Effective Date</label>
              <input
                type="date"
                required
                style={inputStyle}
                value={cashOpenForm.opening_balance_date}
                onChange={(e) => setCashOpenForm({ ...cashOpenForm, opening_balance_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setCashModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-white">
                {saving ? "Saving..." : "Save Cash Balance"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Cash Received / Adjustment Modal */}
      {cashInModal && (
        <ModalShell title="Record Cash Received / Adjustment" onClose={() => setCashInModal(false)}>
          <form onSubmit={handleRecordCashIn} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Entry Type</label>
                <Select
                  value={cashInForm.source}
                  onChange={(e) =>
                    setCashInForm({
                      ...cashInForm,
                      source: e.target.value,
                      type: e.target.value === "CASH_IN" ? "CREDIT" : cashInForm.type,
                    })
                  }
                  options={[
                    { value: "CASH_IN", label: "Cash Received (Income)" },
                    { value: "ADJUSTMENT", label: "Cash Audit Adjustment" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Credit / Debit</label>
                <Select
                  value={cashInForm.type}
                  disabled={cashInForm.source === "CASH_IN"}
                  onChange={(e) => setCashInForm({ ...cashInForm, type: e.target.value })}
                  options={[
                    { value: "CREDIT", label: "Credit (+)" },
                    { value: "DEBIT", label: "Debit (-)" },
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  style={inputStyle}
                  value={cashInForm.amount}
                  onChange={(e) => setCashInForm({ ...cashInForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={cashInForm.entry_date}
                  onChange={(e) => setCashInForm({ ...cashInForm, entry_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">Description *</label>
              <input
                required
                style={inputStyle}
                placeholder="e.g. Community hall cash booking / scrap sale"
                value={cashInForm.description}
                onChange={(e) => setCashInForm({ ...cashInForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setCashInModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">
                {saving ? "Saving..." : "Record Cash Entry"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Cash <-> Bank Transfer Modal */}
      {transferModal && (
        <ModalShell
          title="Cash / Bank Transfer"
          subtitle="Move funds between Cash and Bank accounts without affecting operational income or expenses."
          onClose={() => setTransferModal(false)}
        >
          <form onSubmit={handleTransfer} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">From Account *</label>
              <Select
                value={transferForm.from_account_id}
                onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                placeholder="Select source account..."
                options={activeAccounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.account_name} (${CURRENCY(a.current_balance)})`,
                }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">To Account *</label>
              <Select
                value={transferForm.to_account_id}
                onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                placeholder="Select destination account..."
                options={activeAccounts
                  .filter((a) => String(a.id) !== String(transferForm.from_account_id))
                  .map((a) => ({
                    value: String(a.id),
                    label: `${a.account_name} (${CURRENCY(a.current_balance)})`,
                  }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  style={inputStyle}
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Transfer Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={transferForm.transfer_date}
                  onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">Remarks</label>
              <input
                style={inputStyle}
                placeholder="e.g. Cash deposited to SBI bank"
                value={transferForm.description}
                onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setTransferModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-white">
                {saving ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
