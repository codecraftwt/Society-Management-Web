import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineChatBubbleLeftRight,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineLockClosed,
  HiOutlineCalculator,
  HiOutlineBuildingStorefront,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiBars3,
  HiOutlineXMark
} from "react-icons/hi2";
import { FaYoutube, FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";

/* Image imports from assets/Photos/Home */
import homeBannerImg from "../assets/Photos/Home/Home.png";
import adminImg from "../assets/Photos/Home/Admin.png";
import committeeImg from "../assets/Photos/Home/Commitee.jpg";
import residentImg from "../assets/Photos/Home/Resident.png";
import guardImg from "../assets/Photos/Home/Guard.png";
import soloGuardImg from "../assets/Photos/Home/Solo-Guard.jpg";
import accountantImg from "../assets/Photos/Home/Accountant.png";

import ThemeToggle from "../components/common/ThemeToggle";
import LanguageSelector from "../components/common/LanguageSelector";
import { useLang } from "../context/LanguageContext";
import "./Home.css";

/* ==========================================================================
   SAFE IMAGE COMPONENT
   Gracefully renders elegant gradient placeholders if image paths do not
   exist physically on disk yet, preventing layout crashes or broken icons.
   ========================================================================== */
const SafeImage = ({ src, alt, className, fallbackGradient, fallbackIcon: Icon, ...props }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`home-image-placeholder ${className || ""}`}
        style={{
          background:
            fallbackGradient ||
            "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        {Icon ? (
          <Icon className="home-placeholder-icon" />
        ) : (
          <HiOutlineBuildingOffice2 className="home-placeholder-icon" />
        )}
        <span className="home-placeholder-text">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

/* ==========================================================================
   HOME PAGE REACT COMPONENT
   ========================================================================== */
const Home = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleMobileNav = (id) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  /* Slide transition variant settings matching executive PPT presentation decks */
  const slideVariants = {
    hidden: { opacity: 0, y: 90, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <div className="home-page">
      {/* ==========================================================================
         1. NAVBAR
         ========================================================================== */}
      <nav className={`home-navbar ${scrolled ? "home-navbar--scrolled" : ""}`}>
        <div className="home-container">
          <div className="home-navbar-inner">
            {/* Brand Logo */}
            <Link to="/" className="home-brand-logo">
              <div className="home-brand-icon-box">
                <HiOutlineBuildingOffice2 />
              </div>
              <div className="home-brand-text">
                <div className="home-brand-title">{t("homeBrandTitle")}</div>
                <div className="home-brand-subtitle">{t("homeBrandSubtitle")}</div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <ul className="home-nav-links">
              <li className="home-nav-item">
                <span className="home-nav-link" onClick={() => scrollToSection("features")}>
                  {t("homeNavFeatures")}
                </span>
              </li>
              <li className="home-nav-item">
                <span className="home-nav-link" onClick={() => scrollToSection("how-it-works")}>
                  {t("homeNavHowItWorks")}
                </span>
              </li>
              <li className="home-nav-item">
                <span className="home-nav-link" onClick={() => scrollToSection("roles")}>
                  {t("homeNavUserRoles")}
                </span>
              </li>
            </ul>

            {/* Nav Right Actions: Language -> Authentication -> Primary CTA -> Theme */}
            <div className="home-nav-actions">
              <LanguageSelector compact />
              <button
                onClick={() => navigate("/login")}
                className="home-btn-login"
              >
                {t("homeLogin")}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="home-btn-getstarted"
              >
                {t("homeGetStarted")}
              </button>
              <div className="home-nav-theme-toggle">
                <ThemeToggle />
              </div>
            </div>

            {/* Mobile Burger */}
            <button
              className="home-mobile-burger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <HiOutlineXMark /> : <HiBars3 />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`home-mobile-menu ${menuOpen ? "active" : ""}`}>
          <span className="home-mobile-link" onClick={() => handleMobileNav("features")}>
            {t("homeNavFeatures")}
          </span>
          <span className="home-mobile-link" onClick={() => handleMobileNav("how-it-works")}>
            {t("homeNavHowItWorks")}
          </span>
          <span className="home-mobile-link" onClick={() => handleMobileNav("roles")}>
            {t("homeNavUserRoles")}
          </span>

          <div className="home-mobile-divider" />

          <div className="home-mobile-prefs">
            <div className="home-nav-theme-toggle">
              <ThemeToggle />
            </div>
            <LanguageSelector compact />
          </div>

          <div className="home-mobile-actions">
            <button
              onClick={() => { setMenuOpen(false); navigate("/login"); }}
              className="home-btn-login"
            >
              {t("homeLogin")}
            </button>
            <button
              onClick={() => { setMenuOpen(false); navigate("/login"); }}
              className="home-btn-getstarted"
            >
              {t("homeGetStarted")}
            </button>
          </div>
        </div>
      </nav>

      {/* ==========================================================================
         2. HERO BANNER SECTION
         ========================================================================== */}
      <section className="home-hero-section">
        {/* Full Bleed Background Photo of Residential Community */}
        <div className="home-hero-bg-photo">
          <SafeImage
            src={homeBannerImg}
            alt={t("homeAltHero")}
            className="home-hero-full-img"
            fallbackIcon={HiOutlineBuildingOffice2}
            fallbackGradient="linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)"
          />
        </div>

        {/* Organic White Curved Backdrop Overlay on Left Side */}
        <div className="home-hero-white-curve">
          <svg viewBox="0 0 1000 650" preserveAspectRatio="none" className="home-curve-svg">
            <path
              d="M 0,0 L 680,0 C 960,140 740,340 580,480 C 460,570 240,620 0,650 Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        <div className="home-container">
          <div className="home-hero-layout">
            {/* Hero Left Column Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="home-hero-content"
            >
              <div className="home-eyebrow-badge">
                {t("homeEyebrow")}
              </div>

              <h1 className="home-hero-title">
                {t("homeHeroTitle1")}<br />
                {t("homeHeroTitle2")}<br />
                {t("homeHeroTitle3")}
              </h1>

              <p className="home-hero-subtitle">
                {t("homeHeroSubtitle")}
              </p>

              <div className="home-hero-actions">
                <button
                  onClick={() => navigate("/login")}
                  className="home-btn-getstarted"
                  style={{ padding: "0.8rem 1.75rem", fontSize: "1.025rem" }}
                >
                  {t("homeGetStarted")}
                </button>

                <button
                  onClick={() => scrollToSection("features")}
                  className="home-btn-explore"
                  style={{ padding: "0.8rem 1.75rem", fontSize: "1.025rem" }}
                >
                  {t("homeExplore")}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
         3. PILLARS / PLATFORM OVERVIEW SECTION (PPT SLIDE 1 - SOFT SLATE BG)
         ========================================================================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={slideVariants}
        className="home-pillars-section"
        id="features"
      >
        <div className="home-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="home-section-header"
          >
            <h2 className="home-section-title">
              {t("homeSection1Title")}
            </h2>
          </motion.div>

          <div className="home-pillars-grid">
            {[
              {
                icon: HiOutlineUsers,
                title: t("homePillar1Title"),
                desc: t("homePillar1Desc")
              },
              {
                icon: HiOutlineCreditCard,
                title: t("homePillar2Title"),
                desc: t("homePillar2Desc")
              },
              {
                icon: HiOutlineShieldCheck,
                title: t("homePillar3Title"),
                desc: t("homePillar3Desc")
              },
              {
                icon: HiOutlineChatBubbleLeftRight,
                title: t("homePillar4Title"),
                desc: t("homePillar4Desc")
              }
            ].map((pillar, idx) => {
              const IconComp = pillar.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="home-pillar-card"
                >
                  <div className="home-pillar-content">
                    <div className="home-pillar-icon-box">
                      <IconComp />
                    </div>
                    <h3 className="home-pillar-title">{pillar.title}</h3>
                    <p className="home-pillar-desc">{pillar.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ==========================================================================
         4. EFFICIENT ADMINISTRATION SHOWCASE SECTION (PPT SLIDE 2 - PURE WHITE BG)
         ========================================================================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={slideVariants}
        className="home-admin-section"
      >
        <div className="home-container">
          <div className="home-admin-grid">
            {/* Left Visual */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="home-admin-visual"
            >
              <div className="home-admin-image-box">
                <SafeImage
                  src={guardImg}
                  alt={t("homeAltAdmin")}
                  className="home-admin-img"
                  fallbackIcon={HiOutlineUsers}
                />
              </div>
            </motion.div>

            {/* Right Features */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="home-section-title" style={{ textAlign: "left" }}>
                {t("homeSection2Title")}
              </h2>
              <p className="home-section-subtitle" style={{ textAlign: "left" }}>
                {t("homeSection2Subtitle")}
              </p>

              <div className="home-admin-features">
                {[
                  t("homeAdminF1"),
                  t("homeAdminF2"),
                  t("homeAdminF3"),
                  t("homeAdminF4"),
                  t("homeAdminF5"),
                  t("homeAdminF6"),
                  t("homeAdminF7"),
                  t("homeAdminF8")
                ].map((feature, fIdx) => (
                  <motion.div
                    key={fIdx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: 0.3 + fIdx * 0.05 }}
                    className="home-admin-feature-item"
                  >
                    <span className="home-bullet-dot">•</span>
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ==========================================================================
         5. HOW IT WORKS SECTION (PPT SLIDE 3 - SOFT BLUE TINT BG)
         ========================================================================== */}


      {/* ==========================================================================
         6. ROLE SECTION (PPT SLIDE 4 - 3 IN ROW 1, 3 IN ROW 2 GRID)
         ========================================================================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={slideVariants}
        className="home-roles-section"
        id="roles"
      >
        <div className="home-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="home-section-header"
          >
            <span className="home-section-tag">{t("homeRolesTag")}</span>
            <h2 className="home-section-title">
              {t("homeSection3Title")}
            </h2>
            <p className="home-section-subtitle">
              {t("homeSection3Subtitle")}
            </p>
          </motion.div>

          <div className="home-roles-grid">
            {[
              {
                img: adminImg,
                icon: HiOutlineBriefcase,
                title: t("homeRole1Title"),
                desc: t("homeRole1Desc")
              },
              {
                img: committeeImg,
                icon: HiOutlineUserGroup,
                title: t("homeRole2Title"),
                desc: t("homeRole2Desc")
              },
              {
                img: residentImg,
                icon: HiOutlineUsers,
                title: t("homeRole3Title"),
                desc: t("homeRole3Desc")
              },
              {
                img: soloGuardImg,
                icon: HiOutlineLockClosed,
                title: t("homeRole4Title"),
                desc: t("homeRole4Desc")
              },
              {
                img: accountantImg,
                icon: HiOutlineCalculator,
                title: t("homeRole5Title"),
                desc: t("homeRole5Desc")
              },
              {
                img: adminImg,
                icon: HiOutlineBuildingStorefront,
                title: t("homeRole6Title"),
                desc: t("homeRole6Desc")
              }
            ].map((role, rIdx) => {
              const RoleIcon = role.icon;
              return (
                <motion.div
                  key={rIdx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: rIdx * 0.08 }}
                  className="home-role-card"
                >
                  {/* Left Side Info */}
                  <div className="home-role-content-left">
                    <div className="home-role-head">
                      <div className="home-role-badge"><RoleIcon /></div>
                      <h3 className="home-role-title">{role.title}</h3>
                    </div>
                    <p className="home-role-desc">{role.desc}</p>
                  </div>

                  {/* Right Side Image */}
                  <div className="home-role-image-right">
                    <SafeImage
                      src={role.img}
                      alt={role.title}
                      className="home-role-img"
                      fallbackIcon={RoleIcon}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ==========================================================================
         7. CALL TO ACTION (CTA) BANNER (PPT SLIDE 5 - MODERN LUXURY REDESIGN)
         ========================================================================== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={slideVariants}
        className="home-cta-section"
      >
        <div className="home-container">
          <div className="home-cta-banner">
            {/* Ambient Glow Orbs */}
            <div className="home-cta-glow-orb orb-1"></div>
            <div className="home-cta-glow-orb orb-2"></div>

            <SafeImage
              src={homeBannerImg}
              alt={t("homeAltCta")}
              className="home-cta-bg-image"
              fallbackIcon={HiOutlineBuildingOffice2}
            />

            <div className="home-cta-content">
              <div className="home-cta-badge">
                <HiOutlineSparkles className="home-cta-sparkle-icon" /> {t("homeCtaBadge")}
              </div>

              <h2 className="home-cta-title">
                {t("homeCtaTitle1")}<br />{t("homeCtaTitle2")}
              </h2>

              <p className="home-cta-subtitle">
                {t("homeCtaSubtitle")}
              </p>

              <div className="home-cta-pills">
                <span className="home-cta-pill"><HiOutlineCheckCircle /> {t("homeCtaPill1")}</span>
                <span className="home-cta-pill"><HiOutlineCheckCircle /> {t("homeCtaPill2")}</span>
                <span className="home-cta-pill"><HiOutlineCheckCircle /> {t("homeCtaPill3")}</span>
              </div>

              <div className="home-cta-buttons">
                <button
                  onClick={() => navigate("/login")}
                  className="home-cta-btn-primary"
                >
                  {t("homeGetStartedNow")} <HiOutlineArrowRight className="home-cta-arrow" />
                </button>

                <button
                  onClick={() => scrollToSection("features")}
                  className="home-cta-btn-glass"
                >
                  {t("homeExplore")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ==========================================================================
         8. FOOTER SECTION
         ========================================================================== */}
      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer-grid">
            {/* Col 1: Company Info */}
            <div className="home-footer-brand">
              <Link to="/" className="home-footer-logo">
                <div className="home-brand-icon-box" style={{ width: 36, height: 36, fontSize: "1.1rem" }}>
                  <HiOutlineBuildingOffice2 />
                </div>
                <span>{t("homeFooterBrand")}</span>
              </Link>
              <p className="home-footer-desc">
                {t("homeHeroSubtitle")}
              </p>
            </div>

            {/* Col 2: Product */}
            <div>
              <h4 className="home-footer-col-title">{t("homeFooterProduct")}</h4>
              <ul className="home-footer-links">
                <li><span className="home-footer-link" onClick={() => scrollToSection("features")}>{t("homeNavFeatures")}</span></li>
                <li><Link to="/login" className="home-footer-link">{t("homeFooterResidentPortal")}</Link></li>
                <li><Link to="/login" className="home-footer-link">{t("homeFooterAdminDashboard")}</Link></li>
                <li><Link to="/login" className="home-footer-link">{t("homeFooterSecurityApp")}</Link></li>
                <li><Link to="/login" className="home-footer-link">{t("homeFooterAccountantPortal")}</Link></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div>
              <h4 className="home-footer-col-title">{t("homeFooterCompany")}</h4>
              <ul className="home-footer-links">
                <li><span className="home-footer-link" onClick={() => scrollToSection("roles")}>{t("homeFooterAboutUs")}</span></li>
                <li><span className="home-footer-link" onClick={() => scrollToSection("how-it-works")}>{t("homeNavHowItWorks")}</span></li>
                <li><Link to="/login" className="home-footer-link">{t("homeFooterCareers")}</Link></li>
                <li><Link to="/login" className="home-footer-link">{t("homeFooterContactUs")}</Link></li>
              </ul>
            </div>

            {/* Col 4: Legal */}
            <div>
              <h4 className="home-footer-col-title">{t("homeFooterLegal")}</h4>
              <ul className="home-footer-links">
                <li><Link to="/" className="home-footer-link">{t("homeFooterPrivacy")}</Link></li>
                <li><Link to="/" className="home-footer-link">{t("homeFooterTerms")}</Link></li>
                <li><Link to="/" className="home-footer-link">{t("homeFooterSecurityPolicy")}</Link></li>
                <li><Link to="/" className="home-footer-link">{t("homeFooterCookie")}</Link></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="home-footer-bottom">
            <span>© {new Date().getFullYear()} {t("homeFooterBrand")}. {t("homeFooterRights")}.</span>
            <div className="home-social-links">
              <a href="#youtube" className="home-social-icon" aria-label="YouTube"><FaYoutube /></a>
              <a href="#facebook" className="home-social-icon" aria-label="Facebook"><FaFacebookF /></a>
              <a href="#instagram" className="home-social-icon" aria-label="Instagram"><FaInstagram /></a>
              <a href="#linkedin" className="home-social-icon" aria-label="LinkedIn"><FaLinkedinIn /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
