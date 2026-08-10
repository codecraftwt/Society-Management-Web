import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext"; // ← NEW

export default function EmergencyHistory() {
  const { t } = useLang(); // ← NEW

  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const res = await API.get("/emergency");
      setAlerts(res.data || []);
    } catch (err) { console.error("Failed to load emergency alerts", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAlerts(); }, []);

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <h2 className="text-xl font-semibold text-red-400">
        {t("ehTitle")}
      </h2>

      <div className="bg-card rounded-xl overflow-hidden">

        {loading ? (
          <p className="p-6 text-secondary">{t("ehLoading")}</p>
        ) : alerts.length === 0 ? (
          <p className="p-6 text-secondary">{t("ehEmpty")}</p>
        ) : (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/60">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("ehColType")}</th>
                    <th className="px-4 py-3 text-left">{t("ehColMessage")}</th>
                    <th className="px-4 py-3 text-left">{t("ehColRaisedBy")}</th>
                    <th className="px-4 py-3 text-left">{t("geColFlat")}</th>
                    <th className="px-4 py-3 text-left">{t("billStatusCol")}</th>
                    <th className="px-4 py-3 text-left">{t("ehColTime")}</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id} className="border-t border-white/5">
                      <td className="px-4 py-3">{a.type}</td>
                      <td className="px-4 py-3">{a.message}</td>
                      <td className="px-4 py-3">
                        {a.source === "RESIDENT"
                          ? a.Resident?.name || t("ehResident")
                          : t("ehGuard")}
                      </td>
                      <td className="px-4 py-3">
                        {a.source === "RESIDENT" && a.Flat
                          ? `${a.Flat?.Block?.name}-${a.Flat?.flat_number}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="status in-progress">{a.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="md:hidden space-y-4 p-4">
              {alerts.map((a) => (
                <div key={a.id} className="bg-card border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-red-400">{a.type}</h3>
                    <span className="status in-progress">{a.status}</span>
                  </div>
                  <p className="text-sm text-white/70">
                    {t("ehColMessage")}: <span className="text-white">{a.message}</span>
                  </p>
                  <p className="text-sm text-white/70">
                    {t("ehColRaisedBy")}: <span className="text-white">
                      {a.source === "RESIDENT"
                        ? a.Resident?.name || t("ehResident")
                        : t("ehGuard")}
                    </span>
                  </p>
                  <p className="text-sm text-white/70">
                    {t("geColFlat")}: <span className="text-white">
                      {a.source === "RESIDENT" && a.Flat
                        ? `${a.Flat?.Block?.name}-${a.Flat?.flat_number}`
                        : "-"}
                    </span>
                  </p>
                  <p className="text-sm text-white/70">
                    {t("ehColTime")}: <span className="text-white">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}




