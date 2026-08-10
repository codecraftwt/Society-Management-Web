

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext"; // ← NEW
import API from "../../services/api";

export default function CreateSocietyAdmin() {
  const { t }    = useLang(); // ← NEW
  const navigate = useNavigate();

  const [societies, setSocieties] = useState([]);
  const [form,      setForm]      = useState({
    name: "", email: "", password: "", society_id: "",
  });

  useEffect(() => {
    API.get("/societies").then(res => setSocieties(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await API.post("/users/society-admin", form);
    alert(t("csaCreatedSuccess"));
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h3>{t("csaTitle")}</h3>
        <input placeholder={t("csaName")}
          onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder={t("csaEmail")}
          onChange={e => setForm({ ...form, email: e.target.value })} />
        <input placeholder={t("csaPassword")} type="password"
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <select onChange={e => setForm({ ...form, society_id: e.target.value })}>
          <option>{t("csaSelectSociety")}</option>
          {societies.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button>{t("csaCreateBtn")}</button>
      </form>
      <button onClick={() => navigate(-1)}>{t("socBack")}</button>
    </div>
  );
}