import { useEffect } from "react";
import { motion } from "framer-motion";
import LegalNavbar from "../../components/common/LegalNavbar";
import { APP_NAME } from "../../constants/app";
import { useLang } from "../../context/LanguageContext";
import "../../home/Home.css";

const TermsOfService = () => {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{t("termsTitle")}</h1>
          <p className="text-secondary text-sm mb-8">{t("termsLastUpdated")}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none text-secondary space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS1Title")}</h2>
              <p>{t("termsS1P1", { name: APP_NAME })}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS2Title")}</h2>
              <p>{t("termsS2P1", { name: APP_NAME })}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("termsS2L1")}</li>
                <li>{t("termsS2L2")}</li>
                <li>{t("termsS2L3")}</li>
                <li>{t("termsS2L4")}</li>
                <li>{t("termsS2L5")}</li>
                <li>{t("termsS2L6")}</li>
                <li>{t("termsS2L7")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS3Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("termsS3L1")}</li>
                <li>{t("termsS3L2")}</li>
                <li>{t("termsS3L3")}</li>
                <li>{t("termsS3L4")}</li>
                <li>{t("termsS3L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS4Title")}</h2>
              <p>{t("termsS4P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("termsS4L1")}</li>
                <li>{t("termsS4L2")}</li>
                <li>{t("termsS4L3")}</li>
                <li>{t("termsS4L4")}</li>
                <li>{t("termsS4L5")}</li>
                <li>{t("termsS4L6")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS5Title")}</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("termsS5L1")}</li>
                <li>{t("termsS5L2")}</li>
                <li>{t("termsS5L3")}</li>
                <li>{t("termsS5L4")}</li>
                <li>{t("termsS5L5")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS6Title")}</h2>
              <p>{t("termsS6P1", { name: APP_NAME })}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS7Title")}</h2>
              <p>{t("termsS7P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS8Title")}</h2>
              <p>{t("termsS8P1", { name: APP_NAME })}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("termsS8L1")}</li>
                <li>{t("termsS8L2")}</li>
                <li>{t("termsS8L3")}</li>
                <li>{t("termsS8L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS9Title")}</h2>
              <p>{t("termsS9P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS10Title")}</h2>
              <p>{t("termsS10P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS11Title")}</h2>
              <p>{t("termsS11P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("termsS12Title")}</h2>
              <p>{t("termsS12P1")}</p>
              <p className="font-medium text-primary">Email: support@mysociety.com</p>
            </section>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default TermsOfService;