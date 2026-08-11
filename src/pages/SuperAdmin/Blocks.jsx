
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { MdDelete, MdLayers, MdHomeWork } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import Select from "../../components/common/Select";

export default function Blocks() {
  const { societyId } = useParams();
  const navigate      = useNavigate();
  const { t }         = useLang();

  const [societyName, setSocietyName]   = useState("Society");
  const [blocks,      setBlocks]        = useState([]);
  const [name,        setName]          = useState("");
  const [floorCount,  setFloorCount]    = useState("");
  const [flatsPerFloor, setFlatsPerFloor] = useState("");
  const [propertyType, setPropertyType] = useState("Apartments"); // ✅ NEW STATE FOR BLOCKS

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
      property_type: propertyType // ✅ SENDING IT HERE
    });
    setName(""); setFloorCount(""); setFlatsPerFloor(""); setPropertyType("Apartments");
    loadBlocks();
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm(t("blkConfirmDelete") || "Delete Block?")) return;
    await API.delete(`/blocks/${blockId}`);
    loadBlocks();
  };

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-30 bg-navbar text-white shadow">
        <div className="flex justify-between items-center px-4 sm:px-9 h-16">
          <div>
            <h1 className="text-base sm:text-lg font-semibold">{societyName}</h1>
            <p className="text-xs text-white/70">{t("blkManageBlocks") || "Manage Blocks"}</p>
          </div>
          <button onClick={() => navigate(-1)} className="bg-white/10 px-4 py-2 rounded text-sm hover:bg-white/20 transition">
            {t("socBack") || "Back"}
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-4">{t("blkCreateTitle") || "Create Block"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <input placeholder={t("blkFieldName") || "Block Name"} value={name}
              onChange={e => setName(e.target.value)} className="input h-12" />
            <input placeholder="No. of Floors" type="number" value={floorCount}
              onChange={e => setFloorCount(e.target.value)} className="input h-12" />
            <input placeholder="Flats per Floor" type="number" value={flatsPerFloor}
              onChange={e => setFlatsPerFloor(e.target.value)} className="input h-12" />
            
            {/* ✅ DROPDOWN MOVED HERE */}
            <Select className="input h-12" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
              <option value="Apartments">Apartments / Flats</option>
              <option value="Row Houses">Row Houses / Villas</option>
              <option value="Commercial">Commercial Complex</option>
            </Select>

            <button type="submit" className="btn-primary h-12">{t("blkCreateBtn") || "Create"}</button>
          </form>
        </div>

        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-4">{t("blkListTitle") || "Blocks List"}</h2>
          {blocks.length === 0 ? (
            <p className="text-secondary text-sm">{t("blkEmpty") || "No blocks found."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted text-secondary text-sm">
                  <tr>
                    <th className="p-3 text-left">{t("blkColBlock") || "Block Name"}</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Floors</th>
                    <th className="p-3 text-right">{t("billActionCol") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map(b => (
                    <tr key={b.id} className="border-t text-sm">
                      <td className="p-3 font-medium flex items-center gap-2">
                        {b.property_type === "Row Houses" ? <MdHomeWork size={16} className="text-emerald-500"/> : <FaBuilding size={14} className="text-blue-500" />}
                        {(t("blkBlockLabel")||"Block")} {b.name}
                      </td>
                      <td className="p-3">
                        <span style={{ 
                          fontSize: "11px", fontWeight: "600", padding: "4px 8px", borderRadius: "6px",
                          background: b.property_type === "Row Houses" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
                          color: b.property_type === "Row Houses" ? "#10b981" : "#5B8DEF" 
                        }}>
                          {b.property_type || "Apartments"}
                        </span>
                      </td>
                      <td className="p-3">{b.floorCount || "-"}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-3">
                          <Link to={`/superadmin/block/${b.id}/floors`}
                            className="icon-btn manage text-xl" title="Manage Floors">
                            <MdLayers />
                          </Link>
                          <button onClick={() => handleDelete(b.id)}
                            className="icon-btn delete text-xl" title={t("billDelete")}>
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}