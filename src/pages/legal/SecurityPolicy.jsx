import { useEffect } from "react";
import { motion } from "framer-motion";
import LegalNavbar from "../../components/common/LegalNavbar";
import { APP_NAME } from "../../constants/app";
import { useLang } from "../../context/LanguageContext";
import "../../home/Home.css";

const SecurityPolicy = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const { t } = useLang();

  return (
    <div className="home-page">
      <LegalNavbar />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
      >
        <div className="bg-card rounded-2xl p-6 sm:p-10 shadow-lg border border-app">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{t("securityTitle")}</h1>
          <p className="text-secondary text-sm mb-8">{t("securityLastUpdated")}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none text-secondary space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS1Title")}</h2>
              <p>{t("securityS1P1", { name: APP_NAME })}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS2Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS2L1")}</li>
                <li>{t("securityS2L2")}</li>
                <li>{t("securityS2L3")}</li>
                <li>{t("securityS2L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS3Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS3L1")}</li>
                <li>{t("securityS3L2")}</li>
                <li>{t("securityS3L3")}</li>
                <li>{t("securityS3L4")}</li>
                <li>{t("securityS3L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS4Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS4L1")}</li>
                <li>{t("securityS4L2")}</li>
                <li>{t("securityS4L3")}</li>
                <li>{t("securityS4L4")}</li>
                <li>{t("securityS4L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS5Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS5L1")}</li>
                <li>{t("securityS5L2")}</li>
                <li>{t("securityS5L3")}</li>
                <li>{t("securityS5L4")}</li>
                <li>{t("securityS5L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS6Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS6L1")}</li>
                <li>{t("securityS6L2")}</li>
                <li>{t("securityS6L3")}</li>
                <li>{t("securityS6L4")}</li>
                <li>{t("securityS6L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS7Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS7L1")}</li>
                <li>{t("securityS7L2")}</li>
                <li>{t("securityS7L3")}</li>
                <li>{t("securityS7L4")}</li>
                <li>{t("securityS7L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS8Title")}</h2>
              <p>{t("securityS8P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS8L1")}</li>
                <li>{t("securityS8L2")}</li>
                <li>{t("securityS8L3")}</li>
                <li>{t("securityS8L4")}</li>
                <li>{t("securityS8L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS9Title")}</h2>
              <p>{t("securityS9P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS9L1")}</li>
                <li>{t("securityS9L2")}</li>
                <li>{t("securityS9L3")}</li>
                <li>{t("securityS9L4")}</li>
                <li>{t("securityS9L5")}</li>
                <li>{t("securityS9L6")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS10Title")}</h2>
              <p>{t("securityS10P1")}</p>
              <p className="font-medium text-primary">Email: security@mysociety.com</p>
              <p>{t("securityS10P2")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS11Title")}</h2>
              <p>{t("securityS11P1", { name: APP_NAME })}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("securityS11L1")}</li>
                <li>{t("securityS11L2")}</li>
                <li>{t("securityS11L3")}</li>
                <li>{t("securityS11L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("securityS12Title")}</h2>
              <p>{t("securityS12P1")}</p>
              <p className="font-medium text-primary">Email: security@mysociety.com</p>
            </section>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default SecurityPolicy;