import { useNavigate } from "react-router-dom";
import { APP_NAME } from "../constants/app";
import { motion } from "framer-motion";
import ThemeToggle from "../components/common/ThemeToggle";
import LanguageSelector from "../components/common/LanguageSelector";
import { useLang } from "../context/LanguageContext";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <div className="min-h-screen flex flex-col bg-app relative overflow-hidden">

      {/* Glow Orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6">
        <h1 className="text-xl font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
          {APP_NAME}
        </h1>

        {/* Right: toggle + login — gap-3, no overlap */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector compact />
          <ThemeToggle />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
            className="btn-primary"
          >
            {t("landingLogin")}
          </motion.button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="bg-card max-w-xl w-full text-center px-5 sm:px-10 py-8 sm:py-12 animate-scaleIn"
        >
          <motion.h2
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}
          >
            {t("landingTitleLine1")} <br />
            <span className="text-accent">{t("landingTitleLine2")}</span>{t("landingTitleSuffix")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="text-secondary mb-8 leading-relaxed"
          >
            {t("landingDescription")}
          </motion.p>

          <motion.button
            whileHover={{ scale: 1.07, boxShadow: "0 20px 60px rgba(91,141,239,0.45)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
            className="btn-primary mx-auto"
          >
            {t("landingGetStarted")} 🚀
          </motion.button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-5 text-secondary text-sm">
        © {new Date().getFullYear()} {APP_NAME}. {t("allRightsReserved")}.
      </footer>
    </div>
  );
};

export default Landing;
