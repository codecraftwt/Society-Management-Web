import { useState, useMemo } from "react";
import {
  MdLocationOn,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheck,
  MdClose,
  MdSearch,
  MdToggleOn,
  MdToggleOff,
  MdAutoAwesome,
} from "react-icons/md";
import API from "../../services/api";
import GlobalModal from "../common/GlobalModal";
import GlobalButton from "../common/GlobalButton";
import GlobalBadge from "../common/GlobalBadge";
import { useLang } from "../../context/LanguageContext";
import { useCustomAlert } from "../../context/CustomAlertContext";

const QUICK_PRESETS = [
  "Main Gate",
  "Back Gate",
  "Basement Parking",
  "Clubhouse",
  "Tower A Lobby",
];

export default function ManageShiftPlacesModal({
  isOpen,
  onClose,
  places = [],
  societyId,
  isSuperAdmin,
  onPlacesUpdated,
}) {
  const { t } = useLang();
  const { showSuccess, showError } = useCustomAlert();

  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const existingNamesSet = useMemo(
    () => new Set(places.map((p) => String(p.name || "").trim().toLowerCase())),
    [places]
  );

  const activeCount = useMemo(
    () => places.filter((p) => p.is_active !== false).length,
    [places]
  );

  const inactiveCount = places.length - activeCount;

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      const isActive = p.is_active !== false;
      if (statusFilter === "ACTIVE" && !isActive) return false;
      if (statusFilter === "INACTIVE" && isActive) return false;
      if (!q) return true;
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q)
      );
    });
  }, [places, search, statusFilter]);

  const createPlace = async (nameVal) => {
    const trimmed = String(nameVal || "").trim();
    if (!trimmed) {
      showError(t("guardShiftPlaceNameRequired", "Please enter a shift place name."));
      return;
    }
    try {
      setCreating(true);
      await API.post("/guard-shift/places", {
        name: trimmed,
        ...(isSuperAdmin && societyId ? { society_id: societyId } : {}),
      });
      setNewName("");
      showSuccess(t("guardShiftPlaceCreated", "Shift place added."));
      if (onPlacesUpdated) await onPlacesUpdated();
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          t("guardShiftPlaceErrCreate", "Failed to add shift place.")
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createPlace(newName);
  };

  const startEdit = (place) => {
    setEditingId(place.id);
    setEditName(place.name || "");
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async (place) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showError(t("guardShiftPlaceNameRequired", "Please enter a shift place name."));
      return;
    }
    try {
      setSavingId(place.id);
      await API.put(`/guard-shift/places/${place.id}`, {
        name: trimmed,
      });
      setEditingId(null);
      showSuccess(t("guardShiftPlaceUpdated", "Shift place updated."));
      if (onPlacesUpdated) await onPlacesUpdated();
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          t("guardShiftPlaceErrUpdate", "Failed to update shift place.")
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (place) => {
    try {
      setSavingId(place.id);
      await API.put(`/guard-shift/places/${place.id}`, {
        is_active: place.is_active === false,
      });
      if (onPlacesUpdated) await onPlacesUpdated();
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          t("guardShiftPlaceErrUpdate", "Failed to update shift place.")
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (placeId) => {
    try {
      setSavingId(placeId);
      await API.delete(`/guard-shift/places/${placeId}`);
      setConfirmDeleteId(null);
      showSuccess(t("guardShiftPlaceDeleted", "Shift place removed."));
      if (onPlacesUpdated) await onPlacesUpdated();
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          t("guardShiftPlaceErrDelete", "Failed to delete shift place.")
      );
    } finally {
      setSavingId(null);
    }
  };

  const availablePresets = QUICK_PRESETS.filter(
    (preset) => !existingNamesSet.has(preset.toLowerCase())
  );

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("guardManageShiftPlacesTitle", "Manage Shift Places")}
      subtitle={t(
        "guardManageShiftPlacesSubtitle",
        "Create, edit, activate or remove guard duty posts & gates."
      )}
      icon={MdLocationOn}
      size="md"
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              {activeCount} {t("guardShiftPlacesActiveCount", "Active")}
            </span>
            {inactiveCount > 0 && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "rgba(148, 163, 184, 0.14)",
                  color: "var(--text-tertiary)",
                }}
              >
                {inactiveCount} {t("inactive", "Inactive")}
              </span>
            )}
          </div>
          <GlobalButton variant="cancel" onClick={onClose}>
            {t("close") || "Close"}
          </GlobalButton>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── ADD NEW PLACE CARD ── */}
        <form
          onSubmit={handleCreate}
          style={{
            padding: 15,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(139, 92, 246, 0.10), rgba(16, 185, 129, 0.06))",
            border: "1px solid rgba(139, 92, 246, 0.28)",
            boxShadow: "0 4px 18px rgba(139, 92, 246, 0.07)",
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "var(--accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdAdd size={16} />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-primary)",
              }}
            >
              {t("guardAddShiftPlaceHeader", "Add New Shift Place")}
            </span>
          </div>

          <input
            type="text"
            className="input"
            placeholder={t("guardShiftPlaceNamePlaceholder", "Place name (e.g. Main Gate)")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
            style={{ fontSize: 13, borderRadius: 10 }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {availablePresets.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", flex: 1 }}>
                <MdAutoAwesome size={13} style={{ color: "var(--accent)", opacity: 0.85 }} />
                {availablePresets.slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={creating}
                    onClick={() => createPlace(preset)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px dashed rgba(139, 92, 246, 0.35)",
                      background: "rgba(255, 255, 255, 0.65)",
                      color: "var(--accent)",
                      cursor: "pointer",
                    }}
                    title={`Quick add ${preset}`}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}

            <GlobalButton
              type="submit"
              variant="add"
              size="sm"
              icon={MdAdd}
              loading={creating}
              disabled={creating || !newName.trim()}
            >
              {t("guardAddPlaceBtn", "Add Place")}
            </GlobalButton>
          </div>
        </form>

        {/* ── SEARCH & STATUS FILTER BAR ── */}
        {places.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <MdSearch
                size={16}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("guardSearchShiftPlaces", "Search shift places...")}
                style={{ paddingLeft: 34, fontSize: 13, borderRadius: 10, height: 36 }}
              />
            </div>

            <div
              style={{
                display: "inline-flex",
                padding: 3,
                borderRadius: 10,
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                gap: 2,
              }}
            >
              {[
                { id: "ALL", label: t("all", "All") },
                { id: "ACTIVE", label: t("active", "Active") },
                { id: "INACTIVE", label: t("inactive", "Inactive") },
              ].map((tab) => {
                const selected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: selected ? "var(--accent)" : "transparent",
                      color: selected ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLACES LIST ── */}
        {filteredPlaces.length === 0 ? (
          <div
            style={{
              padding: "30px 16px",
              textAlign: "center",
              borderRadius: 16,
              background: "var(--card-inner-bg)",
              border: "1px dashed var(--glass-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(139, 92, 246, 0.1)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdLocationOn size={24} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-secondary)" }}>
              {places.length === 0
                ? t("guardNoShiftPlacesYet", "No shift places created yet")
                : t("guardNoMatchingShiftPlaces", "No matching shift places")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", maxWidth: 320 }}>
              {t(
                "guardNoShiftPlacesHint",
                "Add gates or duty posts above (e.g. Main Gate, Back Gate, Tower A Lobby)."
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {filteredPlaces.map((place) => {
              const isEditing = editingId === place.id;
              const isConfirmDelete = confirmDeleteId === place.id;
              const isActive = place.is_active !== false;
              const isBusy = savingId === place.id;

              return (
                <div
                  key={place.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "var(--card-inner-bg)",
                    border: `1px solid ${
                      isEditing
                        ? "var(--accent)"
                        : isActive
                        ? "var(--glass-border)"
                        : "rgba(148,163,184,0.22)"
                    }`,
                    boxShadow: isEditing
                      ? "0 4px 16px rgba(139, 92, 246, 0.14)"
                      : "0 1px 4px rgba(15, 23, 42, 0.04)",
                    opacity: isActive || isEditing ? 1 : 0.72,
                    transition: "all 0.18s ease",
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      <input
                        type="text"
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={100}
                        placeholder={t("guardShiftPlaceNamePlaceholder", "Place name")}
                        style={{ fontSize: 13, borderRadius: 10 }}
                        autoFocus
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <GlobalButton
                          variant="cancel"
                          size="sm"
                          icon={MdClose}
                          onClick={cancelEdit}
                          disabled={isBusy}
                        >
                          {t("cancel") || "Cancel"}
                        </GlobalButton>
                        <GlobalButton
                          variant="primary"
                          size="sm"
                          icon={MdCheck}
                          onClick={() => handleSaveEdit(place)}
                          loading={isBusy}
                          disabled={isBusy || !editName.trim()}
                        >
                          {t("save") || "Save"}
                        </GlobalButton>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 11,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isActive
                              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(59, 130, 246, 0.12))"
                              : "rgba(148, 163, 184, 0.14)",
                            color: isActive ? "#10b981" : "var(--text-tertiary)",
                            border: `1px solid ${
                              isActive
                                ? "rgba(16, 185, 129, 0.3)"
                                : "rgba(148, 163, 184, 0.25)"
                            }`,
                          }}
                        >
                          <MdLocationOn size={18} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                wordBreak: "break-word",
                              }}
                            >
                              {place.name}
                            </span>
                            <GlobalBadge variant={isActive ? "success" : "neutral"} size="sm">
                              {isActive
                                ? t("active", "Active")
                                : t("inactive", "Inactive")}
                            </GlobalBadge>
                          </div>
                          {place.description && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--text-tertiary)",
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={place.description}
                            >
                              {place.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isConfirmDelete ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                            {t("guardConfirmRemovePlace", "Remove?")}
                          </span>
                          <GlobalButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(place.id)}
                            loading={isBusy}
                            disabled={isBusy}
                          >
                            {t("yes", "Yes")}
                          </GlobalButton>
                          <GlobalButton
                            variant="cancel"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isBusy}
                          >
                            {t("no", "No")}
                          </GlobalButton>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => handleToggleActive(place)}
                            disabled={isBusy}
                            title={
                              isActive
                                ? t("guardDeactivatePlace", "Deactivate")
                                : t("guardActivatePlace", "Activate")
                            }
                            style={{
                              position: "relative",
                              width: 44,
                              height: 24,
                              borderRadius: 999,
                              border: `1px solid ${
                                isActive
                                  ? "rgba(16, 185, 129, 0.45)"
                                  : "rgba(148, 163, 184, 0.4)"
                              }`,
                              background: isActive
                                ? "linear-gradient(135deg, #10b981, #059669)"
                                : "rgba(148, 163, 184, 0.28)",
                              boxShadow: isActive
                                ? "0 3px 10px rgba(16, 185, 129, 0.32), inset 0 1px 1px rgba(255,255,255,0.25)"
                                : "inset 0 1px 3px rgba(15, 23, 42, 0.14)",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              opacity: isBusy ? 0.6 : 1,
                              padding: 0,
                              transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                left: isActive ? 22 : 3,
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: "#ffffff",
                                boxShadow: "0 2px 5px rgba(15, 23, 42, 0.22)",
                                transition: "left 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                              }}
                            />
                          </button>
                          <GlobalButton
                            variant="edit"
                            size="sm"
                            icon={MdEdit}
                            onClick={() => startEdit(place)}
                            disabled={isBusy}
                            title={t("edit", "Edit")}
                          />
                          <GlobalButton
                            variant="danger"
                            size="sm"
                            icon={MdDelete}
                            onClick={() => setConfirmDeleteId(place.id)}
                            disabled={isBusy}
                            title={t("delete", "Delete")}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlobalModal>
  );
}
