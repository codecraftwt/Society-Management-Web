import API from "./api";

export const updateFlat = (flatId, data) =>
  API.put(`/flats/update/${flatId}`, data).then((r) => r.data);

export const bulkUpdateFlats = (flats) =>
  API.put("/flats/bulk-update", { flats }).then((r) => r.data);

export const moveOutResident = (flatId, userId) =>
  API.post("/flat-history/move-out", { flat_id: flatId, user_id: userId }).then(
    (r) => r.data
  );

export default { updateFlat, bulkUpdateFlats, moveOutResident };
