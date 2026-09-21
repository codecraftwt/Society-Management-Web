import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import Select from "../../components/common/Select";
import { MdPersonAdd, MdArrowBack, MdPerson, MdEmail, MdLock } from "react-icons/md";
import GlobalButton from "../../components/common/GlobalButton";
import { getTitleError, getEmailError, getRequiredError } from "../../utils/validators";

const PW_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter",   test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",   test: (p) => /[a-z]/.test(p) },
  { label: "One number",             test: (p) => /\d/.test(p) },
  { label: "One special character",  test: (p) => /[\W_]/.test(p) },
];

function getPasswordError(password) {
  if (!password.trim()) return "Password is required.";
  for (const rule of PW_RULES) {
    if (!rule.test(password)) return `Password must contain ${rule.label.toLowerCase()}.`;
  }
  return null;
}

export default function CreateSocietyAdmin() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    name: "", email: "", password: "", society_id: "",
  });

  useEffect(() => {
    API.get("/societies").then(res => setSocieties(res.data || []));
  }, []);

  const validate = () => {
    const errors = {};
    errors.name = getTitleError(form.name, t("csaName") || "Name");
    errors.email = getEmailError(form.email, t("csaEmail") || "Email");
    errors.password = getPasswordError(form.password);
    errors.society_id = getRequiredError(form.society_id, t("csaSelectSociety") || "Society");
    return errors;
  };

  const errors = validate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, society_id: true });
    const errs = validate();
    if (Object.keys(errs).some(k => errs[k])) return;
    try {
      setLoading(true);
      await API.post("/users/society-admin", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        society_id: Number(form.society_id),
      });
      alert(t("csaCreatedSuccess"));
      navigate("/superadmin/societies");
    } catch (err) {
      console.error(err);
      alert("Failed to create society admin");
    } finally {
      setLoading(false);
    }
  };

  const touch = (f) => setTouched((p) => ({ ...p, [f]: true }));
  const errTxt = (field) => (touched[field] ? errors[field] : null);

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
            <div className={`sa-input${errTxt("name") ? " invalid" : ""}`}>
              <MdPerson size={15} className="sa-input-icon" />
              <input
                placeholder={t("csaName")}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onBlur={() => touch("name")}
                required
              />
            </div>
            {errTxt("name") && <span className="ms-field-error">{errTxt("name")}</span>}
          </div>
          <div>
            <label className="sa-label">{t("csaEmail")}</label>
            <div className={`sa-input${errTxt("email") ? " invalid" : ""}`}>
              <MdEmail size={15} className="sa-input-icon" />
              <input
                placeholder={t("csaEmail")}
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onBlur={() => touch("email")}
                required
              />
            </div>
            {errTxt("email") && <span className="ms-field-error">{errTxt("email")}</span>}
          </div>
          <div>
            <label className="sa-label">{t("csaPassword")}</label>
            <div className={`sa-input${errTxt("password") ? " invalid" : ""}`}>
              <MdLock size={15} className="sa-input-icon" />
              <input
                placeholder={t("csaPassword")}
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onBlur={() => touch("password")}
                required
              />
            </div>
            {errTxt("password") && <span className="ms-field-error">{errTxt("password")}</span>}
          </div>
          <div>
            <label className="sa-label">{t("csaSelectSociety")}</label>
            <Select className={`input${errTxt("society_id") ? " invalid" : ""}`} value={form.society_id}
              onChange={e => { setForm({ ...form, society_id: e.target.value }); touch("society_id"); }}>
              <option value="">{t("csaSelectSociety")}</option>
              {societies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {errTxt("society_id") && <span className="ms-field-error">{errTxt("society_id")}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <GlobalButton
              type="submit"
              variant="create"
              loading={loading}
              fullWidth
              disabled={loading || Object.keys(errors).some(k => errors[k])}
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
