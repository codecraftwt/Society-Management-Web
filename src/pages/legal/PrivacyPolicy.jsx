import { useEffect } from "react";
import { motion } from "framer-motion";
import LegalNavbar from "../../components/common/LegalNavbar";
import { APP_NAME } from "../../constants/app";
import { useLang } from "../../context/LanguageContext";
import "../../home/Home.css";

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{t("privacyTitle")}</h1>
          <p className="text-secondary text-sm mb-8">{t("privacyLastUpdated")}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none text-secondary space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS1Title")}</h2>
              <p>{t("privacyS1P1", { name: APP_NAME })}</p>
              <p>{t("privacyS1P2")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS2Title")}</h2>
              <h3 className="text-lg font-medium text-primary mb-2">{t("privacyS2Subtitle1")}</h3>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>{t("privacyS2L1")}</li>
                <li>{t("privacyS2L2")}</li>
                <li>{t("privacyS2L3")}</li>
                <li>{t("privacyS2L4")}</li>
                <li>{t("privacyS2L5")}</li>
              </ul>
              <h3 className="text-lg font-medium text-primary mb-2">{t("privacyS2Subtitle2")}</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("privacyS2L6")}</li>
                <li>{t("privacyS2L7")}</li>
                <li>{t("privacyS2L8")}</li>
                <li>{t("privacyS2L9")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS3Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("privacyS3L1")}</li>
                <li>{t("privacyS3L2")}</li>
                <li>{t("privacyS3L3")}</li>
                <li>{t("privacyS3L4")}</li>
                <li>{t("privacyS3L5")}</li>
                <li>{t("privacyS3L6")}</li>
                <li>{t("privacyS3L7")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS4Title")}</h2>
              <p>{t("privacyS4P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("privacyS4L1")}</li>
                <li>{t("privacyS4L2")}</li>
                <li>{t("privacyS4L3")}</li>
                <li>{t("privacyS4L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS5Title")}</h2>
              <p>{t("privacyS5P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS6Title")}</h2>
              <p>{t("privacyS6P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS7Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("privacyS7L1")}</li>
                <li>{t("privacyS7L2")}</li>
                <li>{t("privacyS7L3")}</li>
                <li>{t("privacyS7L4")}</li>
                <li>{t("privacyS7L5")}</li>
                <li>{t("privacyS7L6")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS8Title")}</h2>
              <p>{t("privacyS8P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS9Title")}</h2>
              <p>{t("privacyS9P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("privacyS10Title")}</h2>
              <p>{t("privacyS10P1")}</p>
              <p className="font-medium text-primary">Email: support@mysociety.com</p>
            </section>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default PrivacyPolicy;