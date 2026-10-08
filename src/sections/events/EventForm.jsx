import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import API from "../../services/api";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import MultiMediaUploader from "../../components/common/MultiMediaUploader";

export default function EventForm({ initialData = null, onSubmit, onCancel, loading = false }) {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const defaultLocation = user?.society_name || user?.society?.name || "";

  const [societyId, setSocietyId] = useState(
    initialData?.society_id || localStorage.getItem("superadmin_society_filter") || ""
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

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [eventDate, setEventDate] = useState(initialData?.event_date || "");
  const [eventTime, setEventTime] = useState(initialData?.event_time || "");
  const [location, setLocation] = useState(initialData ? (initialData.location ?? "") : defaultLocation);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  useEffect(() => {
    if (!initialData && !location && defaultLocation) {
      setLocation(defaultLocation);
    }
  }, [defaultLocation, initialData]);

  const [existingMedia, setExistingMedia] = useState(initialData?.media || []);
  const [retainedMediaIds, setRetainedMediaIds] = useState(
    (initialData?.media || []).map((m) => m.id)
  );
  const [newPhotos, setNewPhotos] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [titleError, setTitleError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Event title is required");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description ? description.trim() : "");
    formData.append("event_date", eventDate);
    formData.append("event_time", eventTime);
    formData.append("location", location ? location.trim() : "");
    formData.append("is_active", isActive);
    if (isSuperAdmin && societyId && societyId !== "ALL") {
      formData.append("society_id", societyId);
    }

    if (initialData?.id) {
      formData.append("keep_media", JSON.stringify(retainedMediaIds));
    }

    newPhotos.forEach((file) => formData.append("photos", file));
    newVideos.forEach((file) => formData.append("videos", file));

    onSubmit(formData, isSuperAdmin && societyId && societyId !== "ALL" ? { "x-society-id": societyId } : {});
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Society Selector for SuperAdmin */}
      {isSuperAdmin && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
            Target Society *
          </label>
          <Select
            className="input w-full"
            value={societyId}
            onChange={(e) => {
              const sid = e.target.value;
              setSocietyId(sid);
              const soc = societiesList.find((s) => String(s.id) === String(sid));
              if (soc?.name && !location) {
                setLocation(soc.name);
              }
            }}
          >
            <option value="">-- Select Society --</option>
            {societiesList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Title */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
          Event Title *
        </label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Diwali Celebration 2026"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setTitleError("");
          }}
          style={{ width: "100%", height: 38, borderRadius: 8, fontSize: 13 }}
        />
        {titleError && <span style={{ color: "#ef4444", fontSize: 11, marginTop: 2, display: "block" }}>{titleError}</span>}
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
          Description
        </label>
        <textarea
          className="input"
          rows={5}
          placeholder="Describe the event details, schedule, or highlights..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%", minHeight: 120, borderRadius: 8, fontSize: 13, padding: 10, lineHeight: 1.5 }}
        />
      </div>

      {/* Date & Location Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
            Event Date (Optional)
          </label>
          <input
            type="date"
            className="input"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={{ width: "100%", height: 38, borderRadius: 8, fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
            Location / Venue
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Clubhouse / Main Garden"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: "100%", height: 38, borderRadius: 8, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Active Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          id="event_is_active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
        />
        <label htmlFor="event_is_active" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
          Publish Event (Visible to Residents)
        </label>
      </div>

      {/* MultiMedia Dropzone */}
      <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 12 }}>
        <MultiMediaUploader
          existingMedia={existingMedia}
          photos={newPhotos}
          videos={newVideos}
          onPhotosChange={setNewPhotos}
          onVideosChange={setNewVideos}
          onKeepMediaChange={setRetainedMediaIds}
        />
      </div>

      {/* Form Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <GlobalButton variant="secondary" onClick={onCancel} type="button" disabled={loading}>
          Cancel
        </GlobalButton>
        <GlobalButton variant="primary" type="submit" loading={loading}>
          {initialData?.id ? "Update Event" : "Create Event"}
        </GlobalButton>
      </div>
    </form>
  );
}
