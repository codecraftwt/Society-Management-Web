import API from "./api";

export const updateFlat = (flatId, data) =>
  API.put(`/flats/update/${flatId}`, data).then((r) => r.data);

export const bulkUpdateFlats = (flats) =>
  API.put("/flats/bulk-update", { flats }).then((r) => r.data);

export default { updateFlat, bulkUpdateFlats };
