

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext"; // ← NEW
import API from "../../services/api";
import Select from "../../components/common/Select";

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
    <div className="min-h-screen bg-app">
      <main className="p-4 sm:p-6 lg:p-8 flex justify-center">
        <div className="bg-card rounded-lg shadow p-4 sm:p-6 w-full max-w-md">
          <h2 className="text-base sm:text-lg font-semibold">{t("csaTitle")}</h2>
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <input placeholder={t("csaName")} className="input h-12"
              onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder={t("csaEmail")} className="input h-12"
              onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder={t("csaPassword")} type="password" className="input h-12"
              onChange={e => setForm({ ...form, password: e.target.value })} />
            <Select className="input h-12" onChange={e => setForm({ ...form, society_id: e.target.value })}>
              <option value="">{t("csaSelectSociety")}</option>
              {societies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <button type="submit" className="btn-primary h-12 justify-center">{t("csaCreateBtn")}</button>
            <button type="button" onClick={() => navigate(-1)}
              className="text-secondary text-sm py-1 hover:text-accent transition">
              {t("socBack")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}