import { useEffect } from "react";
import { motion } from "framer-motion";
import LegalNavbar from "../../components/common/LegalNavbar";
import { APP_NAME } from "../../constants/app";
import { useLang } from "../../context/LanguageContext";
import "../../home/Home.css";

const CookiePolicy = () => {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{t("cookieTitle")}</h1>
          <p className="text-secondary text-sm mb-8">{t("cookieLastUpdated")}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none text-secondary space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS1Title")}</h2>
              <p>{t("cookieS1P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS2Title")}</h2>
              <p>{t("cookieS2P1", { name: APP_NAME })}</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>{t("cookieS2L1Strong")}</strong>: {t("cookieS2L1")}</li>
                <li><strong>{t("cookieS2L2Strong")}</strong>: {t("cookieS2L2")}</li>
                <li><strong>{t("cookieS2L3Strong")}</strong>: {t("cookieS2L3")}</li>
                <li><strong>{t("cookieS2L4Strong")}</strong>: {t("cookieS2L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS3Title")}</h2>
              
              <h3 className="text-lg font-medium text-primary mb-2">{t("cookieS3Subtitle1")}</h3>
              <p className="mb-4">{t("cookieS3P1")}</p>
              <ul className="list-disc list-inside space-y-2 mb-6">
                <li>{t("cookieS3L1")}</li>
                <li>{t("cookieS3L2")}</li>
                <li>{t("cookieS3L3")}</li>
                <li>{t("cookieS3L4")}</li>
              </ul>

              <h3 className="text-lg font-medium text-primary mb-2">{t("cookieS3Subtitle2")}</h3>
              <p className="mb-4">{t("cookieS3P2")}</p>
              <ul className="list-disc list-inside space-y-2 mb-6">
                <li>{t("cookieS3L5")}</li>
                <li>{t("cookieS3L6")}</li>
                <li>{t("cookieS3L7")}</li>
                <li>{t("cookieS3L8")}</li>
              </ul>

              <h3 className="text-lg font-medium text-primary mb-2">{t("cookieS3Subtitle3")}</h3>
              <p className="mb-4">{t("cookieS3P3")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("cookieS3L9")}</li>
                <li>{t("cookieS3L10")}</li>
                <li>{t("cookieS3L11")}</li>
                <li>{t("cookieS3L12")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS4Title")}</h2>
              <p>{t("cookieS4P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li>{t("cookieS4L1")}</li>
                <li>{t("cookieS4L2")}</li>
                <li>{t("cookieS4L3")}</li>
                <li>{t("cookieS4L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS5Title")}</h2>
              <p>{t("cookieS5P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>{t("cookieS5L1Strong")}</strong>: {t("cookieS5L1")}</li>
                <li><strong>{t("cookieS5L2Strong")}</strong>: {t("cookieS5L2")}</li>
                <li><strong>{t("cookieS5L3Strong")}</strong>: {t("cookieS5L3")}</li>
              </ul>
              <p className="mt-4">{t("cookieS5P2")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS6Title")}</h2>
              <p>{t("cookieS6P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>{t("cookieS6L1Strong")}</strong>: {t("cookieS6L1")}</li>
                <li><strong>{t("cookieS6L2Strong")}</strong>: {t("cookieS6L2")}</li>
                <li><strong>{t("cookieS6L3Strong")}</strong>: {t("cookieS6L3")}</li>
              </ul>
              <p className="mt-4">{t("cookieS6P2")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS7Title")}</h2>
              <p>{t("cookieS7P1")}</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>{t("cookieS7L1Strong")}</strong>: {t("cookieS7L1")}</li>
                <li><strong>{t("cookieS7L2Strong")}</strong>: {t("cookieS7L2")}</li>
                <li><strong>{t("cookieS7L3Strong")}</strong>: {t("cookieS7L3")}</li>
                <li><strong>{t("cookieS7L4Strong")}</strong>: {t("cookieS7L4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS8Title")}</h2>
              <p>{t("cookieS8P1")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">{t("cookieS9Title")}</h2>
              <p>{t("cookieS9P1")}</p>
              <p className="font-medium text-primary">Email: support@mysociety.com</p>
            </section>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default CookiePolicy;