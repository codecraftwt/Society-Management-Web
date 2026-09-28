import { useNavigate } from "react-router-dom";
import { MdHome } from "react-icons/md";
import { LanguageProvider, useLang } from "../context/LanguageContext";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import LottieAnimation from "../components/common/LottieAnimation";
import GlobalButton from "../components/common/GlobalButton";

const ROLE_DASHBOARD = {
  SUPER_ADMIN: "/superadmin",
  SOCIETY_ADMIN: "/admin",
  COMMITTEE_MEMBER: "/admin",
  RESIDENT: "/resident",
  FAMILY_MEMBER: "/family",
  GUARD: "/guard",
  ACCOUNTANT: "/accountant",
};

function NotFoundInner() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useContext(AuthContext);

  const dashboardPath = user?.activeRole
    ? ROLE_DASHBOARD[user.activeRole] || "/"
    : "/";

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(8px, 1.6vw, 18px)",
        padding: "clamp(12px, 2.4vw, 32px)",
        boxSizing: "border-box",
        overflow: "hidden",
        background: "var(--bg-main)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <LottieAnimation
          name="404"
          width="100%"
          height="100%"
          loop
          speed={0.85}
          style={{
            filter: "drop-shadow(0 12px 28px rgba(0, 0, 0, 0.22))",
          }}
        />
      </div>

      <div style={{ marginTop: "clamp(4px, 1vw, 12px)" }}>
          <GlobalButton
            onClick={() => navigate(dashboardPath, { replace: true })}
            icon={MdHome}
            variant="primary"
          >
            {t("nfBackHome") || "Back to Home"}
          </GlobalButton>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <LanguageProvider role="home">
      <NotFoundInner />
    </LanguageProvider>
  );
}
