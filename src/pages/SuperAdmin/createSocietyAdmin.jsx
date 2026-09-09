import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import Select from "../../components/common/Select";
import { MdPersonAdd, MdArrowBack, MdPerson, MdEmail, MdLock } from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";

export default function CreateSocietyAdmin() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", society_id: "",
  });

  useEffect(() => {
    API.get("/societies").then(res => setSocieties(res.data || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.society_id) return;
    try {
      setLoading(true);
      await API.post("/users/society-admin", form);
      alert(t("csaCreatedSuccess"));
      navigate("/superadmin/societies");
    } catch (err) {
      console.error(err);
      alert("Failed to create society admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-page animate-fadeIn">
      {/* ── HERO ── */}
      <div className="sa-page-er">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div className="er-icon er-icon--amenity">
            <MdPersonAdd size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sa-page-title">{t("csaTitle")}</h1>
            <p className="sa-page-subtitle">
              {t("csaSubtitle") || "Create a society admin account and assign a society to manage"}
            </p>
          </div>
        </div>
        <GlobalButton
          variant="secondary"
          size="sm"
          icon={MdArrowBack}
          onClick={() => navigate(-1)}
        >
          {t("socBack")}
        </GlobalButton>
      </div>

      {/* ── FORM ── */}
      <div className="soc-form-card" style={{ maxWidth: 540, margin: "0 auto", width: "100%" }}>
        <div className="sa-form-er">
          <div className="sa-form-icon"><MdPersonAdd size={19} /></div>
          <div className="min-w-0">
            <h3 className="sa-form-title">{t("csaTitle")}</h3>
            <p className="sa-form-subtitle">{t("csaSubtitle") || "Society admin credentials"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="sa-label">{t("csaName")}</label>
            <div className="sa-input">
              <MdPerson size={15} className="sa-input-icon" />
              <input
                placeholder={t("csaName")}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="sa-label">{t("csaEmail")}</label>
            <div className="sa-input">
              <MdEmail size={15} className="sa-input-icon" />
              <input
                placeholder={t("csaEmail")}
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="sa-label">{t("csaPassword")}</label>
            <div className="sa-input">
              <MdLock size={15} className="sa-input-icon" />
              <input
                placeholder={t("csaPassword")}
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="sa-label">{t("csaSelectSociety")}</label>
            <Select className="input" value={form.society_id} onChange={e => setForm({ ...form, society_id: e.target.value })}>
              <option value="">{t("csaSelectSociety")}</option>
              {societies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <GlobalButton
              type="submit"
              variant="create"
              loading={loading}
              fullWidth
              disabled={loading || !form.name || !form.email || !form.password || !form.society_id}
            >
              {t("csaCreateBtn")}
            </GlobalButton>
            <GlobalButton
              type="button"
              variant="cancel"
              onClick={() => navigate(-1)}
            >
              {t("cancel") || "Cancel"}
            </GlobalButton>
          </div>
        </form>
      </div>
    </div>
  );
}