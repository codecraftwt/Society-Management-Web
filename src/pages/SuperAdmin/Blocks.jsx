import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { MdDelete, MdLayers, MdHomeWork, MdArrowBack, MdAdd } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import Select from "../../components/common/Select";

const PROPERTY_TONES = {
  "Row Houses": { c: "#2FC27E", bg: "rgba(47, 194, 126, 0.13)", bd: "rgba(47, 194, 126, 0.28)" },
  "Commercial":  { c: "#9F87D7", bg: "rgba(159, 135, 215, 0.13)", bd: "rgba(159, 135, 215, 0.28)" },
  "Apartments":  { c: "#F0845D", bg: "rgba(240, 132, 93, 0.13)", bd: "rgba(240, 132, 93, 0.28)" },
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
  const [name,        setName]          = useState("");
  const [floorCount,  setFloorCount]    = useState("");
  const [flatsPerFloor, setFlatsPerFloor] = useState("");
  const [propertyType, setPropertyType] = useState("Apartments");

  useEffect(() => { loadSocietyName(); loadBlocks(); }, [societyId]);

  const loadSocietyName = async () => {
    try {
      const res = await API.get(`/blocks/getname/${societyId}`);
      setSocietyName(res.data?.name || "Society");
    } catch (err) { console.error("Failed to load society name", err); }
  };

  const loadBlocks = async () => {
    try {
      const res = await API.get(`/blocks/${societyId}`);
      setBlocks(res.data);
    } catch (err) { console.error("Failed to load blocks", err); }
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
    setName(""); setFloorCount(""); setFlatsPerFloor(""); setPropertyType("Apartments");
    loadBlocks();
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm(t("blkConfirmDelete") || "Delete Block?")) return;
    await API.delete(`/blocks/${blockId}`);
    loadBlocks();
  };

  const blockIcon = (type) =>
    type === "Row Houses" ? <MdHomeWork size={15} /> : <FaBuilding size={13} />;

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
        <button onClick={() => navigate(-1)} className="sa-hero-back">
          <MdArrowBack size={16} /> {t("socBack") || "Back"}
        </button>
      </div>

      {/* ── CREATE BLOCK ── */}
      <div className="soc-form-card">
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
            <button type="submit" className="sa-btn sa-btn-primary" style={{ width: "100%" }}>
              <MdAdd size={17} /> {t("blkCreateBtn") || "Create"}
            </button>
          </div>
        </form>
      </div>

      {/* ── BLOCKS LIST ── */}
      <div className="sa-panel">
        <div className="sa-panel-head">
          <div className="sa-panel-accent"><MdLayers size={18} /></div>
          <div className="min-w-0">
            <h3 className="sa-panel-title">{t("blkListTitle") || "Blocks List"}</h3>
            <p className="sa-panel-sub">
              {blocks.length} block{blocks.length !== 1 ? "s" : ""} in {societyName}
            </p>
          </div>
        </div>

        {blocks.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.86rem", padding: "18px 0" }}>
            {t("blkEmpty") || "No blocks found."}
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="soc-table-wrap" style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>{t("blkColBlock") || "Block Name"}</th>
                    <th>Type</th>
                    <th>Floors</th>
                    <th style={{ textAlign: "right" }}>{t("billActionCol") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="sa-form-icon" style={{
                            width: 34, height: 34, borderRadius: 9,
                            background: toneFor(b.property_type).bg,
                            color: toneFor(b.property_type).c,
                          }}>
                            {blockIcon(b.property_type)}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {(t("blkBlockLabel") || "Block")} {b.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="sa-tone-badge"
                          style={{
                            "--typeof-c": toneFor(b.property_type).c,
                            "--typeof-bg": toneFor(b.property_type).bg,
                            "--typeof-bd": toneFor(b.property_type).bd,
                          }}>
                          {b.property_type || "Apartments"}
                        </span>
                      </td>
                      <td>{b.floorCount || "-"}</td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <Link to={`/superadmin/block/${b.id}/floors`}
                            className="icon-btn manage" title="Manage Floors">
                            <MdLayers size={16} />
                          </Link>
                          <button onClick={() => handleDelete(b.id)}
                            className="icon-btn delete" title={t("billDelete")}>
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="soc-mobile-list">
              {blocks.map(b => {
                const tone = toneFor(b.property_type);
                return (
                  <div key={b.id} className="soc-mobile-card">
                    <div className="soc-mobile-head">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          background: tone.bg, color: tone.c,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {blockIcon(b.property_type)}
                        </div>
                        <span className="soc-mobile-name">
                          {(t("blkBlockLabel") || "Block")} {b.name}
                        </span>
                      </div>
                      <span className="sa-tone-badge" style={{
                        "--typeof-c": tone.c, "--typeof-bg": tone.bg, "--typeof-bd": tone.bd,
                      }}>
                        {b.property_type || "Apartments"}
                      </span>
                    </div>
                    <div className="soc-mobile-ac">
                      <div className="soc-mobile-meta-row">
                        <span>{b.floorCount || "-"} floor{b.floorCount !== 1 ? "s" : ""}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Link to={`/superadmin/block/${b.id}/floors`}
                            className="icon-btn manage" title="Manage Floors">
                            <MdLayers size={16} />
                          </Link>
                          <button onClick={() => handleDelete(b.id)}
                            className="icon-btn delete" title={t("billDelete")}>
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}