import React, { useState, useEffect, useCallback } from "react";
import {
  MdCalendarToday,
  MdLocationOn,
  MdAccessTime,
  MdImage,
  MdVideoLibrary,
  MdRefresh,
  MdChevronRight,
  MdEventAvailable,
} from "react-icons/md";
import eventService from "../../services/eventService";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import Pagination from "../../components/common/Pagination";
import MediaLightbox from "../../components/common/MediaLightbox";
import PanelHero from "../../components/common/PanelHero";
import RecordCard from "../../components/common/RecordCard";
import { useLang } from "../../context/LanguageContext";

export default function ResidentEvents() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0, limit: 9 });

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.getResidentEvents({
        page,
        limit: 9,
        search,
        upcoming: upcomingOnly,
      });
      if (res.success) {
        setEvents(res.data || []);
        setPagination(res.pagination || { currentPage: 1, totalPages: 1, total: 0, limit: 9 });
      }
    } catch (err) {
      console.error("Failed to fetch resident events:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, upcomingOnly]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenDetail = async (eventId) => {
    setDetailLoading(true);
    try {
      const res = await eventService.getEventById(eventId);
      if (res.success) {
        setSelectedEvent(res.data);
      }
    } catch (err) {
      console.error("Failed to load event details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenLightbox = (mediaArray, index) => {
    setLightboxMedia(mediaArray);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PanelHero
        title={t("events", "Society Events")}
        subtitle="Explore upcoming society celebrations, community workshops, and video highlights."
        icon={MdEventAvailable}
      />

      {/* Filter Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              setUpcomingOnly(false);
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid var(--glass-border)",
              background: !upcomingOnly ? "var(--accent)" : "var(--card-inner-bg)",
              color: !upcomingOnly ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            All Events
          </button>
          <button
            onClick={() => {
              setUpcomingOnly(true);
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid var(--glass-border)",
              background: upcomingOnly ? "var(--accent)" : "var(--card-inner-bg)",
              color: upcomingOnly ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            Upcoming Only
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExpandableSearch
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search events..."
          />
          <GlobalButton variant="secondary" icon={MdRefresh} onClick={fetchEvents} loading={loading}>
            Refresh
          </GlobalButton>
        </div>
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading society events...</div>
      ) : events.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", background: "var(--card-inner-bg)", borderRadius: 12, border: "1px solid var(--glass-border)" }}>
          No society events found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {events.map((evt) => (
            <div
              key={evt.id}
              onClick={() => handleOpenDetail(evt.id)}
              style={{
                borderRadius: 16,
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                display: "flex",
                flexDirection: "column",
              }}
              className="hover:scale-[1.02] hover:shadow-lg"
            >
              {/* Cover Media */}
              <div style={{ position: "relative", width: "100%", height: 160, background: "#1a1a2e" }}>
                {evt.cover_url ? (
                  <img src={evt.cover_url} alt={evt.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MdEventAvailable size={40} color="var(--text-tertiary)" />
                  </div>
                )}

                {/* Media Counter Badges */}
                <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
                  {evt.photo_count > 0 && (
                    <span style={{ padding: "3px 8px", borderRadius: 12, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 11, fontWeight: 700, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 4 }}>
                      <MdImage size={12} /> {evt.photo_count}
                    </span>
                  )}
                  {evt.video_count > 0 && (
                    <span style={{ padding: "3px 8px", borderRadius: 12, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 11, fontWeight: 700, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 4 }}>
                      <MdVideoLibrary size={12} /> {evt.video_count}
                    </span>
                  )}
                </div>
              </div>

              {/* Event Info Body */}
              <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{evt.title}</h3>
                  {evt.description && (
                    <p style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5, marginBottom: 12 }}>
                      {evt.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid var(--glass-border)", fontSize: 11.5, color: "var(--text-secondary)" }}>
                  {evt.event_date && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MdCalendarToday size={14} color="var(--accent)" />
                      <span>{evt.event_date} {evt.event_time ? `• ${evt.event_time}` : ""}</span>
                    </div>
                  )}
                  {evt.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MdLocationOn size={14} color="var(--accent)" />
                      <span>{evt.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Event Details Modal */}
      <GlobalModal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || "Event Details"}
        size="lg"
      >
        {selectedEvent && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Meta pill bar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: 12, borderRadius: 10, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", fontSize: 12 }}>
              {selectedEvent.event_date && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)", fontWeight: 600 }}>
                  <MdCalendarToday color="var(--accent)" size={16} /> {selectedEvent.event_date}
                </div>
              )}
              {selectedEvent.event_time && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)", fontWeight: 600 }}>
                  <MdAccessTime color="var(--accent)" size={16} /> {selectedEvent.event_time}
                </div>
              )}
              {selectedEvent.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)", fontWeight: 600 }}>
                  <MdLocationOn color="var(--accent)" size={16} /> {selectedEvent.location}
                </div>
              )}
            </div>

            {/* Full Description */}
            {selectedEvent.description && (
              <div style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedEvent.description}
              </div>
            )}

            {/* Photos Section */}
            {selectedEvent.media?.filter((m) => m.media_type === "IMAGE").length > 0 && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <MdImage color="var(--accent)" /> Photo Gallery ({selectedEvent.media.filter((m) => m.media_type === "IMAGE").length})
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {selectedEvent.media
                    .filter((m) => m.media_type === "IMAGE")
                    .map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handleOpenLightbox(selectedEvent.media, selectedEvent.media.indexOf(item))}
                        style={{ height: 90, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "1px solid var(--glass-border)" }}
                      >
                        <img src={item.url} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Videos Section */}
            {selectedEvent.media?.filter((m) => m.media_type === "VIDEO").length > 0 && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <MdVideoLibrary color="var(--accent)" /> Video Highlights ({selectedEvent.media.filter((m) => m.media_type === "VIDEO").length})
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {selectedEvent.media
                    .filter((m) => m.media_type === "VIDEO")
                    .map((item) => (
                      <div key={item.id} style={{ borderRadius: 8, overflow: "hidden", background: "#000" }}>
                        <video src={item.url} controls style={{ width: "100%", maxHeight: 160 }} />
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <GlobalButton variant="secondary" onClick={() => setSelectedEvent(null)}>
                Close
              </GlobalButton>
            </div>
          </div>
        )}
      </GlobalModal>

      {/* Lightbox */}
      <MediaLightbox
        isOpen={lightboxOpen}
        mediaList={lightboxMedia}
        initialIndex={lightboxIndex}
        downloadName={selectedEvent?.title}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
