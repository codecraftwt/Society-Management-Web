import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { MdAdd, MdClose, MdSavings, MdHistory, MdCheckCircle, MdPayments, MdDelete } from "react-icons/md";
import Select from "../common/Select";
import StatCard from "../common/StatCard";
import {
  getFixedDeposits,
  getFixedDepositDetail,
  createFixedDeposit,
  recordFdInterestPayout,
  matureFixedDeposit,
} from "../../services/accountingService";

const CURRENCY = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(v) || 0);

const TODAY = () => new Date().toISOString().slice(0, 10);

function computeExpectedMaturity(principal, rate, startDate, maturityDate, payoutType) {
  const p = Number(principal);
  const r = Number(rate) / 100;
  if (!(p > 0) || !(r >= 0) || !startDate || !maturityDate) return "";
  const ms = new Date(maturityDate).getTime() - new Date(startDate).getTime();
  if (!(ms > 0)) return "";
  const years = ms / (1000 * 60 * 60 * 24 * 365);
  const amount =
    payoutType === "ON_MATURITY" || payoutType === "CUMULATIVE"
      ? p * Math.pow(1 + r / 4, 4 * years)
      : p * (1 + r * years);
  return amount.toFixed(2);
}

const inputStyle = {
  background: "var(--card-inner-bg)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-primary)",
  borderRadius: "10px",
  padding: "0 12px",
  height: "38px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
};

function ModalShell({ title, subtitle, maxWidth = "max-w-xl", icon: Icon, onClose, children }) {
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto p-3 sm:p-4 animate-fadeIn"
      style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1200 }}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl animate-scaleIn my-auto shadow-2xl overflow-hidden`}
        style={{ background: "var(--modal-bg)", border: "1.5px solid var(--glass-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-glass-border">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-primary leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-secondary mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-card-inner-bg transition-colors shrink-0"
          >
            <MdClose size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function FixedDepositsTab({ accounts = [], canEdit = true, onBalanceChanged }) {
  const [fds, setFds] = useState([]);
  const [summary, setSummary] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [matureModal, setMatureModal] = useState(null);
  const [payoutModal, setPayoutModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const activeBankAccounts = accounts.filter((a) => a.account_type !== "CASH" && (a.status === "ACTIVE" || a.is_active));
  const activeAllAccounts = accounts.filter((a) => a.status === "ACTIVE" || a.is_active);
  const cashAccount = activeAllAccounts.find((a) => a.account_type === "CASH");
  const registeredBankNames = Array.from(
    new Set(activeBankAccounts.map((a) => (a.bank_name || a.account_name || "").trim()).filter(Boolean))
  );
  const [bankChoice, setBankChoice] = useState("");

  const [fdForm, setFdForm] = useState({
    fd_type: "EXISTING",
    funding_source: "BANK",
    funding_account_id: "",
    fd_number: "",
    bank_name: "",
    principal_amount: "",
    interest_rate: "",
    start_date: TODAY(),
    maturity_date: "",
    expected_maturity_amount: "",
    interest_payout_type: "ON_MATURITY",
    remarks: "",
  });

  const [matureForm, setMatureForm] = useState({
    closure_type: "MATURITY",
    receiving_account_id: "",
    closed_date: TODAY(),
    principal_returned: "",
    final_interest_received: "0",
    reference_no: "",
    remarks: "",
  });

  const [payoutForm, setPayoutForm] = useState({
    interest_amount: "",
    receiving_account_id: "",
    payout_date: TODAY(),
    reference_no: "",
    remarks: "",
  });

  const loadFds = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "ALL" ? { status: statusFilter } : {};
      const res = await getFixedDeposits(params);
      setFds(res.data || []);
      setSummary(res.summary || {});
    } catch (err) {
      toast.error("Failed to load fixed deposits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFds();
  }, [statusFilter]);

  const selectedFundingAccount =
    fdForm.fd_type === "NEW"
      ? fdForm.funding_source === "CASH"
        ? cashAccount
        : activeBankAccounts.find((a) => String(a.id) === String(fdForm.funding_account_id))
      : null;

  const insufficientFunding =
    fdForm.fd_type === "NEW" &&
    selectedFundingAccount &&
    Number(fdForm.principal_amount) > Number(selectedFundingAccount.current_balance || 0);

  const handleCreateFd = async (e) => {
    e.preventDefault();
    if (insufficientFunding) {
      toast.error(
        `Principal amount cannot exceed current balance (${CURRENCY(selectedFundingAccount.current_balance)}) of ${selectedFundingAccount.account_name}.`
      );
      return;
    }
    try {
      setSaving(true);
      await createFixedDeposit(fdForm);
      toast.success(fdForm.fd_type === "EXISTING" ? "Existing FD registered." : "New FD created & funded.");
      setCreateOpen(false);
      loadFds();
      onBalanceChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create FD.");
    } finally {
      setSaving(false);
    }
  };

  const handleMatureFd = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await matureFixedDeposit(matureModal.id, matureForm);
      toast.success("FD closed and payout credited.");
      setMatureModal(null);
      loadFds();
      onBalanceChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to close FD.");
    } finally {
      setSaving(false);
    }
  };

  const handleInterestPayout = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await recordFdInterestPayout(payoutModal.id, payoutForm);
      toast.success("FD interest payout recorded.");
      setPayoutModal(null);
      loadFds();
      onBalanceChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record interest payout.");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (fd) => {
    try {
      const detail = await getFixedDepositDetail(fd.id);
      setDetailModal(detail);
    } catch {
      toast.error("Failed to load FD history.");
    }
  };

  const lossPreview = matureModal
    ? Math.max(0, Number(matureModal.principal_amount || 0) - Number(matureForm.principal_returned || 0))
    : 0;
  const totalCreditPreview =
    Number(matureForm.principal_returned || 0) + Number(matureForm.final_interest_received || 0);

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">Fixed Deposits (FD)</h2>
          <p className="text-xs text-secondary">
            Register Existing FDs (opening assets without bank deduction) or create New FDs funded from Bank/Cash.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setFdForm({
                fd_type: "EXISTING",
                funding_source: "BANK",
                funding_account_id: activeBankAccounts[0] ? String(activeBankAccounts[0].id) : "",
                fd_number: "",
                bank_name: "",
                principal_amount: "",
                interest_rate: "",
                start_date: TODAY(),
                maturity_date: "",
                expected_maturity_amount: "",
                interest_payout_type: "ON_MATURITY",
                remarks: "",
              });
              setCreateOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-white flex items-center gap-1.5"
          >
            <MdAdd size={16} /> Add Fixed Deposit
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          variant="base"
          tone="info"
          value={CURRENCY(summary.active_principal)}
          label="Active FD Investment"
          icon={MdSavings}
          description={`${summary.active_count || 0} active FDs`}
        />
        <StatCard
          variant="base"
          tone="success"
          value={CURRENCY(summary.total_interest_earned)}
          label="Total Interest Earned"
          icon={MdPayments}
        />
        <StatCard
          variant="base"
          tone="neutral"
          value={summary.matured_count || 0}
          label="Matured / Closed"
          icon={MdHistory}
        />
        <StatCard
          variant="base"
          tone="danger"
          value={CURRENCY(summary.total_loss)}
          label="Premature Closure Loss"
          icon={MdDelete}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "ACTIVE", "MATURED", "PREMATURE_CLOSED"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
              statusFilter === st
                ? "bg-accent text-white border-accent"
                : "border-glass-border text-secondary hover:text-primary"
            }`}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* FD Table */}
      <div className="rounded-2xl border border-glass-border bg-card/40 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-glass-border text-xs uppercase text-secondary">
              <th className="py-3 px-4">FD # / Bank</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Principal</th>
              <th className="py-3 px-4">Rate</th>
              <th className="py-3 px-4">Maturity</th>
              <th className="py-3 px-4">Expected</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-secondary">Loading fixed deposits...</td>
              </tr>
            ) : fds.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-secondary">No fixed deposits found.</td>
              </tr>
            ) : (
              fds.map((fd) => (
                <tr key={fd.id} className="border-b border-glass-border/60 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <p className="font-bold text-primary">{fd.fd_number}</p>
                    <p className="text-xs text-secondary">{fd.bank_name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        fd.fd_type === "EXISTING"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-sky-500/15 text-sky-400"
                      }`}
                    >
                      {fd.fd_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-primary">{CURRENCY(fd.principal_amount)}</td>
                  <td className="py-3 px-4 text-secondary">{fd.interest_rate}%</td>
                  <td className="py-3 px-4 text-xs text-secondary">
                    <div>{fd.maturity_date}</div>
                    <div className="opacity-70">Start: {fd.start_date}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-primary">{CURRENCY(fd.expected_maturity_amount)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        fd.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : fd.status === "PREMATURE_CLOSED"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-indigo-500/15 text-indigo-400"
                      }`}
                    >
                      {fd.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openDetail(fd)}
                      title="FD History"
                      className="p-1.5 rounded-lg border border-glass-border text-secondary hover:text-primary"
                    >
                      <MdHistory size={16} />
                    </button>
                    {canEdit && fd.status === "ACTIVE" && (
                      <>
                        {!["ON_MATURITY", "CUMULATIVE"].includes(fd.interest_payout_type) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayoutForm({
                              interest_amount: "",
                              receiving_account_id: activeBankAccounts[0] ? String(activeBankAccounts[0].id) : "",
                              payout_date: TODAY(),
                              reference_no: "",
                              remarks: "",
                            });
                            setPayoutModal(fd);
                          }}
                          title="Record Interest Payout"
                          className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15"
                        >
                          <MdPayments size={16} />
                        </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMatureForm({
                              closure_type: "MATURITY",
                              receiving_account_id: activeBankAccounts[0] ? String(activeBankAccounts[0].id) : "",
                              closed_date: TODAY(),
                              principal_returned: String(fd.principal_amount),
                              final_interest_received: "0",
                              reference_no: "",
                              remarks: "",
                            });
                            setMatureModal(fd);
                          }}
                          title="Mature / Close FD"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                        >
                          Mature / Close
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create FD Modal */}
      {createOpen && (
        <ModalShell
          title="Add Fixed Deposit"
          subtitle={
            fdForm.fd_type === "EXISTING"
              ? "Register an existing FD as an asset (no bank/cash deduction)."
              : "Create a new FD and deduct principal from the selected account."
          }
          maxWidth="max-w-2xl"
          icon={MdSavings}
          onClose={() => setCreateOpen(false)}
        >
          <form onSubmit={handleCreateFd} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-card-inner-bg border border-glass-border">
              {[
                { key: "EXISTING", label: "Existing FD (Opening Asset)" },
                { key: "NEW", label: "New FD (Fund from Account)" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    const next = { ...fdForm, fd_type: opt.key };
                    if (opt.key === "NEW" && next.funding_source === "BANK") {
                      const selBank = activeBankAccounts.find((a) => String(a.id) === String(next.funding_account_id)) || activeBankAccounts[0];
                      if (selBank) {
                        next.funding_account_id = String(selBank.id);
                        next.bank_name = selBank.bank_name || selBank.account_name || "";
                        setBankChoice(next.bank_name);
                      }
                    }
                    setFdForm(next);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition ${
                    fdForm.fd_type === opt.key ? "bg-accent text-white" : "text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {fdForm.fd_type === "NEW" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-xl border border-sky-500/25 bg-sky-500/5">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Funding Source *</label>
                  <Select
                    value={fdForm.funding_source}
                    onChange={(e) => setFdForm({ ...fdForm, funding_source: e.target.value })}
                    options={[
                      { value: "BANK", label: "Bank Account" },
                      { value: "CASH", label: "Cash Account" },
                    ]}
                  />
                </div>
                {fdForm.funding_source === "BANK" && (
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">Source Bank Account *</label>
                    <Select
                      value={fdForm.funding_account_id}
                      onChange={(e) => {
                        const accId = e.target.value;
                        const selBank = activeBankAccounts.find((a) => String(a.id) === String(accId));
                        const resolvedBank = selBank ? selBank.bank_name || selBank.account_name || "" : "";
                        setBankChoice(resolvedBank);
                        setFdForm({ ...fdForm, funding_account_id: accId, bank_name: resolvedBank });
                      }}
                      placeholder="Select bank..."
                      options={activeBankAccounts.map((a) => ({
                        value: String(a.id),
                        label: `${a.account_name} (${CURRENCY(a.current_balance)})`,
                      }))}
                    />
                  </div>
                )}
              </div>
            )}

            <div className={`grid gap-3 ${fdForm.fd_type === "NEW" && fdForm.funding_source === "BANK" ? "grid-cols-1" : "grid-cols-2"}`}>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">FD Number *</label>
                <input
                  required
                  style={inputStyle}
                  value={fdForm.fd_number}
                  onChange={(e) => setFdForm({ ...fdForm, fd_number: e.target.value })}
                />
              </div>
              {!(fdForm.fd_type === "NEW" && fdForm.funding_source === "BANK") && (
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">
                  Bank Name {fdForm.fd_type === "EXISTING" ? "*" : "(Optional)"}
                </label>
                <Select
                  required={fdForm.fd_type === "EXISTING"}
                  style={inputStyle}
                  placeholder="Select registered bank..."
                  value={bankChoice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBankChoice(val);
                    setFdForm({ ...fdForm, bank_name: val === "__OTHER__" ? "" : val });
                  }}
                  options={[
                    ...registeredBankNames.map((name) => ({ value: name, label: name })),
                    { value: "__OTHER__", label: "Other (Enter Bank Name)" },
                  ]}
                />
                {bankChoice === "__OTHER__" && (
                  <input
                    required={fdForm.fd_type === "EXISTING"}
                    style={{ ...inputStyle, marginTop: 8 }}
                    placeholder="Enter bank name"
                    value={fdForm.bank_name}
                    onChange={(e) => setFdForm({ ...fdForm, bank_name: e.target.value })}
                  />
                )}
              </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Principal (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  style={inputStyle}
                  value={fdForm.principal_amount}
                  onChange={(e) => {
                    const next = { ...fdForm, principal_amount: e.target.value };
                    next.expected_maturity_amount = computeExpectedMaturity(
                      next.principal_amount,
                      next.interest_rate,
                      next.start_date,
                      next.maturity_date,
                      next.interest_payout_type
                    );
                    setFdForm(next);
                  }}
                />
                {insufficientFunding && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1">
                    Exceeds current balance ({CURRENCY(selectedFundingAccount.current_balance)}) in {selectedFundingAccount.account_name}.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Interest % *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  style={inputStyle}
                  value={fdForm.interest_rate}
                  onChange={(e) => {
                    const next = { ...fdForm, interest_rate: e.target.value };
                    next.expected_maturity_amount = computeExpectedMaturity(
                      next.principal_amount,
                      next.interest_rate,
                      next.start_date,
                      next.maturity_date,
                      next.interest_payout_type
                    );
                    setFdForm(next);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={fdForm.start_date}
                  onChange={(e) => {
                    const next = { ...fdForm, start_date: e.target.value };
                    next.expected_maturity_amount = computeExpectedMaturity(
                      next.principal_amount,
                      next.interest_rate,
                      next.start_date,
                      next.maturity_date,
                      next.interest_payout_type
                    );
                    setFdForm(next);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Maturity Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={fdForm.maturity_date}
                  onChange={(e) => {
                    const next = { ...fdForm, maturity_date: e.target.value };
                    next.expected_maturity_amount = computeExpectedMaturity(
                      next.principal_amount,
                      next.interest_rate,
                      next.start_date,
                      next.maturity_date,
                      next.interest_payout_type
                    );
                    setFdForm(next);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Payout Type</label>
                <Select
                  value={fdForm.interest_payout_type}
                  onChange={(e) => {
                    const next = { ...fdForm, interest_payout_type: e.target.value };
                    next.expected_maturity_amount = computeExpectedMaturity(
                      next.principal_amount,
                      next.interest_rate,
                      next.start_date,
                      next.maturity_date,
                      next.interest_payout_type
                    );
                    setFdForm(next);
                  }}
                  options={[
                    { value: "ON_MATURITY", label: "On Maturity" },
                    { value: "CUMULATIVE", label: "Cumulative" },
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "QUARTERLY", label: "Quarterly" },
                    { value: "YEARLY", label: "Yearly" },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">Remarks</label>
              <input
                style={inputStyle}
                value={fdForm.remarks}
                onChange={(e) => setFdForm({ ...fdForm, remarks: e.target.value })}
              />
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <p className="text-xs font-bold text-primary">
                  Expected Maturity Amount (₹)
                </p>
                <p className="text-[11px] text-secondary mt-0.5">
                  {Number(fdForm.expected_maturity_amount) > 0 && Number(fdForm.principal_amount) > 0
                    ? `Est. Interest: +${CURRENCY(Math.max(0, Number(fdForm.expected_maturity_amount) - Number(fdForm.principal_amount)))}`
                    : "Auto-calculated from Principal, Rate & Dates"}
                </p>
              </div>
              <div className="relative sm:w-52 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={{ ...inputStyle, paddingLeft: 26, fontWeight: 700 }}
                  placeholder="0.00"
                  value={fdForm.expected_maturity_amount}
                  onChange={(e) => setFdForm({ ...fdForm, expected_maturity_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving || insufficientFunding} className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-white disabled:opacity-50">
                {saving ? "Saving..." : fdForm.fd_type === "EXISTING" ? "Register Existing FD" : "Create & Fund FD"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Mature / Premature Closure Modal */}
      {matureModal && (
        <ModalShell
          title={`Close FD ${matureModal.fd_number}`}
          subtitle={`Original Principal: ${CURRENCY(matureModal.principal_amount)} · Prior Interest Paid: ${CURRENCY(matureModal.total_interest_paid)}`}
          onClose={() => setMatureModal(null)}
        >
          <form onSubmit={handleMatureFd} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Closure Type</label>
                <Select
                  value={matureForm.closure_type}
                  onChange={(e) => setMatureForm({ ...matureForm, closure_type: e.target.value })}
                  options={[
                    { value: "MATURITY", label: "Normal Maturity" },
                    { value: "PREMATURE_CLOSURE", label: "Premature Closure" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Receiving Account *</label>
                <Select
                  value={matureForm.receiving_account_id}
                  onChange={(e) => setMatureForm({ ...matureForm, receiving_account_id: e.target.value })}
                  options={activeAllAccounts.map((a) => ({
                    value: String(a.id),
                    label: `${a.account_name} (${a.account_type})`,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Principal Returned *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={matureModal.principal_amount}
                  required
                  style={inputStyle}
                  value={matureForm.principal_returned}
                  onChange={(e) => setMatureForm({ ...matureForm, principal_returned: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Final Interest *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  style={inputStyle}
                  value={matureForm.final_interest_received}
                  onChange={(e) => setMatureForm({ ...matureForm, final_interest_received: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Closure Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={matureForm.closed_date}
                  onChange={(e) => setMatureForm({ ...matureForm, closed_date: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card-inner-bg border border-glass-border flex items-center justify-between text-xs">
              <span>Total Credited to Account: <strong className="text-emerald-400">{CURRENCY(totalCreditPreview)}</strong></span>
              {lossPreview > 0 && (
                <span>Premature Loss: <strong className="text-rose-400">{CURRENCY(lossPreview)}</strong></span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setMatureModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white">
                {saving ? "Processing..." : "Confirm & Credit Account"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Periodic Interest Payout Modal */}
      {payoutModal && (
        <ModalShell title={`Record Interest Payout — ${payoutModal.fd_number}`} onClose={() => setPayoutModal(null)}>
          <form onSubmit={handleInterestPayout} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Interest Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  style={inputStyle}
                  value={payoutForm.interest_amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, interest_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Payout Date *</label>
                <input
                  type="date"
                  required
                  style={inputStyle}
                  value={payoutForm.payout_date}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payout_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1">Receiving Account *</label>
              <Select
                value={payoutForm.receiving_account_id}
                onChange={(e) => setPayoutForm({ ...payoutForm, receiving_account_id: e.target.value })}
                options={activeAllAccounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.account_name} (${a.account_type})`,
                }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-glass-border">
              <button type="button" onClick={() => setPayoutModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass-border text-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">
                {saving ? "Saving..." : "Record Payout"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* FD Transaction History Modal */}
      {detailModal && (
        <ModalShell
          title={`FD ${detailModal.fd_number} — History`}
          subtitle={`${detailModal.bank_name} · ${detailModal.fd_type} · Status: ${detailModal.status}`}
          onClose={() => setDetailModal(null)}
        >
          <div className="space-y-3">
            {(detailModal.transactions || []).length === 0 ? (
              <p className="text-xs text-secondary text-center py-4">No transactions recorded.</p>
            ) : (
              detailModal.transactions.map((txn) => (
                <div key={txn.id} className="p-3 rounded-xl border border-glass-border bg-card-inner-bg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{txn.transaction_type.replace("_", " ")}</span>
                    <span className="text-secondary">{txn.transaction_date}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-secondary">
                    <span>Tx Amount: <strong className="text-primary">{CURRENCY(txn.transaction_amount)}</strong></span>
                    <span>Principal: <strong>{CURRENCY(txn.principal_amount)}</strong></span>
                    {Number(txn.interest_amount) > 0 && (
                      <span>Interest: <strong className="text-emerald-400">{CURRENCY(txn.interest_amount)}</strong></span>
                    )}
                    {Number(txn.loss_amount) > 0 && (
                      <span>Loss: <strong className="text-rose-400">{CURRENCY(txn.loss_amount)}</strong></span>
                    )}
                  </div>
                  {txn.financialAccount && (
                    <p className="text-secondary">Account: {txn.financialAccount.account_name}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
