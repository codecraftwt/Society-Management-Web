import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { MdApartment, MdArrowBack, MdLayers } from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalTable from "../../components/common/GlobalTable";

export default function Floors() {
  const { blockId } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get(`/floors/${blockId}`)
      .then(res => setFloors(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [blockId]);

  const columns = [
    {
      key: "floor_number",
      header: "Floor Number",
      render: (f) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "rgba(160, 90, 255, 0.12)",
              color: "#60a5fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MdApartment size={16} />
          </div>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            Floor {f.floor_number}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: t("billActionCol") || "Actions",
      align: "right",
      render: (f) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link to={`/superadmin/floor/${f.id}/flats`} style={{ textDecoration: "none" }}>
            <GlobalButton variant="secondary" size="sm" icon={MdApartment}>
              Manage Flats
            </GlobalButton>
          </Link>
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
            <MdApartment size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sa-page-title">{t("flrTitle") || "Block Floors"}</h1>
            <p className="sa-page-subtitle">
              {floors.length} floor{floors.length !== 1 ? "s" : ""} added to this block
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

      {/* ── FLOORS LIST ── */}
      <GlobalTable
        columns={columns}
        data={floors}
        loading={loading}
        emptyMessage="No floors found."
        emptyIcon={MdLayers}
      />
    </div>
  );
}