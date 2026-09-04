import API from "./api";

/* Maintenance configuration (rates) */
export const getMaintenanceConfigs = () =>
  API.get("/maintenance/config").then((r) => r.data);

export const saveMaintenanceConfig = (payload) =>
  API.post("/maintenance/config", payload).then((r) => r.data);

export const deleteMaintenanceConfig = (id) =>
  API.delete(`/maintenance/config/${id}`).then((r) => r.data);

export const getMaintenanceFlatTypes = () =>
  API.get("/maintenance/flat-types").then((r) => r.data.flat_types || []);

/* Bill generation */
export const generateMaintenanceBills = (payload) =>
  API.post("/maintenance/generate", payload).then((r) => r.data);

/* Generated maintenance bills */
export const getMaintenanceBills = (params) =>
  API.get("/maintenance/bills", { params }).then((r) => r.data);

export const getMaintenanceBillDetail = (id) =>
  API.get(`/maintenance/bills/${id}`).then((r) => r.data);

export default {
  getMaintenanceConfigs,
  saveMaintenanceConfig,
  deleteMaintenanceConfig,
  getMaintenanceFlatTypes,
  generateMaintenanceBills,
  getMaintenanceBills,
  getMaintenanceBillDetail,
};
