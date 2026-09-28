// Re-export the shared SuperAdmin expense report so the society-admin route
// renders the same component. Tenant scoping happens server-side: a
// non-SUPER_ADMIN request is pinned to its own society by the API, and the
// component hides the society picker for those roles.
export { default } from "../../SuperAdmin/reports/ExpenseReport.jsx";
