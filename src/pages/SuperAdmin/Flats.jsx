import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  MdApartment, MdArrowBack, MdDelete, MdCheckCircle,
  MdSearch, MdClose, MdPerson, MdLock,
  MdOutlineInbox, MdAdd,
} from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";

export default function Flats() {
  const { blockId, floorId } = useParams();
  const navigate = useNavigate();

  const [flats, setFlats] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFlatData, setNewFlatData] = useState({ flat_number: "", block_id: "", area_sqft: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [resolvedBlockId, setResolvedBlockId] = useState(blockId || null);

  useEffect(() => {
    const init = async () => {
      if (floorId) {
        try {
          const floorRes = await API.get(`/floors/detail/${floorId}`);
          setResolvedBlockId(floorRes.data?.block_id || null);
        } catch {}
      }
      loadFlats();
    };
    init();
  }, [floorId]);

  const loadFlats = async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (floorId) {
        res = await API.get(`/flats/floor/${floorId}`);
      } else if (blockId) {
        res = await API.get(`/flats/${blockId}`);
      } else {
        res = { data: [] };
      }
      setFlats(res.data || []);
      if (floorId && !resolvedBlockId && res.data && res.data.length > 0) {
        setResolvedBlockId(res.data[0].block_id || null);
      }
    } catch {
      setError("Failed to load flats. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm(p => ({ ...p, loading: true }));
    setError("");
    try {
      await API.delete(`/flats/delete/${deleteConfirm.id}`);
      setFlats(prev => prev.filter(f => f.id !== deleteConfirm.id));
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch (err) {
      setError(err?.response?.data?.message || "Delete failed. Please try again.");
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

  const handleAddFlat = async () => {
    if (!newFlatData.flat_number) {
      setAddError("Flat number is required");
      return;
    }
    const effectiveBlockId = resolvedBlockId;
    if (!effectiveBlockId) {
      setAddError("Block ID could not be determined");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      await API.post(`/flats`, {
        ...newFlatData,
        block_id: effectiveBlockId,
        ...(floorId && { floor_id: floorId }),
        resident_id: null,
        occupancy_status: "VACANT",
        area_sqft: newFlatData.area_sqft ? Number(newFlatData.area_sqft) : null,
      });
      await loadFlats();
      setSuccessMessage(`Flat ${newFlatData.flat_number} created successfully`);
      setShowAddModal(false);
      setNewFlatData({ flat_number: "", block_id: "", area_sqft: "" });
    } catch (err) {
      setAddError(err?.response?.data?.message || "Failed to add flat");
    } finally {
      setAdding(false);
    }
  };

  const filtered = flats.filter(f => {
    const q = search.toLowerCase();
    const ms = f.flat_number?.toLowerCase().includes(q);
    const mf =
      filterStatus === "ALL" ? true :
        filterStatus === "OCCUPIED" ? !!f.resident_id :
          !f.resident_id;
    return ms && mf;
  });

  const counts = {
    ALL: flats.length,
    OCCUPIED: flats.filter(f => !!f.resident_id).length,
    VACANT: flats.filter(f => !f.resident_id).length,
  };

  const TABS = [
    { key: "ALL", label: "All" },
    { key: "OCCUPIED", label: "Occupied" },
    { key: "VACANT", label: "Vacant" },
  ];

  const columns = [
    {
      key: "idx",
      header: "#",
      width: 60,
      render: (_, idx) => <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>{idx + 1}</span>,
    },
    {
      key: "flat_number",
      header: "Flat Number",
      render: (flat) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: flat.resident_id ? "rgba(16, 185, 129, 0.12)" : "rgba(37, 99, 235, 0.12)",
              color: flat.resident_id ? "#10b981" : "#60a5fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MdApartment size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              Flat {flat.flat_number}
            </span>
            {flat.area_sqft && (
              <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                {flat.area_sqft} sq.ft
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (flat) => (
        <GlobalBadge
          variant={flat.resident_id ? "success" : "neutral"}
          icon={flat.resident_id ? MdCheckCircle : MdLock}
        >
          {flat.resident_id ? "Occupied" : "Vacant"}
        </GlobalBadge>
      ),
    },
    {
      key: "resident",
      header: "Resident",
      render: (flat) =>
        flat.resident_id ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "rgba(37, 99, 235, 0.15)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdPerson size={14} />
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Assigned
            </span>
          </div>
        ) : (
          <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>—</span>
        ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (flat) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <GlobalButton
            variant="delete"
            size="sm"
            icon={MdDelete}
            onClick={() => setDeleteConfirm({ isOpen: true, id: flat.id, loading: false })}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="sa-page animate-fadeIn" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ── HERO ── */}
      <div className="sa-page-er">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div className="er-icon er-icon--amenity">
            <MdApartment size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sa-page-title">Block Flats</h1>
            <p className="sa-page-subtitle">{counts.ALL} unit{counts.ALL !== 1 ? "s" : ""} in this block</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <GlobalButton
            variant="secondary"
            size="sm"
            icon={MdArrowBack}
            onClick={() => navigate(-1)}
          >
            Back
          </GlobalButton>
          <GlobalButton
            variant="add"
            icon={MdAdd}
            onClick={() => setShowAddModal(true)}
          >
            Add Flat
          </GlobalButton>
        </div>
      </div>

      {/* ── ERROR & SUCCESS NOTIFICATIONS ── */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.28)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 13,
            color: "#ef4444",
            marginBottom: 14,
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <MdClose size={16} />
          </button>
        </div>
      )}
      {successMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.28)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 13,
            color: "#10b981",
            marginBottom: 14,
          }}
        >
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* ── TOOLBAR / FILTERS ── */}
      <div className="sa-toolbar" style={{ marginBottom: 16 }}>
        <div className="sa-search-wrap" style={{ flex: 1 }}>
          <MdSearch size={17} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            className="sa-search-input"
            placeholder="Search flat number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sa-segment">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={filterStatus === tab.key ? "sa-segment-active" : ""}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </div>

      {/* ── FLATS TABLE ── */}
      <GlobalTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={search || filterStatus !== "ALL" ? "No flats match your search." : "No flats found in this block."}
        emptyIcon={MdOutlineInbox}
        emptyAction={
          !search && filterStatus === "ALL" ? (
            <GlobalButton variant="add" icon={MdAdd} onClick={() => setShowAddModal(true)}>
              Add Flat
            </GlobalButton>
          ) : null
        }
      />

      {/* ── ADD FLAT MODAL ── */}
      <GlobalModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewFlatData({ flat_number: "", block_id: "", area_sqft: "" });
          setAddError("");
        }}
        title="Add New Flat"
        subtitle="Create a flat unit in this block"
        icon={MdApartment}
        size="sm"
        showFooter
        submitLabel="Add Flat"
        cancelLabel="Cancel"
        onSubmit={handleAddFlat}
        submitLoading={adding}
        submitDisabled={adding || !newFlatData.flat_number}
        submitIcon={MdAdd}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {addError && (
            <div
              style={{
                color: "#ef4444",
                fontSize: 12,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.22)",
                padding: "8px 12px",
                borderRadius: 9,
              }}
            >
              {addError}
            </div>
          )}
          <div className="sa-input-group">
            <label className="sa-label">Flat Number</label>
            <input
              className="input"
              placeholder="e.g. A-101"
              value={newFlatData.flat_number}
              onChange={(e) => setNewFlatData({ ...newFlatData, flat_number: e.target.value })}
              required
            />
          </div>
          <div className="sa-input-group">
            <label className="sa-label">Area (sq.ft)</label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1200"
              value={newFlatData.area_sqft}
              onChange={(e) => setNewFlatData({ ...newFlatData, area_sqft: e.target.value })}
            />
          </div>
        </div>
      </GlobalModal>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Flat"
        message="Are you sure you want to delete this flat? All historical logs and bills for this unit will be affected."
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}