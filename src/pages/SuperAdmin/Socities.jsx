
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { MdAdd, MdApartment, MdLocationOn, MdArrowBack, MdManageAccounts, MdSearch } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import API from "../../services/api";

export default function Societies() {
  const { t }    = useLang();
  const navigate = useNavigate();

  const [societies,   setSocieties]   = useState([]);
  const [name,        setName]        = useState("");
  const [address,     setAddress]     = useState("");
  const [loading,     setLoading]     = useState(true);
  const [addLoading,  setAddLoading]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadSocieties(); }, []);

  const loadSocieties = async () => {
    try {
      setLoading(true);
      const res = await API.get("/societies");
      setSocieties(res.data);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setAddLoading(true);
      await API.post("/societies", { name, address });
      setName(""); setAddress("");
      loadSocieties();
    } finally { setAddLoading(false); }
  };

  const filtered = societies.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sa-page" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── HEADER ── */}
      <div className="sa-page-er">
        <div>
          <h1 className="sa-page-title">{t("socTitle")}</h1>
          <p className="sa-page-subtitle">{t("socSubtitle")}</p>
        </div>
      </div>

      {/* ── ADD SOCIETY FORM ── */}
      <div className="soc-form-card">
        <div className="sa-form-er">
          <div className="sa-form-icon"><MdApartment size={20} /></div>
          <div>
            <h3 className="sa-form-title">{t("saCreateSocietyTitle")}</h3>
            <p className="sa-form-subtitle">{t("saCreateSocietySub")}</p>
          </div>
        </div>

        {/* ✅ Stack vertically on mobile, horizontal on sm+ */}
        <form onSubmit={handleSubmit} className="soc-form-row">
          <div className="sa-input-group">
            <label className="sa-label">{t("saSocietyName")}</label>
            <input
              className="soc-input"
              type="text"
              placeholder={t("saSocietyNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="sa-input-group">
            <label className="sa-label">{t("saSocietyAddress")}</label>
            <input
              className="soc-input"
              type="text"
              placeholder={t("saSocietyAddressPlaceholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={addLoading || !name || !address}
            className="sa-create-btn soc-submit-btn"
          >
            {addLoading ? <span className="sa-spinner" /> : <MdAdd size={18} />}
            {t("saCreateSocietyBtn")}
          </button>
        </form>
      </div>

      {/* ── SOCIETY LIST ── */}
      <div className="soc-list-card">

        {/* Toolbar */}
        <div className="soc-list-er">
          <div>
            <h3 className="sa-form-title">{t("socListTitle")}</h3>
            <p className="sa-form-subtitle">
              {societies.length} {societies.length === 1 ? t("socSingular") : t("socPlural")} {t("socRegistered")}
            </p>
          </div>
          <div className="soc-search-box">
            <MdSearch size={16} className="soc-search-icon" />
            <input
              className="soc-search-input"
              placeholder={t("saSearchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="soc-skeleton-rows">
            {[1, 2, 3].map((i) => <div key={i} className="soc-skeleton-row" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="sa-empty-state" style={{ border: "none", background: "transparent", padding: "40px 24px" }}>
            <FaBuilding size={40} style={{ color: "var(--text-secondary)", opacity: 0.3 }} />
            <p className="sa-empty-title">
              {searchQuery ? t("saEmptySearchTitle") : t("socEmptyYet")}
            </p>
            <p className="sa-empty-subtitle">
              {searchQuery ? t("saEmptySearchSub") : t("socEmptyYetSub")}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* ── Desktop table ── */}
            <div className="soc-table-wrap">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th className="soc-th">#</th>
                    <th className="soc-th">{t("saSocietyName")}</th>
                    <th className="soc-th soc-th-address">{t("saSocietyAddress")}</th>
                    <th className="soc-th soc-th-action">{t("billActionCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((society, idx) => (
                    <tr key={society.id} className="soc-tr">
                      <td className="soc-td soc-td-num">{idx + 1}</td>
                      <td className="soc-td">
                        <div className="soc-name-cell">
                          <div className="soc-row-icon"><FaBuilding size={13} /></div>
                          <span className="soc-name">{society.name}</span>
                        </div>
                      </td>
                      <td className="soc-td soc-td-address">
                        <div className="soc-address-cell">
                          <MdLocationOn size={14} className="soc-loc-icon" />
                          <span>{society.address}</span>
                        </div>
                      </td>
                      <td className="soc-td soc-td-action">
                        <Link to={`/superadmin/society/${society.id}/blocks`} className="soc-manage-btn">
                          <MdManageAccounts size={15} /> {t("socManageBlocks")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="soc-mobile-list">
              {filtered.map((society, idx) => (
                <div key={society.id} className="soc-mobile-card">
                  <div className="soc-mobile-card-top">
                    <div className="soc-row-icon" style={{ flexShrink: 0 }}>
                      <FaBuilding size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="soc-name" style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                        {society.name}
                      </p>
                      <div className="soc-address-cell" style={{ marginTop: 4 }}>
                        <MdLocationOn size={12} className="soc-loc-icon" />
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {society.address}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>
                      #{idx + 1}
                    </span>
                  </div>
                  <Link
                    to={`/superadmin/society/${society.id}/blocks`}
                    className="soc-manage-btn"
                    style={{ display: "flex", justifyContent: "center", width: "100%" }}
                  >
                    <MdManageAccounts size={14} /> {t("socManageBlocks")}
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── BACK ── */}
      <div>
        <button onClick={() => navigate(-1)} className="soc-back-btn">
          <MdArrowBack size={16} /> {t("socBack")}
        </button>
      </div>
    </div>
  );
}