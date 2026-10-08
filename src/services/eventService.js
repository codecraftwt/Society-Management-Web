import API from "./api";

export const getResidentEvents = (params = {}, headers = {}) =>
  API.get("/events", { params, headers }).then((res) => res.data);

export const getAdminEvents = (params = {}, headers = {}) =>
  API.get("/events/admin", { params, headers }).then((res) => res.data);

export const getEventById = (id, headers = {}) =>
  API.get(`/events/${id}`, { headers }).then((res) => res.data);

export const createEvent = (formData, headers = {}) =>
  API.post("/events", formData, {
    headers: { "Content-Type": "multipart/form-data", ...headers },
  }).then((res) => res.data);

export const updateEvent = (id, formData, headers = {}) =>
  API.put(`/events/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...headers },
  }).then((res) => res.data);

export const deleteEvent = (id, headers = {}) =>
  API.delete(`/events/${id}`, { headers }).then((res) => res.data);

const eventService = {
  getResidentEvents,
  getAdminEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};

export default eventService;
