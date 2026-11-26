import API from "./api";

const unwrapData = (res) => res.data?.data ?? res.data;

export const getBalance = (params = {}) => API.get("/account/balance", { params }).then(unwrapData);

export const getLedger = (params = {}) => API.get("/account/ledger", { params }).then((res) => res.data);

export const getChartData = (params = {}) => API.get("/account/chart", { params }).then(unwrapData);

export const setOpeningBalance = (payload) =>
  API.put("/account/opening-balance", payload).then((res) => res.data);

export const getAuditLogs = (params = {}) => API.get("/account/audit-logs", { params }).then((res) => res.data);

export const getExpenses = (params = {}) => API.get("/expenses", { params }).then((res) => res.data);

export const getExpense = (id) => API.get(`/expenses/${id}`).then(unwrapData);

const expenseBody = (payload) => {
  if (!(payload?.receipt instanceof File) && !payload?.remove_receipt) return payload;
  const body = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (key === "receipt") {
      if (value) body.append("receipt", value);
    } else if (value !== undefined && value !== null) {
      body.append(key, String(value));
    }
  });
  return body;
};

export const createExpense = (payload) => API.post("/expenses", expenseBody(payload)).then((res) => res.data);

export const updateExpense = (id, payload) => API.put(`/expenses/${id}`, expenseBody(payload)).then((res) => res.data);

export const voidExpense = (id, reason) =>
  API.delete(`/expenses/${id}`, { data: { reason } }).then((res) => res.data);

export const getSocietiesOverview = () => API.get("/account/societies").then(unwrapData);

export const getPaymentsList = (params = {}) => API.get("/accountant/payments", { params }).then((res) => res.data);

export const confirmBillPayment = (billId, payload = {}) =>
  API.put(`/bills/confirm/${billId}`, payload).then((res) => res.data);

export const confirmPaymentRecord = (paymentId, payload = {}) =>
  API.put(`/accountant/payments/${paymentId}/confirm`, payload).then((res) => res.data);

/* ── Financial Accounts (Bank + Cash) ───────────────────────────────────── */
export const getFinancialAccounts = (params = {}) =>
  API.get("/financial-accounts", { params }).then(unwrapData);

export const createFinancialAccount = (payload) =>
  API.post("/financial-accounts", payload).then((res) => res.data);

export const updateFinancialAccount = (id, payload) =>
  API.put(`/financial-accounts/${id}`, payload).then((res) => res.data);

export const toggleFinancialAccountStatus = (id, status) =>
  API.patch(`/financial-accounts/${id}/status`, { status }).then((res) => res.data);

export const recordCashEntry = (payload) =>
  API.post("/financial-accounts/cash-entry", payload).then((res) => res.data);

export const transferBetweenAccounts = (payload) =>
  API.post("/financial-accounts/transfer", payload).then((res) => res.data);

export const reconcileFinancialAccounts = () =>
  API.get("/financial-accounts/reconcile").then(unwrapData);

/* ── Expense Categories ─────────────────────────────────────────────────── */
export const getExpenseCategories = (params = {}) =>
  API.get("/expense-categories", { params }).then(unwrapData);

export const createExpenseCategory = (payload) =>
  API.post("/expense-categories", payload).then((res) => res.data);

export const updateExpenseCategory = (id, payload) =>
  API.put(`/expense-categories/${id}`, payload).then((res) => res.data);

export const deleteExpenseCategory = (id) =>
  API.delete(`/expense-categories/${id}`).then((res) => res.data);

/* ── Fixed Deposits (Existing & New) ────────────────────────────────────── */
export const getFixedDeposits = (params = {}) =>
  API.get("/fixed-deposits", { params }).then((res) => res.data);

export const getFixedDepositDetail = (id) =>
  API.get(`/fixed-deposits/${id}`).then(unwrapData);

export const createFixedDeposit = (payload) =>
  API.post("/fixed-deposits", payload).then((res) => res.data);

export const updateFixedDeposit = (id, payload) =>
  API.put(`/fixed-deposits/${id}`, payload).then((res) => res.data);

export const recordFdInterestPayout = (id, payload) =>
  API.post(`/fixed-deposits/${id}/interest-payout`, payload).then((res) => res.data);

export const matureFixedDeposit = (id, payload) =>
  API.post(`/fixed-deposits/${id}/mature`, payload).then((res) => res.data);

const accountingService = {
  getBalance,
  getLedger,
  getChartData,
  setOpeningBalance,
  getAuditLogs,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  voidExpense,
  getSocietiesOverview,
  getPaymentsList,
  confirmBillPayment,
  confirmPaymentRecord,
  getFinancialAccounts,
  createFinancialAccount,
  updateFinancialAccount,
  toggleFinancialAccountStatus,
  recordCashEntry,
  transferBetweenAccounts,
  reconcileFinancialAccounts,
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getFixedDeposits,
  getFixedDepositDetail,
  createFixedDeposit,
  updateFixedDeposit,
  recordFdInterestPayout,
  matureFixedDeposit,
};

export default accountingService;
