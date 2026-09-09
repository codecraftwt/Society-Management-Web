import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { MdDelete, MdLayers, MdHomeWork, MdArrowBack, MdAdd } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalTable from "../../components/common/GlobalTable";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";

const PROPERTY_TONES = {
  "Row Houses": { c: "#2FC27E", bg: "rgba(47, 194, 126, 0.13)", bd: "rgba(47, 194, 126, 0.28)" },
  "Commercial":  { c: "#9F87D7", bg: "rgba(159, 135, 215, 0.13)", bd: "rgba(159, 135, 215, 0.28)" },
  "Apartments":  { c: "#2563EB", bg: "rgba(37, 99, 235, 0.13)", bd: "rgba(37, 99, 235, 0.28)" },
};

function toneFor(type) {
  return PROPERTY_TONES[type] || PROPERTY_TONES.Apartments;
}

export default function Blocks() {
  const { societyId } = useParams();
  const navigate      = useNavigate();
  const { t }         = useLang();

  const [societyName, setSocietyName]   = useState("Society");
  const [blocks,      setBlocks]        = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [name,        setName]          = useState("");
  const [floorCount,  setFloorCount]    = useState("");
  const [flatsPerFloor, setFlatsPerFloor] = useState("");
  const [propertyType, setPropertyType] = useState("Apartments");
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  useEffect(() => {
    loadSocietyName();
    loadBlocks();
  }, [societyId]);

  const loadSocietyName = async () => {
    try {
      const res = await API.get(`/blocks/getname/${societyId}`);
      setSocietyName(res.data?.name || "Society");
    } catch (err) {
      console.error("Failed to load society name", err);
    }
  };

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/blocks/${societyId}`);
      setBlocks(res.data || []);
    } catch (err) {
      console.error("Failed to load blocks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !floorCount || !flatsPerFloor) {
      alert(t("blkErrFillAll") || "Please fill all fields");
      return;
    }
    await API.post("/blocks", {
      name,
      society_id: societyId,
      floor_count: Number(floorCount),
      flats_per_floor: Number(flatsPerFloor),
      property_type: propertyType
    });
    setName("");
    setFloorCount("");
    setFlatsPerFloor("");
    setPropertyType("Apartments");
    loadBlocks();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      setDeleteConfirm(p => ({ ...p, loading: true }));
      await API.delete(`/blocks/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      loadBlocks();
    } catch (err) {
      console.error("Delete block error", err);
      setDeleteConfirm(p => ({ ...p, loading: false }));
    }
  };

  const blockIcon = (type) =>
    type === "Row Houses" ? <MdHomeWork size={15} /> : <FaBuilding size={13} />;

  const columns = [
    {
      key: "name",
      header: t("blkColBlock") || "Block Name",
      render: (b) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: toneFor(b.property_type).bg,
              color: toneFor(b.property_type).c,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {blockIcon(b.property_type)}
          </div>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {(t("blkBlockLabel") || "Block")} {b.name}
          </span>
        </div>
      ),
    },
    {
      key: "property_type",
      header: "Type",
      render: (b) => (
        <GlobalBadge
          variant="info"
          style={{
            color: toneFor(b.property_type).c,
            background: toneFor(b.property_type).bg,
            border: `1px solid ${toneFor(b.property_type).bd}`,
          }}
        >
          {b.property_type || "Apartments"}
        </GlobalBadge>
      ),
    },
    {
      key: "floorCount",
      header: "Floors",
      render: (b) => <span style={{ color: "var(--text-secondary)" }}>{b.floorCount || "-"}</span>,
    },
    {
      key: "actions",
      header: t("billActionCol") || "Actions",
      align: "right",
      render: (b) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Link to={`/superadmin/block/${b.id}/floors`} style={{ textDecoration: "none" }}>
            <GlobalButton variant="secondary" size="sm" icon={MdLayers}>
              Manage
            </GlobalButton>
          </Link>
          <GlobalButton
            variant="delete"
            size="sm"
            icon={MdDelete}
            onClick={() => setDeleteConfirm({ isOpen: true, id: b.id, loading: false })}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="sa-page animate-fadeIn">
      {/* ── HERO ── */}
      <div className="sa-page-er">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div className="er-icon er-icon--amenity">
            <MdHomeWork size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sa-page-title">{societyName}</h1>
            <p className="sa-page-subtitle">
              {t("blkManageBlocks") || "Manage Blocks"} · {blocks.length} block{blocks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <GlobalButton
          variant="secondary"
          size="sm"
          icon={MdArrowBack}
          onClick={() => navigate(-1)}
        >
          {t("socBack") || "Back"}
        </GlobalButton>
      </div>

      {/* ── CREATE BLOCK ── */}
      <div className="soc-form-card" style={{ marginBottom: 20 }}>
        <div className="sa-form-er">
          <div className="sa-form-icon"><MdAdd size={19} /></div>
          <div className="min-w-0">
            <h3 className="sa-form-title">{t("blkCreateTitle") || "Create Block"}</h3>
            <p className="sa-form-subtitle">
              {(t("blkCreateSub") || "Add a new block to")} {societyName}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="sa-grid-5" style={{ marginTop: 4 }}>
          <div>
            <label className="sa-label">{t("blkFieldName") || "Block Name"}</label>
            <input placeholder={t("blkFieldName") || "Block Name"} value={name}
              onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="sa-label">No. of Floors</label>
            <input placeholder="No. of Floors" type="number" value={floorCount}
              onChange={e => setFloorCount(e.target.value)} className="input" />
          </div>
          <div>
            <label className="sa-label">Flats per Floor</label>
            <input placeholder="Flats per Floor" type="number" value={flatsPerFloor}
              onChange={e => setFlatsPerFloor(e.target.value)} className="input" />
          </div>
          <div>
            <label className="sa-label">Type</label>
            <Select className="input" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
              <option value="Apartments">Apartments / Flats</option>
              <option value="Row Houses">Row Houses / Villas</option>
              <option value="Commercial">Commercial Complex</option>
            </Select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <GlobalButton
              type="submit"
              variant="add"
              icon={MdAdd}
              fullWidth
            >
              {t("blkCreateBtn") || "Create"}
            </GlobalButton>
          </div>
        </form>
      </div>

      {/* ── BLOCKS TABLE ── */}
      <GlobalTable
        columns={columns}
        data={blocks}
        loading={loading}
        emptyMessage={t("blkEmpty") || "No blocks found."}
        emptyIcon={MdLayers}
      />

      {/* ── DELETE CONFIRM DIALOG ── */}
      <GlobalConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        title={t("blkConfirmDelete") || "Delete Block"}
        message="Are you sure you want to delete this block? This will permanently remove all associated floors and flats."
        variant="danger"
        loading={deleteConfirm.loading}
      />
    </div>
  );
}