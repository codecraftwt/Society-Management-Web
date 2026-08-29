import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { MdApartment, MdArrowBack, MdLayers } from "react-icons/md";

export default function Floors() {
  const { blockId } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [floors, setFloors] = useState([]);

  useEffect(() => {
    API.get(`/floors/${blockId}`)
      .then(res => setFloors(res.data))
      .catch(err => console.error(err));
  }, [blockId]);

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
        <button onClick={() => navigate(-1)} className="sa-hero-back">
          <MdArrowBack size={16} /> {t("socBack") || "Back"}
        </button>
      </div>

      {/* ── FLOORS LIST ── */}
      <div className="sa-panel">
        <div className="sa-panel-head">
          <div className="sa-panel-accent"><MdLayers size={18} /></div>
          <div>
            <h3 className="sa-panel-title">{t("flrListTitle") || "Floors List"}</h3>
            <p className="sa-panel-sub">
              {t("flrListSub") || "Manage the flats inside each floor"}
            </p>
          </div>
        </div>

        {floors.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.86rem", padding: "18px 0" }}>
            No floors found.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Floor Number</th>
                  <th style={{ textAlign: "right" }}>{t("billActionCol") || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {floors.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="sa-form-icon" style={{ width: 34, height: 34, borderRadius: 9 }}>
                          <MdApartment size={15} />
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          Floor {f.floor_number}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Link to={`/superadmin/floor/${f.id}/flats`}
                          className="icon-btn manage" title="Manage Flats">
                          <MdApartment size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}