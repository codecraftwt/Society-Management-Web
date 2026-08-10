

import { useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext";

export default function AccountDashboard() {
  const { t } = useLang();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) {
    return (
      <div className="text-center text-secondary">
        {t("loadingProfile")}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* === HEADER === */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("welcome")}, {user.name}
        </h2>
        <p className="text-sm text-secondary">
          {t("acctDashSubtitle")}
        </p>
      </div>

      {/* === INFO CARDS === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* User Info */}
        <div className="bg-card p-6 rounded-xl shadow space-y-3">
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            {t("acctAccountInfo")}
          </h3>
          <div className="text-sm space-y-1" style={{ color: "var(--text-primary)" }}>
            <p>
              <span className="text-secondary">{t("acctUserId")}:</span>{" "}
              {user.id}
            </p>
            <p>
              <span className="text-secondary">{t("fullName")}:</span>{" "}
              {user.name}
            </p>
            <p>
              <span className="text-secondary">{t("acctRoleLabel")}:</span>{" "}
              {t("acctRole")}
            </p>
          </div>
        </div>

        {/* Society Info */}
        <div className="bg-card p-6 rounded-xl shadow space-y-3">
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            {t("acctSocietyInfo")}
          </h3>
          <div className="text-sm space-y-1" style={{ color: "var(--text-primary)" }}>
            <p>
              <span className="text-secondary">{t("dashSocietyId")}:</span>{" "}
              {user.society_id}
            </p>
            <p>
              <span className="text-secondary">{t("profileTileSociety")}:</span>{" "}
              {user.society_name}
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-card p-6 rounded-xl shadow space-y-3">
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            {t("acctStatusTitle")}
          </h3>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="font-medium text-green-500">
              {t("active")}
            </span>
          </div>
          <p className="text-xs text-secondary">
            {t("acctStatusDesc")}
          </p>
        </div>

      </div>
    </div>
  );
}