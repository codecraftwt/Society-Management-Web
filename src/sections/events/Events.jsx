import React, { useState, useEffect, useCallback, useContext } from "react";
import { MdAdd, MdRefresh, MdImage, MdVideoLibrary, MdEdit, MdDelete, MdVisibility, MdApartment } from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import API from "../../services/api";
import Select from "../../components/common/Select";
import eventService from "../../services/eventService";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import PanelHero from "../../components/common/PanelHero";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Pagination from "../../components/common/Pagination";
import MediaLightbox from "../../components/common/MediaLightbox";
import EventForm from "./EventForm";
import "./Event.css";

export default function Events() {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0, limit: 10 });

  /* Super Admin Society Filter */
  const [filterSocietyId, setFilterSocietyId] = useState(
    localStorage.getItem("superadmin_society_filter") || ""
  );
  const [societiesList, setSocietiesList] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies")
        .then((res) => {
          const d = res.data;
          const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.societies) ? d.societies : [];
          setSocietiesList(list);
        })
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: "", loading: false });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState([]);
  const [lightboxTitle, setLightboxTitle] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const headers = (isSuperAdmin && filterSocietyId && filterSocietyId !== "ALL")
        ? { "x-society-id": filterSocietyId }
        : {};
      const params = {
        page,
        limit: 10,
        search,
        ...(filterSocietyId && filterSocietyId !== "ALL" ? { society_id: filterSocietyId } : {}),
      };
      const res = await eventService.getAdminEvents(params, headers);
      if (res.success) {
        setEvents(res.data || []);
        setPagination(res.pagination || { currentPage: 1, totalPages: 1, total: 0, limit: 10 });
      }
    } catch (err) {
      console.error("Failed to fetch admin events:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterSocietyId, isSuperAdmin]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = async (eventObj) => {
    try {
      const detailRes = await eventService.getEventById(eventObj.id);
      if (detailRes.success) {
        setEditingEvent(detailRes.data);
      } else {
        setEditingEvent(eventObj);
      }
    } catch (err) {
      setEditingEvent(eventObj);
    }
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (formData, customHeaders = {}) => {
    setFormLoading(true);
    try {
      const headers = {
        ...(isSuperAdmin && filterSocietyId && filterSocietyId !== "ALL" ? { "x-society-id": filterSocietyId } : {}),
        ...customHeaders,
      };
      if (editingEvent?.id) {
        await eventService.updateEvent(editingEvent.id, formData, headers);
      } else {
        await eventService.createEvent(formData, headers);
      }
      setFormModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error("Failed to save event:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (eventObj) => {
    setDeleteConfirm({ isOpen: true, id: eventObj.id, title: eventObj.title, loading: false });
  };

  const handleDeleteConfirm = async () => {
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await eventService.deleteEvent(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, title: "", loading: false });
      fetchEvents();
    } catch (err) {
      console.error("Failed to delete event:", err);
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleOpenMediaPreview = async (eventId) => {
    try {
      const detail = await eventService.getEventById(eventId);
      if (detail.success && detail.data?.media?.length > 0) {
        setLightboxMedia(detail.data.media);
        setLightboxTitle(detail.data.title || detail.data.event_title || "event_media");
        setLightboxOpen(true);
      }
    } catch (err) {
      console.error("Failed to open media preview:", err);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Title & Venue",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {row.cover_url ? (
            <img
              src={row.cover_url}
              alt={row.title}
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--glass-border)" }}
            />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--card-inner-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MdImage size={20} color="var(--text-tertiary)" />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{row.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{row.location || "No venue specified"}</div>
          </div>
        </div>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "society",
            header: "Society",
            render: (row) => {
              const socName =
                row.society_name ||
                row.society?.name ||
                societiesList.find((s) => String(s.id) === String(row.society_id))?.name ||
                (row.society_id ? `Society #${row.society_id}` : "—");
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MdApartment size={15} style={{ color: "var(--accent, #6366f1)", flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-primary)" }}>
                    {socName}
                  </span>
                </div>
              );
            },
          },
        ]
      : []),
    {
      key: "event_date",
      header: "Date & Time",
      render: (row) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.event_date || "TBD"}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{row.event_time || ""}</div>
        </div>
      ),
    },
    {
      key: "media",
      header: "Media",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="event-media-badge" title="Photos">
            <MdImage size={12} /> {row.photo_count || 0}
          </span>
          <span className="event-media-badge" title="Videos">
            <MdVideoLibrary size={12} /> {row.video_count || 0}
          </span>
          {(row.photo_count > 0 || row.video_count > 0) && (
            <button
              onClick={() => handleOpenMediaPreview(row.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center", marginLeft: 4 }}
              title="Preview Media"
            >
              <MdVisibility size={16} />
            </button>
          )}
        </div>
      ),
    },
    {
      key: "created_by",
      header: "Created By",
      render: (row) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.created_by_name || "—"}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>{row.created_by_role || ""}</div>
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) => (
        <GlobalBadge variant={row.is_active ? "success" : "neutral"}>
          {row.is_active ? "Published" : "Hidden"}
        </GlobalBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          <GlobalButton variant="secondary" size="sm" icon={MdEdit} onClick={() => handleOpenEdit(row)}>
            Edit
          </GlobalButton>
          <GlobalButton variant="danger" size="sm" icon={MdDelete} onClick={() => handleOpenDelete(row)}>
            Delete
          </GlobalButton>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PanelHero
        title="Event Management"
        subtitle="Organize, schedule, and showcase society events with photo galleries and video highlights."
        icon={MdVideoLibrary}
        actions={
          <GlobalButton variant="primary" icon={MdAdd} onClick={handleOpenCreate}>
            Create Event
          </GlobalButton>
        }
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <ExpandableSearch
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search events by title or location..."
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {isSuperAdmin && (
            <Select
              className="input"
              style={{ minWidth: 160, height: 38, padding: "6px 12px", borderRadius: 10, fontSize: 13 }}
              value={filterSocietyId}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSocietyId(val);
                localStorage.setItem("superadmin_society_filter", val || "ALL");
                setPage(1);
              }}
            >
              <option value="">All Societies</option>
              {societiesList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          )}
          <GlobalButton variant="secondary" icon={MdRefresh} onClick={fetchEvents} loading={loading}>
            Refresh
          </GlobalButton>
          <GlobalButton variant="primary" icon={MdAdd} onClick={handleOpenCreate}>
            Create Event
          </GlobalButton>
        </div>
      </div>

      <GlobalTable
        columns={columns}
        data={events}
        loading={loading}
        emptyMessage="No society events found."
        emptySubtext="Get started by publishing your first society event with photo galleries and video highlights."
        emptyIcon={MdVideoLibrary}
        emptyAction={
          <GlobalButton variant="primary" icon={MdAdd} onClick={handleOpenCreate}>
            Create Event
          </GlobalButton>
        }
      />

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Form Modal */}
      <GlobalModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingEvent ? "Edit Society Event" : "Create New Event"}
        size="lg"
      >
        <EventForm
          initialData={editingEvent}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormModalOpen(false)}
          loading={formLoading}
        />
      </GlobalModal>

      {/* Confirm Delete */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: "", loading: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Society Event"
        message={`Are you sure you want to delete "${deleteConfirm.title}"? All attached photos and videos will be deleted from Cloudinary.`}
        variant="danger"
        loading={deleteConfirm.loading}
      />

      {/* Media Lightbox */}
      <MediaLightbox
        isOpen={lightboxOpen}
        mediaList={lightboxMedia}
        downloadName={lightboxTitle}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
