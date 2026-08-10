
import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import GuardEmergencyPanel from "../../components/guard/GuardEmergencyPanel";

function Stat({ title, value }) {
  return (
    <div className="gd-stat-card">
      <p className="gd-stat-title">{title}</p>
      <h2 className="gd-stat-val">{value}</h2>
    </div>
  );
}

export default function GuardDashboard() {
  const { t } = useLang();

  const [dateTime, setDateTime] = useState(new Date());
  const [profile,  setProfile]  = useState(null);
  const [shift,    setShift]    = useState(null);
  const [stats,    setStats]    = useState({ today: 0, inside: 0, exited: 0 });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(h); d.setMinutes(m);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const loadProfile = async () => {
    try { const res = await API.get("/users/me");       setProfile(res.data); } catch (e) { console.error(e); }
  };

  const loadShift = async () => {
    try { const res = await API.get("/guard-shift/my"); setShift(res.data);   } catch (e) { console.error(e); }
  };

  /* ── /visitors now returns { data, pagination, counts }
        counts.ALL = total, counts.IN = inside, counts.OUT = exited ── */
  const loadStats = async () => {
    try {
      const res    = await API.get("/visitors?page=1&limit=1");
      const counts = res.data?.counts || {};
      setStats({
        today:  counts.ALL ?? 0,
        inside: counts.IN  ?? 0,
        exited: counts.OUT ?? 0,
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadProfile();
    loadShift();
    loadStats();
    const timer = setInterval(() => setDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      <div className="xl:col-span-3 space-y-4">

        <div className="gd-welcome-card">
          <div className="gd-welcome-bar" />
          <div className="gd-welcome-inner">
            <h1 className="gd-welcome-title">
              {t("gdWelcome")}, {profile?.name || t("gdGuard")} 👮
            </h1>
            <p className="gd-welcome-society">{profile?.Society?.name}</p>
            <p className="gd-welcome-time">{dateTime.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="gd-shift-card">
          <p className="gd-shift-label">{t("gdDutySchedule")}</p>
          {shift ? (
            <>
              <h2 className="gd-shift-type">{shift.shift_type}</h2>
              <p className="gd-shift-time">
                {formatTime(shift.start_time)} → {formatTime(shift.end_time)}
              </p>
              <p className="gd-shift-dates">
                {formatDate(shift.start_date)} → {formatDate(shift.end_date)}
              </p>
            </>
          ) : (
            <span className="gd-no-shift">{t("gdNoShift")}</span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Stat title={t("gdStatToday")}  value={stats.today}  />
          <Stat title={t("gdStatInside")} value={stats.inside} />
          <Stat title={t("gdStatExited")} value={stats.exited} />
        </div>

      </div>

      <div>
        <GuardEmergencyPanel onSent={loadStats} />
      </div>

    </div>
  );
}