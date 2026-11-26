import { useEffect, useState, useCallback, useContext } from "react";
import {
  MdEventNote,
  MdAdd,
  MdRefresh,
  MdVisibility,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
  MdCalendarToday,
  MdPerson,
} from "react-icons/md";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Select from "../../components/common/Select";
import CustomDatePicker from "../../components/common/CustomDatePicker";
import Pagination from "../../components/common/Pagination";
import MeetingMinutesFormModal from "../../components/admin/MeetingMinutesFormModal";
import MeetingMinutesDetailModal from "../../components/admin/MeetingMinutesDetailModal";
import { meetingMinutesService } from "../../services/meetingMinutesService";

export default function MeetingMinutes() {
  const { user } = useContext(AuthContext);

  const canCreate = hasPermission(user, "meeting_minutes", "create");
  const canEdit = hasPermission(user, "meeting_minutes", "edit");
  const canDelete = hasPermission(user, "meeting_minutes", "delete");

  const [meetings, setMeetings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listing filters & pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Category Manager Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await meetingMinutesService.listCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch meeting categories:", err);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await meetingMinutesService.listMeetings({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        category_id: categoryFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setMeetings(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch meeting minutes:", err);
      toast.error("Failed to load meeting minutes.");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter, fromDate, toDate]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleOpenCreate = () => {
    setEditingMeeting(null);
    setFormOpen(true);
  };

  const handleOpenEdit = async (meetingRow) => {
    try {
      const res = await meetingMinutesService.getMeetingById(meetingRow.id);
      setEditingMeeting(res.data);
      setFormOpen(true);
    } catch {
      toast.error("Failed to load meeting details for editing.");
    }
  };

  const handleOpenDetail = async (meetingRow) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await meetingMinutesService.getMeetingById(meetingRow.id);
      setDetailMeeting(res.data);
    } catch {
      toast.error("Failed to load meeting details.");
      setDetailMeeting(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await meetingMinutesService.deleteMeeting(deleteTarget.id);
      toast.success("Meeting deleted.");
      setDeleteTarget(null);
      fetchMeetings();
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete meeting.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setCatSaving(true);
      await meetingMinutesService.createCategory({
        name: newCatName.trim(),
      });
      toast.success("Category created.");
      setNewCatName("");
      fetchCategories();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create category.");
    } finally {
      setCatSaving(false);
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    try {
      await meetingMinutesService.updateCategory(cat.id, { is_active: !cat.is_active });
      toast.success(`Category ${cat.is_active ? "deactivated" : "activated"}.`);
      fetchCategories();
    } catch {
      toast.error("Failed to update category.");
    }
  };

  const handleSaved = () => {
    fetchMeetings();
    fetchCategories();
  };

  const hasActiveFilters = Boolean(categoryFilter || fromDate || toDate || search);

  return (
    <div className="page-root animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3.5">
          <div className="ad-page-icon">
            <MdEventNote size={24} />
          </div>
          <div>
            <h2 className="page-title">Meeting Minutes (MOM)</h2>
            <div className="page-subtitle">
              Manage society meetings, agendas, decisions & member attendance
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canCreate && (
            <GlobalButton
              variant="secondary"
              onClick={() => setCatModalOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MdAdd size={17} />
                New Category
              </span>
            </GlobalButton>
          )}
          <GlobalButton
            variant="secondary"
            onClick={fetchMeetings}
            disabled={loading}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <MdRefresh size={16} />
              Refresh
            </span>
          </GlobalButton>
          {canCreate && (
            <GlobalButton
              variant="primary"
              onClick={handleOpenCreate}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MdAdd size={18} />
                New Meeting
              </span>
            </GlobalButton>
          )}
        </div>
      </div>

      {/* Category Dropdown, Date Range & Search Bar */}
      <div
        className="p-3.5 rounded-2xl mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        style={{
          background: "var(--card-bg)",
          border: "1.5px solid var(--glass-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            className="input h-10 text-xs sm:w-52"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.usage_count || 0})
              </option>
            ))}
          </Select>

          <div className="w-44">
            <CustomDatePicker
              value={fromDate}
              onChange={(val) => {
                setFromDate(val);
                setPage(1);
              }}
              placeholder="From date"
            />
          </div>
          <div className="w-44">
            <CustomDatePicker
              value={toDate}
              onChange={(val) => {
                setToDate(val);
                setPage(1);
              }}
              placeholder="To date"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("");
                setFromDate("");
                setToDate("");
                setSearch("");
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              style={{
                background: "rgba(99,102,241,0.1)",
                color: "var(--accent)",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 lg:ml-auto justify-end">
          <ExpandableSearch
            placeholder="Search meeting title or agenda…"
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* Listing / Empty State */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--card-bg)",
          border: "1.5px solid var(--glass-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading meeting minutes…
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--accent)",
                border: "1px solid rgba(99, 102, 241, 0.24)",
              }}
            >
              <MdEventNote size={32} />
            </div>
            <h3 className="text-base font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>
              No Meeting Minutes Found
            </h3>
            <p className="text-sm max-w-md mb-5" style={{ color: "var(--text-secondary)" }}>
              {hasActiveFilters
                ? "No meetings match your selected category, date range, or search query."
                : "Keep organized records of society meetings, agendas, decisions, and member attendance."}
            </p>
            {canCreate && !hasActiveFilters && (
              <GlobalButton variant="primary" onClick={handleOpenCreate}>
                <span className="inline-flex items-center gap-1.5">
                  <MdAdd size={18} />
                  Record First Meeting
                </span>
              </GlobalButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="text-[11px] font-bold uppercase tracking-wider border-b"
                  style={{
                    background: "var(--card-inner-bg)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <th className="py-3.5 px-5">Meeting</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Attendance</th>
                  <th className="py-3.5 px-4">Recorded By</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                {meetings.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {m.meeting_title}
                      </div>
                      <div className="text-xs truncate max-w-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {m.agenda}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background: "rgba(99,102,241,0.12)",
                          color: "#4F46E5",
                          border: "1px solid rgba(99,102,241,0.22)",
                        }}
                      >
                        {m.category?.name || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <MdCalendarToday size={13} />
                        {m.meeting_date}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}
                        >
                          <MdCheckCircle size={13} /> {m.present_count ?? 0}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#DC2626" }}
                        >
                          <MdCancel size={13} /> {m.absent_count ?? 0}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>
                          ({m.total_attendees ?? 0})
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <MdPerson size={14} />
                        {m.creator?.name || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(m)}
                          title="View Details"
                          className="p-2 rounded-xl hover:bg-indigo-500/10 transition-colors"
                          style={{ color: "var(--accent)" }}
                        >
                          <MdVisibility size={18} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit Meeting"
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            style={{ color: "var(--text-primary)" }}
                          >
                            <MdEdit size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            title="Delete Meeting"
                            className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-600 transition-colors"
                          >
                            <MdDelete size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Showing page {page} of {totalPages} ({total} meetings)
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Create / Edit MOM Step Wizard Modal */}
      <MeetingMinutesFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        categories={categories}
        editingMeeting={editingMeeting}
      />

      {/* View Detail Modal */}
      <MeetingMinutesDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        meeting={detailMeeting}
        loading={detailLoading}
      />

      {/* Delete Confirmation */}
      <GlobalConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Meeting Minutes"
        message={`Are you sure you want to delete "${deleteTarget?.meeting_title}"?`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        variant="danger"
      />

      {/* Category Management Modal */}
      <GlobalModal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="Manage Meeting Categories"
        size="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              className="input flex-1 h-10 text-sm"
              placeholder="New category name (e.g. Special General Meeting)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
            <GlobalButton type="submit" variant="primary" disabled={catSaving}>
              {catSaving ? "Adding…" : "Add"}
            </GlobalButton>
          </form>

          <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: "var(--glass-border)" }}>
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2.5 gap-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {cat.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Used in {cat.usage_count || 0} meeting(s)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCategoryActive(cat)}
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: cat.is_active ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
                    color: cat.is_active ? "#059669" : "var(--text-secondary)",
                  }}
                >
                  {cat.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </GlobalModal>
    </div>
  );
}
