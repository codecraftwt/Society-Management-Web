import API from "./api";

const unwrapData = (res) => res.data?.data ?? res.data;

export const getBalance = () => API.get("/account/balance").then(unwrapData);

export const getLedger = (params = {}) => API.get("/account/ledger", { params }).then((res) => res.data);

export const getChartData = (params = {}) => API.get("/account/chart", { params }).then(unwrapData);

export const setOpeningBalance = (payload) =>
  API.put("/account/opening-balance", payload).then((res) => res.data);

export const getAuditLogs = (params = {}) => API.get("/account/audit-logs", { params }).then((res) => res.data);

export const getExpenses = (params = {}) => API.get("/expenses", { params }).then((res) => res.data);

export const getExpense = (id) => API.get(`/expenses/${id}`).then(unwrapData);

export const createExpense = (payload) => API.post("/expenses", payload).then((res) => res.data);

export const updateExpense = (id, payload) => API.put(`/expenses/${id}`, payload).then((res) => res.data);

export const voidExpense = (id, reason) =>
  API.delete(`/expenses/${id}`, { data: { reason } }).then((res) => res.data);

export const getSocietiesOverview = () => API.get("/account/societies").then(unwrapData);

export const getPaymentsList = (params = {}) => API.get("/accountant/payments", { params }).then((res) => res.data);

export const confirmBillPayment = (billId) => API.put(`/bills/confirm/${billId}`).then((res) => res.data);

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
};

export default accountingService;