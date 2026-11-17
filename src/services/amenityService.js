import API from "./api";

/**
 * Fetch published rules for residents/users
 * Returns { success, has_rules, ruleset_version, rules }
 */
export async function getPublishedAmenityRules(societyId) {
  const query = societyId ? `?societyId=${encodeURIComponent(societyId)}` : "";
  const res = await API.get(`/amenities/rules/published${query}`);
  return res.data;
}

/**
 * Admin: Fetch all amenity rules for society
 */
export async function getAdminAmenityRules(societyId) {
  const query = societyId && societyId !== "ALL" ? `?societyId=${encodeURIComponent(societyId)}` : "";
  const res = await API.get(`/admin/amenities/rules${query}`);
  return res.data;
}

/**
 * Admin: Create an amenity rule (multipart/form-data for attachments)
 */
export async function createAmenityRule(formData) {
  const res = await API.post("/admin/amenities/rules", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Admin: Update an amenity rule
 */
export async function updateAmenityRule(id, formData) {
  const res = await API.put(`/admin/amenities/rules/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * Admin: Delete an amenity rule
 */
export async function deleteAmenityRule(id) {
  const res = await API.delete(`/admin/amenities/rules/${id}`);
  return res.data;
}

/**
 * Fetch frozen accepted terms snapshot for a specific booking
 */
export async function getBookingAcceptedTerms(bookingId) {
  const res = await API.get(`/amenities/bookings/${bookingId}/accepted-terms`);
  return res.data;
}
