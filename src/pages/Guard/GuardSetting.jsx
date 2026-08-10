
import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext"; // ← NEW

export default function GuardSetting() {
  const { t } = useLang(); // ← NEW

  const [profile,  setProfile]  = useState(null);
  const [formData, setFormData] = useState({ name: "", password: "" });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await API.get("/users/me");
      setProfile(res.data);
      setFormData({ name: res.data.name, password: "" });
    } catch (err) { console.error("Failed to load profile", err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await API.put("/users/me", {
        name:     formData.name,
        password: formData.password || undefined,
      });
      alert(t("gsUpdateSuccess"));
      setFormData(prev => ({ ...prev, password: "" }));
      loadProfile();
    } catch (err) {
      console.error("Update failed", err);
      alert(t("gsUpdateFail"));
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-secondary">{t("gsLoading")}</p>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-card p-6 rounded-xl border border-white/10">
        <h2 className="text-lg font-semibold mb-4">{t("gsTitle")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-sm text-secondary">{t("gsName")}</label>
            <input type="text" value={formData.name} required className="input w-full"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <label className="text-sm text-secondary">{t("gsEmail")}</label>
            <input type="email" value={profile.email} disabled
              className="input w-full opacity-60 cursor-not-allowed" />
          </div>

          <div>
            <label className="text-sm text-secondary">{t("gsNewPassword")}</label>
            <input type="password" placeholder={t("gsPasswordPlaceholder")}
              value={formData.password} className="input w-full"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? t("gsUpdating") : t("gsUpdateBtn")}
          </button>

        </form>
      </div>
    </div>
  );
}